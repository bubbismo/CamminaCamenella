import { describe, expect, it } from 'vitest';
import { calcolaPrestazioni, calcolaRecord, formatDifferenza, formatValore, inizioPeriodo, migliorSegmento, nuoviRecord, Prestazioni, tipoAutomatico, Uscita } from './record';
import { rng } from './altimetria/simulazione';
import type { Punto } from './tipi';

/** Un punto ogni secondo; velocità in m/s in funzione del tempo (s). */
function traccia(secondi: number, vel: (s: number) => number, opz: { rumore?: number; seed?: number; gapA?: number } = {}): Punto[] {
  const R = rng(opz.seed ?? 1), pts: Punto[] = [];
  let x = 0;
  for (let s = 0; s <= secondi; s++) {
    if (s > 0) x += vel(s);
    const p: Punto = { t: s * 1000, lat: 46 + x / 111195, lon: 11 + ((opz.rumore ?? 0) * R.g()) / 77000, alt: 500, acc: 5, speed: null };
    if (opz.gapA != null && s === opz.gapA) p.gap = 1;
    pts.push(p);
  }
  return pts;
}

/** Controllo "a forza bruta": prova ogni coppia di punti (lento ma ovvio). */
function bruta(pts: Punto[], L: number): number | null {
  const D = [0];
  for (let i = 1; i < pts.length; i++) {
    D.push(D[i - 1] + Math.abs(pts[i].lat - pts[i - 1].lat) * 111195); // traccia dritta verso nord
  }
  let best: number | null = null;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if (D[j] - D[i] >= L) {
      const f = (D[i] + L - D[j - 1]) / (D[j] - D[j - 1]);
      const t = pts[j - 1].t + (pts[j].t - pts[j - 1].t) * f - pts[i].t;
      if (best == null || t < best) best = t;
      break;
    }
  }
  return best;
}

describe('miglior segmento continuo', () => {
  it('passo costante: 1 km a 4 m/s = 250 s', () => {
    const t = migliorSegmento(traccia(1200, () => 4), 1000)!;
    expect(t / 1000).toBeCloseTo(250, 0);
  });

  it('trova il tratto veloce in mezzo alla corsa, non solo dall\'inizio', () => {
    // 10 min a 3 m/s, poi 5 min a 5 m/s, poi 10 min a 3 m/s
    const pts = traccia(1500, (s) => (s > 600 && s <= 900 ? 5 : 3));
    expect(migliorSegmento(pts, 1000)! / 1000).toBeCloseTo(200, 0);
    // 5 km: deve includere tutto il tratto veloce (1500 m in 300 s) + 3500 m a 3 m/s
    expect(migliorSegmento(pts, 5000)! / 1000).toBeCloseTo(300 + 3500 / 3, 0);
  });

  it('coincide con il calcolo a forza bruta su una corsa irregolare', () => {
    const R = rng(42);
    const v: number[] = [];
    for (let s = 0; s <= 2000; s++) v.push(2.5 + 1.5 * Math.sin(s / 90) + 0.4 * R.g());
    const pts = traccia(2000, (s) => Math.max(0.5, v[s]));
    for (const L of [1000, 2000]) {
      expect(migliorSegmento(pts, L)! / 1000).toBeCloseTo(bruta(pts, L)! / 1000, 0);
    }
  });

  it('le soste non contano nel tempo del segmento', () => {
    const pts = traccia(800, (s) => (s > 200 && s <= 500 ? 0 : 3)).filter((p, i, a) => i === 0 || p.lat !== a[i - 1].lat);
    // 300 s fermo in mezzo: con la sosta esclusa, 1 km a 3 m/s = 333 s
    expect(migliorSegmento(pts, 1000, [[200000, 500000]])! / 1000).toBeCloseTo(333.3, 0);
    expect(migliorSegmento(pts, 1000)! / 1000).toBeGreaterThan(600);
  });

  it('esclude i tratti stimati (senza GPS) e le corse troppo corte', () => {
    const pts = traccia(1200, () => 3, { gapA: 300 }); // tratto stimato tra il punto 299 e 300
    const t = migliorSegmento(pts, 1000)!;
    expect(t / 1000).toBeCloseTo(333.3, 0); // c'è comunque un km intero dopo il buco
    expect(migliorSegmento(traccia(600, () => 3, { gapA: 300 }), 1000)).toBeNull();
    expect(migliorSegmento(traccia(100, () => 3), 1000)).toBeNull();
  });

  it('prestazioni complete e tipo automatico', () => {
    const pts = traccia(3600, () => 2.5); // 9 km/h per un'ora
    const p = calcolaPrestazioni(pts, { durataMs: 3600000, salitaM: 120 });
    expect(p.distanzaM).toBeCloseTo(9000, -1);
    expect(p.kmVeloceMs! / 1000).toBeCloseTo(400, 0);
    expect(p.migliori['5000']! / 1000).toBeCloseTo(2000, 0);
    expect(p.migliori['10000']).toBeNull();
    expect(tipoAutomatico(p)).toBe('corsa');
    expect(tipoAutomatico({ distanzaM: 5000, durataMs: 3600000 })).toBe('camminata');
  });
});

