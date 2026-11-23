import { describe, expect, it } from 'vitest';
import * as avataaars from '@dicebear/avataaars';
import { svgAvatar } from './avatarSvg';
import {
  AVATAR_PREDEFINITO, BARBA, BOCCA, CAPELLI, COLORI_CAPELLI, COLORI_PELLE, COLORI_SFONDO, COLORI_VESTITI, OCCHI, OCCHIALI,
  SOPRACCIGLIA, VESTITI, avatarCasuale,
} from './avatar';

const schema: any = (avataaars as any).schema.properties;
const valori = (k: string): string[] => schema[k].items?.enum ?? schema[k].default;

describe('avatar offline', () => {
  it('tutte le scelte dell\'editor sono valide per lo stile DiceBear', () => {
    const verifica = (k: string, v: string[]) => v.forEach((x) => expect(valori(k), `${k}=${x}`).toContain(x));
    verifica('top', CAPELLI.map((o) => o.v)); verifica('eyes', OCCHI.map((o) => o.v)); verifica('eyebrows', SOPRACCIGLIA.map((o) => o.v));
    verifica('mouth', BOCCA.map((o) => o.v)); verifica('accessories', OCCHIALI.map((o) => o.v).filter(Boolean));
    verifica('facialHair', BARBA.map((o) => o.v).filter(Boolean)); verifica('clothing', VESTITI.map((o) => o.v));
    verifica('hairColor', COLORI_CAPELLI); verifica('skinColor', COLORI_PELLE); verifica('clothesColor', COLORI_VESTITI);
    verifica('hatColor', COLORI_VESTITI);
  });
  it('genera un SVG senza nessun riferimento a rete', () => {
    const svg = svgAvatar(AVATAR_PREDEFINITO);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:\/\//);
    expect(svg).not.toMatch(/<image|href="http/);
  });
  it('occhiali e barba si possono togliere', () => {
    const a = svgAvatar({ ...AVATAR_PREDEFINITO, accessories: null, facialHair: null });
    const b = svgAvatar({ ...AVATAR_PREDEFINITO, accessories: 'sunglasses', facialHair: 'beardMajestic' });
    expect(b.length).toBeGreaterThan(a.length);
  });
  it('lo stesso avatar dà sempre lo stesso disegno; "sorprendimi" dà avatar validi', () => {
    const x = () => svgAvatar(AVATAR_PREDEFINITO);
    expect(x()).toBe(x());
    let seme = 1; const u = () => ((seme = (seme * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 30; i++) {
      const c = avatarCasuale(u);
      expect(valori('top')).toContain(c.top); expect(valori('eyes')).toContain(c.eyes); expect(valori('mouth')).toContain(c.mouth);
      expect(COLORI_SFONDO).toContain(c.backgroundColor);
      expect(svgAvatar(c).length).toBeGreaterThan(500);
    }
  });
});
