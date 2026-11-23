// Service worker minimo: serve per l'installazione e per aprire l'app anche senza rete.
// Strategia "rete prima, poi cache": dopo un aggiornamento si vede subito la versione nuova.
const CACHE = 'camminacamenella-v10';
const TILES = 'camminacamenella-tessere';
const MAX_TESSERE = 800;
const TERRENO = 'camminacamenella-terreno';
const MAX_TERRENO = 60;
const HOST_TESSERE = ['tile.openstreetmap.org', 'tile.opentopomap.org', 'a.tile.opentopomap.org', 'b.tile.opentopomap.org', 'c.tile.opentopomap.org'];
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE && x !== TILES && x !== TERRENO).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
// Tessere della mappa: cache prima (le mappe già viste funzionano con poca rete), con tetto massimo.
async function tessera(req) {
  const c = await caches.open(TILES);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && (r.ok || r.type === 'opaque')) {
    c.put(req, r.clone());
    c.keys().then((k) => { if (k.length > MAX_TESSERE) c.delete(k[0]); });
  }
  return r;
}
// Tessere di terreno (quote): poche e pesanti, tenute in una cache separata.
async function terreno(req) {
  const c = await caches.open(TERRENO);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && r.ok) {
    c.put(req, r.clone());
    c.keys().then((k) => { if (k.length > MAX_TERRENO) c.delete(k[0]); });
  }
  return r;
}
self.addEventListener('fetch', (e) => {
  try {
    const u = new URL(e.request.url);
    if (e.request.method === 'GET' && u.hostname === 's3.amazonaws.com' && u.pathname.startsWith('/elevation-tiles-prod/')) {
      e.respondWith(terreno(e.request)); return;
    }
    if (e.request.method === 'GET' && HOST_TESSERE.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))) {
      e.respondWith(tessera(e.request)); return;
    }
  } catch (_) {}
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copia = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
