// Segnala quando la schermata iniziale (splash) è finita, così le finestre di dialogo non compaiono sopra di essa.
let finito = false;
const attese: (() => void)[] = [];
export function splashFinito() { finito = true; attese.splice(0).forEach((f) => f()); }
export function dopoSplash(f: () => void) { if (finito) f(); else attese.push(f); }
