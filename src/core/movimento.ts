// Pausa automatica: dai punti GPS già filtrati si ricava quando si era in movimento e quando fermi.
// Funzione pura, identica su web e Android: si può sempre ricalcolare dai dati grezzi.
//
// Idea: da fermi il GPS smette di salvare punti (gli spostamenti sotto 3 m vengono scartati), quindi un
// lungo intervallo tra due punti con poca strada percorsa è una sosta. Contro il "ballo" del GPS da fermo
// si confronta la posizione media dei punti nei 15 s prima e nei 15 s dopo. Isteresi: una sosta conta solo se
// dura almeno 10 s, una ripresa solo se dura almeno 5 s (niente sfarfallii vicino alla soglia).
import { distanza } from './geo';
import type { Punto } from './tipi';

export type Intervallo = [number, number]; // [inizio, fine] in ms

export const SOGLIA_KMH_PREDEFINITA = 1.5;
export const SOGLIE_KMH = [1, 1.5, 3] as const;

export type OpzioniMovimento = {
  /** false = pausa automatica spenta: si escludono solo le pause manuali */
  attiva?: boolean;
  sogliaKmh?: number;
  confermaFermoS?: number;
  confermaMotoS?: number;
  finestraS?: number;
  /** inizio della corsa (Start): il tempo prima del primo punto GPS non è movimento */
  inizio?: number;
  /** fine (Stop, o "adesso" durante la corsa): il tempo dopo l'ultimo punto è sosta */
  fine?: number;
  /** pause manuali (Pausa/Riprendi) */
  manuali?: Intervallo[];
};

export type Movimento = {
  movimentoMs: number;
  /** intervalli NON in movimento (soste automatiche + pause manuali), ordinati e senza sovrapposizioni */
  soste: Intervallo[];
  /** durante la corsa: true se in questo momento si è in sosta automatica (confermata) */
  fermoOra: boolean;
};

type Tratto = { a: number; b: number; tipo: 'moto' | 'fermo' | 'manuale' };

/** Toglie da [a,b] le parti che cadono dentro le pause manuali. */
function spezza(a: number, b: number, manuali: Intervallo[], tipo: 'moto' | 'fermo', out: Tratto[]) {
  let cur = a;
  for (const [ma, mb] of manuali) {
    if (mb <= cur || ma >= b) continue;
    if (ma > cur) out.push({ a: cur, b: ma, tipo });
    out.push({ a: Math.max(ma, cur), b: Math.min(mb, b), tipo: 'manuale' });
    cur = Math.min(mb, b);
  }
  if (cur < b) out.push({ a: cur, b, tipo });
}

