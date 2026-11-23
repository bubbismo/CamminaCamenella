// Genera l'icona di CamminaCamenella: indice e medio come due gambe in passo, sotto una mano.
// Uso: node grafica/icona.mjs   (richiede Chrome; scrive in assets/ e public/)
export const PELLE = '#FFC9A0', PELLE_OMBRA = '#E8A070', CONTORNO = '#9C4A22', UNGHIA = '#FFE3CF';

/** Il disegno, in un quadrato 1024x1024. `mono` = silhouette a tinta unica per l'icona monocromatica. */
export function arte({ mono = false } = {}) {
  const c = (n) => (mono ? '#FFFFFF' : n);
  const o = mono ? '#FFFFFF' : CONTORNO;
  const gamba = (punti, w = 118) => `
    <polyline points="${punti}" fill="none" stroke="${o}" stroke-width="${w + 26}" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${punti}" fill="none" stroke="${c(PELLE)}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const buchi = [];
  const unghia = (x, y, ang) => {
    if (mono) { buchi.push(`<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="-34" y="-62" width="68" height="74" rx="30" fill="#000"/></g>`); return ''; }
    return `<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="-34" y="-62" width="68" height="74" rx="30" fill="${UNGHIA}" stroke="${PELLE_OMBRA}" stroke-width="6"/></g>`;
  };
  const piega = (x, y, ang) => mono ? '' : `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M -34 0 Q 0 14 34 0" fill="none" stroke="${PELLE_OMBRA}" stroke-width="8" stroke-linecap="round"/></g>`;
  const polvere = mono ? '' : `<g fill="#FFFFFF" fill-opacity="0.45"><circle cx="190" cy="850" r="26"/><circle cx="140" cy="880" r="18"/><circle cx="222" cy="896" r="14"/></g>`;
  const corpo = `
  ${polvere}
  <g transform="rotate(5 512 500)">
  <!-- gamba dietro: dito disteso all'indietro -->
  ${gamba('445,470 268,792')}
  ${piega(385, 640, -29)}${piega(345, 715, -29)}
  ${unghia(268, 820, 29)}
  <!-- gamba davanti: dito piegato come un ginocchio in avanti -->
  ${gamba('585,470 730,640 700,838')}
  ${piega(655, 560, 40)}${piega(716, 735, 9)}${piega(708, 780, 9)}
  ${unghia(700, 866, 9)}
  <!-- mano: dorso con le altre dita chiuse e il pollice -->
  <path d="M 330 250 Q 330 150 440 150 L 600 150 Q 700 150 700 250 L 700 450 Q 700 530 620 530 L 410 530 Q 330 530 330 450 Z"
        fill="${c(PELLE)}" stroke="${o}" stroke-width="26" stroke-linejoin="round"/>
  ${mono ? '' : `
  <g fill="none" stroke="${PELLE_OMBRA}" stroke-width="12" stroke-linecap="round">
    <path d="M 392 170 L 392 270 M 470 160 L 470 270 M 548 160 L 548 270 M 626 170 L 626 270"/>
  </g>`}
  <!-- pollice -->
  <path d="M 335 345 Q 262 335 252 400 Q 250 452 326 446" fill="${c(PELLE)}" stroke="${o}" stroke-width="26" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- polsino giallo -->
  <rect x="352" y="505" width="324" height="64" rx="24" fill="${mono ? '#FFFFFF' : '#FFD23F'}" stroke="${o}" stroke-width="${mono ? 0 : 14}"/>
  </g>`;
  if (!mono) return corpo;
  // silhouette: unghie, pollice e polsino staccati dal resto con linee trasparenti
  const separa = `<g transform="rotate(5 512 500)"><rect x="352" y="505" width="324" height="64" rx="24" fill="none" stroke="#000" stroke-width="16"/>
    <path d="M 335 345 Q 262 335 252 400 Q 250 452 326 446" fill="none" stroke="#000" stroke-width="0"/></g>`;
  return `<defs><mask id="mm"><rect width="1024" height="1024" fill="#fff"/>${buchi.join('')}${separa}</mask></defs><g mask="url(#mm)">${corpo}</g>`;
}

export function righeVelocita() {
  return `<g stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="16" stroke-linecap="round">
    <line x1="70" y1="230" x2="190" y2="230"/><line x1="40" y1="300" x2="170" y2="300"/><line x1="90" y1="370" x2="190" y2="370"/>
  </g>`;
}

export function sfondo() {
  return `<defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#FF5148"/><stop offset="0.6" stop-color="#E5202A"/><stop offset="1" stop-color="#B3121B"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="512" cy="500" r="330" fill="#FFD23F" fill-opacity="0.22"/>`;
}

const svg = (corpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${corpo}</svg>`;
const scala = (arteSvg, s) => `<g transform="translate(512 512) scale(${s}) translate(-512 -500)">${arteSvg}</g>`;

export const VARIANTI = {
  'icon-piena': svg(`${sfondo()}${righeVelocita()}${scala(arte(), 0.98)}`),                 // icona standard / iOS / PWA
  'android-fg': svg(scala(arte(), 0.62)),                                                   // adaptive: dentro la zona sicura
  'android-mono': svg(scala(arte({ mono: true }), 0.62)),
  'maskable': svg(`${sfondo()}${scala(arte(), 0.66)}`),                                     // PWA maskable
  'splash': svg(`<circle cx="512" cy="500" r="400" fill="#FFD23F" fill-opacity="0.25"/>${scala(arte(), 0.9)}`), // trasparente
};
