import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colori } from '../theme';
import {  elencoCamminate } from '../archivio';
import type { Camminata } from '../core/tipi';
import { formatDistanza, formatDurata } from '../core/geo';
import { faticaDi } from '../core/fatica';
import { tempoMovimento } from '../core/movimento';
import { giorniDallUltimoBackup } from '../core/backupServizio';

export default function Storico({ navigation }: any) {
  const [lista, setLista] = useState<Camminata[]>([]);
  useFocusEffect(useCallback(() => { elencoCamminate().then(setLista); }, []));
  return (
    <FlatList style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 14 }} data={lista}
      keyExtractor={(w) => String(w.id)}
      ListHeaderComponent={lista.length > 0 && ((giorniDallUltimoBackup() ?? 999) > 14) ? (
        <Pressable onPress={() => navigation.navigate('Impostazioni')} style={s.backup}>
          <Text style={s.backupT}>💾 Le tue camminate sono solo su questo telefono. Tocca qui per salvare un backup.</Text>
        </Pressable>) : undefined}
      ListEmptyComponent={<Text style={s.vuoto}>Nessuna camminata ancora. Premi START! 🏃</Text>}
      renderItem={({ item, index }) => (
        <Pressable onPress={() => navigation.navigate('Dettaglio', { id: item.id })}
          style={[s.card, index === 0 && s.ultima]}>
          {index === 0 && <Text style={s.badge}>⭐ Ultima camminata</Text>}
          <Text style={s.data}>{new Date(item.started_at).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</Text>
          <Text style={s.riga}>⏱ {formatDurata(tempoMovimento(item))}   📏 {formatDistanza(item.distance_m)}</Text>
          {item.rpe != null && <Text style={[s.riga, { color: faticaDi(item.rpe)?.colore, fontWeight: '800' }]}>💪 Fatica {item.rpe}/10 · {faticaDi(item.rpe)?.titolo}</Text>}
          <Text style={s.riga}>▲ {Math.round(item.ascent_m)} m   ▼ {Math.round(item.descent_m)} m{item.calories != null ? `   🔥 ≈${Math.round(item.calories)} kcal` : ''}</Text>
        </Pressable>
      )} />
  );
}

const s = StyleSheet.create({
  backup: { backgroundColor: colori.giallo, borderRadius: 16, padding: 12, marginBottom: 12 },
  backupT: { color: colori.testo, fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: colori.bianco, borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2 },
  ultima: { borderWidth: 3, borderColor: colori.arancio },
  badge: { color: colori.arancio, fontWeight: '800', marginBottom: 4 },
  data: { fontSize: 16, fontWeight: '700', color: colori.rossoScuro },
  riga: { fontSize: 16, color: colori.testo, marginTop: 4 },
  vuoto: { textAlign: 'center', marginTop: 60, fontSize: 18, color: colori.testoChiaro },
});
