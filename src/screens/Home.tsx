import React, { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bottone } from '../ui';
import { colori } from '../theme';
import { camminataInCorso, elencoCamminate } from '../db';
import { avvia, richiediPermessi } from '../tracking';
import { formatDistanza } from '../geo';

const FRASI = ['Ogni passo conta! 💪', 'Oggi si va forte! 🔥', 'Le gambe sono pronte? 😄', 'Che bella giornata per camminare! ☀️'];

export default function Home({ navigation }: any) {
  const [frase] = useState(() => FRASI[Math.floor(Math.random() * FRASI.length)]);
  const [inCorso, setInCorso] = useState(false);
  const [ultima, setUltima] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const w = await camminataInCorso();
      setInCorso(!!w);
      const e = await elencoCamminate();
      setUltima(e[0] ? `Ultima: ${formatDistanza(e[0].distance_m)}` : null);
    })();
  }, []));

  const start = async () => {
    if (inCorso) return navigation.navigate('Attivita');
    const p = await richiediPermessi();
    if (p === 'negato') {
      Alert.alert('Serve la posizione', 'Senza la posizione non posso registrare il percorso.',
        [{ text: 'Apri impostazioni', onPress: () => Linking.openSettings() }, { text: 'Annulla' }]);
      return;
    }
    if (p === 'primoPiano') {
      Alert.alert('Posizione "sempre"',
        'Per tracciare con lo schermo spento imposta la posizione su "Consenti sempre" nelle impostazioni dell\'app.',
        [{ text: 'Apri impostazioni', onPress: () => Linking.openSettings() }, { text: 'Continua comunque' }]);
    }
    await avvia();
    navigation.navigate('Attivita');
  };

  return (
    <View style={s.c}>
      <Text style={s.titolo}>CamminaCamenella</Text>
      <Text style={s.frase}>{frase}</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Bottone grande testo={inCorso ? '▶ CONTINUA' : '▶ START'} onPress={start} colore={colori.arancio} />
        {ultima && <Text style={s.ultima}>{ultima}</Text>}
      </View>
      <Bottone testo="📖 Le mie camminate" onPress={() => navigation.navigate('Storico')} colore={colori.rossoScuro} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colori.rosso, padding: 20, paddingTop: 60 },
  titolo: { fontSize: 36, fontWeight: '900', color: colori.giallo, textAlign: 'center' },
  frase: { fontSize: 18, color: colori.bianco, textAlign: 'center', marginTop: 8 },
  ultima: { color: colori.bianco, textAlign: 'center', marginTop: 20, fontSize: 16 },
});
