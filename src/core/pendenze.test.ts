import { describe, expect, it } from 'vitest';
import { classifica, leggiSoglie, pendenze, riepilogoPendenze, trattiPendenza } from './pendenze';

// curva ogni 25 m: 1 km piano, 1 km al 10%, 500 m al 20%, 1 km in discesa al -6%
const d: number[] = [], z: number[] = [];
for (let x = 0; x <= 3500; x += 25) {
  d.push(x);
  z.push(x <= 1000 ? 500 : x <= 2000 ? 500 + (x - 1000) * 0.1 : x <= 2500 ? 600 + (x - 2000) * 0.2 : 700 - (x - 2500) * 0.06);
}

describe('profilo per pendenza', () => {
  it('pendenza misurata sulla finestra', () => {
    const p = pendenze(d, z);
    expect(p[d.indexOf(500)]).toBeCloseTo(0, 5);
    expect(p[d.indexOf(1500)]).toBeCloseTo(10, 5);
    expect(p[d.indexOf(2250)]).toBeCloseTo(20, 5);
    expect(p[d.indexOf(3000)]).toBeCloseTo(-6, 5);
  });

  it('classi e soglie', () => {
    const s: [number, number, number] = [3, 8, 15];
    expect(classifica(-3, s)).toBe('discesa');
    expect(classifica(-2.9, s)).toBe('piano');
    expect(classifica(3, s)).toBe('leggera');
    expect(classifica(8, s)).toBe('impegnativa');
    expect(classifica(15, s)).toBe('ripida');
  });

  it('tratti e riepilogo: le lunghezze tornano (a meno delle transizioni)', () => {
    const t = trattiPendenza(d, z);
    // tratti lunghi (le transizioni di 25-50 m sono l'effetto della media sulla finestra)
    expect(t.filter((x) => x.a - x.da >= 100).map((x) => x.classe)).toEqual(['piano', 'impegnativa', 'ripida', 'discesa']);
    const r = riepilogoPendenze(d, z);
    expect(r.metri.piano).toBeGreaterThan(950);
    expect(r.metri.impegnativa).toBeGreaterThan(950);
    expect(r.metri.ripida).toBeGreaterThan(450);
    expect(r.metri.discesa).toBeGreaterThan(925);
    expect(Object.values(r.metri).reduce((a, b) => a + b, 0)).toBeCloseTo(3500, 5);
    expect(r.maxSalita).toBeCloseTo(20, 5);
    expect(r.maxDiscesa).toBeCloseTo(-6, 5);
  });

  it('il rumore sulla quota non spezzetta un tratto piano', () => {
    const zn = z.map((q, i) => (d[i] <= 1000 ? q + (i % 2 ? 0.4 : -0.4) : q));
    const t = trattiPendenza(d, zn);
    expect(t[0].classe).toBe('piano');
    expect(t[0].a).toBeGreaterThan(950);
  });

  it('soglie dalle preferenze', () => {
    expect(leggiSoglie('2,5,10')).toEqual([2, 5, 10]);
    expect(leggiSoglie('10,5,2')).toEqual([3, 8, 15]);
    expect(leggiSoglie(null)).toEqual([3, 8, 15]);
    expect(trattiPendenza([0], [1])).toEqual([]);
  });
});
