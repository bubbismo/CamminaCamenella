// Genera i PNG dell'icona dal disegno in glifo.mjs. Serve Chrome e puppeteer-core.
// Uso: node grafica/render.mjs <cartella-di-uscita>   poi   python3 grafica/esporta.py <cartella>
import puppeteer from 'puppeteer-core';
import { VARIANTI } from './glifo.mjs';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1024, height: 1024 });
for (const [n, s] of Object.entries(VARIANTI)) {
  await p.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`);
  await p.screenshot({ path: `${out}/${n}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
}
await b.close();
