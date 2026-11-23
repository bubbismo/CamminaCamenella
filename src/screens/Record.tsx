import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colori } from '../theme';
import { calcolaRecord, CATEGORIE, formatValore, Tipo, TIPI, Uscita } from '../core/record';
import { uscite } from '../core/recordServizio';

const ICONE: Record<string, string> = { km: '⚡', s1000: '⏱', s5000: '⏱', s10000: '⏱', distanza: '📏', durata: '⌛', salita: '⛰', settimana: '📅', mese: '🗓' };

function quando(cat: string, data: number): string {
  const d = new Date(data);
  if (cat === 'mese') return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  if (cat === 'settimana') return `settimana del ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Record({ navigation }: any) {
  const [lista, setLista] = useState<Uscita[] | null>(null);
  const [tipo, setTipo] = useState<Tipo>('camminata');
  useFocusEffect(useCallback(() => {
    let vivo = true;
    uscite().then((u) => {
      if (!vivo) return;
      setLista(u);
      // si apre sul tipo che si pratica di più
      const corse = u.filter((x) => x.tipo === 'corsa').length;
      if (corse > u.length - corse) setTipo('corsa');
    }).catch(() => vivo && setLista([]));
    return () => { vivo = false; };
  }, []));

  if (!lista) return <View style={s.c}><ActivityIndicator color={colori.rosso} style={{ marginTop: 40 }} /><Text style={s.vuoto}>Calcolo i record…</Text></View>;
  const rec = calcolaRecord(lista, tipo);
  const n = lista.filter((u) => u.tipo === tipo).length;
  return (
    <ScrollView style={s.c} contentContainerStyle={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {TIPI.map((t) => (
          <Pressable key={t.v} onPress={() => setTipo(t.v)} style={[s.chip, tipo === t.v && s.chipOn]}>
            <Text style={[s.chipT, tipo === t.v && { color: '#fff' }]}>{t.icona} {t.t}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.nota}>{n === 0 ? '' : `Calcolati su ${n} ${tipo === 'corsa' ? (n === 1 ? 'corsa' : 'corse') : (n === 1 ? 'camminata' : 'camminate')}. `}Camminata o corsa si decide dalla velocità media (da 7 km/h è corsa); si corregge nel dettaglio di ogni uscita.</Text>
      {!rec.length && <Text style={s.vuoto}>{tipo === 'corsa' ? '🏃 Ancora nessuna corsa: i record arriveranno con la prima!' : '🚶 Ancora nessuna camminata: i record arriveranno con la prima!'}</Text>}
      {CATEGORIE.map((c) => {
        const r = rec.find((x) => x.cat === c.c);
        if (!r) return rec.length ? (
          <View key={c.c} style={[s.card, { opacity: 0.55 }]}>
            <Text style={s.icona}>{ICONE[c.c]}</Text>
            <View style={{ flex: 1 }}><Text style={s.nome}>{c.nome}</Text><Text style={s.data}>ancora nessuno: tocca a te!</Text></View>
          </View>
        ) : null;
        const link = r.id != null;
        return (
          <Pressable key={c.c} disabled={!link} onPress={() => link && navigation.navigate('Dettaglio', { id: r.id })} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
            <Text style={s.icona}>{ICONE[c.c]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{c.nome}</Text>
              <Text style={s.data}>{quando(c.c, r.data)}</Text>
            </View>
            <Text style={s.valore}>{formatValore(c.c, r.valore)}</Text>
            {link && <Text style={s.freccia}>›</Text>}
          </Pressable>
        );
      })}
      {rec.length > 0 && <Text style={s.nota}>Tocca un record per aprire l'uscita. I migliori tempi su 1, 5 e 10 km sono il tratto continuo più veloce, ovunque nell'uscita, senza le soste.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colori.crema },
  chip: { backgroundColor: colori.bianco, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, marginRight: 8 },
  chipOn: { backgroundColor: colori.rosso },
  chipT: { fontSize: 16, fontWeight: '700', color: colori.rossoScuro },
  nota: { fontSize: 13, color: colori.testoChiaro, marginVertical: 8 },
  vuoto: { fontSize: 16, color: colori.testoChiaro, textAlign: 'center', marginTop: 30 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colori.bianco, borderRadius: 18, padding: 14, marginTop: 10 },
  icona: { fontSize: 26, width: 40, textAlign: 'center', marginRight: 10 },
  nome: { fontSize: 15, fontWeight: '800', color: colori.rossoScuro },
  data: { fontSize: 13, color: colori.testoChiaro, marginTop: 2 },
  valore: { fontSize: 20, fontWeight: '900', color: colori.testo, fontVariant: ['tabular-nums'] },
  freccia: { fontSize: 26, color: colori.testoChiaro, marginLeft: 8 },
});
