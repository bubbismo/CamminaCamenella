import * as SQLite from 'expo-sqlite';
import type { Camminata, Punto } from './core/tipi';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('camminacamenella.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS walks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL, ended_at INTEGER,
          status TEXT NOT NULL DEFAULT 'recording',
          paused_since INTEGER, paused_total_ms INTEGER NOT NULL DEFAULT 0,
          distance_m REAL NOT NULL DEFAULT 0, ascent_m REAL NOT NULL DEFAULT 0,
          descent_m REAL NOT NULL DEFAULT 0, active_ms INTEGER NOT NULL DEFAULT 0,
          calories REAL, rpe INTEGER, notes TEXT
        );
        CREATE TABLE IF NOT EXISTS points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          walk_id INTEGER NOT NULL REFERENCES walks(id) ON DELETE CASCADE,
          t INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
          alt REAL, acc REAL, speed REAL, gap INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_points_walk ON points(walk_id, t);
      `);
      try { await db.execAsync('ALTER TABLE points ADD COLUMN gap INTEGER'); } catch {} // vecchie installazioni
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    })();
  }
  return dbPromise;
}

const COLONNE = ['ended_at', 'status', 'paused_since', 'paused_total_ms', 'distance_m', 'ascent_m',
  'descent_m', 'active_ms', 'calories', 'rpe', 'notes'];

export async function nuovaCamminata(startedAt: number): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync("INSERT INTO walks (started_at,status) VALUES (?, 'recording')", startedAt);
  return r.lastInsertRowId;
}

export async function aggiorna(id: number, campi: Partial<Camminata>) {
  const db = await getDb();
  const chiavi = Object.keys(campi).filter((k) => COLONNE.includes(k));
  if (!chiavi.length) return;
  await db.runAsync(`UPDATE walks SET ${chiavi.map((k) => `${k}=?`).join(', ')} WHERE id=?`,
    ...chiavi.map((k) => (campi as any)[k]), id);
}

export async function camminataInCorso(): Promise<Camminata | null> {
  const db = await getDb();
  return db.getFirstAsync<Camminata>("SELECT * FROM walks WHERE status IN ('recording','paused') ORDER BY id DESC LIMIT 1");
}

export async function aggiungiPunto(walkId: number, p: Punto) {
  const db = await getDb();
  await db.runAsync('INSERT INTO points (walk_id,t,lat,lon,alt,acc,speed,gap) VALUES (?,?,?,?,?,?,?,?)',
    walkId, p.t, p.lat, p.lon, p.alt, p.acc, p.speed, p.gap ?? null);
}

export async function ultimoPunto(walkId: number): Promise<Punto | null> {
  const db = await getDb();
  return db.getFirstAsync<Punto>('SELECT t, lat, lon, alt, acc, speed, gap FROM points WHERE walk_id = ? ORDER BY t DESC LIMIT 1', walkId);
}

export async function punti(walkId: number): Promise<Punto[]> {
  const db = await getDb();
  return db.getAllAsync<Punto>('SELECT t, lat, lon, alt, acc, speed, gap FROM points WHERE walk_id = ? ORDER BY t', walkId);
}

export async function elencoCamminate(): Promise<Camminata[]> {
  const db = await getDb();
  return db.getAllAsync<Camminata>("SELECT * FROM walks WHERE status = 'done' ORDER BY started_at DESC");
}

export async function camminata(id: number): Promise<Camminata | null> {
  const db = await getDb();
  return db.getFirstAsync<Camminata>('SELECT * FROM walks WHERE id = ?', id);
}

export async function eliminaCamminata(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM points WHERE walk_id = ?', id);
  await db.runAsync('DELETE FROM walks WHERE id = ?', id);
}
