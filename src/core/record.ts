// Record personali. Funzioni pure, identiche su web e Android.
// Per ogni uscita si calcolano le "prestazioni" (salvate con l'uscita); i record si ricavano ogni volta
// dall'elenco delle uscite: se una viene eliminata, i record si aggiornano da soli.
import { distanza } from './geo';
import { Intervallo, sovrapposizione } from './movimento';
import { calcolaParziali } from './parziali';
import type { Punto } from './tipi';

export type Tipo = 'camminata' | 'corsa';
export const TIPI: { v: Tipo; t: string; icona: string }[] = [
  { v: 'camminata', t: 'Camminata', icona: '🚶' }, { v: 'corsa', t: 'Corsa', icona: '🏃' },
];
/** Sopra questa velocità media in movimento, l'uscita è considerata una corsa (si può correggere a mano). */
export const SOGLIA_CORSA_KMH = 7;

export const SEGMENTI = [1000, 5000, 10000] as const;

export type Prestazioni = {
  v: 1;
  distanzaM: number;
  durataMs: number;          // tempo in movimento
  salitaM: number;
  kmVeloceMs: number | null; // miglior km "da cartello" (parziale completo)
  migliori: Record<string, number | null>; // miglior segmento continuo di 1/5/10 km (ms)
};

export function tipoAutomatico(p: Pick<Prestazioni, 'distanzaM' | 'durataMs'>): Tipo {
  const kmh = p.durataMs > 0 ? (p.distanzaM / 1000) / (p.durataMs / 3600000) : 0;
  return kmh >= SOGLIA_CORSA_KMH ? 'corsa' : 'camminata';
}

/**
 * Tempo (in movimento) del tratto continuo di `lunghezzaM` metri più veloce, ovunque nella traccia
 * (non solo dall'inizio). Esclude soste/pause e i tratti stimati dopo un'interruzione del GPS.
 */
export function migliorSegmento(pts: Punto[], lunghezzaM: number, soste: Intervallo[] = []): number | null {
  const n = pts.length;
  if (n < 2) return null;
  const D = [0], M = [0], G = [0]; // distanza, tempo in movimento, numero di tratti stimati (cumulati)
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1].t, b = pts[i].t;
    D.push(D[i - 1] + distanza(pts[i - 1], pts[i]));
    M.push(M[i - 1] + Math.max(0, b - a - sovrapposizione(a, b, soste)));
    G.push(G[i - 1] + (pts[i].gap ? 1 : 0));
  }
  if (D[n - 1] < lunghezzaM) return null;
  let best: number | null = null, j = 1;
  for (let i = 0; i < n - 1; i++) {
    const obiettivo = D[i] + lunghezzaM;
    if (j <= i) j = i + 1;
    while (j < n && D[j] < obiettivo) j++;
    if (j >= n) break;
    if (G[j] - G[i] > 0) continue; // dentro c'è un tratto senza GPS: non affidabile
    const f = (obiettivo - D[j - 1]) / (D[j] - D[j - 1] || 1);
    const tempo = M[j - 1] + (M[j] - M[j - 1]) * f - M[i];
    if (tempo > 0 && (best == null || tempo < best)) best = tempo;
  }
  return best;
}

export function calcolaPrestazioni(pts: Punto[], o: { soste?: Intervallo[]; durataMs: number; salitaM: number; inizio?: number }): Prestazioni {
  const soste = o.soste ?? [];
  let dist = 0;
  for (let i = 1; i < pts.length; i++) dist += distanza(pts[i - 1], pts[i]);
  const completi = calcolaParziali(pts, { soste, inizio: o.inizio }).filter((p) => p.completo && p.ms > 0);
  const migliori: Record<string, number | null> = {};
  for (const L of SEGMENTI) migliori[L] = migliorSegmento(pts, L, soste);
  return {
    v: 1, distanzaM: dist, durataMs: o.durataMs, salitaM: o.salitaM,
    kmVeloceMs: completi.length ? Math.min(...completi.map((p) => p.ms)) : null,
    migliori,
  };
}

// ---------------------------------------------------------------- record

export type Categoria = 'km' | 's1000' | 's5000' | 's10000' | 'distanza' | 'durata' | 'salita' | 'settimana' | 'mese';
export const CATEGORIE: { c: Categoria; nome: string; tempo: boolean }[] = [
  { c: 'km', nome: 'Km più veloce', tempo: true },
  { c: 's1000', nome: 'Miglior tempo su 1 km', tempo: true },
  { c: 's5000', nome: 'Miglior tempo su 5 km', tempo: true },
  { c: 's10000', nome: 'Miglior tempo su 10 km', tempo: true },
  { c: 'distanza', nome: 'Uscita più lunga', tempo: false },
  { c: 'durata', nome: 'Uscita più lunga (tempo)', tempo: false },
  { c: 'salita', nome: 'Maggior dislivello in salita', tempo: false },
  { c: 'settimana', nome: 'Settimana con più km', tempo: false },
  { c: 'mese', nome: 'Mese con più km', tempo: false },
];
const PER_USCITA: Categoria[] = ['km', 's1000', 's5000', 's10000', 'distanza', 'durata', 'salita'];

