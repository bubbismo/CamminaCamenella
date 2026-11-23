/**
 * Salita e discesa con isteresi: si segue il profilo "a zig-zag" e una tappa (da valle a picco o viceversa)
 * conta per intero, ma solo quando l'inversione successiva supera la soglia. Le oscillazioni più piccole
 * della soglia vengono ignorate, così il rumore non si somma.
 */
export function salitaDiscesa(quote: number[], soglia: number): { salita: number; discesa: number } {
  let salita = 0, discesa = 0;
  if (!quote.length) return { salita, discesa };
  let dir = 0, ext = quote[0], cand = quote[0], min = quote[0], max = quote[0];
  for (const q of quote) {
    if (dir === 0) {
      if (q < min) min = q;
      if (q > max) max = q;
      if (q - min >= soglia) { dir = 1; ext = min; cand = q; }
      else if (max - q >= soglia) { dir = -1; ext = max; cand = q; }
    } else if (dir === 1) {
      if (q > cand) cand = q;
      else if (cand - q >= soglia) { salita += cand - ext; ext = cand; dir = -1; cand = q; }
    } else {
      if (q < cand) cand = q;
      else if (q - cand >= soglia) { discesa += ext - cand; ext = cand; dir = 1; cand = q; }
    }
  }
  if (dir === 1) salita += cand - ext; else if (dir === -1) discesa += ext - cand;
  return { salita, discesa };
}

/** Somma di tutte le variazioni positive/negative: è il valore "grezzo", gonfiato dal rumore. */
export function salitaDiscesaGrezza(quote: number[]): { salita: number; discesa: number } {
  let salita = 0, discesa = 0;
  for (let i = 1; i < quote.length; i++) {
    const d = quote[i] - quote[i - 1];
    if (d > 0) salita += d; else discesa -= d;
  }
  return { salita, discesa };
}
