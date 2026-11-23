// Esportazione GPX 1.1 di una camminata, per aprirla in altre app (Komoot, Strava, OsmAnd, Google Earth…).
import type { Camminata, Punto } from './tipi';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** I tratti senza GPS (app sospesa) iniziano un nuovo segmento: le altre app non li disegnano come percorso reale. */
export function creaGpx(w: Pick<Camminata, 'started_at' | 'notes' | 'rpe'>, punti: Punto[], nome?: string): string {
  const titolo = nome ?? `Camminata del ${new Date(w.started_at).toLocaleDateString('it-IT')}`;
  const segmenti: Punto[][] = [];
  for (const p of punti) {
    if (!segmenti.length || p.gap) segmenti.push([]);
    segmenti[segmenti.length - 1].push(p);
  }
  const pt = (p: Punto) =>
    `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">` +
    (p.alt != null ? `<ele>${p.alt.toFixed(1)}</ele>` : '') +
    `<time>${new Date(p.t).toISOString()}</time></trkpt>`;
  const desc = [w.rpe != null ? `Fatica percepita: ${w.rpe}/10` : '', w.notes ?? ''].filter(Boolean).join(' — ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CamminaCamenella" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(titolo)}</name><time>${new Date(w.started_at).toISOString()}</time></metadata>
  <trk>
    <name>${esc(titolo)}</name>${desc ? `\n    <desc>${esc(desc)}</desc>` : ''}
    <type>walking</type>
${segmenti.map((s) => `    <trkseg>\n${s.map(pt).join('\n')}\n    </trkseg>`).join('\n')}
  </trk>
</gpx>
`;
}

export function nomeFileGpx(startedAt: number): string {
  const d = new Date(startedAt), p = (n: number) => String(n).padStart(2, '0');
  return `CamminaCamenella-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.gpx`;
}
