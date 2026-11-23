import * as SQLite from 'expo-sqlite';

export type Punto = {
  t: number; lat: number; lon: number; alt: number | null; acc: number | null; speed: number | null;
};

export type Camminata = {
  id: number; started_at: number; ended_at: number | null; status: 'recording' | 'paused' | 'done';
  paused_since: number | null; paused_total_ms: number;
  distance_m: number; ascent_m: number; descent_m: number; active_ms: number;
  calories: number | null; rpe: number | null; notes: string | null;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
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
          alt REAL, acc REAL, speed REAL
        );
        CREATE INDEX IF NOT EXISTS idx_points_walk ON points(walk_id, t);
      `);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    })();
  }
  return dbPromise;
}

export async function camminataInCorso(): Promise<Camminata | null> {
  const db = await getDb();
  return db.getFirstAsync<Camminata>("SELECT * FROM walks WHERE status IN ('recording','paused') ORDER BY id DESC LIMIT 1");
}

export async function punti(walkId: number): Promise<Punto[]> {
  const db = await getDb();
  return db.getAllAsync<Punto>('SELECT t, lat, lon, alt, acc, speed FROM points WHERE walk_id = ? ORDER BY t', walkId);
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
