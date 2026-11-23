import { describe, expect, it } from 'vitest';
import { calcolaParziali, estremi, formatPassoS } from './parziali';
import { calcolaAltimetria } from './altimetria';
import { calcolaMovimento } from './movimento';
import type { Punto } from './tipi';

/** Traccia verso nord: un punto ogni 5 m; velocità (m/s) e quota in funzione della distanza. */
function traccia(m: number, vel: (d: number) => number, quota: (d: number) => number = () => 500, sosta?: { a: number; s: number }): Punto[] {
  const pts: Punto[] = [];
  let t = 0;
  for (let d = 0; d <= m; d += 5) {
    if (d > 0) t += (5 / vel(d)) * 1000;
    if (sosta && d === sosta.a) t += sosta.s * 1000; // fermo: nessun punto
    pts.push({ t, lat: 46 + d / 111320, lon: 11, alt: quota(d), alt_acc: 3, acc: 5, speed: null });
  }
  return pts;
}

describe('parziali per km', () => {
  it('3,5 km a passo costante: 3 km completi più un ultimo parziale con passo equivalente', () => {
    const p = calcolaParziali(traccia(3500, () => 1.25)); // 13:20 al km
    expect(p.length).toBe(4);
    for (const x of p.slice(0, 3)) {
      expect(x.completo).toBe(true);
      expect(x.passoSKm).toBeCloseTo(800, -1);
    }
    expect(p[3].completo).toBe(false);
    expect(p[3].metri).toBeCloseTo(500, -1);
    expect(p[3].passoSKm).toBeCloseTo(800, -1);
  });

  it('il passaggio del km è interpolato tra i punti', () => {
    const p = calcolaParziali(traccia(2040, (d) => (d <= 1000 ? 1 : 2)));
    expect(p[0].ms / 1000).toBeCloseTo(1000, -1);
    expect(p[1].ms / 1000).toBeCloseTo(500, -1);
    expect(estremi(p)).toEqual({ veloce: 2, lento: 1 });
  });

  it('una sosta non rallenta il km in cui avviene', () => {
    const pts = traccia(2000, () => 1.25, undefined, { a: 1500, s: 300 });
    const m = calcolaMovimento(pts, { inizio: 0, fine: pts[pts.length - 1].t });
    const p = calcolaParziali(pts, { soste: m.soste });
    expect(p[1].passoSKm).toBeLessThan(820);
    expect(calcolaParziali(pts)[1].passoSKm).toBeGreaterThan(1000); // senza togliere la sosta
  });

  it('dislivello per km dalla curva altimetrica', () => {
    const quota = (d: number) => (d <= 1000 ? 500 + d * 0.1 : 600 - (d - 1000) * 0.05);
    const pts = traccia(2000, () => 1.2, quota);
    const r = calcolaAltimetria(pts);
    const p = calcolaParziali(pts, { profilo: { d: r.campioni.map((c) => c.d), quote: r.quote } });
    expect(p[0].salita).toBeGreaterThan(90);
    expect(p[0].discesa).toBeLessThan(5);
    expect(p[1].discesa).toBeGreaterThan(45);
    expect(p[1].salita).toBeLessThan(5);
  });

  it('primo punto GPS con orario prima dello Start: si conta dallo Start', () => {
    const pts = traccia(1040, () => 1).map((p) => ({ ...p, t: p.t + 5000 }));
    pts[0].t = 0; // posizione "vecchia" di 5 s prima
    const p = calcolaParziali(pts, { inizio: 5000 });
    expect(p[0].ms / 1000).toBeCloseTo(1000, -1);
    expect(calcolaParziali(pts)[0].ms / 1000).toBeGreaterThan(1004);
  });

  it('casi limite', () => {
    expect(calcolaParziali([])).toEqual([]);
    expect(calcolaParziali(traccia(30, () => 1))).toEqual([]);       // meno di 50 m: niente
    expect(calcolaParziali(traccia(1020, () => 1)).length).toBe(1); // ultimi 20 m ignorati
    expect(estremi(calcolaParziali(traccia(1500, () => 1)))).toEqual({ veloce: null, lento: null });
    expect(formatPassoS(800)).toBe('13:20');
    expect(formatPassoS(359.7)).toBe('6:00');
    expect(formatPassoS(0)).toBe('--:--');
  });
});
