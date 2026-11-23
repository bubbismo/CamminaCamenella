// Parziali per km: per ogni chilometro, il tempo in movimento (senza soste e pause) e il dislivello.
// Funzione pura, identica su web e Android: si ricalcola sempre dai punti GPS salvati.
import { distanza } from './geo';
import { Intervallo, sovrapposizione } from './movimento';
import type { Punto } from './tipi';

export type Parziale = {
  n: number;            // 1, 2, 3…
  daM: number; aM: number;
  metri: number;        // 1000, tranne l'ultimo (parziale)
  ms: number;           // tempo in movimento
  passoSKm: number;     // secondi al km (per l'ultimo: passo equivalente)
  salita: number; discesa: number;
  completo: boolean;
};

const MIN_ULTIMO_M = 50; // un ultimo pezzetto più corto non ha un passo significativo

/** Quota alla distanza d (interpolata) lungo la curva altimetrica. */
function quotaA(d: number, dist: number[], quote: number[]): number {
  if (!dist.length) return 0;
  if (d <= dist[0]) return quote[0];
  let lo = 0, hi = dist.length - 1;
  if (d >= dist[hi]) return quote[hi];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (dist[m] <= d) lo = m; else hi = m; }
  const f = (d - dist[lo]) / (dist[hi] - dist[lo] || 1);
  return quote[lo] + (quote[hi] - quote[lo]) * f;
}

/** Salita e discesa tra due distanze lungo la curva altimetrica (già filtrata). */
function dislivello(da: number, a: number, dist: number[], quote: number[]) {
  const xs = [da, ...dist.filter((d) => d > da && d < a), a];
  let salita = 0, discesa = 0, prev = quotaA(da, dist, quote);
  for (let i = 1; i < xs.length; i++) {
    const q = quotaA(xs[i], dist, quote), dz = q - prev;
    if (dz > 0) salita += dz; else discesa -= dz;
    prev = q;
  }
  return { salita, discesa };
}

export function calcolaParziali(pts: Punto[], o: {
  soste?: Intervallo[];
  /** curva altimetrica: distanze (m) e quote corrispondenti (es. campioni e quote di calcolaAltimetria) */
  profilo?: { d: number[]; quote: number[] };
  passoM?: number;
  /** Start: il primo punto GPS può avere un orario di qualche secondo prima (posizione già nota) */
  inizio?: number;
} = {}): Parziale[] {
  const passo = o.passoM ?? 1000;
  const soste = o.soste ?? [];
  if (pts.length < 2) return [];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distanza(pts[i - 1], pts[i]));
  const tot = cum[cum.length - 1];

  // istante in cui si passa la distanza d (interpolato tra i due punti a cavallo)
  let j = 0;
  const istante = (d: number) => {
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const seg = cum[j + 1] - cum[j];
    const f = seg > 0 ? Math.min(1, Math.max(0, (d - cum[j]) / seg)) : 0;
    return pts[j].t + (pts[j + 1].t - pts[j].t) * f;
  };

  const out: Parziale[] = [];
  let da = 0, tDa = Math.max(pts[0].t, o.inizio ?? -Infinity);
  for (let n = 1; da < tot; n++) {
    const a = Math.min(n * passo, tot);
    const metri = a - da;
    const completo = a === n * passo;
    if (!completo && metri < MIN_ULTIMO_M) break;
    const tA = Math.max(istante(a), tDa);
    const ms = Math.max(0, tA - tDa - sovrapposizione(tDa, tA, soste));
    const dz = o.profilo && o.profilo.d.length > 1 ? dislivello(da, a, o.profilo.d, o.profilo.quote) : { salita: 0, discesa: 0 };
    out.push({ n, daM: da, aM: a, metri, ms, passoSKm: metri > 0 ? (ms / 1000) / (metri / 1000) : 0, ...dz, completo });
    da = a; tDa = tA;
  }
  return out;
}

/** Il più veloce e il più lento tra i km completi (servono almeno 2 km). */
export function estremi(p: Parziale[]): { veloce: number | null; lento: number | null } {
  const c = p.filter((x) => x.completo && x.ms > 0);
  if (c.length < 2) return { veloce: null, lento: null };
  const ord = [...c].sort((x, y) => x.passoSKm - y.passoSKm);
  return { veloce: ord[0].n, lento: ord[ord.length - 1].n };
}

/** Passo in "m:ss" da secondi al km. */
export function formatPassoS(sKm: number): string {
  if (!(sKm > 0) || sKm > 99 * 60) return '--:--';
  let m = Math.floor(sKm / 60), s = Math.round(sKm - m * 60);
  if (s === 60) { m++; s = 0; }
  return `${m}:${String(s).padStart(2, '0')}`;
}
