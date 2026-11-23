// Formato del backup: un file JSON con camminate (e i loro punti GPS grezzi), percorsi ripetuti e preferenze.
import type { Camminata, Punto } from './tipi';
import type { Percorso } from './altimetria/percorsi';

export const FORMATO = 'camminacamenella-backup';
export const VERSIONE = 1;
/** Preferenze salvate nel backup (peso, nome, avatar, impostazioni). */
export const PREF_BACKUP = ['peso', 'nome', 'avatar', 'avatar_chiesto', 'peso_saltato', 'rete', 'soglia', 'mappa'];

export type CamminataBackup = Camminata & { punti: Punto[] };
export type Backup = {
  formato: typeof FORMATO; versione: number; creato: string;
  camminate: CamminataBackup[]; percorsi: Percorso[]; preferenze: Record<string, string>;
};

export function nomeFileBackup(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `CamminaCamenella-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

const num = (v: any) => typeof v === 'number' && Number.isFinite(v);

/** Controlla che il file sia davvero un backup di CamminaCamenella; altrimenti spiega il problema. */
export function leggiBackup(testo: string): Backup {
  let x: any;
  try { x = JSON.parse(testo); } catch { throw new Error('Il file non è un backup valido (non è un file JSON).'); }
  if (!x || x.formato !== FORMATO) throw new Error('Questo file non è un backup di CamminaCamenella.');
  if (!num(x.versione) || x.versione > VERSIONE) throw new Error('Il backup è stato creato da una versione più recente dell\'app: aggiornala e riprova.');
  if (!Array.isArray(x.camminate)) throw new Error('Il backup è danneggiato (mancano le camminate).');
  for (const w of x.camminate) {
    if (!num(w.started_at) || !Array.isArray(w.punti)) throw new Error('Il backup è danneggiato (una camminata non è leggibile).');
    for (const p of w.punti) if (!num(p.lat) || !num(p.lon) || !num(p.t)) throw new Error('Il backup è danneggiato (punti GPS non validi).');
  }
  return {
    formato: FORMATO, versione: x.versione, creato: String(x.creato ?? ''),
    camminate: x.camminate, percorsi: Array.isArray(x.percorsi) ? x.percorsi : [],
    preferenze: x.preferenze && typeof x.preferenze === 'object' ? x.preferenze : {},
  };
}

/** Riassunto leggibile per la conferma prima del ripristino. */
export function riassunto(b: Backup): string {
  const n = b.camminate.length, km = b.camminate.reduce((s, w) => s + (w.distance_m || 0), 0) / 1000;
  const data = b.creato ? new Date(b.creato).toLocaleDateString('it-IT', { dateStyle: 'long' }) : 'data sconosciuta';
  return `${n} ${n === 1 ? 'camminata' : 'camminate'} (${km.toFixed(1).replace('.', ',')} km in tutto), salvato il ${data}.`;
}
