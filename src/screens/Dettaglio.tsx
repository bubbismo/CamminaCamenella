import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bottone, Dato } from '../ui';
import { colori } from '../theme';
import {  camminata, eliminaCamminata } from '../archivio';
import type { Camminata } from '../core/tipi';
import { formatDistanza, formatDurata, formatPasso, distanzaStimata } from '../core/geo';
import { punti } from '../archivio';
import { useDialogo } from '../dialogo';

export default function Dettaglio({ route, navigation }: any) {
  const dialogo = useDialogo();
  const [w, setW] = useState<Camminata | null>(null);
  const [stimata, setStimata] = useState(0);
  useEffect(() => {
    camminata(route.params.id).then(setW);
    punti(route.params.id).then((p) => setStimata(distanzaStimata(p)));
  }, [route.params.id]);
  if (!w) return null;
  const kmh = w.active_ms > 0 ? (w.distance_m / 1000) / (w.active_ms / 3600000) : 0;
  return (
    <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 14 }}>
      <Text style={s.titolo}>Bravo/a! 🎉</Text>
      <Text style={s.data}>{new Date(w.started_at).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</Text>
      <View style={s.griglia}>
        <Dato etichetta="Tempo trascorso" valore={formatDurata((w.ended_at ?? w.started_at) - w.started_at)} />
        <Dato etichetta="Tempo attivo (senza pause)" valore={formatDurata(w.active_ms)} />
        <Dato etichetta="Distanza" valore={formatDistanza(w.distance_m)} />
        <Dato etichetta="Velocità media" valore={`${kmh.toFixed(1).replace('.', ',')} km/h`} />
        <Dato etichetta="Passo medio (min/km)" valore={formatPasso(w.distance_m, w.active_ms)} />
        <Dato etichetta="Salita" valore={`▲ ${Math.round(w.ascent_m)} m`} />
        <Dato etichetta="Discesa" valore={`▼ ${Math.round(w.descent_m)} m`} />
      </View>
      {stimata > 0 && <Text style={s.avviso}>⚠️ Circa {formatDistanza(stimata)} di questo percorso sono una stima in linea retta: in quel tratto il GPS non ha registrato (app sospesa).</Text>}
      <Bottone testo="🗑 Elimina" colore={colori.rossoScuro} style={{ marginTop: 20 }}
        onPress={() => dialogo({ titolo: 'Eliminare?', messaggio: 'La camminata verrà cancellata per sempre.', bottoni: [
          { testo: 'Elimina', stile: 'pericolo', onPress: async () => { await eliminaCamminata(w.id); navigation.popToTop(); } },
          { testo: 'Annulla', stile: 'secondario' },
        ] })} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  titolo: { fontSize: 28, fontWeight: '900', color: colori.rosso },
  data: { fontSize: 16, color: colori.testoChiaro, marginBottom: 10 },
  avviso: { color: colori.testo, backgroundColor: colori.giallo, borderRadius: 12, padding: 12, marginTop: 14 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
});
