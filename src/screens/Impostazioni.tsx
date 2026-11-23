import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colori } from '../theme';
import { Avatar } from '../Avatar';
import { leggiAvatar } from '../core/avatar';
import { leggiPref, scriviPref } from '../preferenze';
import { SOGLIA_PREDEFINITA_M } from '../core/altimetria';
import { PESO_MAX, PESO_MIN, pesoValido } from '../core/calorie';
import { riprovaCorrezioniPendenti } from '../core/altimetria/servizio';

export default function Impostazioni({ navigation }: any) {
  const avatar = leggiAvatar();
  const [peso, setPeso] = useState(leggiPref('peso', ''));
  const [nome, setNome] = useState(leggiPref('nome', ''));
  const pesoNum = parseFloat(peso.replace(',', '.'));
  const pesoOk = peso === '' || pesoValido(pesoNum);
  const [rete, setRete] = useState(leggiPref('rete', '0') === '1');
  const [soglia, setSoglia] = useState(leggiPref('soglia', String(SOGLIA_PREDEFINITA_M)));
  return (
    <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <View style={s.riga}>
          <Text style={s.titolo}>Il tuo avatar</Text>
          <Pressable onPress={() => navigation.navigate('Avatar')}>{avatar ? <Avatar config={avatar} size={64} /> : <Text style={{ fontSize: 40 }}>🙂</Text>}</Pressable>
        </View>
        <Pressable onPress={() => navigation.navigate('Avatar')} style={[s.chip, { alignSelf: 'flex-start', marginTop: 10 }]}><Text style={s.chipT}>🎨 {avatar ? 'Modifica avatar' : 'Crea avatar'}</Text></Pressable>
      </View>
      <View style={s.card}>
        <Text style={s.titolo}>Il tuo profilo</Text>
        <Text style={s.testo}>Peso corporeo (kg), serve per stimare le calorie. Si chiede una volta sola e resta sul telefono.</Text>
        <TextInput value={peso} inputMode="decimal" placeholder="es. 70" style={[s.input, !pesoOk && { borderColor: colori.rosso }]}
          onChangeText={(v) => { setPeso(v); const n = parseFloat(v.replace(',', '.')); if (pesoValido(n)) scriviPref('peso', String(n)); else if (v === '') scriviPref('peso', ''); }} />
        {!pesoOk && <Text style={s.errore}>Inserisci un peso tra {PESO_MIN} e {PESO_MAX} kg.</Text>}
        <Text style={[s.testo, { marginTop: 14 }]}>Nome (facoltativo)</Text>
        <TextInput value={nome} placeholder="Come ti chiami?" style={s.input} maxLength={30}
          onChangeText={(v) => { setNome(v); scriviPref('nome', v.trim()); }} />
        <Text style={[s.testo, { marginTop: 14 }]}>Unità: sistema metrico (km, m, kg).</Text>
      </View>
      <View style={s.card}>
        <View style={s.riga}>
          <Text style={s.titolo}>Correggi la quota con la rete</Text>
          <Switch value={rete} trackColor={{ true: colori.rosso, false: '#ccc' }} thumbColor="#fff"
            onValueChange={(v) => { setRete(v); scriviPref('rete', v ? '1' : '0'); if (v) riprovaCorrezioniPendenti().catch(() => {}); }} />
        </View>
        <Text style={s.testo}>Il GPS sbaglia la quota di 10-20 m e il dislivello risulta gonfiato. Con questa opzione, a fine corsa, l'app scarica le quote del terreno e le usa per correggerlo.</Text>
        <Text style={s.privacy}>🔒 Cosa viene inviato: l'app scarica da AWS alcune "tessere" di terreno (ognuna copre circa 2 km) e legge le quote sul tuo telefono, quindi i tuoi punti non partono. Il servizio vede soltanto la zona approssimativa e il tuo indirizzo IP. Se le tessere non sono disponibili, può usare Open-Meteo: in quel caso partono le coordinate dei punti ricampionati (circa uno ogni 25 m), senza orari né nome. Spento, tutto resta sul telefono.</Text>
      </View>
      <View style={s.card}>
        <Text style={s.titolo}>Soglia del dislivello</Text>
        <Text style={s.testo}>Una variazione di quota conta solo se supera questa soglia: evita di sommare il rumore del GPS.</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {['3', '4', '5'].map((v) => (
            <Pressable key={v} onPress={() => { setSoglia(v); scriviPref('soglia', v); }} style={[s.chip, soglia === v && s.chipOn]}>
              <Text style={[s.chipT, soglia === v && { color: '#fff' }]}>{v} m</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={s.credits}>Avatar: stile Avataaars di Pablo Stanley, disegnato con DiceBear (offline). Mappe © OpenStreetMap, OpenTopoMap, SRTM. Quote: AWS Terrain Tiles.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colori.bianco, borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2 },
  riga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titolo: { fontSize: 18, fontWeight: '800', color: colori.rossoScuro, flex: 1, paddingRight: 10 },
  testo: { fontSize: 15, color: colori.testo, marginTop: 8 },
  privacy: { fontSize: 14, color: colori.testoChiaro, marginTop: 10, backgroundColor: colori.crema, borderRadius: 12, padding: 10 },
  input: { borderWidth: 2, borderColor: '#E7D5C0', borderRadius: 14, padding: 12, fontSize: 18, marginTop: 8, color: colori.testo, backgroundColor: colori.crema },
  errore: { color: colori.rosso, marginTop: 6, fontSize: 14 },
  credits: { fontSize: 12, color: colori.testoChiaro, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  chip: { backgroundColor: colori.crema, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, marginRight: 8 },
  chipOn: { backgroundColor: colori.rosso },
  chipT: { fontSize: 16, fontWeight: '700', color: colori.rossoScuro },
});
