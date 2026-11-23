import { describe, expect, it } from 'vitest';
import { calcolaStatistiche, fasce, variazione } from './statistiche';
import type { Camminata } from './tipi';

const oggi = new Date(2026, 10, 23, 18, 0); // lunedì 23 novembre 2026, ore 18
const w = (giorno: Date, km: number, kcal: number | null, extra: Partial<Camminata> = {}): Camminata => ({
  id: Math.random(), started_at: giorno.getTime(), ended_at: null, status: 'done', paused_since: null, paused_total_ms: 0,
  distance_m: km * 1000, ascent_m: 100, descent_m: 90, active_ms: 3600000, calories: kcal, rpe: null, notes: null, ...extra,
});

describe('fasce del periodo', () => {
  it('settimana: 7 giorni che finiscono oggi, etichette dei giorni', () => {
    const f = fasce('settimana', oggi);
    expect(f).toHaveLength(7);
    expect(f[6].lunga).toBe('lun 23 nov');
    expect(f[0].lunga).toBe('mar 17 nov');
  });
  it('mese: 30 giorni; anno: 12 mesi che finiscono col mese corrente', () => {
    expect(fasce('mese', oggi)).toHaveLength(30);
    const a = fasce('anno', oggi);
    expect(a).toHaveLength(12);
    expect(a[11].lunga).toBe('nov 2026');
    expect(a[0].lunga).toBe('dic 2025');
  });
});

describe('totali', () => {
  const dati = [
    w(new Date(2026, 10, 23, 8), 5, 300),
    w(new Date(2026, 10, 23, 17), 2, 100),          // stesso giorno: si somma
    w(new Date(2026, 10, 18, 9), 3.5, null),        // senza calorie (peso non impostato)
    w(new Date(2026, 10, 10, 9), 4, 250),           // settimana precedente
    w(new Date(2026, 10, 22, 9), 9, 999, { status: 'recording' }), // in corso: esclusa
  ];
  it('somma per giorno e per periodo, ignora le camminate non concluse', () => {
    const s = calcolaStatistiche(dati, 'settimana', oggi);
    expect(s.fasce[6].km).toBeCloseTo(7);
    expect(s.fasce[6].kcal).toBe(400);
    expect(s.fasce[6].n).toBe(2);
    expect(s.fasce[1].km).toBeCloseTo(3.5);
    expect(s.totale.km).toBeCloseTo(10.5);
    expect(s.totale.kcal).toBe(400);
    expect(s.totale.n).toBe(3);
  });
  it('confronta con il periodo precedente della stessa durata', () => {
    const s = calcolaStatistiche(dati, 'settimana', oggi);
    expect(s.precedente.km).toBeCloseTo(4);
    expect(variazione(s.totale.km, s.precedente.km)).toBe(163);
    expect(variazione(5, 0)).toBeNull();
  });
  it('nel mese ci sono tutte e quattro le camminate concluse', () => {
    expect(calcolaStatistiche(dati, 'mese', oggi).totale.n).toBe(4);
  });
});
