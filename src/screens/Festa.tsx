import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Bottone } from '../ui';
import { colori } from '../theme';
import { formatDifferenza, formatValore, nomeCategoria, NuovoRecord } from '../core/record';
import { leggiPrefVoce } from '../core/annunci';
import { leggiPref } from '../preferenze';
import { parla } from '../voce';

const COLORI_CORIANDOLI = [colori.giallo, colori.arancio, '#FFFFFF', '#FFE9A8', colori.rossoScuro];

function Coriandolo({ i, larghezza, altezza }: { i: number; larghezza: number; altezza: number }) {
  const caduta = useRef(new Animated.Value(0)).current;
  const dati = useMemo(() => {
    const r = (k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    return {
      x: r(1) * larghezza, ondeggia: 20 + r(2) * 40, giri: (r(3) > 0.5 ? 1 : -1) * (2 + r(4) * 4),
      ritardo: r(5) * 1800, durata: 2600 + r(6) * 2200, colore: COLORI_CORIANDOLI[i % COLORI_CORIANDOLI.length],
      w: 7 + r(7) * 6, h: 10 + r(8) * 8, tondo: r(9) > 0.7,
    };
  }, [i, larghezza]);
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.delay(dati.ritardo),
      Animated.timing(caduta, { toValue: 1, duration: dati.durata, easing: Easing.linear, useNativeDriver: true }),
    ]), { iterations: 3 });
    a.start();
    return () => a.stop();
  }, [caduta, dati]);
  const translateY = caduta.interpolate({ inputRange: [0, 1], outputRange: [-40, altezza + 40] });
  const translateX = caduta.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, dati.ondeggia, 0, -dati.ondeggia, 0] });
  const rotate = caduta.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * dati.giri}deg`] });
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: dati.x, top: 0, width: dati.w, height: dati.tondo ? dati.w : dati.h,
      borderRadius: dati.tondo ? dati.w / 2 : 2, backgroundColor: dati.colore,
      transform: [{ translateY }, { translateX }, { rotate }],
    }} />
  );
}

export default function Festa({ route, navigation }: any) {
  const id: number = route.params.id;
  const record: NuovoRecord[] = route.params.record ?? [];
  const { width, height } = useWindowDimensions();
  const salto = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(salto, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(salto, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ])).start();
    const pv = leggiPrefVoce(leggiPref);
    if (pv.attiva) parla(record.length === 1 ? 'Nuovo record personale!' : `${record.length} nuovi record personali!`, pv.volume);
  }, []);
  const trofeo = salto.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  return (
    <View style={s.c}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <Animated.Text style={[s.trofeo, { transform: [{ translateY: trofeo }] }]}>🏆</Animated.Text>
        <Text style={s.titolo}>{record.length === 1 ? 'Nuovo record!' : `${record.length} nuovi record!`}</Text>
        <Text style={s.sotto}>Sei andato/a oltre i tuoi limiti. Grande! 🎉</Text>
        {record.map((r) => (
          <View key={r.cat} style={s.card}>
            <Text style={s.cat}>{nomeCategoria(r.cat)}</Text>
            <Text style={s.valore}>{formatValore(r.cat, r.valore)}</Text>
            <Text style={s.confronto}>Prima: {formatValore(r.cat, r.precedente)}  ·  {formatDifferenza(r.cat, r.valore, r.precedente)}</Text>
          </View>
        ))}
        <Bottone testo="Continua ➜" colore={colori.rossoScuro} style={{ marginTop: 20 }}
          onPress={() => navigation.replace('Fatica', { id })} />
      </ScrollView>
      {/* coriandoli sopra a tutto, ma non intercettano i tocchi */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 45 }, (_, i) => <Coriandolo key={i} i={i} larghezza={width} altezza={height} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colori.rosso, overflow: 'hidden' },
  trofeo: { fontSize: 84, textAlign: 'center' },
  titolo: { fontSize: 34, fontWeight: '900', color: colori.bianco, textAlign: 'center', marginTop: 6 },
  sotto: { fontSize: 17, color: '#FFE9A8', textAlign: 'center', marginTop: 6, marginBottom: 14 },
  card: { backgroundColor: colori.bianco, borderRadius: 18, padding: 16, marginTop: 12 },
  cat: { fontSize: 15, fontWeight: '800', color: colori.rossoScuro },
  valore: { fontSize: 32, fontWeight: '900', color: colori.rosso, marginTop: 2 },
  confronto: { fontSize: 14, color: colori.testoChiaro, marginTop: 4 },
});
