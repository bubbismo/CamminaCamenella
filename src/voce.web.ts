// Voce nel browser (Web Speech API). Sul telefono legge con la voce italiana di sistema, senza rete.
// Safari su iPhone parla solo dopo un tocco dell'utente: per questo `sbloccaVoce` va chiamata
// dentro un tocco (Start, Riprendi, prova della voce).

const sintesi = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

let voceIt: SpeechSynthesisVoice | null = null;
let vociCaricate = false;
function scegliVoce() {
  const s = sintesi();
  if (!s) return;
  const tutte = s.getVoices();
  vociCaricate = tutte.length > 0;
  // Solo voci italiane SUL DISPOSITIVO: quelle "online" (es. Google su Chrome per computer)
  // manderebbero il testo a un server esterno.
  voceIt = tutte.find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('it') && v.localService) ?? null;
}
if (sintesi()) {
  scegliVoce();
  sintesi()!.addEventListener?.('voiceschanged', scegliVoce);
}

/** 'ok'; 'nessuna_it' = il browser ha solo voci online o straniere; 'no' = sintesi vocale assente. */
export function statoVoce(): 'ok' | 'nessuna_it' | 'no' {
  if (!sintesi()) return 'no';
  scegliVoce();
  return vociCaricate && !voceIt ? 'nessuna_it' : 'ok';
}

export function sbloccaVoce() {
  const s = sintesi();
  if (!s) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    s.speak(u);
  } catch {}
}

export function parla(testo: string, volume = 1) {
  const s = sintesi();
  if (!s) return;
  try {
    if (!voceIt) scegliVoce();
    if (vociCaricate && !voceIt) return; // niente voce italiana locale: meglio tacere che inviare il testo fuori
    const u = new SpeechSynthesisUtterance(testo);
    u.lang = 'it-IT';
    if (voceIt) u.voice = voceIt;
    u.volume = volume;
    u.rate = 1;
    s.speak(u);
  } catch {}
}

export function zittisci() {
  try { sintesi()?.cancel(); } catch {}
}
