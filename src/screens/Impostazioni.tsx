import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colori } from '../theme';
import { leggiPref, scriviPref } from '../preferenze';
import { SOGLIA_PREDEFINITA_M } from '../core/altimetria';
import { riprovaCorrezioniPendenti } from '../core/altimetria/servizio';

export default function Impostazioni() {
  const [rete, setRete] = useState(leggiPref('rete', '0') === '1');
  const [soglia, setSoglia] = useState(leggiPref('soglia', String(SOGLIA_PREDEFINITA_M)));
  return (
    <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 16 }}>
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
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colori.bianco, borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2 },
  riga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titolo: { fontSize: 18, fontWeight: '800', color: colori.rossoScuro, flex: 1, paddingRight: 10 },
  testo: { fontSize: 15, color: colori.testo, marginTop: 8 },
  privacy: { fontSize: 14, color: colori.testoChiaro, marginTop: 10, backgroundColor: colori.crema, borderRadius: 12, padding: 10 },
  chip: { backgroundColor: colori.crema, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, marginRight: 8 },
  chipOn: { backgroundColor: colori.rosso },
  chipT: { fontSize: 16, fontWeight: '700', color: colori.rossoScuro },
});
