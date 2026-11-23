import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../Avatar';
import { Bottone } from '../ui';
import { colori } from '../theme';
import {
  AVATAR_PREDEFINITO, AvatarConfig, BARBA, BOCCA, CAPELLI, COLORI_CAPELLI, COLORI_CAPPELLO, COLORI_PELLE, COLORI_SFONDO, COLORI_VESTITI,
  OCCHI, OCCHIALI, Opzione, SOPRACCIGLIA, VESTITI, avatarCasuale, leggiAvatar, salvaAvatar,
} from '../core/avatar';

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return <View style={s.sezione}><Text style={s.sTitolo}>{titolo}</Text><View style={s.riga}>{children}</View></View>;
}
function Scelte({ opzioni, valore, onScegli }: { opzioni: Opzione[]; valore: string; onScegli: (v: string) => void }) {
  return <>{opzioni.map((o) => (
    <Pressable key={o.v} onPress={() => onScegli(o.v)} style={[s.chip, valore === o.v && s.chipOn]}>
      <Text style={[s.chipT, valore === o.v && { color: '#fff' }]}>{o.nome}</Text>
    </Pressable>))}</>;
}
function Colori({ lista, valore, onScegli }: { lista: string[]; valore: string; onScegli: (v: string) => void }) {
  return <>{lista.map((c) => (
    <Pressable key={c} onPress={() => onScegli(c)} style={[s.tinta, { backgroundColor: '#' + c }, valore === c && s.tintaOn]} />))}</>;
}

export default function AvatarEditor({ navigation }: any) {
  const [c, setC] = useState<AvatarConfig>(() => leggiAvatar() ?? AVATAR_PREDEFINITO);
  const salto = useRef(new Animated.Value(1)).current;
  const set = <K extends keyof AvatarConfig>(k: K, v: AvatarConfig[K]) => setC((p) => ({ ...p, [k]: v }));
  useEffect(() => { Animated.sequence([Animated.timing(salto, { toValue: 1.08, duration: 90, useNativeDriver: true }), Animated.spring(salto, { toValue: 1, friction: 4, useNativeDriver: true })]).start(); }, [c]);
  const ciSonoCappelli = ['hat', 'hijab', 'turban', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04'].includes(c.top);
  const conCapelli = !ciSonoCappelli;
  return (
    <View style={{ flex: 1, backgroundColor: colori.crema }}>
      <View style={s.anteprima}>
        <Animated.View style={{ transform: [{ scale: salto }] }}><Avatar config={c} size={150} /></Animated.View>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Pressable onPress={() => setC(avatarCasuale())} style={s.dado}><Text style={s.dadoT}>🎲 Sorprendimi</Text></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110 }}>
        <Sezione titolo="Capelli e cappelli"><Scelte opzioni={CAPELLI} valore={c.top} onScegli={(v) => set('top', v)} /></Sezione>
        {conCapelli && <Sezione titolo="Colore dei capelli"><Colori lista={COLORI_CAPELLI} valore={c.hairColor} onScegli={(v) => set('hairColor', v)} /></Sezione>}
        {ciSonoCappelli && <Sezione titolo="Colore del cappello"><Colori lista={COLORI_CAPPELLO} valore={c.hatColor} onScegli={(v) => set('hatColor', v)} /></Sezione>}
        <Sezione titolo="Colore della pelle"><Colori lista={COLORI_PELLE} valore={c.skinColor} onScegli={(v) => set('skinColor', v)} /></Sezione>
        <Sezione titolo="Occhi"><Scelte opzioni={OCCHI} valore={c.eyes} onScegli={(v) => set('eyes', v)} /></Sezione>
        <Sezione titolo="Sopracciglia"><Scelte opzioni={SOPRACCIGLIA} valore={c.eyebrows} onScegli={(v) => set('eyebrows', v)} /></Sezione>
        <Sezione titolo="Bocca"><Scelte opzioni={BOCCA} valore={c.mouth} onScegli={(v) => set('mouth', v)} /></Sezione>
        <Sezione titolo="Occhiali"><Scelte opzioni={OCCHIALI} valore={c.accessories ?? ''} onScegli={(v) => set('accessories', v || null)} /></Sezione>
        <Sezione titolo="Barba e baffi"><Scelte opzioni={BARBA} valore={c.facialHair ?? ''} onScegli={(v) => set('facialHair', v || null)} /></Sezione>
        {c.facialHair && <Sezione titolo="Colore della barba"><Colori lista={COLORI_CAPELLI} valore={c.facialHairColor} onScegli={(v) => set('facialHairColor', v)} /></Sezione>}
        <Sezione titolo="Abbigliamento"><Scelte opzioni={VESTITI} valore={c.clothing} onScegli={(v) => set('clothing', v)} /></Sezione>
        <Sezione titolo="Colore dei vestiti"><Colori lista={COLORI_VESTITI} valore={c.clothesColor} onScegli={(v) => set('clothesColor', v)} /></Sezione>
        <Sezione titolo="Sfondo"><Colori lista={COLORI_SFONDO} valore={c.backgroundColor} onScegli={(v) => set('backgroundColor', v)} /></Sezione>
        <Text style={s.privacy}>🔒 L'avatar viene disegnato sul tuo telefono. Nessuna foto e nessun dato esce dal dispositivo.</Text>
      </ScrollView>
      <View style={s.barra}><Bottone testo="✅ Salva avatar" onPress={() => { salvaAvatar(c); navigation.goBack(); }} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  anteprima: { alignItems: 'center', paddingVertical: 10, backgroundColor: colori.rosso },
  dado: { backgroundColor: colori.giallo, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 },
  dadoT: { fontWeight: '800', color: colori.testo, fontSize: 15 },
  sezione: { marginBottom: 14 },
  sTitolo: { fontSize: 16, fontWeight: '800', color: colori.rossoScuro, marginBottom: 6 },
  riga: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: colori.bianco, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, marginRight: 6, marginBottom: 6, borderWidth: 2, borderColor: '#EFE0CE' },
  chipOn: { backgroundColor: colori.rosso, borderColor: colori.rosso },
  chipT: { fontSize: 14, fontWeight: '700', color: colori.rossoScuro },
  tinta: { width: 36, height: 36, borderRadius: 18, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: '#fff', elevation: 2 },
  tintaOn: { borderColor: colori.testo, borderWidth: 4 },
  privacy: { fontSize: 13, color: colori.testoChiaro, marginTop: 8 },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: colori.crema },
});
