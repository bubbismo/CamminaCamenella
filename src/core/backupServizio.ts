// Crea e ripristina i backup usando l'archivio della piattaforma (IndexedDB sul web, SQLite su Android).
import { camminata as leggiCamminata, elencoCamminate, elencoPercorsi, importaCamminata, punti, salvaPercorso } from '../archivio';
import { leggiPref, scriviPref } from '../preferenze';
import { distanza } from './geo';
import { Backup, FORMATO, PREF_BACKUP, VERSIONE } from './backup';
import type { Percorso } from './altimetria/percorsi';

export async function creaBackup(): Promise<Backup> {
  const camminate = [];
  for (const w of await elencoCamminate()) camminate.push({ ...w, punti: await punti(w.id) });
  const preferenze: Record<string, string> = {};
  for (const k of PREF_BACKUP) { const v = leggiPref(k, ''); if (v !== '') preferenze[k] = v; }
  return { formato: FORMATO, versione: VERSIONE, creato: new Date().toISOString(), camminate, percorsi: await elencoPercorsi(), preferenze };
}

const stessoPercorso = (a: Percorso, b: Percorso) =>
  Math.abs(a.lunghezza_m - b.lunghezza_m) < 1 && distanza({ lat: a.inizio[0], lon: a.inizio[1] }, { lat: b.inizio[0], lon: b.inizio[1] }) < 1;

/**
 * Aggiunge al telefono le camminate del backup che non ci sono già (riconosciute dall'ora di partenza).
 * Non cancella nulla di ciò che c'è. Le preferenze del backup sostituiscono quelle attuali.
 */
export async function ripristinaBackup(b: Backup): Promise<{ aggiunte: number; gia: number }> {
  // percorsi ripetuti: si riusano quelli già presenti, si aggiungono gli altri, e si ricorda la corrispondenza degli id
  const esistenti = await elencoPercorsi();
  const mappa = new Map<number, number>();
  for (const p of b.percorsi) {
    const uguale = esistenti.find((e) => stessoPercorso(e, p));
    const nuovoId = uguale?.id ?? await salvaPercorso({ ...p, id: null });
    if (p.id != null && nuovoId != null) mappa.set(p.id, nuovoId);
  }
  const giaPresenti = new Set((await elencoCamminate()).map((w) => w.started_at));
  let aggiunte = 0, gia = 0;
  for (const w of b.camminate) {
    if (giaPresenti.has(w.started_at)) { gia++; continue; }
    const { id: _vecchio, punti: pts, ...dati } = w;
    let altimetria = dati.altimetria ?? null;
    try {
      if (altimetria) {
        const info = JSON.parse(altimetria);
        if (info.in_profilo != null) info.in_profilo = mappa.get(info.in_profilo) ?? undefined;
        altimetria = JSON.stringify(info);
      }
    } catch { altimetria = null; }
    await importaCamminata({ ...dati, status: 'done', altimetria }, pts);
    aggiunte++;
  }
  for (const [k, v] of Object.entries(b.preferenze)) if (PREF_BACKUP.includes(k) && typeof v === 'string') scriviPref(k, v);
  return { aggiunte, gia };
}

export function segnaBackupFatto() { scriviPref('ultimo_backup', String(Date.now())); }
export function giorniDallUltimoBackup(): number | null {
  const t = Number(leggiPref('ultimo_backup', ''));
  return t > 0 ? Math.floor((Date.now() - t) / 86400000) : null;
}
// (camminata è riesportata per comodità di chi importa questo modulo)
export { leggiCamminata };
