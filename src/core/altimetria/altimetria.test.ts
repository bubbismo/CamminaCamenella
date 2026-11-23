import { describe, expect, it } from 'vitest';
import { encode } from 'fast-png';
import type { Punto } from '../tipi';
import { calcolaAltimetria, dislivelloLive } from './calcola';
import { salitaDiscesa, salitaDiscesaGrezza } from './isteresi';
import { aggiornaProfilo, nuovoPercorso, trovaPercorso } from './percorsi';
import { campiona } from './campiona';
import { demDa, piatto, rampa, rng, saliscendi, traccia } from './simulazione';
import { demTerrarium, quotaDaImmagine, tessera } from './dem';

describe('isteresi', () => {
  it('conta una variazione solo oltre la soglia', () => {
    expect(salitaDiscesa([0, 1, 2, 1, 2, 1, 0], 3).salita).toBe(0);
    const r = salitaDiscesa([0, 2, 4, 6, 3, 0], 3);
    expect(r.salita).toBe(6); expect(r.discesa).toBe(6);
  });
  it('il valore grezzo somma ogni saltello', () => {
    expect(salitaDiscesaGrezza([0, 1, 0, 1, 0]).salita).toBe(2);
  });
});

describe('dislivello con GPS rumoroso (±10 m)', () => {
  it('su un percorso piatto il GPS grezzo inventa dislivello, il filtro no', () => {
    const r = calcolaAltimetria(traccia({ km: 3, quota: piatto }));
    expect(r.grezzo.salita).toBeGreaterThan(300);      // il rumore si somma
    expect(r.salita).toBeLessThan(r.grezzo.salita * 0.15);
    expect(r.salita).toBeLessThan(110);                // resta un residuo: il solo GPS non è azzerabile
  });

  it('su una salita di 300 m il valore filtrato è vicino al reale, il grezzo no', () => {
    const r = calcolaAltimetria(traccia({ km: 3, quota: rampa }));
    expect(r.grezzo.salita).toBeGreaterThan(450);      // gonfiato di oltre il 50%
    expect(r.salita).toBeGreaterThan(260);
    expect(r.salita).toBeLessThan(360);
    expect(r.discesa).toBeLessThan(50);
  });

  it('da fermi (punti nello stesso posto) non produce dislivello', () => {
    const R = rng(3);
    const pts: Punto[] = Array.from({ length: 200 }, (_, i) => ({
      t: i * 1000, lat: 46, lon: 11, alt: 600 + 8 * R.g(), alt_acc: 12, acc: 8, speed: 0,
    }));
    const r = dislivelloLive(pts);
    expect(r.salita).toBeLessThan(5);
  });

  it('scarta i punti con errore verticale dichiarato troppo alto', () => {
    const pts = traccia({ km: 1, quota: piatto });
    const peggio = pts.map((p, i) => (i % 5 === 0 ? { ...p, alt: p.alt! + 150, alt_acc: 120 } : p));
    const r = calcolaAltimetria(peggio);
    expect(r.salita).toBeLessThan(110);
  });
});

describe('correzione con DEM', () => {
  it('con DEM (errore 4 m) l\'errore medio su 8 tracce si dimezza rispetto al solo GPS', () => {
    let eSolo = 0, eDem = 0, N = 8;
    for (let seed = 1; seed <= N; seed++) {
      const pts = traccia({ km: 4, quota: saliscendi, seed });
      const vero = salitaDiscesa(campiona(pts).map((c) => saliscendi(c.d)), 3).salita;
      eSolo += Math.abs(calcolaAltimetria(pts).salita - vero);
      eDem += Math.abs(calcolaAltimetria(pts, { dem: { quote: demDa(pts, saliscendi, 4, seed + 50), sigma: 6 } }).salita - vero);
    }
    expect(eDem / N).toBeLessThan(0.05 * 300);       // sotto il 5% su 300 m
    expect(eDem).toBeLessThanOrEqual(eSolo * 1.2);   // non peggiora il solo GPS (qui già buono sulle oscillazioni ampie)
  });

  it('con DEM il dislivello inventato su un percorso piatto si riduce', () => {
    let solo = 0, con = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const pts = traccia({ km: 4, quota: piatto, seed });
      solo += calcolaAltimetria(pts).salita;
      con += calcolaAltimetria(pts, { dem: { quote: demDa(pts, piatto, 4, seed + 50), sigma: 6 } }).salita;
    }
    expect(con).toBeLessThan(solo * 0.7);
  });

  it('toglie lo scarto costante tra GPS (ellissoide, +48 m) e DEM (livello del mare)', () => {
    const pts = traccia({ km: 3, quota: rampa, offset: 48, seed: 9 });
    const r = calcolaAltimetria(pts, { dem: { quote: demDa(pts, rampa, 3), sigma: 6 } });
    expect(r.offsetGpsDem).not.toBeNull();
    expect(Math.abs(r.offsetGpsDem! - 48)).toBeLessThan(8);
    expect(r.salita).toBeGreaterThan(270); expect(r.salita).toBeLessThan(340);
  });

  it('tollera un DEM con buchi (punti null)', () => {
    const pts = traccia({ km: 3, quota: rampa, seed: 4 });
    const dem = demDa(pts, rampa, 4).map((v, i) => (i % 4 === 0 ? null : v));
    const r = calcolaAltimetria(pts, { dem: { quote: dem, sigma: 6 } });
    expect(r.salita).toBeGreaterThan(260); expect(r.salita).toBeLessThan(350);
  });
});

