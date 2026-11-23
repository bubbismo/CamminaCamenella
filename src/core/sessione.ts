// Ciclo di vita di una camminata: identico su Android e sul web.
import { aggiorna, camminata, camminateAperte, eliminaCamminata, nuovaCamminata, punti } from '../archivio';
import { avviaTracciamento, fermaTracciamento } from '../tracking';
import { statistiche } from './geo';
import { elaboraCamminata } from './altimetria/servizio';
import { pauseManuali } from './movimento';

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
    const ora = Date.now();
    await aggiorna(id, {
      status: 'recording', paused_total_ms: w.paused_total_ms + (ora - w.paused_since), paused_since: null,
      pause_manuali: JSON.stringify(pauseManuali(w, ora)),
    });
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
    pause_manuali: JSON.stringify(pauseManuali(w, now)),
    active_ms: now - w.started_at - pausato,
    distance_m: s.distanzaM,
  });
  // Dislivello, tempo in movimento e calorie: filtro locale subito, correzione col terreno (se attiva) in secondo piano.
  await elaboraCamminata(id, { saltaRete: true });
  elaboraCamminata(id).catch(() => {});
}

export async function scarta(id: number) {
  await fermaTracciamento();
  await eliminaCamminata(id);
}

/** Elimina le corse rimaste aperte senza dati (es. Start premuto più volte): non c'è nulla da riprendere. */
export async function pulisciVuote() {
  for (const w of await camminateAperte()) {
    if ((await punti(w.id)).length < 2) await eliminaCamminata(w.id);
  }
}
