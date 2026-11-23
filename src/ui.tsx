import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colori } from './theme';

export function Bottone({ testo, onPress, colore = colori.rosso, grande, style }:
  { testo: string; onPress: () => void; colore?: string; grande?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      s.btn, grande && s.btnGrande, { backgroundColor: colore, transform: [{ scale: pressed ? 0.96 : 1 }] }, style]}>
      <Text style={[s.btnTesto, grande && { fontSize: 28 }]}>{testo}</Text>
    </Pressable>
  );
}

export function Dato({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <View style={s.dato}>
      <Text style={s.datoValore}>{valore}</Text>
      <Text style={s.datoEtichetta}>{etichetta}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  btnGrande: { paddingVertical: 24, borderRadius: 28 },
  btnTesto: { color: colori.bianco, fontSize: 20, fontWeight: '800' },
  dato: { flex: 1, minWidth: '45%', backgroundColor: colori.bianco, borderRadius: 18, padding: 14, margin: 5, alignItems: 'center', elevation: 2 },
  datoValore: { fontSize: 30, fontWeight: '800', color: colori.rossoScuro },
  datoEtichetta: { fontSize: 14, color: colori.testoChiaro, marginTop: 2 },
});

// Pulsante che si attiva solo tenendolo premuto: evita i tocchi sfiorati in tasca.
export function BottonePressioneLunga({ testo, onConferma, durataMs = 2000, colore = colori.rossoScuro, testoColore = colori.bianco, style }:
  { testo: string; onConferma: () => void; durataMs?: number; colore?: string; testoColore?: string; style?: ViewStyle }) {
  const [p, setP] = React.useState(0);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const inizio = React.useRef(0);
  const ferma = () => { if (timer.current) clearInterval(timer.current); timer.current = null; setP(0); };
  React.useEffect(() => ferma, []);
  const premi = () => {
    inizio.current = Date.now();
    timer.current = setInterval(() => {
      const x = (Date.now() - inizio.current) / durataMs;
      if (x >= 1) { ferma(); onConferma(); } else setP(x);
    }, 40);
  };
  return (
    <Pressable onPressIn={premi} onPressOut={ferma} pressRetentionOffset={{ top: 200, bottom: 200, left: 200, right: 200 }} style={[s.btn, s.btnGrande, { backgroundColor: colore, overflow: 'hidden', touchAction: 'none' } as any, style]}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, backgroundColor: 'rgba(255,255,255,0.35)' }} />
      <Text style={[s.btnTesto, { fontSize: 22, color: testoColore }]}>{testo}</Text>
      <Text style={{ color: testoColore, opacity: 0.7, fontSize: 12 }}>tieni premuto</Text>
    </Pressable>
  );
}
