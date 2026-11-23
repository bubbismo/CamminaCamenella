// Tracciamento nel browser: funziona solo con lo schermo acceso e l'app in primo piano.
import { aggiungiPunto, ultimoPunto, camminataInCorso } from './archivio';
import { puntoValido } from './core/geo';
import type { Punto } from './core/tipi';

export const sfondoPossibile = false;

let watchId: number | null = null;
let walkAttiva: number | null = null;
let primoDopoInterruzione = false;
let ultimaAcc: number | null = null;
let ultimaT: number | null = null;
let ultimoSalvato: Punto | null = null;
let sentinella: any = null;

async function bloccaSchermo() {
  try {
    const wl = (navigator as any).wakeLock;
    if (wl && !sentinella) {
      sentinella = await wl.request('screen');
      sentinella.addEventListener('release', () => { sentinella = null; });
    }
  } catch { /* non supportato o negato: l'utente è avvisato nell'interfaccia */ }
}

if (typeof document !== 'undefined') {
  // Il wake lock viene rilasciato quando la pagina va in secondo piano: lo richiediamo al ritorno.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && watchId != null) bloccaSchermo();
  });
}

export async function richiediPermessi(): Promise<'ok' | 'primoPiano' | 'negato'> {
  if (!('geolocation' in navigator)) return 'negato';
  return new Promise((ok) => {
    navigator.geolocation.getCurrentPosition(() => ok('primoPiano'), () => ok('negato'),
      { enableHighAccuracy: true, timeout: 20000 });
  });
}

export async function avviaTracciamento(walkId: number, dopoInterruzione = false) {
  if (watchId != null) return;
  walkAttiva = walkId;
  primoDopoInterruzione = dopoInterruzione;
  ultimoSalvato = await ultimoPunto(walkId);
  await bloccaSchermo();
  watchId = navigator.geolocation.watchPosition(async (pos) => {
    if (walkAttiva == null) return;
    const w = await camminataInCorso();
    if (!w || w.id !== walkAttiva || w.status !== 'recording') return;
    const p: Punto = {
      t: pos.timestamp, lat: pos.coords.latitude, lon: pos.coords.longitude,
      alt: pos.coords.altitude, acc: pos.coords.accuracy, speed: pos.coords.speed,
    };
    ultimaAcc = p.acc; ultimaT = p.t;
    if (primoDopoInterruzione) {
      // Dopo una sospensione il primo punto buono si accetta comunque: il tratto è marcato "stimato".
      if (p.acc != null && p.acc > 50) return;
      p.gap = ultimoSalvato ? 1 : null;
      primoDopoInterruzione = false;
    } else if (!puntoValido(ultimoSalvato, p)) return;
    await aggiungiPunto(walkAttiva, p);
    ultimoSalvato = p;
  }, (err) => { ultimaAcc = null; ultimaT = null; console.warn('GPS', err.message); },
  { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
}

export async function fermaTracciamento() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null; walkAttiva = null; ultimoSalvato = null; ultimaAcc = null; ultimaT = null;
  try { await sentinella?.release(); } catch {}
  sentinella = null;
}

export async function staTracciando(): Promise<boolean> {
  return watchId != null;
}

export async function statoGps(_walkId: number): Promise<{ acc: number | null; t: number | null }> {
  return { acc: ultimaAcc, t: ultimaT };
}
