// Sagoma originale (stile glifo a un colore): mano di profilo che cammina con indice e medio.
// I pezzi sono separati da spazi trasparenti (maschera), così si leggono pollice e dita piegate.
const cap = (a, b, w, col) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
export const PEZZI = {
  MEDIO: [[640, 610], [700, 884]],
  // dita piegate: uncini che tornano verso il palmo (non "gambe" in più)
  ANULARE: 'M 772 512 C 800 590 780 646 716 640',
  MIGNOLO: 'M 850 428 C 878 500 862 552 806 552',
  POLLICE: 'M 606 600 C 598 650 570 680 530 690',
  CORPO: `M 742 104 L 906 262
    C 866 352 798 452 712 532
    C 654 584 590 616 540 640
    C 496 716 432 806 376 878
    C 354 906 306 902 300 868
    C 298 856 300 846 306 836
    C 344 752 400 640 436 548
    C 476 430 600 236 742 104 Z`,
};
const arco = (d, w, col) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
export function maschera(id = 'm', gap = 24) {
  const { MEDIO, ANULARE, MIGNOLO, POLLICE, CORPO } = PEZZI;
  const W = '#fff', N = '#000';
  const strati = [
    cap(...MEDIO, 96, W),
    arco(MIGNOLO, 70 + gap * 2, N), arco(MIGNOLO, 70, W),
    arco(ANULARE, 80 + gap * 2, N), arco(ANULARE, 80, W),
    arco(POLLICE, 72 + gap * 2, N), arco(POLLICE, 72, W),
    `<path d="${CORPO}" fill="${N}" stroke="${N}" stroke-width="${gap * 2}" stroke-linejoin="round"/>`,
    `<path d="${CORPO}" fill="${W}"/>`,
  ];
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="${N}"/>${strati.join('')}</mask>`;
}
export const glifo = (colore = '#FFFFFF', id = 'm') => `<defs>${maschera(id)}</defs><rect width="1024" height="1024" fill="${colore}" mask="url(#${id})"/>`;
const sfondo = `<defs><radialGradient id="g" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#FF4A45"/><stop offset="0.65" stop-color="#E5202A"/><stop offset="1" stop-color="#B3121B"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>`;
const svg = (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${c}</svg>`;
export const PROPOSTE = { A: svg(sfondo + glifo('#FFFFFF')), B: svg(sfondo + glifo('#FFD23F')) };

// ---- varianti per l'app ----
const scala = (c, k) => `<g transform="translate(512 512) scale(${k}) translate(-512 -490)">${c}</g>`;
export const VARIANTI = {
  'icona': svg(sfondo + glifo('#FFFFFF', 'a')),                                  // icona standard (iPhone, web, APK)
  'maskable': svg(sfondo + scala(glifo('#FFFFFF', 'b'), 0.8)),                  // web app installata su Android
  'android-fg': svg(scala(glifo('#FFFFFF', 'c'), 0.66)),                        // Android adattiva (zona sicura)
  'splash': svg(scala(glifo('#FFFFFF', 'd'), 0.92)),                            // schermata iniziale (sfondo rosso a parte)
};
