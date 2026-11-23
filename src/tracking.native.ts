import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { aggiungiPunto, camminataInCorso, ultimoPunto } from './archivio';
import { puntoValido } from './core/geo';
import type { Punto } from './core/tipi';

const TASK_GPS = 'camminacamenella-gps';

// Il task gira anche con lo schermo spento: scrive i punti buoni direttamente nell'archivio.
// DEVE essere definito a livello di modulo (importato da index.ts).
TaskManager.defineTask(TASK_GPS, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const w = await camminataInCorso();
  if (!w || w.status !== 'recording') return;
  let ultimo = await ultimoPunto(w.id);
  for (const l of locations) {
    const p: Punto = {
      t: l.timestamp, lat: l.coords.latitude, lon: l.coords.longitude,
      alt: l.coords.altitude, alt_acc: l.coords.altitudeAccuracy, acc: l.coords.accuracy, speed: l.coords.speed,
    };
    if (!puntoValido(ultimo, p)) continue;
    await aggiungiPunto(w.id, p);
    ultimo = p;
  }
});

export const sfondoPossibile = true;

export async function richiediPermessi(): Promise<'ok' | 'primoPiano' | 'negato'> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'negato';
  try { await Notifications.requestPermissionsAsync(); } catch {}
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'ok' : 'primoPiano';
}

export async function avviaTracciamento(_walkId: number, _dopoInterruzione = false) {
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

export async function fermaTracciamento() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK_GPS)) await Location.stopLocationUpdatesAsync(TASK_GPS);
}

export async function staTracciando(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TASK_GPS);
}

export async function statoGps(walkId: number): Promise<{ acc: number | null; t: number | null; errore: string | null }> {
  const p = await ultimoPunto(walkId);
  return { acc: p?.acc ?? null, t: p?.t ?? null, errore: null };
}
