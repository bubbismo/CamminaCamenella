// Stima delle calorie con le equazioni metaboliche dell'ACSM (consumo di ossigeno in ml/kg/min):
//   camminata (≈3-6 km/h):  VO2 = 0,1·S + 1,8·S·G + 3,5
//   corsa (>8 km/h):        VO2 = 0,2·S + 0,9·S·G + 3,5
// S = velocità in m/min, G = pendenza (frazione, es. 0,10 = 10%), 3,5 = metabolismo a riposo.
// Tra 6 e 8 km/h si passa gradualmente da una formula all'altra. 1 litro di O2 ≈ 5 kcal.
// È una STIMA (± 15-20% tipico): dipende da andatura, terreno, zaino, forma fisica.
// In discesa si usa solo il termine orizzontale (le equazioni ACSM non coprono le pendenze negative).

export const KCAL_PER_LITRO_O2 = 5;
const WALK_MAX = 100;  // m/min (6 km/h)
const RUN_MIN = 134;   // m/min (8 km/h)

/** Consumo di ossigeno (ml/kg/min) a velocità S (m/min) e pendenza G (frazione). */
export function vo2(S: number, G: number): number {
  const g = Math.max(G, 0);
  const cammina = 0.1 * S + 1.8 * S * g + 3.5;
  const corre = 0.2 * S + 0.9 * S * g + 3.5;
  if (S <= WALK_MAX) return cammina;
  if (S >= RUN_MIN) return corre;
  const t = (S - WALK_MAX) / (RUN_MIN - WALK_MAX);
  return cammina * (1 - t) + corre * t;
}

/** kcal per ora a data velocità e pendenza. */
export function kcalOra(pesoKg: number, S: number, G: number): number {
  return (vo2(S, G) * pesoKg * 60 / 1000) * KCAL_PER_LITRO_O2;
}

export type TrattoCal = { metri: number; secondi: number; salitaM: number };

const PAUSA_S = 120;      // un tratto che dura più di così è una sosta/pausa: non si conta
const VEL_MIN = 10;       // m/min (~0,6 km/h): sotto, si è fermi
const VEL_MAX = 300;      // m/min (18 km/h): oltre, dato incoerente
const PEND_MAX = 0.4;

/** Calorie totali di una sequenza di tratti (metri, secondi, dislivello). Esclude soste e pause. */
export function calorieTratti(pesoKg: number, tratti: TrattoCal[]): number {
  if (!(pesoKg > 0)) return 0;
  let kcal = 0;
  for (const t of tratti) {
    if (t.metri <= 0 || t.secondi <= 0 || t.secondi > PAUSA_S) continue;
    const S = (t.metri / t.secondi) * 60;
    if (S < VEL_MIN || S > VEL_MAX) continue;
    const G = Math.max(-PEND_MAX, Math.min(PEND_MAX, t.salitaM / t.metri));
    kcal += kcalOra(pesoKg, S, G) * (t.secondi / 3600);
  }
  return kcal;
}

export const PESO_MIN = 30, PESO_MAX = 250;
export function pesoValido(v: number): boolean { return Number.isFinite(v) && v >= PESO_MIN && v <= PESO_MAX; }
