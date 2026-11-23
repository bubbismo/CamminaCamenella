import { distanza } from '../geo';
import type { Punto } from '../tipi';

/** Un punto della traccia ricampionata a passo fisso lungo il percorso. */
export type Campione = {
  d: number;            // distanza dall'inizio (m)
  t: number;            // istante (ms) interpolato lungo la traccia
  lat: number; lon: number;
  z: number | null;     // quota GPS grezza media dei punti vicini (null se nessuna misura utile)
  r: number;            // varianza (m²) della misura GPS
};

export const PASSO_M = 25;
const ACC_QUOTA_DEFAULT = 15;   // errore verticale tipico se il telefono non lo dichiara
const ACC_QUOTA_MAX = 50;       // oltre, il punto è troppo incerto e si scarta
const ACC_ORIZZ_SCARSA = 25;    // GPS orizzontale scarso → anche la quota è meno affidabile

export function varianzaPunto(p: Punto): number | null {
  if (p.alt == null || !Number.isFinite(p.alt)) return null;
  const sigma = p.alt_acc != null && p.alt_acc > 0 ? p.alt_acc : ACC_QUOTA_DEFAULT;
  if (sigma > ACC_QUOTA_MAX) return null;
  let v = Math.max(sigma, 3) ** 2;
  if (p.acc != null && p.acc > ACC_ORIZZ_SCARSA) v *= 2;
  return v;
}

/** Ricampiona la traccia ogni `passo` metri. Le misure GPS vicine si mediano pesandole per precisione. */
export function campiona(pts: Punto[], passo = PASSO_M): Campione[] {
  const n = pts.length;
  if (n === 0) return [];
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + distanza(pts[i - 1], pts[i]));
  const tot = cum[n - 1];

  const posizioni: number[] = [];
  for (let s = 0; s <= tot; s += passo) posizioni.push(s);
  if (tot - posizioni[posizioni.length - 1] > passo * 0.4) posizioni.push(tot);

  const out: Campione[] = [];
  let j = 0;          // per interpolare la posizione
  let lo = 0, hi = 0; // finestra di punti entro mezzo passo
  for (const s of posizioni) {
    while (j < n - 2 && cum[j + 1] < s) j++;
    const seg = n > 1 ? cum[j + 1] - cum[j] : 0;
    const f = seg > 0 ? Math.min(1, Math.max(0, (s - cum[j]) / seg)) : 0;
    const a = pts[j], b = pts[Math.min(j + 1, n - 1)];
    const lat = a.lat + (b.lat - a.lat) * f, lon = a.lon + (b.lon - a.lon) * f, t = a.t + (b.t - a.t) * f;

    while (lo < n && cum[lo] < s - passo / 2) lo++;
    while (hi < n && cum[hi] <= s + passo / 2) hi++;
    let sw = 0, swz = 0, sv = 0, k = 0;
    for (let i = lo; i < hi; i++) {
      const v = varianzaPunto(pts[i]);
      if (v == null) continue;
      sw += 1 / v; swz += pts[i].alt! / v; sv += v; k++;
    }
    // Gli errori GPS di punti vicini sono correlati: non si "guadagna" più di 3 misure indipendenti.
    out.push({ d: s, t, lat, lon, z: k ? swz / sw : null, r: k ? sv / k / Math.min(k, 3) : 1e6 });
  }
  return out;
}
