import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bottone } from '../ui';
import { colori } from '../theme';
import { aggiorna, camminata } from '../archivio';
import { FATICA, faticaDi } from '../core/fatica';

function Pallino({ f, attivo, onPress }: { f: (typeof FATICA)[number]; attivo: boolean; onPress: () => void }) {
  const scala = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.spring(scala, { toValue: attivo ? 1.18 : 1, useNativeDriver: true, friction: 5 }).start(); }, [attivo]);
  return (
    <Animated.View style={{ transform: [{ scale: scala }], width: '18%', margin: '1%' }}>
      <Pressable onPress={onPress} style={[s.pallino, { backgroundColor: f.colore }, attivo && s.pallinoOn]}>
        <Text style={s.num}>{f.valore}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Fatica({ route, navigation }: any) {
  const id: number = route.params.id;
  const [valore, setValore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  useEffect(() => { camminata(id).then((w) => { if (w) { setValore(w.rpe); setNote(w.notes ?? ''); } }); }, [id]);
  const f = faticaDi(valore);
  const vai = () => navigation.replace('Dettaglio', { id });
  const salva = async () => { await aggiorna(id, { rpe: valore, notes: note.trim() || null }); vai(); };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={s.titolo}>Quanto è stata faticosa? 😅</Text>
        <Text style={s.sotto}>Scegli da 1 (leggerissima) a 10 (massimo sforzo).</Text>
        <View style={s.griglia}>
          {FATICA.map((x) => <Pallino key={x.valore} f={x} attivo={valore === x.valore} onPress={() => setValore(x.valore)} />)}
        </View>
        <View style={[s.descr, { borderColor: f?.colore ?? '#E7D5C0' }]}>
          {f ? (<><Text style={[s.dTitolo, { color: f.colore }]}>{f.valore} · {f.titolo}</Text><Text style={s.dTesto}>{f.descrizione}</Text></>)
            : <Text style={s.dTesto}>Tocca un numero per vedere cosa significa.</Text>}
        </View>
        <Text style={s.etichetta}>Note (facoltative)</Text>
        <TextInput value={note} onChangeText={setNote} multiline placeholder="Come ti sei sentito/a? Caldo, vento, sentiero…" style={s.input} maxLength={500} />
        <Bottone testo="✅ Salva" onPress={salva} colore={valore ? colori.rosso : '#C9A9A9'} style={{ marginTop: 14 }} />
        <Pressable onPress={vai} style={{ alignSelf: 'center', padding: 14 }}><Text style={{ color: colori.testoChiaro, fontSize: 16 }}>Salta per ora</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  titolo: { fontSize: 26, fontWeight: '900', color: colori.rosso },
  sotto: { fontSize: 15, color: colori.testoChiaro, marginTop: 4, marginBottom: 14 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  pallino: { aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  pallinoOn: { borderWidth: 4, borderColor: colori.testo },
  num: { color: '#fff', fontSize: 24, fontWeight: '900' },
  descr: { backgroundColor: colori.bianco, borderRadius: 18, borderWidth: 3, padding: 14, marginTop: 16, minHeight: 84 },
  dTitolo: { fontSize: 20, fontWeight: '800' },
  dTesto: { fontSize: 16, color: colori.testo, marginTop: 4 },
  etichetta: { fontSize: 16, fontWeight: '700', color: colori.rossoScuro, marginTop: 18 },
  input: { backgroundColor: colori.bianco, borderRadius: 14, borderWidth: 2, borderColor: '#E7D5C0', padding: 12, fontSize: 16, minHeight: 90, marginTop: 6, textAlignVertical: 'top' },
});
