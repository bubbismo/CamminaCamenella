// Avatar personalizzabile, tutto offline (DiceBear, stile "Avataaars" di Pablo Stanley:
// uso libero personale e commerciale). Nessuna foto, nessun servizio esterno: l'immagine
// viene disegnata sul telefono a partire da queste poche scelte.
import { leggiPref, scriviPref } from '../preferenze';

export type Opzione = { v: string; nome: string };
export type AvatarConfig = {
  top: string; hairColor: string; hatColor: string; skinColor: string;
  eyes: string; eyebrows: string; mouth: string;
  accessories: string | null;               // occhiali; null = nessuno
  facialHair: string | null; facialHairColor: string;   // barba/baffi; null = nessuna
  clothing: string; clothesColor: string; backgroundColor: string;
};

export const CAPELLI: Opzione[] = [
  { v: 'shortFlat', nome: 'Corti' }, { v: 'shortRound', nome: 'Rotondi' }, { v: 'shortWaved', nome: 'Mossi corti' },
  { v: 'shortCurly', nome: 'Ricci corti' }, { v: 'sides', nome: 'Ai lati' }, { v: 'theCaesar', nome: 'Alla Cesare' },
  { v: 'theCaesarAndSidePart', nome: 'Cesare e riga' }, { v: 'shaggy', nome: 'Scompigliati' }, { v: 'shaggyMullet', nome: 'Mullet' },
  { v: 'frizzle', nome: 'Crespi' }, { v: 'dreads01', nome: 'Rasta corti' }, { v: 'dreads02', nome: 'Rasta' }, { v: 'dreads', nome: 'Rasta lunghi' },
  { v: 'straight01', nome: 'Lisci' }, { v: 'straight02', nome: 'Lisci lunghi' }, { v: 'straightAndStrand', nome: 'Lisci e ciocca' },
  { v: 'longButNotTooLong', nome: 'Medi' }, { v: 'bob', nome: 'Caschetto' }, { v: 'bun', nome: 'Chignon' },
  { v: 'curly', nome: 'Ricci' }, { v: 'curvy', nome: 'Ondulati' }, { v: 'frida', nome: 'Con fiore' },
  { v: 'fro', nome: 'Afro' }, { v: 'froBand', nome: 'Afro e fascia' }, { v: 'bigHair', nome: 'Voluminosi' },
  { v: 'miaWallace', nome: 'Frangia' }, { v: 'shavedSides', nome: 'Rasati ai lati' },
  { v: 'hat', nome: 'Cappello' }, { v: 'winterHat1', nome: 'Cuffia 1' }, { v: 'winterHat02', nome: 'Cuffia 2' },
  { v: 'winterHat03', nome: 'Cuffia 3' }, { v: 'winterHat04', nome: 'Cuffia 4' }, { v: 'hijab', nome: 'Velo' }, { v: 'turban', nome: 'Turbante' },
];
export const COLORI_CAPELLI = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'ecdcbf', 'e8e1e1', 'c93305', 'f59797'];
export const COLORI_PELLE = ['ffdbb4', 'edb98a', 'f8d25c', 'fd9841', 'd08b5b', 'ae5d29', '614335'];
export const COLORI_VESTITI = ['ff5c5c', 'ff488e', 'ffafb9', 'ffffb1', 'a7ffc4', 'b1e2ff', '65c9ff', '5199e4', '25557c', '262e33', '3c4f5c', '929598', 'e6e6e6', 'ffffff'];
export const COLORI_CAPPELLO = COLORI_VESTITI;
export const COLORI_SFONDO = ['ffd23f', 'ff8a1f', 'ff5c5c', 'ffafb9', 'a7ffc4', '65c9ff', 'e6e6e6', 'ffffff'];
export const OCCHI: Opzione[] = [
  { v: 'default', nome: 'Normali' }, { v: 'happy', nome: 'Felici' }, { v: 'wink', nome: 'Occhiolino' }, { v: 'winkWacky', nome: 'Buffo' },
  { v: 'hearts', nome: 'Cuoricini' }, { v: 'surprised', nome: 'Sorpresi' }, { v: 'squint', nome: 'Socchiusi' }, { v: 'side', nome: 'Di lato' },
  { v: 'closed', nome: 'Chiusi' }, { v: 'eyeRoll', nome: 'Alzati' }, { v: 'cry', nome: 'Piangenti' }, { v: 'xDizzy', nome: 'Stordito' },
];
export const SOPRACCIGLIA: Opzione[] = [
  { v: 'default', nome: 'Normali' }, { v: 'defaultNatural', nome: 'Naturali' }, { v: 'raisedExcited', nome: 'Alzate' },
  { v: 'raisedExcitedNatural', nome: 'Alzate nat.' }, { v: 'flatNatural', nome: 'Dritte' }, { v: 'upDown', nome: 'Su e giù' },
  { v: 'upDownNatural', nome: 'Su e giù nat.' }, { v: 'angry', nome: 'Arrabbiate' }, { v: 'angryNatural', nome: 'Arrabbiate nat.' },
  { v: 'sadConcerned', nome: 'Preoccupate' }, { v: 'sadConcernedNatural', nome: 'Preocc. nat.' }, { v: 'frownNatural', nome: 'Corrucciate' }, { v: 'unibrowNatural', nome: 'Monociglio' },
];
export const BOCCA: Opzione[] = [
  { v: 'smile', nome: 'Sorriso' }, { v: 'default', nome: 'Normale' }, { v: 'twinkle', nome: 'Birichina' }, { v: 'tongue', nome: 'Linguaccia' },
  { v: 'serious', nome: 'Seria' }, { v: 'concerned', nome: 'Preoccupata' }, { v: 'sad', nome: 'Triste' }, { v: 'disbelief', nome: 'Incredula' },
  { v: 'eating', nome: 'Mangia' }, { v: 'grimace', nome: 'Smorfia' }, { v: 'screamOpen', nome: 'Urla' },
];
export const OCCHIALI: Opzione[] = [
  { v: '', nome: 'Nessuno' }, { v: 'round', nome: 'Tondi' }, { v: 'prescription01', nome: 'Da vista 1' }, { v: 'prescription02', nome: 'Da vista 2' },
  { v: 'wayfarers', nome: 'Wayfarer' }, { v: 'kurt', nome: 'Kurt' }, { v: 'sunglasses', nome: 'Da sole' }, { v: 'eyepatch', nome: 'Benda' },
];
export const BARBA: Opzione[] = [
  { v: '', nome: 'Nessuna' }, { v: 'beardLight', nome: 'Leggera' }, { v: 'beardMedium', nome: 'Media' }, { v: 'beardMajestic', nome: 'Folta' },
  { v: 'moustacheFancy', nome: 'Baffi eleganti' }, { v: 'moustacheMagnum', nome: 'Baffi grandi' },
];
export const VESTITI: Opzione[] = [
  { v: 'hoodie', nome: 'Felpa' }, { v: 'shirtCrewNeck', nome: 'Maglietta' }, { v: 'shirtVNeck', nome: 'Maglia a V' }, { v: 'shirtScoopNeck', nome: 'Maglia scollata' },
  { v: 'graphicShirt', nome: 'Maglietta con disegno' }, { v: 'overall', nome: 'Salopette' }, { v: 'collarAndSweater', nome: 'Maglione e colletto' },
  { v: 'blazerAndSweater', nome: 'Giacca e maglione' }, { v: 'blazerAndShirt', nome: 'Giacca e camicia' },
];

