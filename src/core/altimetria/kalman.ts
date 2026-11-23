// Filtro di Kalman a 2 stati (quota e pendenza) con smoothing all'indietro (Rauch-Tung-Striebel).
// Lavora sulla distanza (un passo = un campione), non sul tempo: da fermi non "inventa" dislivello.

export type OpzioniKalman = {
  qQuota?: number;      // varianza del rumore di processo sulla quota per passo (m²)
  qPendenza?: number;   // varianza del cambio di pendenza per passo ((m/passo)²)
  rDem?: number;        // varianza della misura DEM (m²)
};

function mediana(v: number[]): number {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type RisultatoFusione = { h: number[]; offsetGpsDem: number | null };

/**
 * Fonde le misure GPS (z, varianza r) e, se presenti, quelle del DEM, restituendo la quota liscia.
 * Il GPS dei telefoni può essere riferito all'ellissoide (fino a ~50 m di scarto dal livello del mare):
 * se c'è il DEM si stima e si toglie lo scarto costante (mediana), così GPS e DEM sono confrontabili.
 */
export function fondi(
  z: (number | null)[], r: number[], dem?: (number | null)[], o: OpzioniKalman = {},
): RisultatoFusione {
  const n = z.length;
  if (n === 0) return { h: [], offsetGpsDem: null };
  const qh = o.qQuota ?? 0.05, qs = o.qPendenza ?? 0.5, rDem = o.rDem ?? 25;

  let offset: number | null = null;
  let zz = z;
  if (dem) {
    const diff: number[] = [];
    for (let i = 0; i < n; i++) if (z[i] != null && dem[i] != null) diff.push(z[i]! - dem[i]!);
    if (diff.length >= 3) { offset = mediana(diff); zz = z.map((v) => (v == null ? null : v - offset!)); }
  }

  const prima = (i: number) => (zz[i] ?? dem?.[i] ?? null);
  let i0 = 0; while (i0 < n && prima(i0) == null) i0++;
  if (i0 === n) return { h: new Array(n).fill(0), offsetGpsDem: offset };

  // stato [h, s], covarianza [[a,b],[b,c]]
  let h = prima(i0)!, s = 0, a = 400, b = 0, c = 4;
  const xf: [number, number][] = [], Pf: [number, number, number][] = [];
  const xp: [number, number][] = [], Pp: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) { // predizione: h += s
      const nh = h + s;
      const na = a + 2 * b + c + qh, nb = b + c, nc = c + qs;
      h = nh; a = na; b = nb; c = nc;
    }
    xp.push([h, s]); Pp.push([a, b, c]);
    const misure: [number, number][] = [];
    if (zz[i] != null) misure.push([zz[i]!, r[i]]);
    if (dem?.[i] != null) misure.push([dem[i]!, rDem]);
    for (const [m, R] of misure) {
      const S = a + R, k0 = a / S, k1 = b / S, innov = m - h;
      h += k0 * innov; s += k1 * innov;
      const na = a - k0 * a, nb = b - k0 * b, nc = c - k1 * b;
      a = na; b = nb; c = nc;
    }
    xf.push([h, s]); Pf.push([a, b, c]);
  }

  // smoothing all'indietro
  const hs = new Array<number>(n);
  let xs: [number, number] = xf[n - 1];
  hs[n - 1] = xs[0];
  for (let i = n - 2; i >= 0; i--) {
    const [fa, fb, fc] = Pf[i];
    const [pa, pb, pc] = Pp[i + 1];
    const det = pa * pc - pb * pb;
    if (Math.abs(det) < 1e-12) { xs = xf[i]; hs[i] = xs[0]; continue; }
    const ia = pc / det, ib = -pb / det, ic = pa / det;     // inversa di Pp[i+1]
    // C = Pf F' Pp^-1,   F' = [[1,0],[1,1]]
    const m00 = fa + fb, m01 = fb + fc, m10 = fb, m11 = fc;  // Pf * F'
    const c00 = m00 * ia + m01 * ib, c01 = m00 * ib + m01 * ic;
    const c10 = m10 * ia + m11 * ib, c11 = m10 * ib + m11 * ic;
    const d0 = xs[0] - xp[i + 1][0], d1 = xs[1] - xp[i + 1][1];
    xs = [xf[i][0] + c00 * d0 + c01 * d1, xf[i][1] + c10 * d0 + c11 * d1];
    hs[i] = xs[0];
  }
  // Rimette il livello del DEM (la quota assoluta) senza scarto: h è già nel riferimento del DEM.
  return { h: hs, offsetGpsDem: offset };
}
