import { describe, expect, it } from 'vitest';
import { FORMATO, leggiBackup, nomeFileBackup, riassunto } from './backup';
import { creaGpx, nomeFileGpx } from './gpx';

const camminata = {
  id: 7, started_at: Date.UTC(2026, 10, 23, 9, 0), ended_at: Date.UTC(2026, 10, 23, 10, 0), status: 'done' as const,
  paused_since: null, paused_total_ms: 0, distance_m: 3200, ascent_m: 120, descent_m: 110, active_ms: 3600000,
  calories: 250, rpe: 6, notes: 'Sole & vento <forte>', altimetria: null,
  punti: [
    { t: Date.UTC(2026, 10, 23, 9, 0), lat: 46.0, lon: 11.1, alt: 600, acc: 5, speed: 1 },
    { t: Date.UTC(2026, 10, 23, 9, 1), lat: 46.001, lon: 11.1, alt: 605, acc: 5, speed: 1 },
    { t: Date.UTC(2026, 10, 23, 9, 9), lat: 46.004, lon: 11.1, alt: null, acc: 5, speed: 1, gap: 1 },
  ],
};
const backup = { formato: FORMATO, versione: 1, creato: '2026-11-23T10:00:00Z', camminate: [camminata], percorsi: [], preferenze: { peso: '70' } };

describe('backup', () => {
  it('rilegge un backup valido e ne fa il riassunto', () => {
    const b = leggiBackup(JSON.stringify(backup));
    expect(b.camminate).toHaveLength(1);
    expect(b.preferenze.peso).toBe('70');
    expect(riassunto(b)).toContain('1 camminata (3,2 km');
  });
  it('rifiuta file che non sono backup, con un messaggio chiaro', () => {
    expect(() => leggiBackup('ciao')).toThrow(/non è un file JSON/);
    expect(() => leggiBackup('{"a":1}')).toThrow(/non è un backup di CamminaCamenella/);
    expect(() => leggiBackup(JSON.stringify({ ...backup, versione: 99 }))).toThrow(/più recente/);
    const rotto = { ...backup, camminate: [{ ...camminata, punti: [{ t: 1, lat: 'x', lon: 2 }] }] };
    expect(() => leggiBackup(JSON.stringify(rotto))).toThrow(/punti GPS non validi/);
  });
  it('nome del file con la data', () => {
    expect(nomeFileBackup(new Date(2026, 10, 3))).toBe('CamminaCamenella-backup-2026-11-03.json');
  });
});

describe('GPX', () => {
  const gpx = creaGpx(camminata, camminata.punti);
  it('è un GPX 1.1 con i punti, le quote e gli orari', () => {
    expect(gpx).toContain('<gpx version="1.1" creator="CamminaCamenella"');
    expect(gpx.match(/<trkpt /g)).toHaveLength(3);
    expect(gpx).toContain('<ele>605.0</ele>');
    expect(gpx).toContain('<time>2026-11-23T09:01:00.000Z</time>');
  });
  it('il tratto senza GPS inizia un nuovo segmento', () => {
    expect(gpx.match(/<trkseg>/g)).toHaveLength(2);
  });
  it('protegge i caratteri speciali delle note e include la fatica', () => {
    expect(gpx).toContain('Sole &amp; vento &lt;forte&gt;');
    expect(gpx).toContain('Fatica percepita: 6/10');
  });
  it('nome del file con data e ora', () => {
    expect(nomeFileGpx(new Date(2026, 10, 23, 9, 5).getTime())).toBe('CamminaCamenella-2026-11-23-0905.gpx');
  });
});