export const AVATAR_PREDEFINITO: AvatarConfig = {
  top: 'shortRound', hairColor: '4a312c', hatColor: 'ff5c5c', skinColor: 'edb98a',
  eyes: 'happy', eyebrows: 'defaultNatural', mouth: 'smile',
  accessories: null, facialHair: null, facialHairColor: '4a312c',
  clothing: 'hoodie', clothesColor: 'ff5c5c', backgroundColor: 'ffd23f',
};

const scegli = <T,>(a: T[], u: () => number) => a[Math.floor(u() * a.length) % a.length];

/** Avatar casuale ("Sorprendimi"). `u` è una funzione casuale in [0,1) (iniettabile per i test). */
export function avatarCasuale(u: () => number = Math.random): AvatarConfig {
  return {
    top: scegli(CAPELLI, u).v, hairColor: scegli(COLORI_CAPELLI, u), hatColor: scegli(COLORI_CAPPELLO, u), skinColor: scegli(COLORI_PELLE, u),
    eyes: scegli(OCCHI, u).v, eyebrows: scegli(SOPRACCIGLIA, u).v, mouth: scegli(BOCCA.filter((b) => !['vomit'].includes(b.v)), u).v,
    accessories: u() < 0.35 ? scegli(OCCHIALI.filter((o) => o.v), u).v : null,
    facialHair: u() < 0.25 ? scegli(BARBA.filter((o) => o.v), u).v : null, facialHairColor: scegli(COLORI_CAPELLI, u),
    clothing: scegli(VESTITI, u).v, clothesColor: scegli(COLORI_VESTITI, u), backgroundColor: scegli(COLORI_SFONDO, u),
  };
}

/** Opzioni per DiceBear (tutte fisse: nessun elemento casuale nell'immagine finale). */
export function opzioniDiceBear(c: AvatarConfig) {
  return {
    seed: 'camminacamenella',
    style: ['circle'] as ('circle' | 'default')[],
    backgroundColor: [c.backgroundColor],
    top: [c.top], topProbability: 100, hairColor: [c.hairColor], hatColor: [c.hatColor], skinColor: [c.skinColor],
    eyes: [c.eyes], eyebrows: [c.eyebrows], mouth: [c.mouth],
    accessories: c.accessories ? [c.accessories] : [], accessoriesProbability: c.accessories ? 100 : 0,
    facialHair: c.facialHair ? [c.facialHair] : [], facialHairProbability: c.facialHair ? 100 : 0, facialHairColor: [c.facialHairColor],
    clothing: [c.clothing], clothesColor: [c.clothesColor],
  } as any;
}

export function leggiAvatar(): AvatarConfig | null {
  try {
    const s = leggiPref('avatar', '');
    return s ? ({ ...AVATAR_PREDEFINITO, ...JSON.parse(s) } as AvatarConfig) : null;
  } catch { return null; }
}
export function salvaAvatar(c: AvatarConfig) { scriviPref('avatar', JSON.stringify(c)); scriviPref('avatar_chiesto', '1'); }