const pr = (x: Partial<Prestazioni>): Prestazioni => ({ v: 1, distanzaM: 3000, durataMs: 1800000, salitaM: 10, kmVeloceMs: 600000, migliori: { 1000: 590000, 5000: null, 10000: null }, ...x });
const giorno = (g: number) => new Date(2026, 10, g, 9).getTime(); // novembre 2026 (lun 2, 9, 16, 23, 30)

describe('record', () => {
  const uscite: Uscita[] = [
    { id: 1, started_at: giorno(2), tipo: 'camminata', p: pr({ distanzaM: 5000, kmVeloceMs: 620000, salitaM: 300 }) },
    { id: 2, started_at: giorno(4), tipo: 'camminata', p: pr({ distanzaM: 8000, kmVeloceMs: 580000 }) },
    { id: 3, started_at: giorno(10), tipo: 'corsa', p: pr({ distanzaM: 6000, kmVeloceMs: 330000 }) },
  ];

  it('record per tipo di attività', () => {
    const r = calcolaRecord(uscite, 'camminata');
    expect(r.find((x) => x.cat === 'km')).toMatchObject({ valore: 580000, id: 2 });
    expect(r.find((x) => x.cat === 'distanza')).toMatchObject({ valore: 8000, id: 2 });
    expect(r.find((x) => x.cat === 'salita')).toMatchObject({ valore: 300, id: 1 });
    expect(r.find((x) => x.cat === 'settimana')).toMatchObject({ valore: 13000, data: inizioPeriodo(giorno(2), 'settimana') });
    expect(calcolaRecord(uscite, 'corsa').find((x) => x.cat === 'km')).toMatchObject({ valore: 330000, id: 3 });
  });

  it('eliminando un\'uscita il record torna al precedente', () => {
    const r = calcolaRecord(uscite.filter((u) => u.id !== 2), 'camminata');
    expect(r.find((x) => x.cat === 'km')).toMatchObject({ valore: 620000, id: 1 });
    expect(r.find((x) => x.cat === 'distanza')).toMatchObject({ valore: 5000, id: 1 });
  });

  it('nuovi record di una nuova uscita, con il valore precedente', () => {
    const nuova: Uscita = { id: 9, started_at: giorno(20), tipo: 'camminata', p: pr({ distanzaM: 9000, kmVeloceMs: 570000, salitaM: 100 }) };
    const n = nuoviRecord(uscite, nuova);
    expect(n).toContainEqual({ cat: 'km', valore: 570000, precedente: 580000 });
    expect(n).toContainEqual({ cat: 'distanza', valore: 9000, precedente: 8000 });
    expect(n.find((x) => x.cat === 'salita')).toBeUndefined();
    expect(n.find((x) => x.cat === 'settimana')).toBeUndefined(); // 9 km < 13 km
  });

  it('testi dei valori e delle differenze', () => {
    expect(formatValore('km', 101000)).toBe('1:41');
    expect(formatValore('s10000', 3725000)).toBe('1:02:05');
    expect(formatValore('distanza', 12345)).toBe('12,35 km');
    expect(formatDifferenza('km', 101000, 125000)).toBe('24 s in meno');
    expect(formatDifferenza('s5000', 1500000, 1590000)).toBe('1:30 in meno');
    expect(formatDifferenza('salita', 420, 380)).toBe('40 m in più');
  });

  it('niente festa alla prima uscita di un tipo, né per miglioramenti minimi', () => {
    expect(nuoviRecord([], { id: 1, started_at: giorno(1), tipo: 'corsa', p: pr({}) })).toEqual([]);
    const quasi: Uscita = { id: 9, started_at: giorno(20), tipo: 'camminata', p: pr({ distanzaM: 8005, kmVeloceMs: 579500 }) };
    expect(nuoviRecord(uscite, quasi)).toEqual([]);
  });

  it('settimana record: si festeggia quando una settimana nuova supera la migliore, una volta sola', () => {
    const lun = giorno(16), mer = giorno(18);
    const a: Uscita = { id: 10, started_at: lun, tipo: 'camminata', p: pr({ distanzaM: 7000, kmVeloceMs: null, migliori: {} }) };
    const b: Uscita = { id: 11, started_at: mer, tipo: 'camminata', p: pr({ distanzaM: 7000, kmVeloceMs: null, migliori: {} }) };
    expect(nuoviRecord([...uscite, a], b)).toContainEqual({ cat: 'settimana', valore: 14000, precedente: 13000 });
    const c: Uscita = { ...b, id: 12, started_at: giorno(19) };
    expect(nuoviRecord([...uscite, a, b], c).find((x) => x.cat === 'settimana')).toBeUndefined();
  });
});
