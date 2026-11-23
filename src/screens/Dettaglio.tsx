import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bottone, Dato } from '../ui';
import { colori } from '../theme';
import { Camminata, camminata, eliminaCamminata } from '../db';
import { formatDistanza, formatDurata, formatPasso } from '../geo';

export default function Dettaglio({ route, navigation }: any) {
  const [w, setW] = useState<Camminata | null>(null);
  useEffect(() => { camminata(route.params.id).then(setW); }, [route.params.id]);
  if (!w) return null;
  const kmh = w.active_ms > 0 ? (w.distance_m / 1000) / (w.active_ms / 3600000) : 0;
  return (
    <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 14 }}>
      <Text style={s.titolo}>Bravo/a! 🎉</Text>
      <Text style={s.data}>{new Date(w.started_at).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</Text>
      <View style={s.griglia}>
        <Dato etichetta="Durata" valore={formatDurata(w.active_ms)} />
        <Dato etichetta="Distanza" valore={formatDistanza(w.distance_m)} />
        <Dato etichetta="Velocità media" valore={`${kmh.toFixed(1).replace('.', ',')} km/h`} />
        <Dato etichetta="Passo medio (min/km)" valore={formatPasso(w.distance_m, w.active_ms)} />
        <Dato etichetta="Salita" valore={`▲ ${Math.round(w.ascent_m)} m`} />
        <Dato etichetta="Discesa" valore={`▼ ${Math.round(w.descent_m)} m`} />
      </View>
      <Bottone testo="🗑 Elimina" colore={colori.rossoScuro} style={{ marginTop: 20 }}
        onPress={() => Alert.alert('Eliminare?', 'La camminata verrà cancellata per sempre.', [
          { text: 'Annulla' },
          { text: 'Elimina', style: 'destructive', onPress: async () => { await eliminaCamminata(w.id); navigation.popToTop(); } },
        ])} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  titolo: { fontSize: 28, fontWeight: '900', color: colori.rosso },
  data: { fontSize: 16, color: colori.testoChiaro, marginBottom: 10 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
});
