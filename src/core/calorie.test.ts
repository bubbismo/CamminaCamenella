import { describe, expect, it } from 'vitest';
import { calorieTratti, kcalOra, vo2 } from './calorie';

describe('equazioni ACSM', () => {
  it('camminata piana a 5 km/h, 70 kg ≈ 248 kcal/h', () => {
    const S = 5000 / 60;
    expect(vo2(S, 0)).toBeCloseTo(0.1 * S + 3.5, 6);
    expect(kcalOra(70, S, 0)).toBeCloseTo(248.4, 0);
  });
  it('corsa piana a 10 km/h, 70 kg ≈ 773,5 kcal/h', () => {
    expect(kcalOra(70, 10000 / 60, 0)).toBeCloseTo(773.5, 0);
  });
  it('la salita fa consumare di più, in modo diverso per camminata e corsa', () => {
    const w = 5000 / 60, r = 10000 / 60;
    expect(vo2(w, 0.1)).toBeCloseTo(0.1 * w + 1.8 * w * 0.1 + 3.5, 6);
    expect(vo2(r, 0.1)).toBeCloseTo(0.2 * r + 0.9 * r * 0.1 + 3.5, 6);
    expect(kcalOra(70, w, 0.1)).toBeGreaterThan(2 * kcalOra(70, w, 0));
  });
  it('in discesa non ci sono sconti (solo termine orizzontale)', () => {
    expect(vo2(80, -0.1)).toBe(vo2(80, 0));
  });
  it('tra camminata e corsa il passaggio è continuo (nessun salto) e crescente', () => {
    let prec = vo2(95, 0);
    for (let S = 96; S <= 140; S++) { const v = vo2(S, 0); expect(Math.abs(v - prec)).toBeLessThan(1.5); prec = v; }
    expect(vo2(100, 0)).toBeCloseTo(vo2(100.0001, 0), 2);
  });
  it('è proporzionale al peso', () => {
    expect(kcalOra(80, 80, 0.05) / kcalOra(40, 80, 0.05)).toBeCloseTo(2, 6);
  });
});

describe('calorie di un percorso', () => {
  const tratti = (n: number, metri: number, secondi: number, salita: number) =>
    Array.from({ length: n }, () => ({ metri, secondi, salitaM: salita }));

  it('1 ora a 5 km/h piani = come kcal/h', () => {
    const t = tratti(200, 25, 18, 0); // 25 m in 18 s = 5 km/h; 200 tratti = 1 ora
    expect(calorieTratti(70, t)).toBeCloseTo(kcalOra(70, 5000 / 60, 0), 0);
  });
  it('ignora le soste lunghe (pause) e il rumore da fermo', () => {
    const base = tratti(100, 25, 18, 0);
    const conPausa = [...base, { metri: 25, secondi: 1800, salitaM: 0 }, { metri: 1, secondi: 60, salitaM: 0 }];
    expect(calorieTratti(70, conPausa)).toBeCloseTo(calorieTratti(70, base), 6);
  });
  it('una salita costante consuma più della stessa distanza in piano', () => {
    expect(calorieTratti(70, tratti(100, 25, 25, 2.5))).toBeGreaterThan(calorieTratti(70, tratti(100, 25, 25, 0)) * 1.5);
  });
  it('senza peso valido restituisce 0', () => { expect(calorieTratti(0, tratti(10, 25, 18, 0))).toBe(0); });
});
