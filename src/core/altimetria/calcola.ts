// Calcolo del dislivello: puro (nessun accesso a rete o archivio), identico su web e Android.
import type { Punto } from '../tipi';
import { campiona, Campione } from './campiona';
import { fondi } from './kalman';
import { salitaDiscesa, salitaDiscesaGrezza } from './isteresi';
import { Corrispondenza, fondiConProfilo } from './percorsi';
import { calorieTratti, TrattoCal } from '../calorie';

export const SOGLIA_PREDEFINITA_M = 3;

export type Fonte = 'gps_filtrato' | 'dem' | 'ripetuto';
export type SD = { salita: number; discesa: number };

export type RisultatoAltimetria = {
  fonte: Fonte;
  salita: number; discesa: number;       // valore finale
  grezzo: SD;                            // somma dei saltelli del GPS (gonfiato)
  filtrato: SD;                          // solo GPS, filtrato e con isteresi
  dem?: SD;                              // con correzione DEM
  ripetuto?: SD;                         // con profilo del percorso ripetuto
  campioni: Campione[];
  quote: number[];                       // curva finale
  offsetGpsDem: number | null;
};

export type DemInput = { quote: (number | null)[]; sigma: number };

export function calcolaAltimetria(pts: Punto[], o: {
  soglia?: number; dem?: DemInput | null; corrispondenza?: Corrispondenza | null;
} = {}): RisultatoAltimetria {
  const soglia = o.soglia ?? SOGLIA_PREDEFINITA_M;
  const campioni = campiona(pts);
  const z = campioni.map((c) => c.z), r = campioni.map((c) => c.r);

  const grezzo = salitaDiscesaGrezza(pts.map((p) => p.alt).filter((a): a is number => a != null));
  const solo = fondi(z, r);
  const filtrato = salitaDiscesa(solo.h, soglia);

  let fonte: Fonte = 'gps_filtrato';
  let quote = solo.h, offset: number | null = null;
  let dem: SD | undefined, ripetuto: SD | undefined;

  if (o.dem && o.dem.quote.length === campioni.length) {
    const f = fondi(z, r, o.dem.quote, { rDem: o.dem.sigma ** 2 });
    quote = f.h; offset = f.offsetGpsDem; fonte = 'dem';
    dem = salitaDiscesa(quote, soglia);
  }
  if (o.corrispondenza && quote.length > 2) {
    quote = fondiConProfilo(quote, o.corrispondenza);
    fonte = 'ripetuto';
    ripetuto = salitaDiscesa(quote, soglia);
  }
  const fin = salitaDiscesa(quote, soglia);
  return { fonte, salita: fin.salita, discesa: fin.discesa, grezzo, filtrato, dem, ripetuto, campioni, quote, offsetGpsDem: offset };
}

/** Stima veloce durante la corsa (solo GPS, nessuna rete). */
export function dislivelloLive(pts: Punto[], soglia = SOGLIA_PREDEFINITA_M): SD {
  const r = calcolaAltimetria(pts, { soglia });
  return { salita: r.salita, discesa: r.discesa };
}

/** Calorie stimate dal percorso: velocità e pendenza di ogni tratto da 25 m (quota già filtrata). */
export function calorieDaRisultato(r: Pick<RisultatoAltimetria, 'campioni' | 'quote'>, pesoKg: number): number {
  const tratti: TrattoCal[] = [];
  for (let i = 1; i < r.campioni.length; i++) {
    tratti.push({
      metri: r.campioni[i].d - r.campioni[i - 1].d,
      secondi: (r.campioni[i].t - r.campioni[i - 1].t) / 1000,
      salitaM: r.quote[i] - r.quote[i - 1],
    });
  }
  return calorieTratti(pesoKg, tratti);
}
