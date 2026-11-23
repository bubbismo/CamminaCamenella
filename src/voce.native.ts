// Voce su Android/iOS nativo: sintesi vocale del sistema (expo-speech), senza rete.
import * as Speech from 'expo-speech';

export const statoVoce = (): 'ok' | 'nessuna_it' | 'no' => 'ok';
export function sbloccaVoce() { /* sul nativo non serve */ }
export function parla(testo: string, volume = 1) {
  Speech.speak(testo, { language: 'it-IT', volume, rate: 1 });
}
export function zittisci() { Speech.stop().catch(() => {}); }
