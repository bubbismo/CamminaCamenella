// Ciclo di vita di una camminata: identico su Android e sul web.
import { aggiorna, camminata, eliminaCamminata, nuovaCamminata, punti } from '../archivio';
import { avviaTracciamento, fermaTracciamento } from '../tracking';
import { statistiche } from './geo';

export async function avvia(): Promise<number> {
  const id = await nuovaCamminata(Date.now());
  await avviaTracciamento(id);
  return id;
}

export async function pausa(id: number) {
  const w = await camminata(id);
  if (w?.status === 'recording') await aggiorna(id, { status: 'paused', paused_since: Date.now() });
}

export async function riprendi(id: number) {
  const w = await camminata(id);
  if (w?.status === 'paused' && w.paused_since != null) {
    await aggiorna(id, { status: 'recording', paused_total_ms: w.paused_total_ms + (Date.now() - w.paused_since), paused_since: null });
  }
}

/** Dopo che l'app è stata sospesa/chiusa (solo web): si riparte collegando con un tratto stimato. */
export async function riprendiDopoInterruzione(id: number) {
  await riprendi(id); // se era in pausa, chiude anche la pausa
  await avviaTracciamento(id, true);
}

export async function termina(id: number) {
  await fermaTracciamento();
  const now = Date.now();
  const w = await camminata(id);
  if (!w) return;
  const pausato = w.paused_total_ms + (w.paused_since != null ? now - w.paused_since : 0);
  const s = statistiche(await punti(id));
  await aggiorna(id, {
    status: 'done', ended_at: now, paused_since: null, paused_total_ms: pausato,
    active_ms: now - w.started_at - pausato,
    distance_m: s.distanzaM, ascent_m: s.salitaM, descent_m: s.discesaM,
  });
}

export async function scarta(id: number) {
  await fermaTracciamento();
  await eliminaCamminata(id);
}
