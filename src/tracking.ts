import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { getDb, camminataInCorso, punti, Punto } from './db';
import { puntoValido, statistiche } from './geo';

export const TASK_GPS = 'camminacamenella-gps';

// Il task gira anche con lo schermo spento: scrive i punti buoni direttamente nel database.
// DEVE essere definito a livello di modulo (importato da index.ts).
TaskManager.defineTask(TASK_GPS, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const w = await camminataInCorso();
  if (!w || w.status !== 'recording') return;
  const db = await getDb();
  let ultimo = await db.getFirstAsync<Punto>(
    'SELECT t, lat, lon, alt, acc, speed FROM points WHERE walk_id = ? ORDER BY t DESC LIMIT 1', w.id);
  for (const l of locations) {
    const p: Punto = {
      t: l.timestamp, lat: l.coords.latitude, lon: l.coords.longitude,
      alt: l.coords.altitude, acc: l.coords.accuracy, speed: l.coords.speed,
    };
    if (!puntoValido(ultimo, p)) continue;
    await db.runAsync('INSERT INTO points (walk_id,t,lat,lon,alt,acc,speed) VALUES (?,?,?,?,?,?,?)',
      w.id, p.t, p.lat, p.lon, p.alt, p.acc, p.speed);
    ultimo = p;
  }
});

export async function richiediPermessi(): Promise<'ok' | 'primoPiano' | 'negato'> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'negato';
  try { await Notifications.requestPermissionsAsync(); } catch {}
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'ok' : 'primoPiano';
}

async function avviaServizio() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK_GPS)) return;
  await Location.startLocationUpdatesAsync(TASK_GPS, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 3,
    timeInterval: 2000,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'CamminaCamenella è in cammino 🏃',
      notificationBody: 'Sto registrando il tuo percorso. Forza!',
      notificationColor: '#E5202A',
      killServiceOnDestroy: false,
    },
  });
}

async function fermaServizio() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK_GPS)) await Location.stopLocationUpdatesAsync(TASK_GPS);
}

export async function avvia(): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync("INSERT INTO walks (started_at,status) VALUES (?, 'recording')", Date.now());
  await avviaServizio();
  return r.lastInsertRowId;
}

export async function pausa(id: number) {
  const db = await getDb();
  await db.runAsync("UPDATE walks SET status='paused', paused_since=? WHERE id=? AND status='recording'", Date.now(), id);
}

export async function riprendi(id: number) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE walks SET status='recording', paused_total_ms = paused_total_ms + (? - paused_since), paused_since=NULL WHERE id=? AND status='paused'",
    Date.now(), id);
}

// Chiude la camminata e salva i totali. Resta in stato 'done'.
export async function termina(id: number) {
  await fermaServizio();
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    "UPDATE walks SET paused_total_ms = paused_total_ms + CASE WHEN paused_since IS NOT NULL THEN (? - paused_since) ELSE 0 END, paused_since=NULL WHERE id=?",
    now, id);
  const w = await db.getFirstAsync<{ started_at: number; paused_total_ms: number }>('SELECT started_at, paused_total_ms FROM walks WHERE id=?', id);
  const s = statistiche(await punti(id));
  await db.runAsync(
    "UPDATE walks SET status='done', ended_at=?, active_ms=?, distance_m=?, ascent_m=?, descent_m=? WHERE id=?",
    now, now - w!.started_at - w!.paused_total_ms, s.distanzaM, s.salitaM, s.discesaM, id);
}
