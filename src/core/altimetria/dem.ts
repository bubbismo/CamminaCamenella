// Quote del terreno (DEM) da servizi gratuiti raggiungibili dal browser.
import { decode } from 'fast-png';

export type PuntoLL = { lat: number; lon: number };
export type RisultatoDem = { quote: (number | null)[]; sigma: number; fonte: string };

export type Dipendenze = {
  /** scarica un URL e restituisce i byte (per le tessere) */
  scaricaBuffer?: (url: string) => Promise<ArrayBuffer>;
  scaricaJson?: (url: string) => Promise<any>;
  attendi?: (ms: number) => Promise<void>;
  /** annullamento / avanzamento facoltativi */
  maxTessere?: number;
};

const dip = (d: Dipendenze = {}) => ({
  scaricaBuffer: d.scaricaBuffer ?? (async (u: string) => {
    const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer();
  }),
  scaricaJson: d.scaricaJson ?? (async (u: string) => {
    const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
  }),
  attendi: d.attendi ?? ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms))),
  maxTessere: d.maxTessere ?? 80,
});

// ---- Tessere "terrarium" (AWS Open Data): la quota è codificata nel colore del pixel. ----
// Il telefono scarica poche tessere (ognuna copre ~2 km) e legge le quote da sé:
// al servizio non arrivano i punti del percorso, solo quali tessere servono.
const Z = 14;
const URL_TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

export function tessera(lat: number, lon: number, z = Z) {
  const n = 2 ** z, rad = Math.PI / 180;
  const fx = ((lon + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan(lat * rad) + 1 / Math.cos(lat * rad)) / Math.PI) / 2) * n;
  return { x: Math.floor(fx), y: Math.floor(fy), px: (fx - Math.floor(fx)) * 256, py: (fy - Math.floor(fy)) * 256 };
}

type Immagine = { w: number; h: number; ch: number; dati: ArrayLike<number> };

function quotaPixel(im: Immagine, x: number, y: number): number | null {
  x = Math.min(im.w - 1, Math.max(0, x)); y = Math.min(im.h - 1, Math.max(0, y));
  const i = (y * im.w + x) * im.ch;
  const q = im.dati[i] * 256 + im.dati[i + 1] + im.dati[i + 2] / 256 - 32768;
  return q < -500 || q > 9000 ? null : q;
}

/** Interpolazione bilineare tra i 4 pixel vicini. */
export function quotaDaImmagine(im: Immagine, px: number, py: number): number | null {
  const x0 = Math.floor(px - 0.5), y0 = Math.floor(py - 0.5);
  const fx = px - 0.5 - x0, fy = py - 0.5 - y0;
  const q = [quotaPixel(im, x0, y0), quotaPixel(im, x0 + 1, y0), quotaPixel(im, x0, y0 + 1), quotaPixel(im, x0 + 1, y0 + 1)];
  if (q.some((v) => v == null)) return null;
  const a = q[0]! * (1 - fx) + q[1]! * fx, b = q[2]! * (1 - fx) + q[3]! * fx;
  return a * (1 - fy) + b * fy;
}

export async function demTerrarium(punti: PuntoLL[], d?: Dipendenze): Promise<RisultatoDem | null> {
  const D = dip(d);
  const gruppi = new Map<string, { x: number; y: number; voci: { i: number; px: number; py: number }[] }>();
  punti.forEach((p, i) => {
    const t = tessera(p.lat, p.lon);
    const k = `${t.x}/${t.y}`;
    if (!gruppi.has(k)) gruppi.set(k, { x: t.x, y: t.y, voci: [] });
    gruppi.get(k)!.voci.push({ i, px: t.px, py: t.py });
  });
  if (gruppi.size > D.maxTessere) return null;
  const quote: (number | null)[] = new Array(punti.length).fill(null);
  for (const g of gruppi.values()) {
    try {
      const buf = await D.scaricaBuffer(`${URL_TERRARIUM}/${Z}/${g.x}/${g.y}.png`);
      const png = decode(new Uint8Array(buf));
      const im: Immagine = { w: png.width, h: png.height, ch: png.channels, dati: png.data as any };
      for (const v of g.voci) quote[v.i] = quotaDaImmagine(im, v.px, v.py);
    } catch { /* tessera non disponibile: quei punti restano senza DEM */ }
  }
  return { quote, sigma: 6, fonte: 'Tessere terreno AWS (Terrain Tiles)' };
}

// ---- Open-Meteo Elevation (Copernicus ~90 m): riserva, più grossolana. ----
export async function demOpenMeteo(punti: PuntoLL[], d?: Dipendenze): Promise<RisultatoDem | null> {
  const D = dip(d);
  const quote: (number | null)[] = [];
  for (let i = 0; i < punti.length; i += 100) {
    const blocco = punti.slice(i, i + 100);
    const url = 'https://api.open-meteo.com/v1/elevation?latitude=' + blocco.map((p) => p.lat.toFixed(5)).join(',')
      + '&longitude=' + blocco.map((p) => p.lon.toFixed(5)).join(',');
    try {
      const j = await D.scaricaJson(url);
      for (const q of j.elevation as number[]) quote.push(Number.isFinite(q) ? q : null);
    } catch { for (let k = 0; k < blocco.length; k++) quote.push(null); }
    await D.attendi(150); // limite del servizio: 600 chiamate/minuto
  }
  return { quote, sigma: 12, fonte: 'Open-Meteo (Copernicus 90 m)' };
}

const frazioneValida = (q: (number | null)[]) => (q.length ? q.filter((v) => v != null).length / q.length : 0);

/** Prova le fonti in ordine; la prima che copre almeno l'80% dei punti vince. */
export async function ottieniDem(punti: PuntoLL[], d?: Dipendenze): Promise<RisultatoDem | null> {
  if (!punti.length) return null;
  for (const fonte of [demTerrarium, demOpenMeteo]) {
    try {
      const r = await fonte(punti, d);
      if (r && frazioneValida(r.quote) >= 0.8) return r;
    } catch { /* passa alla fonte successiva */ }
  }
  return null;
}
