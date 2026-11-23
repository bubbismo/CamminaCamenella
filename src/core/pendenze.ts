// Profilo altimetrico per pendenza: ogni tratto del percorso viene classificato (discesa, pianeggiante,
// salita leggera, impegnativa, ripida). Funzione pura: usa la curva di quota già corretta dell'altimetria.

export type Classe = 'discesa' | 'piano' | 'leggera' | 'impegnativa' | 'ripida';
/** soglie di salita in %: [leggera da, impegnativa da, ripida da] */
export type Soglie = [number, number, number];

export const SOGLIE_PREDEFINITE: Soglie = [3, 8, 15];
export const PRESET_SOGLIE: { v: string; t: string; d: string }[] = [
  { v: '3,8,15', t: 'Escursionismo', d: 'leggera dal 3%, impegnativa dall\'8%, ripida dal 15%' },
  { v: '2,5,10', t: 'Strada e corsa', d: 'leggera dal 2%, impegnativa dal 5%, ripida dal 10%' },
  { v: '5,12,20', t: 'Montagna', d: 'leggera dal 5%, impegnativa dal 12%, ripida dal 20%' },
];

export const CLASSI: { c: Classe; nome: string; colore: string }[] = [
  { c: 'discesa', nome: 'Discesa', colore: '#2F6FD6' },
  { c: 'piano', nome: 'Pianeggiante', colore: '#2E9E55' },
  { c: 'leggera', nome: 'Salita leggera', colore: '#D8A300' },
  { c: 'impegnativa', nome: 'Salita impegnativa', colore: '#E8590C' },
  { c: 'ripida', nome: 'Salita ripida', colore: '#B3121B' },
];
export const coloreDi = (c: Classe) => CLASSI.find((x) => x.c === c)!.colore;

export function leggiSoglie(testo: string | null | undefined): Soglie {
  const n = (testo ?? '').split(',').map((x) => parseFloat(x));
  if (n.length === 3 && n.every((x) => Number.isFinite(x) && x > 0 && x < 100) && n[0] < n[1] && n[1] < n[2]) return n as Soglie;
  return SOGLIE_PREDEFINITE;
}

/**
 * Pendenza (%) in ogni punto della curva, misurata su una finestra di ±`mezzaFinestraM` metri:
 * su 25 m il residuo di rumore della quota darebbe pendenze "ballerine".
 */
export function pendenze(d: number[], z: number[], mezzaFinestraM = 50): number[] {
  const n = d.length, out: number[] = [];
  let a = 0, b = 0;
  for (let i = 0; i < n; i++) {
    while (a < i && d[a] < d[i] - mezzaFinestraM) a++;
    if (b < i) b = i;
    while (b < n - 1 && d[b] < d[i] + mezzaFinestraM) b++;
    const dd = d[b] - d[a];
    out.push(dd > 0 ? ((z[b] - z[a]) / dd) * 100 : 0);
  }
  return out;
}

export function classifica(p: number, s: Soglie): Classe {
  if (p <= -s[0]) return 'discesa';
  if (p < s[0]) return 'piano';
  if (p < s[1]) return 'leggera';
  if (p < s[2]) return 'impegnativa';
  return 'ripida';
}

export type Tratto = { da: number; a: number; classe: Classe; i0: number; i1: number };

/** Tratti consecutivi della stessa classe (indici i0..i1 sulla curva). Pendenza di un segmento = media dei suoi estremi. */
export function trattiPendenza(d: number[], z: number[], s: Soglie = SOGLIE_PREDEFINITE): Tratto[] {
  if (d.length < 2) return [];
  const p = pendenze(d, z);
  const out: Tratto[] = [];
  for (let i = 1; i < d.length; i++) {
    const classe = classifica((p[i - 1] + p[i]) / 2, s);
    const u = out[out.length - 1];
    if (u && u.classe === classe) { u.a = d[i]; u.i1 = i; } else out.push({ da: d[i - 1], a: d[i], classe, i0: i - 1, i1: i });
  }
  return out;
}

/** Metri per classe, e pendenza massima in salita e in discesa. */
export function riepilogoPendenze(d: number[], z: number[], s: Soglie = SOGLIE_PREDEFINITE) {
  const metri: Record<Classe, number> = { discesa: 0, piano: 0, leggera: 0, impegnativa: 0, ripida: 0 };
  for (const t of trattiPendenza(d, z, s)) metri[t.classe] += t.a - t.da;
  const p = pendenze(d, z);
  return { metri, maxSalita: p.length ? Math.max(0, ...p) : 0, maxDiscesa: p.length ? Math.min(0, ...p) : 0 };
}
