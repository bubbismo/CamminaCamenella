// Riconosce i percorsi ripetuti e mantiene un profilo altimetrico medio per ciascuno.
import { distanza } from '../geo';
import type { Campione } from './campiona';

export type Percorso = {
  id: number | null;
  celle: string[];                 // celle da ~25 m attraversate (con ripetizioni lungo la traccia)
  inizio: [number, number]; fine: [number, number];
  lunghezza_m: number;
  n: number;                       // quante uscite hanno contribuito
  quote: number[];                 // profilo medio, un valore ogni PASSO_M
};

const SOGLIA_SOMIGLIANZA = 0.7;
const DISTANZA_ESTREMI_M = 150;
const RAPPORTO_LUNGHEZZA = [0.8, 1.25];
const LUNGHEZZA_MIN_M = 300;

const chiave = (lat: number, lon: number) => {
  const c = Math.cos(Math.round(lat) * Math.PI / 180);
  return `${Math.round(lat / (25 / 111320))},${Math.round(lon / (25 / (111320 * c)))}`;
};
const vicine = (k: string): string[] => {
  const [a, b] = k.split(',').map(Number), out: string[] = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push(`${a + i},${b + j}`);
  return out;
};

export function celleDi(c: Campione[]): string[] { return c.map((p) => chiave(p.lat, p.lon)); }

function copertura(da: string[], verso: string[]): number {
  if (!da.length) return 0;
  const set = new Set(verso);
  let ok = 0;
  for (const k of da) if (vicine(k).some((v) => set.has(v))) ok++;
  return ok / da.length;
}

export type Corrispondenza = { percorso: Percorso; invertito: boolean; somiglianza: number };

export function trovaPercorso(c: Campione[], lunghezza: number, esistenti: Percorso[]): Corrispondenza | null {
  if (c.length < 3 || lunghezza < LUNGHEZZA_MIN_M) return null;
  const celle = celleDi(c);
  const ini = { lat: c[0].lat, lon: c[0].lon }, fin = { lat: c[c.length - 1].lat, lon: c[c.length - 1].lon };
  let migliore: Corrispondenza | null = null;
  for (const p of esistenti) {
    const rap = lunghezza / p.lunghezza_m;
    if (rap < RAPPORTO_LUNGHEZZA[0] || rap > RAPPORTO_LUNGHEZZA[1]) continue;
    const dritto = distanza(ini, { lat: p.inizio[0], lon: p.inizio[1] }) <= DISTANZA_ESTREMI_M
      && distanza(fin, { lat: p.fine[0], lon: p.fine[1] }) <= DISTANZA_ESTREMI_M;
    const inverso = distanza(ini, { lat: p.fine[0], lon: p.fine[1] }) <= DISTANZA_ESTREMI_M
      && distanza(fin, { lat: p.inizio[0], lon: p.inizio[1] }) <= DISTANZA_ESTREMI_M;
    if (!dritto && !inverso) continue;
    const sim = Math.min(copertura(celle, p.celle), copertura(p.celle, celle));
    if (sim >= SOGLIA_SOMIGLIANZA && (!migliore || sim > migliore.somiglianza)) {
      migliore = { percorso: p, invertito: !dritto, somiglianza: sim };
    }
  }
  return migliore;
}

/** Porta una serie a `n` punti (interpolazione lineare), eventualmente rovesciandola. */
export function adattaSerie(q: number[], n: number, rovescia = false): number[] {
  const src = rovescia ? [...q].reverse() : q;
  if (src.length === n) return src;
  if (src.length < 2) return new Array(n).fill(src[0] ?? 0);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / Math.max(1, n - 1)) * (src.length - 1);
    const a = Math.floor(t), b = Math.min(src.length - 1, a + 1);
    return src[a] + (src[b] - src[a]) * (t - a);
  });
}

const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / (v.length || 1);

/** Allinea il livello medio di `serie` a quello di `rif` (le quote assolute possono avere riferimenti diversi). */
function allinea(serie: number[], rif: number[]): number[] {
  const d = media(rif) - media(serie);
  return serie.map((v) => v + d);
}

/** Stabilizza la quota di questa uscita con il profilo medio: più uscite ha alle spalle, più pesa. */
export function fondiConProfilo(h: number[], c: Corrispondenza): number[] {
  const prof = allinea(adattaSerie(c.percorso.quote, h.length, c.invertito), h);
  const w = Math.min(c.percorso.n, 4);
  return h.map((v, i) => (w * prof[i] + v) / (w + 1));
}

export function aggiornaProfilo(p: Percorso, h: number[], invertito: boolean, lunghezza: number): Percorso {
  const nuova = allinea(adattaSerie(h, p.quote.length, invertito), p.quote);
  return {
    ...p, n: p.n + 1,
    lunghezza_m: (p.lunghezza_m * p.n + lunghezza) / (p.n + 1),
    quote: p.quote.map((v, i) => (v * p.n + nuova[i]) / (p.n + 1)),
  };
}

export function nuovoPercorso(c: Campione[], h: number[], lunghezza: number): Percorso {
  return {
    id: null, celle: celleDi(c),
    inizio: [c[0].lat, c[0].lon], fine: [c[c.length - 1].lat, c[c.length - 1].lon],
    lunghezza_m: lunghezza, n: 1, quote: [...h],
  };
}
