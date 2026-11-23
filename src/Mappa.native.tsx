import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Punto } from './core/tipi';
import { colori } from './theme';

// Nell'app Android la mappa arriverà in un passo successivo; per ora si usa la web app.
export function Mappa({ altezza = 120 }: { punti: Punto[]; segui?: boolean; altezza?: number }) {
  return <View style={[s.v, { height: altezza }]}><Text style={s.t}>🗺 Mappa disponibile nella web app</Text></View>;
}
const s = StyleSheet.create({
  v: { backgroundColor: colori.giallo, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 12 },
  t: { color: colori.testo, fontWeight: '700' },
});
