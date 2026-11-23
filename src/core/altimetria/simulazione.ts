import type { Punto } from '../tipi';
import { campiona } from './campiona';

// --- generatore pseudo-casuale riproducibile ---
export function rng(seed: number) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const g = () => Math.sqrt(-2 * Math.log(u() || 1e-9)) * Math.cos(2 * Math.PI * u());
  return { u, g };
}

/** Traccia a passo ~5 m verso nord con rumore GPS verticale correlato nel tempo (AR(1)). */
export function traccia(opz: {
  km: number; quota: (d: number) => number; sigma?: number; rho?: number; seed?: number;
  lat0?: number; lon0?: number; offset?: number; deviazione?: (d: number) => number;
}): Punto[] {
  const { km, quota, sigma = 10, rho = 0.95, seed = 1, lat0 = 46.0, lon0 = 11.1, offset = 0 } = opz;
  const R = rng(seed), pts: Punto[] = [];
  let e = 0;
  for (let d = 0, t = 0; d <= km * 1000; d += 5, t += 4000) {
    e = rho * e + Math.sqrt(1 - rho * rho) * sigma * R.g();
    pts.push({
      t, lat: lat0 + d / 111320, lon: lon0 + (opz.deviazione?.(d) ?? 0) / 80000,
      alt: quota(d) + offset + e, alt_acc: sigma * 1.2, acc: 8, speed: 1.2,
    });
  }
  return pts;
}

export const rampa = (d: number) => 600 + 0.1 * d;                       // +300 m in 3 km
export const piatto = () => 600;
export const saliscendi = (d: number) => 600 + 100 * Math.sin(d / 400);   // oscillazioni reali: 200 m ogni ~2,5 km

export function demDa(pts: Punto[], quota: (d: number) => number, sigma: number, seed = 7) {
  const R = rng(seed);
  return campiona(pts).map((c) => quota(c.d) + sigma * R.g());
}