/** Miglioramento minimo perché sia un nuovo record (evita "record" per pochi centimetri o un secondo). */
const MARGINE: Record<Categoria, number> = { km: 1000, s1000: 1000, s5000: 1000, s10000: 1000, distanza: 10, durata: 60000, salita: 1, settimana: 10, mese: 10 };

export type Uscita = { id: number; started_at: number; tipo: Tipo; p: Prestazioni };
export type Record_ = { cat: Categoria; valore: number; id: number | null; data: number };
export type NuovoRecord = { cat: Categoria; valore: number; precedente: number };

function valoreDi(u: Uscita, c: Categoria): number | null {
  switch (c) {
    case 'km': return u.p.kmVeloceMs;
    case 's1000': case 's5000': case 's10000': return u.p.migliori[c.slice(1)] ?? null;
    case 'distanza': return u.p.distanzaM >= 100 ? u.p.distanzaM : null;
    case 'durata': return u.p.durataMs >= 60000 ? u.p.durataMs : null;
    case 'salita': return u.p.salitaM >= 1 ? u.p.salitaM : null;
    default: return null;
  }
}
const meglio = (c: Categoria, a: number, b: number) => (CATEGORIE.find((x) => x.c === c)!.tempo ? a < b : a > b);

/** Inizio (ms) della settimana (da lunedì) o del mese, in ora locale. */
export function inizioPeriodo(t: number, periodo: 'settimana' | 'mese'): number {
  const d = new Date(t);
  if (periodo === 'mese') return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const g = (d.getDay() + 6) % 7; // lunedì = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - g).getTime();
}

function totaliPeriodo(uscite: Uscita[], periodo: 'settimana' | 'mese'): Map<number, number> {
  const m = new Map<number, number>();
  for (const u of uscite) { const k = inizioPeriodo(u.started_at, periodo); m.set(k, (m.get(k) ?? 0) + u.p.distanzaM); }
  return m;
}

/** Record attuali per un tipo di attività. */
export function calcolaRecord(uscite: Uscita[], tipo: Tipo): Record_[] {
  const us = uscite.filter((u) => u.tipo === tipo);
  const out: Record_[] = [];
  for (const c of PER_USCITA) {
    let best: Record_ | null = null;
    for (const u of us) {
      const v = valoreDi(u, c);
      // a parità vince la prima volta che è stato raggiunto
      if (v != null && (!best || meglio(c, v, best.valore) || (v === best.valore && u.started_at < best.data))) best = { cat: c, valore: v, id: u.id, data: u.started_at };
    }
    if (best) out.push(best);
  }
  for (const periodo of ['settimana', 'mese'] as const) {
    let best: Record_ | null = null;
    for (const [k, v] of totaliPeriodo(us, periodo)) if (v >= 100 && (!best || v > best.valore)) best = { cat: periodo, valore: v, id: null, data: k };
    if (best) out.push(best);
  }
  return out;
}

/**
 * Record battuti dall'uscita `u` rispetto alle altre dello stesso tipo. Serve un record precedente:
 * la prima uscita di un tipo non fa festa (sarebbe "record" tutto).
 */
export function nuoviRecord(altre: Uscita[], u: Uscita): NuovoRecord[] {
  const us = altre.filter((x) => x.tipo === u.tipo && x.id !== u.id);
  const prima = calcolaRecord(us, u.tipo);
  const out: NuovoRecord[] = [];
  for (const c of PER_USCITA) {
    const v = valoreDi(u, c), r = prima.find((x) => x.cat === c);
    if (v != null && r && meglio(c, v, r.valore) && Math.abs(v - r.valore) >= MARGINE[c]) out.push({ cat: c, valore: v, precedente: r.valore });
  }
  for (const periodo of ['settimana', 'mese'] as const) {
    const r = prima.find((x) => x.cat === periodo);
    if (!r) continue;
    const k = inizioPeriodo(u.started_at, periodo);
    if (r.data === k) continue; // il record era già di questo periodo: non si festeggia a ogni uscita
    const ora = (totaliPeriodo(us, periodo).get(k) ?? 0) + u.p.distanzaM;
    if (ora > r.valore + MARGINE[periodo]) out.push({ cat: periodo, valore: ora, precedente: r.valore });
  }
  return out;
}

// ---------------------------------------------------------------- testi

export function formatTempo(ms: number): string {
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`;
}
const km = (m: number) => `${(m / 1000).toFixed(2).replace('.', ',')} km`;

export function formatValore(c: Categoria, v: number): string {
  if (CATEGORIE.find((x) => x.c === c)!.tempo) return formatTempo(v);
  if (c === 'durata') return formatTempo(v);
  if (c === 'salita') return `${Math.round(v)} m`;
  return km(v);
}

/** "−18 s", "+1,20 km", "+35 m" */
export function formatDifferenza(c: Categoria, nuovo: number, prima: number): string {
  const d = Math.abs(nuovo - prima);
  const t = (ms: number) => (ms < 60000 ? `${Math.round(ms / 1000)} s` : formatTempo(ms));
  if (CATEGORIE.find((x) => x.c === c)!.tempo) return `${t(d)} in meno`;
  if (c === 'durata') return `${t(d)} in più`;
  if (c === 'salita') return `${Math.round(d)} m in più`;
  return `${km(d)} in più`;
}

export const nomeCategoria = (c: Categoria) => CATEGORIE.find((x) => x.c === c)!.nome;
