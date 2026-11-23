// Elabora il dislivello di una camminata salvata: filtro locale, correzione DEM (se l'utente l'ha attivata),
// riconoscimento dei percorsi ripetuti. I dati GPS grezzi non vengono mai modificati: si può sempre ricalcolare.
import { aggiorna, camminata, elencoCamminate, elencoPercorsi, punti, salvaPercorso } from '../../archivio';
import { leggiPref } from '../../preferenze';
import { pesoValido } from '../calorie';
import type { Camminata } from '../tipi';
import { calcolaAltimetria, calorieDaRisultato, Fonte, SD, SOGLIA_PREDEFINITA_M } from './calcola';
import { campiona } from './campiona';
import { ottieniDem } from './dem';
import { aggiornaProfilo, nuovoPercorso, trovaPercorso } from './percorsi';

export type StatoDem = 'no' | 'in_corso' | 'attesa' | 'ok';

export type InfoAltimetria = {
  v: 1;
  fonte: Fonte;
  stato_dem: StatoDem;
  fonte_dem?: string;
  grezzo: SD; filtrato: SD; dem?: SD; ripetuto?: SD;
  soglia: number;
  offset_gps_dem?: number | null;
  ripetizioni?: number;          // quante uscite precedenti hanno formato il profilo usato
  dem_quote?: (number | null)[]; // quote DEM per campione (cache: si può ricalcolare senza rete)
  dem_sigma?: number;
  peso_kg?: number;              // peso usato per le calorie
  in_profilo?: number;           // id del percorso al cui profilo questa uscita ha già contribuito
};

export const leggiInfo = (w: Pick<Camminata, 'altimetria'>): InfoAltimetria | null => {
  try { return w.altimetria ? (JSON.parse(w.altimetria) as InfoAltimetria) : null; } catch { return null; }
};

export const pesoConfigurato = (): number | null => {
  const v = parseFloat(leggiPref('peso', '').replace(',', '.'));
  return pesoValido(v) ? v : null;
};

export const correzioneReteAttiva = () => leggiPref('rete', '0') === '1';
export const sogliaConfigurata = () => {
  const s = parseFloat(leggiPref('soglia', String(SOGLIA_PREDEFINITA_M)));
  return Number.isFinite(s) && s >= 1 && s <= 10 ? s : SOGLIA_PREDEFINITA_M;
};

const inCorso = new Set<number>();

/**
 * Calcola e salva il dislivello. Fase 1 (immediata, tutta sul telefono); fase 2 (solo se la correzione
 * con la rete è attiva): scarica le quote del terreno. Senza rete la corsa resta "in attesa" e si riprova dopo.
 */
export async function elaboraCamminata(id: number, opz: { saltaRete?: boolean } = {}): Promise<void> {
  if (inCorso.has(id)) return;
  inCorso.add(id);
  try {
    const w = await camminata(id);
    if (!w) return;
    const pts = await punti(id);
    const prec = leggiInfo(w);
    const soglia = sogliaConfigurata();
    const campioni = campiona(pts);
    const lunghezza = campioni.length ? campioni[campioni.length - 1].d : 0;

    let demQuote = prec?.dem_quote && prec.dem_quote.length === campioni.length ? prec.dem_quote : undefined;
    let demSigma = prec?.dem_sigma ?? 6, demFonte = prec?.fonte_dem;
    let stato: StatoDem = demQuote ? 'ok' : (correzioneReteAttiva() && campioni.length > 1 ? 'in_corso' : 'no');

    const volteRete = correzioneReteAttiva() && !opz.saltaRete && !demQuote;
    const esistenti = await elencoPercorsi();
    const giaInProfilo = prec?.in_profilo;
    const corrisp = (profiliUsabili: typeof esistenti) =>
      trovaPercorso(campioni, lunghezza, profiliUsabili.filter((p) => p.id !== giaInProfilo));

    const salva = async (dem: { quote: (number | null)[]; sigma: number } | undefined, st: StatoDem, inProfilo?: number) => {
      const c = corrisp(esistenti);
      const r = calcolaAltimetria(pts, { soglia, dem, corrispondenza: c });
      const info: InfoAltimetria = {
        v: 1, fonte: r.fonte, stato_dem: st, fonte_dem: demFonte,
        grezzo: r.grezzo, filtrato: r.filtrato, dem: r.dem, ripetuto: r.ripetuto, soglia,
        offset_gps_dem: r.offsetGpsDem, ripetizioni: c?.percorso.n,
        dem_quote: dem?.quote, dem_sigma: dem ? demSigma : undefined, in_profilo: inProfilo ?? giaInProfilo,
      };
      const peso = pesoConfigurato();
      await aggiorna(id, { ascent_m: r.salita, descent_m: r.discesa, calories: peso ? calorieDaRisultato(r, peso) : null, altimetria: JSON.stringify({ ...info, peso_kg: peso ?? undefined }) });
      return { r, c, info };
    };

    // Fase 1: subito, senza rete
    let ris = await salva(demQuote ? { quote: demQuote, sigma: demSigma } : undefined, stato);

    // Fase 2: quote del terreno
    if (volteRete && campioni.length > 1) {
      const dem = await ottieniDem(campioni.map((c) => ({ lat: c.lat, lon: c.lon })));
      if (dem) {
        demQuote = dem.quote; demSigma = dem.sigma; demFonte = dem.fonte; stato = 'ok';
        ris = await salva({ quote: demQuote, sigma: demSigma }, 'ok');
      } else {
        stato = 'attesa';
        ris = await salva(undefined, 'attesa');
      }
    }

    // Contributo al profilo dei percorsi ripetuti: solo quando il risultato è definitivo
    const definitivo = stato === 'ok' || !correzioneReteAttiva();
    if (definitivo && lunghezza >= 300 && ris.info.in_profilo == null) {
      const senzaProfilo = calcolaAltimetria(pts, { soglia, dem: demQuote ? { quote: demQuote, sigma: demSigma } : undefined });
      const c = ris.c;
      const profilo = c
        ? aggiornaProfilo(c.percorso, senzaProfilo.quote, c.invertito, lunghezza)
        : nuovoPercorso(campioni, senzaProfilo.quote, lunghezza);
      const pid = await salvaPercorso(profilo);
      const w2 = await camminata(id);
      const info = leggiInfo(w2!)!;
      await aggiorna(id, { altimetria: JSON.stringify({ ...info, in_profilo: pid }) });
    }
  } finally {
    inCorso.delete(id);
  }
}

/** Riprova le correzioni rimaste "in attesa" (rete assente al momento dello Stop). */
export async function riprovaCorrezioniPendenti() {
  if (!correzioneReteAttiva()) return;
  for (const w of await elencoCamminate()) {
    const i = leggiInfo(w);
    if (i && (i.stato_dem === 'attesa' || i.stato_dem === 'in_corso')) await elaboraCamminata(w.id);
  }
}