export function calcolaMovimento(pts: Punto[], o: OpzioniMovimento = {}): Movimento {
  const attiva = o.attiva ?? true;
  const soglia = (o.sogliaKmh ?? SOGLIA_KMH_PREDEFINITA) / 3.6; // m/s
  const confFermo = (o.confermaFermoS ?? 10) * 1000;
  const confMoto = (o.confermaMotoS ?? 5) * 1000;
  const finestra = (o.finestraS ?? 30) * 1000;
  const manuali = [...(o.manuali ?? [])].filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);

  const inizio = o.inizio ?? (pts.length ? pts[0].t : 0);
  const fine = Math.max(o.fine ?? (pts.length ? pts[pts.length - 1].t : inizio), inizio);

  // 1. tratti grezzi
  const grezzi: Tratto[] = [];
  const primo = pts.length ? Math.max(inizio, Math.min(pts[0].t, fine)) : fine;
  spezza(inizio, primo, manuali, attiva ? 'fermo' : 'moto', grezzi);
  // somme progressive per le medie di posizione e tempo
  const n = pts.length, sLat = [0], sLon = [0], sT = [0];
  for (const p of pts) { sLat.push(sLat[sLat.length - 1] + p.lat); sLon.push(sLon[sLon.length - 1] + p.lon); sT.push(sT[sT.length - 1] + p.t); }
  const media = (da: number, a: number) => { // punti [da, a)
    const k = a - da;
    return { lat: (sLat[a] - sLat[da]) / k, lon: (sLon[a] - sLon[da]) / k, t: (sT[a] - sT[da]) / k };
  };
  let ja = 0, jb = 1;
  for (let i = 1; i < n; i++) {
    const a = Math.max(pts[i - 1].t, inizio), b = Math.min(pts[i].t, fine);
    if (b <= a) continue;
    let tipo: 'moto' | 'fermo' = 'moto';
    if (attiva) {
      // Posizione media dei punti nei ~15 s prima del tratto contro quella dei ~15 s dopo:
      // il rumore del GPS da fermo si attenua nella media, il movimento vero resta.
      const m = (pts[i - 1].t + pts[i].t) / 2;
      while (ja < i - 1 && pts[ja].t < m - finestra / 2) ja++;
      if (jb < i + 1) jb = i + 1;
      while (jb < n && pts[jb].t <= m + finestra / 2) jb++;
      const A = media(ja, i), B = media(i, jb);
      const dt = (B.t - A.t) / 1000;
      const v = dt > 0 ? distanza(A, B) / dt : 0;
      // Velocità misurata dal GPS (effetto Doppler, quando il telefono la fornisce): da fermi è quasi zero
      // anche se la posizione "deriva". Serve solo a confermare una sosta, mai a inventare movimento.
      const vg: number[] = [];
      for (let k = ja; k < jb; k++) { const sp = pts[k].speed; if (sp != null && sp >= 0 && Number.isFinite(sp)) vg.push(sp); }
      vg.sort((x, y) => x - y);
      const vDoppler = vg.length >= 3 ? vg[vg.length >> 1] : null;
      const fermoDoppler = vDoppler != null && vDoppler < soglia && v < 3 * soglia;
      tipo = v >= soglia && !fermoDoppler ? 'moto' : 'fermo';
    }
    spezza(a, b, manuali, tipo, grezzi);
  }
  const ultimo = pts.length ? Math.max(pts[pts.length - 1].t, primo) : fine;
  if (fine > ultimo) spezza(ultimo, fine, manuali, attiva ? 'fermo' : 'moto', grezzi);

  // 2. raggruppa in sequenze dello stesso tipo
  const seq = (tt: Tratto[]) => {
    const r: Tratto[] = [];
    for (const t of tt) {
      const u = r[r.length - 1];
      if (u && u.tipo === t.tipo && u.b === t.a) u.b = t.b; else r.push({ ...t });
    }
    return r;
  };
  let s = seq(grezzi);

  // 3. isteresi: soste troppo brevi = movimento; poi riprese troppo brevi = sosta.
  //    L'ultima sosta (ancora in corso) non viene "confermata" finché non supera la soglia.
  s = seq(s.map((t) => (t.tipo === 'fermo' && t.b - t.a < confFermo ? { ...t, tipo: 'moto' as const } : t)));
  s = seq(s.map((t, k) => {
    if (t.tipo !== 'moto' || t.b - t.a >= confMoto) return t;
    const prima = s[k - 1]?.tipo, dopo = s[k + 1]?.tipo;
    // una breve ripresa tra due soste (o in coda, dopo una sosta) è ancora sosta
    return prima === 'fermo' && (dopo === 'fermo' || dopo == null || dopo === 'manuale') ? { ...t, tipo: 'fermo' as const } : t;
  }));

  let movimentoMs = 0;
  const soste: Intervallo[] = [];
  for (const t of s) {
    if (t.tipo === 'moto') { movimentoMs += t.b - t.a; continue; }
    const u = soste[soste.length - 1];
    if (u && u[1] === t.a) u[1] = t.b; else soste.push([t.a, t.b]);
  }
  const coda = s[s.length - 1];
  return { movimentoMs, soste, fermoOra: !!coda && coda.tipo === 'fermo' };
}

/** Millisecondi di [a,b] che cadono dentro gli intervalli dati (ordinati). */
export function sovrapposizione(a: number, b: number, iv: Intervallo[]): number {
  let ms = 0;
  for (const [x, y] of iv) {
    if (y <= a) continue;
    if (x >= b) break;
    ms += Math.min(b, y) - Math.max(a, x);
  }
  return ms;
}

/** Pause manuali salvate nella camminata (JSON), più quella eventualmente in corso fino a `ora`. */
export function pauseManuali(w: { pause_manuali?: string | null; paused_since?: number | null }, ora?: number): Intervallo[] {
  let iv: Intervallo[] = [];
  try { iv = w.pause_manuali ? JSON.parse(w.pause_manuali) : []; } catch { iv = []; }
  if (!Array.isArray(iv)) iv = [];
  if (w.paused_since != null && ora != null && ora > w.paused_since) iv.push([w.paused_since, ora]);
  return iv;
}

/** Tempo da mostrare: in movimento se disponibile, altrimenti il tempo attivo (corse registrate prima). */
export const tempoMovimento = (w: { moving_ms?: number | null; active_ms: number }) =>
  w.moving_ms != null ? w.moving_ms : w.active_ms;
