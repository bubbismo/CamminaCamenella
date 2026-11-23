import { describe, expect, it } from 'vitest';
import { calcolaMovimento, pauseManuali, sovrapposizione, tempoMovimento } from './movimento';
import { puntoValido } from './geo';
import { rng } from './altimetria/simulazione';
import { calcolaAltimetria, calorieDaRisultato } from './altimetria';
import type { Punto } from './tipi';

type Fase = { s: number; v: number }; // durata (s), velocità (m/s); v=0 = fermo

/** GPS a 1 Hz con rumore orizzontale (σ metri), filtrato come fa l'app durante la corsa. */
function simula(fasi: Fase[], sigma = 2, seed = 3): Punto[] {
  const R = rng(seed), grezzi: Punto[] = [];
  let x = 0, t = 0;
  for (const f of fasi) for (let k = 0; k < f.s; k++) {
    x += f.v; t += 1000;
    grezzi.push({ t, lat: 46 + (x + sigma * R.g()) / 111320, lon: 11 + (sigma * R.g()) / 77000, alt: 600, acc: 6, speed: f.v });
  }
  const out: Punto[] = [];
  for (const p of grezzi) if (puntoValido(out[out.length - 1] ?? null, p)) out.push(p);
  return out;
}

const fineDi = (fasi: Fase[]) => fasi.reduce((a, f) => a + f.s, 0) * 1000;
const sec = (ms: number) => ms / 1000;

describe('pausa automatica', () => {
  it('camminata senza soste: tutto il tempo è movimento', () => {
    const fasi = [{ s: 600, v: 1.3 }];
    const m = calcolaMovimento(simula(fasi), { inizio: 0, fine: fineDi(fasi) });
    expect(sec(m.movimentoMs)).toBeGreaterThan(590);
    expect(m.fermoOra).toBe(false);
  });

  it('una sosta di 2 minuti viene tolta (con qualche secondo di tolleranza)', () => {
    const fasi = [{ s: 300, v: 1.3 }, { s: 120, v: 0 }, { s: 300, v: 1.3 }];
    const m = calcolaMovimento(simula(fasi), { inizio: 0, fine: fineDi(fasi) });
    expect(sec(m.movimentoMs)).toBeGreaterThan(585);
    expect(sec(m.movimentoMs)).toBeLessThan(620);
    expect(m.soste.length).toBe(1);
  });

  it('un semaforo di 5 secondi non è una sosta', () => {
    const fasi = [{ s: 200, v: 1.3 }, { s: 5, v: 0 }, { s: 200, v: 1.3 }];
    const m = calcolaMovimento(simula(fasi), { inizio: 0, fine: fineDi(fasi) });
    expect(m.soste.length).toBe(0);
  });

  it('il GPS che "balla" da fermo (rumore forte) non fa ripartire il tempo', () => {
    const fasi = [{ s: 120, v: 1.3 }, { s: 300, v: 0 }, { s: 120, v: 1.3 }];
    const m = calcolaMovimento(simula(fasi, 4, 11), { inizio: 0, fine: fineDi(fasi) });
    expect(sec(m.movimentoMs)).toBeLessThan(300);
    expect(sec(m.movimentoMs)).toBeGreaterThan(225);
  });

  it('camminata molto lenta (2 km/h) resta movimento', () => {
    const fasi = [{ s: 600, v: 0.55 }];
    const m = calcolaMovimento(simula(fasi, 2), { inizio: 0, fine: fineDi(fasi) });
    expect(sec(m.movimentoMs)).toBeGreaterThan(560);
  });

  it('durante la corsa: "fermo adesso" solo dopo 10 s, e il tempo dopo l\'ultimo punto non conta', () => {
    const pts = simula([{ s: 120, v: 1.3 }]);
    const ultimo = pts[pts.length - 1].t;
    expect(calcolaMovimento(pts, { inizio: 0, fine: ultimo + 5000 }).fermoOra).toBe(false);
    const dopo = calcolaMovimento(pts, { inizio: 0, fine: ultimo + 30000 });
    expect(dopo.fermoOra).toBe(true);
    expect(sec(dopo.movimentoMs)).toBeLessThan(121);
  });

  it('le pause manuali sono escluse anche se intanto si cammina', () => {
    const fasi = [{ s: 300, v: 1.3 }, { s: 300, v: 1.3 }];
    const pts = simula(fasi).filter((p) => p.t <= 300000 || p.t >= 400000); // niente punti in pausa
    const m = calcolaMovimento(pts, { inizio: 0, fine: fineDi(fasi), manuali: [[300000, 400000]] });
    expect(sec(m.movimentoMs)).toBeGreaterThan(490);
    expect(sec(m.movimentoMs)).toBeLessThanOrEqual(500);
  });

  it('spenta: conta tutto tranne le pause manuali', () => {
    const fasi = [{ s: 100, v: 1.3 }, { s: 200, v: 0 }, { s: 100, v: 1.3 }];
    const m = calcolaMovimento(simula(fasi), { attiva: false, inizio: 0, fine: fineDi(fasi), manuali: [[350000, 360000]] });
    expect(sec(m.movimentoMs)).toBe(390);
  });

  it('nessun punto GPS: nessun movimento', () => {
    expect(calcolaMovimento([], { inizio: 0, fine: 60000 }).movimentoMs).toBe(0);
  });

  it('le calorie non contano la sosta', () => {
    const senza = simula([{ s: 600, v: 1.3 }]);
    const con = simula([{ s: 300, v: 1.3 }, { s: 300, v: 0 }, { s: 300, v: 1.3 }]);
    const a = calorieDaRisultato(calcolaAltimetria(senza), 70);
    const r = calcolaAltimetria(con);
    const m = calcolaMovimento(con, { inizio: 0, fine: 900000 });
    const b = calorieDaRisultato(r, 70, m.soste);
    expect(Math.abs(b - a) / a).toBeLessThan(0.08);           // stessa strada, stesse calorie (circa)
    expect(calorieDaRisultato(r, 70) / a).toBeGreaterThan(1.3); // senza togliere la sosta erano gonfiate
  });

  it('GPS che deriva da fermo: la velocità Doppler conferma la sosta', () => {
    const R = rng(5), pts: Punto[] = [];
    let ex = 0, x = 0;
    for (let t = 1; t <= 420; t++) {
      const v = t > 150 && t <= 270 ? 0 : 1.3;
      x += v; ex = 0.95 * ex + Math.sqrt(1 - 0.95 ** 2) * 8 * R.g();
      const p: Punto = { t: t * 1000, lat: 46 + (x + ex) / 111320, lon: 11, alt: 600, acc: 10, speed: Math.max(0, v + 0.2 * R.g()) };
      if (puntoValido(pts[pts.length - 1] ?? null, p)) pts.push(p);
    }
    const m = calcolaMovimento(pts, { inizio: 0, fine: 420000 });
    expect(Math.abs(sec(m.movimentoMs) - 300)).toBeLessThan(20);
  });

  it('utilità', () => {
    expect(sovrapposizione(0, 100, [[10, 20], [50, 200]])).toBe(60);
    expect(pauseManuali({ pause_manuali: '[[1,2]]', paused_since: 5 }, 9)).toEqual([[1, 2], [5, 9]]);
    expect(pauseManuali({ pause_manuali: 'rotto' })).toEqual([]);
    expect(tempoMovimento({ moving_ms: null, active_ms: 7 })).toBe(7);
    expect(tempoMovimento({ moving_ms: 5, active_ms: 7 })).toBe(5);
  });
});
