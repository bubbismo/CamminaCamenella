import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Bottone, Dato } from '../ui';
import { colori } from '../theme';
import { Camminata, camminataInCorso, punti } from '../db';
import { formatDistanza, formatDurata, formatPasso, statistiche } from '../geo';
import { pausa, riprendi, termina } from '../tracking';

export default function Attivita({ navigation }: any) {
  useKeepAwake();
  const [w, setW] = useState<Camminata | null>(null);
  const [st, setSt] = useState({ distanzaM: 0, salitaM: 0, discesaM: 0 });
  const [ora, setOra] = useState(Date.now());

  useEffect(() => {
    let vivo = true;
    const giro = async () => {
      const c = await camminataInCorso();
      if (!vivo) return;
      setW(c); setOra(Date.now());
      if (c) setSt(statistiche(await punti(c.id)));
    };
    giro();
    const t = setInterval(giro, 1000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  if (!w) return <View style={s.c}><Text style={s.msg}>Nessuna attività in corso</Text>
    <Bottone testo="Indietro" onPress={() => navigation.popToTop()} /></View>;

  const fine = w.status === 'paused' ? w.paused_since! : ora;
  const attivoMs = Math.max(0, fine - w.started_at - w.paused_total_ms);
  const inPausa = w.status === 'paused';

  const stop = () => Alert.alert('Finito?', 'Vuoi terminare la camminata?', [
    { text: 'Continua' },
    { text: 'Sì, stop', style: 'destructive', onPress: async () => {
      await termina(w.id); navigation.replace('Dettaglio', { id: w.id }); } },
  ]);

  return (
    <View style={s.c}>
      <Text style={s.tempo}>{formatDurata(attivoMs)}</Text>
      <Text style={s.stato}>{inPausa ? '⏸ In pausa' : 'Forza, così! 🔥'}</Text>
      <ScrollView contentContainerStyle={s.griglia}>
        <Dato etichetta="Distanza" valore={formatDistanza(st.distanzaM)} />
        <Dato etichetta="Passo (min/km)" valore={formatPasso(st.distanzaM, attivoMs)} />
        <Dato etichetta="Salita" valore={`▲ ${Math.round(st.salitaM)} m`} />
        <Dato etichetta="Discesa" valore={`▼ ${Math.round(st.discesaM)} m`} />
      </ScrollView>
      <View style={s.riga}>
        <Bottone grande style={{ flex: 1, marginRight: 8 }} colore={colori.giallo}
          testo={inPausa ? '▶ Riprendi' : '⏸ Pausa'}
          onPress={() => (inPausa ? riprendi(w.id) : pausa(w.id))} />
        <Bottone grande style={{ flex: 1, marginLeft: 8 }} colore={colori.rossoScuro} testo="■ STOP" onPress={stop} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colori.rosso, padding: 16, paddingTop: 50 },
  tempo: { fontSize: 72, fontWeight: '900', color: colori.bianco, textAlign: 'center' },
  stato: { fontSize: 18, color: colori.giallo, textAlign: 'center', marginBottom: 10 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  riga: { flexDirection: 'row', paddingVertical: 12 },
  msg: { color: colori.bianco, fontSize: 20, textAlign: 'center', marginVertical: 30 },
});
