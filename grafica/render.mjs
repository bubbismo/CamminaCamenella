import puppeteer from 'puppeteer-core';
import { VARIANTI } from './icona.mjs';
import fs from 'node:fs';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
for (const [nome, svg] of Object.entries(VARIANTI)) {
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await p.screenshot({ path: `${out}/${nome}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
}
await b.close();
