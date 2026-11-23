import type { Punto } from './tipi';

export function distanza(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Un punto GPS viene scartato se impreciso, troppo vicino (rumore da fermo) o con salto irrealistico.
export const MAX_IMPRECISIONE_M = 30;
export const MIN_SPOSTAMENTO_M = 3;
export const MAX_VELOCITA_MS = 12; // ~43 km/h: oltre non è camminata/corsa

export function puntoValido(prec: Punto | null, nuovo: Punto): boolean {
  if (nuovo.acc != null && nuovo.acc > MAX_IMPRECISIONE_M) return false;
  if (!prec) return true;
  const dt = (nuovo.t - prec.t) / 1000;
  if (dt <= 0) return false;
  const d = distanza(prec, nuovo);
  if (d < MIN_SPOSTAMENTO_M) return false;
  if (d / dt > MAX_VELOCITA_MS) return false;
  return true;
}

/** Distanza totale lungo i punti validi. Il dislivello si calcola in core/altimetria. */
export function statistiche(pts: Punto[]) {
  let distanzaM = 0;
  for (let i = 1; i < pts.length; i++) distanzaM += distanza(pts[i - 1], pts[i]);
  return { distanzaM };
}

export function formatDurata(ms: number): string {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

export function formatDistanza(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2).replace('.', ',')} km`;
}

// Passo in min/km
export function formatPasso(distanzaM: number, ms: number): string {
  if (distanzaM < 20 || ms <= 0) return '--:--';
  const minKm = ms / 60000 / (distanzaM / 1000);
  if (minKm > 99) return '--:--';
  const mm = Math.floor(minKm), ss = Math.round((minKm - mm) * 60);
  return `${mm}:${String(ss === 60 ? 59 : ss).padStart(2, '0')}`;
}

// Distanza coperta dai soli tratti "stimati" (senza GPS, dopo un'interruzione).
export function distanzaStimata(pts: Punto[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].gap) d += distanza(pts[i - 1], pts[i]);
  return d;
}
