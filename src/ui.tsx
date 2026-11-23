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
