// Annunci vocali: decide COSA dire e QUANDO. Funzione pura, identica su web e Android;
// la voce vera e propria è in src/voce.web.ts / src/voce.native.ts.
import type { Parziale } from './parziali';

export type Frequenza = 'km' | '500m' | '5min' | '10min';
export type DatoVoce = 'tempo' | 'distanza' | 'passo' | 'salita' | 'pause';

export type PrefVoce = { attiva: boolean; ogni: Frequenza; dati: DatoVoce[]; volume: number };

export const FREQUENZE: { v: Frequenza; t: string }[] = [
  { v: 'km', t: 'Ogni km' }, { v: '500m', t: 'Ogni 500 m' }, { v: '5min', t: 'Ogni 5 min' }, { v: '10min', t: 'Ogni 10 min' },
];
export const DATI_VOCE: { v: DatoVoce; t: string }[] = [
  { v: 'tempo', t: 'Tempo' }, { v: 'distanza', t: 'Distanza' }, { v: 'passo', t: 'Passo' },
  { v: 'salita', t: 'Salita' }, { v: 'pause', t: 'Pausa e ripresa' },
];
export const VOLUMI = [{ v: 0.4, t: 'Basso' }, { v: 0.7, t: 'Medio' }, { v: 1, t: 'Alto' }];
export const DATI_PREDEFINITI: DatoVoce[] = ['tempo', 'distanza', 'passo', 'pause'];

/** Le preferenze sono salvate come testo: le si legge con tolleranza (valori sconosciuti = predefiniti). */
export function leggiPrefVoce(get: (k: string, d: string) => string): PrefVoce {
  const ogni = get('voce_ogni', 'km') as Frequenza;
  const dati = get('voce_dati', DATI_PREDEFINITI.join(',')).split(',').filter((d): d is DatoVoce => DATI_VOCE.some((x) => x.v === d));
  const vol = parseFloat(get('voce_volume', '1'));
  return {
    attiva: get('voce', '1') === '1',
    ogni: FREQUENZE.some((f) => f.v === ogni) ? ogni : 'km',
    dati,
    volume: Number.isFinite(vol) && vol > 0 && vol <= 1 ? vol : 1,
  };
}

export type Istantanea = {
  distanzaM: number;
  movimentoMs: number;
  salitaM: number;
  /** pausa automatica confermata */
  fermo: boolean;
  /** pausa manuale */
  pausa: boolean;
  parziali: Parziale[];
};

export type StatoAnnunci = { traguardo: number; ogni: Frequenza; fermo: boolean; pausa: boolean };

function traguardo(i: Istantanea, ogni: Frequenza): number {
  switch (ogni) {
    case 'km': return Math.floor(i.distanzaM / 1000);
    case '500m': return Math.floor(i.distanzaM / 500);
    case '5min': return Math.floor(i.movimentoMs / 300000);
    case '10min': return Math.floor(i.movimentoMs / 600000);
  }
}

// --- frasi in italiano, pensate per essere ascoltate (niente abbreviazioni, niente "virgola") ---

export function diDistanza(m: number): string {
  const km = Math.floor(m / 1000), resto = Math.round((m - km * 1000) / 10) * 10;
  const k = km === 0 ? '' : km === 1 ? 'un chilometro' : `${km} chilometri`;
  if (resto === 0 || resto === 1000) return k || '0 metri';
  return k ? `${k} e ${resto} metri` : `${resto} metri`;
}

export function diDurata(ms: number): string {
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ore = h === 1 ? "un'ora" : `${h} ore`, min = m === 1 ? 'un minuto' : `${m} minuti`, secondi = sec === 1 ? 'un secondo' : `${sec} secondi`;
  if (h > 0) return m ? `${ore} e ${min}` : ore;               // oltre l'ora i secondi non interessano
  if (m > 0) return sec ? `${min} e ${secondi}` : min;
  return secondi;
}

export function diPasso(sKm: number): string | null {
  if (!(sKm > 0) || sKm > 60 * 60) return null;
  return `${diDurata(Math.round(sKm) * 1000)} al chilometro`;
}

/** Frase periodica (al traguardo di distanza o di tempo). */
export function frasePeriodica(i: Istantanea, p: PrefVoce): string {
  const parti: string[] = [];
  const perDistanza = p.ogni === 'km' || p.ogni === '500m';
  // Al traguardo di distanza si annuncia il traguardo esatto (es. "2 chilometri"), non i metri di adesso.
  const passo = p.ogni === '500m' ? 500 : 1000;
  const dist = perDistanza ? Math.floor(i.distanzaM / passo) * passo : i.distanzaM;
  if (p.dati.includes('distanza') || perDistanza) parti.push(diDistanza(dist));
  if (p.dati.includes('tempo')) parti.push(`tempo ${diDurata(i.movimentoMs)}`);
  if (p.dati.includes('passo')) {
    const ultimo = [...i.parziali].reverse().find((x) => x.completo);
    const pk = p.ogni === 'km' && ultimo ? diPasso(ultimo.passoSKm) : null;
    const medio = i.distanzaM >= 100 ? diPasso((i.movimentoMs / 1000) / (i.distanzaM / 1000)) : null;
    if (pk) parti.push(`ultimo chilometro ${pk}`);
    else if (medio) parti.push(`passo medio ${medio}`);
  }
  if (p.dati.includes('salita') && i.salitaM >= 1) parti.push(`salita ${Math.round(i.salitaM)} metri`);
  return parti.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join('. ') + '.';
}

/**
 * Confronta lo stato di adesso con quello dell'ultimo controllo e restituisce le frasi da dire.
 * Al primo controllo (prec = null, es. schermata appena aperta) non dice nulla: memorizza soltanto.
 */
export function prossimiAnnunci(prec: StatoAnnunci | null, i: Istantanea, p: PrefVoce): { frasi: string[]; stato: StatoAnnunci } {
  const stato: StatoAnnunci = { traguardo: traguardo(i, p.ogni), ogni: p.ogni, fermo: i.fermo, pausa: i.pausa };
  if (!prec || !p.attiva) return { frasi: [], stato };
  const frasi: string[] = [];
  const pause = p.dati.includes('pause');
  if (pause && i.pausa !== prec.pausa) frasi.push(i.pausa ? 'Pausa.' : 'Si riparte.');
  else if (pause && !i.pausa && i.fermo !== prec.fermo) frasi.push(i.fermo ? 'Pausa automatica.' : 'Si riparte.');
  // Traguardo superato (se ne sono passati più insieme, es. dopo un'interruzione, se ne annuncia uno solo).
  // Se nel frattempo è cambiata la frequenza nelle impostazioni, si riparte a contare senza annunciare.
  if (prec.ogni === p.ogni && stato.traguardo > prec.traguardo && stato.traguardo > 0) frasi.push(frasePeriodica(i, p));
  return { frasi, stato };
}
