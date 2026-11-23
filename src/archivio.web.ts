// Archivio per il browser: IndexedDB. Stessa interfaccia di archivio.native.ts.
import type { Camminata, Punto } from './core/tipi';

let dbPromise: Promise<IDBDatabase> | null = null;

function apri(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((ok, ko) => {
      const rq = indexedDB.open('camminacamenella', 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        db.createObjectStore('walks', { keyPath: 'id', autoIncrement: true });
        const pts = db.createObjectStore('points', { keyPath: 'id', autoIncrement: true });
        pts.createIndex('walk', ['walk_id', 't']);
      };
      rq.onsuccess = () => {
        ok(rq.result);
        // Chiede a Safari/Chrome di non cancellare i dati quando serve spazio.
        try { (navigator as any).storage?.persist?.(); } catch {}
      };
      rq.onerror = () => ko(rq.error);
    });
  }
  return dbPromise;
}

function rich<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
}

async function store(nome: 'walks' | 'points', rw = false) {
  const db = await apri();
  return db.transaction(nome, rw ? 'readwrite' : 'readonly').objectStore(nome);
}

export async function nuovaCamminata(startedAt: number): Promise<number> {
  const w: Omit<Camminata, 'id'> = {
    started_at: startedAt, ended_at: null, status: 'recording', paused_since: null, paused_total_ms: 0,
    distance_m: 0, ascent_m: 0, descent_m: 0, active_ms: 0, calories: null, rpe: null, notes: null,
  };
  return (await rich((await store('walks', true)).add(w))) as number;
}

export async function camminata(id: number): Promise<Camminata | null> {
  return ((await rich((await store('walks')).get(id))) as Camminata) ?? null;
}

export async function aggiorna(id: number, campi: Partial<Camminata>) {
  const w = await camminata(id);
  if (!w) return;
  await rich((await store('walks', true)).put({ ...w, ...campi, id }));
}

export async function camminataInCorso(): Promise<Camminata | null> {
  const tutte = (await rich((await store('walks')).getAll())) as Camminata[];
  const attive = tutte.filter((w) => w.status !== 'done');
  return attive.length ? attive[attive.length - 1] : null;
}

export async function camminateAperte(): Promise<Camminata[]> {
  const tutte = (await rich((await store('walks')).getAll())) as Camminata[];
  return tutte.filter((w) => w.status !== 'done').sort((a, b) => a.id - b.id);
}

export async function aggiungiPunto(walkId: number, p: Punto) {
  await rich((await store('points', true)).add({ ...p, walk_id: walkId, gap: p.gap ?? null }));
}

export async function punti(walkId: number): Promise<Punto[]> {
  const r = (await rich((await store('points')).index('walk').getAll(
    IDBKeyRange.bound([walkId, 0], [walkId, Number.MAX_SAFE_INTEGER])))) as any[];
  return r.map(({ t, lat, lon, alt, acc, speed, gap }) => ({ t, lat, lon, alt, acc, speed, gap }));
}

export async function ultimoPunto(walkId: number): Promise<Punto | null> {
  const p = await punti(walkId);
  return p.length ? p[p.length - 1] : null;
}

export async function elencoCamminate(): Promise<Camminata[]> {
  const tutte = (await rich((await store('walks')).getAll())) as Camminata[];
  return tutte.filter((w) => w.status === 'done').sort((a, b) => b.started_at - a.started_at);
}

export async function eliminaCamminata(id: number) {
  const db = await apri();
  const tx = db.transaction(['walks', 'points'], 'readwrite');
  tx.objectStore('walks').delete(id);
  const idx = tx.objectStore('points').index('walk');
  const cur = idx.openCursor(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]));
  cur.onsuccess = () => { const c = cur.result; if (c) { c.delete(); c.continue(); } };
  await new Promise<void>((ok, ko) => { tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error); });
}
