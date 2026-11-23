import React, { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bottone } from '../ui';
import { colori } from '../theme';
import { camminataInCorso, elencoCamminate } from '../archivio';
import { richiediPermessi, sfondoPossibile, staTracciando } from '../tracking';
import { avvia, riprendiDopoInterruzione, scarta, termina } from '../core/sessione';
import { formatDistanza } from '../core/geo';
import { useDialogo } from '../dialogo';

const FRASI = ['Ogni passo conta! 💪', 'Oggi si va forte! 🔥', 'Le gambe sono pronte? 😄', 'Che bella giornata per camminare! ☀️'];

export default function Home({ navigation }: any) {
  const dialogo = useDialogo();
  const [frase] = useState(() => FRASI[Math.floor(Math.random() * FRASI.length)]);
  const [inCorso, setInCorso] = useState(false);
  const [ultima, setUltima] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const w = await camminataInCorso();
      setInCorso(!!w);
      const e = await elencoCamminate();
      setUltima(e[0] ? `Ultima: ${formatDistanza(e[0].distance_m)}` : null);
      // Corsa rimasta in sospeso (app chiusa o sospesa): si chiede che fare.
      if (w && !(await staTracciando())) {
        dialogo({
          titolo: 'Corsa interrotta', messaggio: 'La corsa si è fermata (telefonata, cambio di app o schermo spento). Vuoi riprenderla? Il tratto senza GPS verrà collegato con una linea dritta e segnato come stimato.',
          bottoni: [
            { testo: 'Riprendi', onPress: async () => { await riprendiDopoInterruzione(w.id); navigation.navigate('Attivita'); } },
            { testo: 'Termina e salva', stile: 'secondario', onPress: async () => { await termina(w.id); navigation.navigate('Dettaglio', { id: w.id }); } },
            { testo: 'Scarta', stile: 'pericolo', onPress: async () => { await scarta(w.id); setInCorso(false); } },
          ],
        });
      }
    })();
  }, []));

  const impostazioni = () => { if (Platform.OS !== 'web') Linking.openSettings(); };

  const start = async () => {
    if (inCorso) return navigation.navigate('Attivita');
    const p = await richiediPermessi();
    if (p === 'negato') {
      dialogo({ titolo: 'Serve la posizione', messaggio: 'Senza la posizione non posso registrare il percorso. Abilitala nelle impostazioni del telefono o del browser per questo sito.',
        bottoni: [{ testo: 'Apri impostazioni', onPress: impostazioni }, { testo: 'Annulla', stile: 'secondario' }] });
      return;
    }
    if (p === 'primoPiano' && sfondoPossibile) {
      dialogo({ titolo: 'Posizione "sempre"', messaggio: 'Per tracciare con lo schermo spento imposta la posizione su "Consenti sempre" nelle impostazioni dell\'app.',
        bottoni: [{ testo: 'Apri impostazioni', onPress: impostazioni }, { testo: 'Continua comunque', stile: 'secondario' }] });
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
        {!sfondoPossibile && <Text style={s.nota}>Tieni lo schermo acceso durante la corsa: dal browser il GPS si ferma se lo schermo si spegne o cambi app.</Text>}
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
  nota: { color: colori.giallo, textAlign: 'center', marginTop: 24, fontSize: 14 },
});
