import { describe, expect, it } from 'vitest';
import { diDistanza, diDurata, diPasso, fraseRecord, frasePeriodica, Istantanea, leggiPrefVoce, PrefVoce, prossimiAnnunci } from './annunci';
import type { Parziale } from './parziali';

const pref = (x: Partial<PrefVoce> = {}): PrefVoce => ({ attiva: true, ogni: 'km', dati: ['tempo', 'distanza', 'passo', 'pause'], volume: 1, ...x });
const ist = (x: Partial<Istantanea> = {}): Istantanea => ({ distanzaM: 0, movimentoMs: 0, salitaM: 0, fermo: false, pausa: false, parziali: [], ...x });
const parz = (n: number, passoSKm: number): Parziale => ({ n, daM: (n - 1) * 1000, aM: n * 1000, metri: 1000, ms: passoSKm * 1000, passoSKm, salita: 0, discesa: 0, completo: true });

describe('frasi', () => {
  it('distanze', () => {
    expect(diDistanza(0)).toBe('0 metri');
    expect(diDistanza(500)).toBe('500 metri');
    expect(diDistanza(1000)).toBe('un chilometro');
    expect(diDistanza(1500)).toBe('un chilometro e 500 metri');
    expect(diDistanza(12004)).toBe('12 chilometri');
    expect(diDistanza(2996)).toBe('2 chilometri'); // arrotondamento a 1000 m del resto: non "2 chilometri e 1000 metri"
  });
  it('durate e passo', () => {
    expect(diDurata(61000)).toBe('un minuto e un secondo');
    expect(diDurata(12 * 60000 + 5000)).toBe('12 minuti e 5 secondi');
    expect(diDurata(600000)).toBe('10 minuti');
    expect(diDurata(3600000 + 5 * 60000 + 30000)).toBe("un'ora e 5 minuti");
    expect(diPasso(716)).toBe('11 minuti e 56 secondi al chilometro');
    expect(diPasso(0)).toBeNull();
  });
  it('frase del record', () => {
    expect(fraseRecord({ cat: 'km', valore: 302000, precedente: 320000 })).toBe('Nuovo record personale! Km più veloce: 5 minuti e 2 secondi.');
    expect(fraseRecord({ cat: 'distanza', valore: 12340, precedente: 10000 })).toBe('Nuovo record personale! Uscita più lunga: 12 chilometri e 340 metri.');
  });
  it('frase al km: traguardo esatto, tempo, passo dell\'ultimo km', () => {
    const f = frasePeriodica(ist({ distanzaM: 2012, movimentoMs: 24 * 60000, parziali: [parz(1, 730), parz(2, 716)] }), pref());
    expect(f).toBe('2 chilometri. Tempo 24 minuti. Ultimo chilometro 11 minuti e 56 secondi al chilometro.');
  });
  it('frase a tempo: distanza attuale e passo medio', () => {
    const f = frasePeriodica(ist({ distanzaM: 850, movimentoMs: 600000, salitaM: 42 }), pref({ ogni: '10min', dati: ['tempo', 'distanza', 'passo', 'salita'] }));
    expect(f).toBe('850 metri. Tempo 10 minuti. Passo medio 11 minuti e 46 secondi al chilometro. Salita 42 metri.');
  });
});

describe('quando parlare', () => {
  it('al primo controllo non dice nulla; poi al km', () => {
    let r = prossimiAnnunci(null, ist({ distanzaM: 1500 }), pref());
    expect(r.frasi).toEqual([]);
    r = prossimiAnnunci(r.stato, ist({ distanzaM: 1900 }), pref());
    expect(r.frasi).toEqual([]);
    r = prossimiAnnunci(r.stato, ist({ distanzaM: 2003, movimentoMs: 1500000 }), pref());
    expect(r.frasi.length).toBe(1);
    r = prossimiAnnunci(r.stato, ist({ distanzaM: 2010 }), pref());
    expect(r.frasi).toEqual([]);
  });
  it('pausa automatica e ripresa', () => {
    let r = prossimiAnnunci(null, ist(), pref());
    r = prossimiAnnunci(r.stato, ist({ fermo: true }), pref());
    expect(r.frasi).toEqual(['Pausa automatica.']);
    r = prossimiAnnunci(r.stato, ist({ fermo: false }), pref());
    expect(r.frasi).toEqual(['Si riparte.']);
    r = prossimiAnnunci(r.stato, ist({ pausa: true }), pref());
    expect(r.frasi).toEqual(['Pausa.']);
  });
  it('spenta: silenzio; senza "pausa e ripresa": niente avvisi di pausa', () => {
    let r = prossimiAnnunci(null, ist(), pref({ attiva: false }));
    r = prossimiAnnunci(r.stato, ist({ distanzaM: 1200, fermo: true }), pref({ attiva: false }));
    expect(r.frasi).toEqual([]);
    r = prossimiAnnunci(null, ist(), pref({ dati: ['tempo'] }));
    r = prossimiAnnunci(r.stato, ist({ fermo: true }), pref({ dati: ['tempo'] }));
    expect(r.frasi).toEqual([]);
  });
  it('cambio di frequenza durante la corsa: nessun annuncio a sorpresa', () => {
    let r = prossimiAnnunci(null, ist({ distanzaM: 3200, movimentoMs: 600000 }), pref({ ogni: '10min' }));
    r = prossimiAnnunci(r.stato, ist({ distanzaM: 3201, movimentoMs: 601000 }), pref({ ogni: 'km' }));
    expect(r.frasi).toEqual([]);
  });
  it('preferenze lette con tolleranza', () => {
    const p = leggiPrefVoce((_k, d) => d);
    expect(p).toEqual({ attiva: true, ogni: 'km', dati: ['tempo', 'distanza', 'passo', 'pause', 'record'], volume: 1 });
    const q = leggiPrefVoce((k) => ({ voce: '0', voce_ogni: 'boh', voce_dati: 'tempo,xyz', voce_volume: '7' } as any)[k]);
    expect(q).toEqual({ attiva: false, ogni: 'km', dati: ['tempo'], volume: 1 });
  });
});
