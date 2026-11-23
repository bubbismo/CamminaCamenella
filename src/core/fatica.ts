// Fatica percepita su scala 1-10 (ispirata alla scala di Borg CR10).
export const FATICA: { valore: number; titolo: string; descrizione: string; colore: string }[] = [
  { valore: 1, titolo: 'Molto leggera', descrizione: 'Una passeggiata rilassata, quasi nessuno sforzo.', colore: '#2EAD5B' },
  { valore: 2, titolo: 'Leggera', descrizione: 'Potevi chiacchierare senza problemi.', colore: '#5BB84A' },
  { valore: 3, titolo: 'Comoda', descrizione: 'Ritmo piacevole, respiro tranquillo.', colore: '#8DC63F' },
  { valore: 4, titolo: 'Moderata', descrizione: 'Il respiro è appena più veloce, ma stai bene.', colore: '#C5CC35' },
  { valore: 5, titolo: 'Impegnativa', descrizione: 'Cominci a sentire lo sforzo, riesci ancora a parlare.', colore: '#F2C230' },
  { valore: 6, titolo: 'Piuttosto dura', descrizione: 'Parli solo a frasi brevi, le gambe lavorano.', colore: '#FFA826' },
  { valore: 7, titolo: 'Dura', descrizione: 'Respiro affannato, serve concentrazione.', colore: '#FF8A1F' },
  { valore: 8, titolo: 'Molto dura', descrizione: 'Poche parole alla volta, ti viene voglia di fermarti.', colore: '#F2561F' },
  { valore: 9, titolo: 'Durissima', descrizione: 'Quasi al limite: ogni passo costa fatica.', colore: '#D93222' },
  { valore: 10, titolo: 'Massimo', descrizione: 'Più di così non potevi fare.', colore: '#B3121B' },
];
export const faticaDi = (v: number | null | undefined) => FATICA.find((f) => f.valore === v) ?? null;
