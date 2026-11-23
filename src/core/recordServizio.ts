// Collega i record all'archivio: prestazioni mancanti (uscite registrate prima di questa funzione),
// record attuali, record battuti da un'uscita appena conclusa.
import { aggiorna, elencoCamminate, punti } from '../archivio';
import { movimentoDi } from './altimetria/servizio';
import { tempoMovimento } from './movimento';
import { calcolaPrestazioni, nuoviRecord, NuovoRecord, Prestazioni, tipoAutomatico, Uscita } from './record';
import type { Camminata } from './tipi';

export function leggiPrestazioni(w: Pick<Camminata, 'prestazioni'>): Prestazioni | null {
  try { const p = w.prestazioni ? JSON.parse(w.prestazioni) : null; return p && p.v === 1 ? p : null; } catch { return null; }
}

/** Tutte le uscite concluse con le loro prestazioni; quelle che non le hanno ancora vengono calcolate (una volta sola). */
export async function uscite(): Promise<Uscita[]> {
  const out: Uscita[] = [];
  for (const w of await elencoCamminate()) {
    let p = leggiPrestazioni(w);
    let tipo = w.tipo ?? null;
    if (!p) {
      const pts = await punti(w.id);
      p = calcolaPrestazioni(pts, { soste: movimentoDi(w, pts).soste, durataMs: tempoMovimento(w), salitaM: w.ascent_m, inizio: w.started_at });
      tipo = tipo ?? tipoAutomatico(p);
      await aggiorna(w.id, { prestazioni: JSON.stringify(p), tipo });
    }
    out.push({ id: w.id, started_at: w.started_at, tipo: tipo ?? tipoAutomatico(p), p });
  }
  return out;
}

/** Record battuti dall'uscita `id` (appena conclusa) rispetto a tutte le altre. */
export async function recordBattuti(id: number): Promise<NuovoRecord[]> {
  const tutte = await uscite();
  const u = tutte.find((x) => x.id === id);
  return u ? nuoviRecord(tutte, u) : [];
}
