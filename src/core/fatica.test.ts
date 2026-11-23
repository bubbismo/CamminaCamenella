import { describe, expect, it } from 'vitest';
import { FATICA, faticaDi } from './fatica';
import { velocitaKmh } from './altimetria/calcola';

describe('fatica percepita', () => {
  it('ha 10 livelli distinti con descrizione e colore', () => {
    expect(FATICA.map((f) => f.valore)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(FATICA.map((f) => f.colore)).size).toBe(10);
    FATICA.forEach((f) => { expect(f.titolo.length).toBeGreaterThan(2); expect(f.descrizione.length).toBeGreaterThan(10); });
  });
  it('faticaDi gestisce valori mancanti', () => { expect(faticaDi(null)).toBeNull(); expect(faticaDi(7)?.titolo).toBe('Dura'); });
});

describe('velocità lungo il percorso', () => {
  const c = (d: number, t: number) => ({ d, t, lat: 0, lon: 0, z: null, r: 1 });
  it('5 km/h costanti → 5 km/h; le pause diventano null', () => {
    const camp = Array.from({ length: 8 }, (_, i) => c(i * 25, i * 18000));
    camp.push(c(200, 7 * 18000 + 600000)); // sosta di 10 minuti
    const v = velocitaKmh(camp);
    expect(v[3]).toBeCloseTo(5, 3);
    expect(v[8]).toBeNull();
  });
});