describe('percorsi ripetuti', () => {
  const A = traccia({ km: 3, quota: rampa, seed: 11 });
  const cA = campiona(A);

  it('riconosce lo stesso percorso con rumore GPS diverso e deviazioni di pochi metri', () => {
    const p = nuovoPercorso(cA, calcolaAltimetria(A).quote, 3000);
    const B = traccia({ km: 3, quota: rampa, seed: 12, deviazione: (d) => 8 * Math.sin(d / 300) });
    const m = trovaPercorso(campiona(B), 3000, [p]);
    expect(m).not.toBeNull();
    expect(m!.invertito).toBe(false);
  });

  it('non confonde un percorso diverso (800 m più a est)', () => {
    const p = nuovoPercorso(cA, calcolaAltimetria(A).quote, 3000);
    const C = traccia({ km: 3, quota: rampa, seed: 13, lon0: 11.1 + 800 / 80000 });
    expect(trovaPercorso(campiona(C), 3000, [p])).toBeNull();
  });

  it('con il profilo medio di più uscite il dislivello è più stabile', () => {
    let profilo = nuovoPercorso(cA, calcolaAltimetria(A).quote, 3000);
    for (const seed of [21, 22, 23]) {
      const T = traccia({ km: 3, quota: rampa, seed });
      profilo = aggiornaProfilo(profilo, calcolaAltimetria(T).quote, false, 3000);
    }
    const nuova = traccia({ km: 3, quota: rampa, seed: 31 });
    const m = trovaPercorso(campiona(nuova), 3000, [profilo])!;
    const solo = calcolaAltimetria(nuova);
    const rip = calcolaAltimetria(nuova, { corrispondenza: m });
    expect(rip.fonte).toBe('ripetuto');
    expect(Math.abs(rip.salita - 300)).toBeLessThanOrEqual(Math.abs(solo.salita - 300) + 5);
    expect(rip.salita).toBeGreaterThan(270); expect(rip.salita).toBeLessThan(340);
  });

  it('riconosce lo stesso percorso fatto al contrario', () => {
    const p = nuovoPercorso(cA, calcolaAltimetria(A).quote, 3000);
    const inversa = traccia({ km: 3, quota: rampa, seed: 14 }).reverse().map((q, i) => ({ ...q, t: i * 4000 }));
    const m = trovaPercorso(campiona(inversa), 3000, [p]);
    expect(m?.invertito).toBe(true);
  });
});

describe('tessere terreno', () => {
  const png = (quota: number) => {
    const v = Math.round((quota + 32768) * 256), data = new Uint8Array(256 * 256 * 3);
    for (let i = 0; i < 256 * 256; i++) { data[i * 3] = (v >> 16) & 255; data[i * 3 + 1] = (v >> 8) & 255; data[i * 3 + 2] = v & 255; }
    return encode({ width: 256, height: 256, data, channels: 3, depth: 8 }).buffer as ArrayBuffer;
  };

  it('legge la quota codificata nel colore (bilineare)', () => {
    const data = new Uint8Array(4 * 4 * 3);
    for (let i = 0; i < 16; i++) { const v = (500 + 32768) * 256; data[i*3] = v >> 16; data[i*3+1] = (v >> 8) & 255; data[i*3+2] = v & 255; }
    expect(quotaDaImmagine({ w: 4, h: 4, ch: 3, dati: data }, 2, 2)).toBeCloseTo(500, 1);
  });

  it('scarica una tessera sola per punti vicini e restituisce le quote', async () => {
    let chiamate = 0;
    const r = await demTerrarium(
      [{ lat: 46.0, lon: 11.1 }, { lat: 46.0005, lon: 11.1005 }],
      { scaricaBuffer: async () => { chiamate++; return png(777); } });
    expect(chiamate).toBe(1);
    expect(r!.quote[0]).toBeCloseTo(777, 0);
    expect(tessera(46.0, 11.1).x).toBeGreaterThan(8000);
  });
});
