// Statistiche per periodo: totali e valori giorno per giorno (o mese per mese), con confronto col periodo precedente.
import type { Camminata } from './tipi';
import { tempoMovimento } from './movimento';

export type Periodo = 'settimana' | 'mese' | 'anno';
export type Valori = { km: number; kcal: number; n: number; ore: number; salita: number };
export type Fascia = Valori & { inizio: number; fine: number; breve: string; lunga: string };
export type Statistiche = { fasce: Fascia[]; totale: Valori; precedente: Valori };

const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const vuoto = (): Valori => ({ km: 0, kcal: 0, n: 0, ore: 0, salita: 0 });
const aggiungi = (v: Valori, w: Camminata) => {
  v.km += (w.distance_m || 0) / 1000; v.kcal += w.calories || 0; v.n += 1;
  v.ore += (tempoMovimento(w) || 0) / 3600000; v.salita += w.ascent_m || 0;
};
const mezzanotte = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Fasce del periodo che termina oggi (ora locale): 7 o 30 giorni, oppure 12 mesi. */
export function fasce(periodo: Periodo, oggi = new Date()): Fascia[] {
  const out: Fascia[] = [];
  if (periodo === 'anno') {
    for (let i = 11; i >= 0; i--) {
      const a = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1), b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
      out.push({ ...vuoto(), inizio: a.getTime(), fine: b.getTime(), breve: MESI[a.getMonth()][0].toUpperCase(), lunga: `${MESI[a.getMonth()]} ${a.getFullYear()}` });
    }
  } else {
    const giorni = periodo === 'settimana' ? 7 : 30;
    const m0 = mezzanotte(oggi);
    for (let i = giorni - 1; i >= 0; i--) {
      const a = new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() - i), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
      out.push({
        ...vuoto(), inizio: a.getTime(), fine: b.getTime(),
        breve: periodo === 'settimana' ? GIORNI[a.getDay()] : String(a.getDate()),
        lunga: `${GIORNI[a.getDay()]} ${a.getDate()} ${MESI[a.getMonth()]}`,
      });
    }
  }
  return out;
}

export function calcolaStatistiche(camminate: Camminata[], periodo: Periodo, oggi = new Date()): Statistiche {
  const f = fasce(periodo, oggi);
  const inizio = f[0].inizio, fine = f[f.length - 1].fine;
  // periodo precedente della stessa lunghezza (es. i 7 giorni prima)
  const precInizio = periodo === 'anno' ? new Date(new Date(inizio).getFullYear() - 1, new Date(inizio).getMonth(), 1).getTime() : inizio - (fine - inizio);
  const totale = vuoto(), precedente = vuoto();
  for (const w of camminate) {
    if (w.status !== 'done') continue;
    const t = w.started_at;
    if (t >= inizio && t < fine) {
      const fascia = f.find((x) => t >= x.inizio && t < x.fine);
      if (fascia) aggiungi(fascia, w);
      aggiungi(totale, w);
    } else if (t >= precInizio && t < inizio) aggiungi(precedente, w);
  }
  return { fasce: f, totale, precedente };
}

/** Variazione percentuale rispetto al periodo precedente (null se prima non c'era nulla). */
export function variazione(ora: number, prima: number): number | null {
  if (prima <= 0) return null;
  return Math.round(((ora - prima) / prima) * 100);
}
