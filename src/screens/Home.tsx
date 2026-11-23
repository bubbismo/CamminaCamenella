import React, { useCallback, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bottone } from '../ui';
import { colori } from '../theme';
import { camminataInCorso, elencoCamminate } from '../archivio';
import { richiediPermessi, sfondoPossibile, staTracciando } from '../tracking';
import { sbloccaVoce } from '../voce';
import { vaiDopoStop } from '../dopoStop';
import { avvia, pulisciVuote, riprendiDopoInterruzione, scarta, termina } from '../core/sessione';
import { formatDistanza } from '../core/geo';
import { useDialogo } from '../dialogo';
import { pesoConfigurato, riprovaCorrezioniPendenti } from '../core/altimetria/servizio';
import { leggiPref, scriviPref } from '../preferenze';
import { Avatar } from '../Avatar';
import { dopoSplash } from '../avvio';
import { AvatarConfig, leggiAvatar } from '../core/avatar';

const FRASI = ['Ogni passo conta! 💪', 'Oggi si va forte! 🔥', 'Le gambe sono pronte? 😄', 'Che bella giornata per camminare! ☀️'];

export default function Home({ navigation }: any) {
  const dialogo = useDialogo();
  const [frase] = useState(() => FRASI[Math.floor(Math.random() * FRASI.length)]);
  const [inCorso, setInCorso] = useState(false);
  const [ultima, setUltima] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<AvatarConfig | null>(() => leggiAvatar());
  const rimbalzo = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    // micro-animazione: l'avatar "saltella" piano
    const a = Animated.loop(Animated.sequence([
      Animated.timing(rimbalzo, { toValue: -6, duration: 700, useNativeDriver: true }),
      Animated.timing(rimbalzo, { toValue: 0, duration: 700, useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, []);

  const controlla = useCallback(() => {
    (async () => {
      setAvatar(leggiAvatar());
      await pulisciVuote();
      riprovaCorrezioniPendenti().catch(() => {});
      const w = await camminataInCorso();
      setInCorso(!!w);
      const e = await elencoCamminate();
      setUltima(e[0] ? `Ultima: ${formatDistanza(e[0].distance_m)}` : null);
      // Primo avvio: si propone di personalizzare l'app con un avatar.
      if (!w && leggiPref('avatar_chiesto', '0') !== '1') {
        scriviPref('avatar_chiesto', '1');
        dopoSplash(() => dialogo({ titolo: 'Vuoi personalizzare l\'app? 🎨', messaggio: 'Crea il tuo avatar: capelli, occhiali, colori… Si disegna sul telefono, senza foto e senza inviare nulla a nessuno.',
          bottoni: [{ testo: 'Crea il mio avatar', onPress: () => navigation.navigate('Avatar') }, { testo: 'Più tardi', stile: 'secondario' }] }));
      }
      // Corsa rimasta in sospeso (app chiusa o sospesa): si chiede che fare.
      if (w && !(await staTracciando())) {
        dialogo({
          titolo: 'Corsa interrotta', messaggio: 'La corsa si è fermata (telefonata, cambio di app o schermo spento). Vuoi riprenderla? Il tratto senza GPS verrà collegato con una linea dritta e segnato come stimato.',
          bottoni: [
            { testo: 'Riprendi', onPress: async () => { sbloccaVoce(); await riprendiDopoInterruzione(w.id); navigation.navigate('Attivita'); } },
            { testo: 'Termina e salva', stile: 'secondario', onPress: async () => { await termina(w.id); await vaiDopoStop(navigation, w.id, false); } },
            { testo: 'Scarta', stile: 'pericolo', onPress: async () => { await scarta(w.id); controlla(); } },
          ],
        });
      }
    })();
  }, []);
  useFocusEffect(controlla);
  React.useEffect(() => {
    // Torna la rete: si completano le correzioni rimaste in attesa.
    const g: any = globalThis;
    const f = () => riprovaCorrezioniPendenti().catch(() => {});
    g.addEventListener?.('online', f);
    return () => g.removeEventListener?.('online', f);
  }, []);

  const occupato = useRef(false);
  const impostazioni = () => { if (Platform.OS !== 'web') Linking.openSettings(); };

  const start = async () => {
    sbloccaVoce(); // Safari su iPhone: la voce si può usare solo se "sbloccata" da un tocco
    if (occupato.current) return;
    if (!inCorso && !pesoConfigurato() && leggiPref('peso_saltato', '0') !== '1') {
      dialogo({ titolo: 'Qual è il tuo peso?', messaggio: 'Serve una volta sola per stimare le calorie. Resta sul telefono e lo puoi cambiare quando vuoi nelle impostazioni.',
        bottoni: [
          { testo: 'Inserisci il peso', onPress: () => navigation.navigate('Impostazioni') },
          { testo: 'Più tardi (niente calorie)', stile: 'secondario', onPress: () => { scriviPref('peso_saltato', '1'); start(); } },
        ] });
      return;
    }
    occupato.current = true;
    try { await avviaTutto(); } finally { occupato.current = false; }
  };

  const avviaTutto = async () => {
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
      <Pressable onPress={() => navigation.navigate('Impostazioni')} style={s.ingranaggio}><Text style={{ fontSize: 28 }}>⚙️</Text></Pressable>
      <Pressable onPress={() => navigation.navigate('Avatar')} style={s.avatar}>
        <Animated.View style={{ transform: [{ translateY: rimbalzo }] }}>
          {avatar ? <Avatar config={avatar} size={92} /> : <View style={s.avatarVuoto}><Text style={{ fontSize: 40 }}>🙂</Text><Text style={s.avatarT}>Crea avatar</Text></View>}
        </Animated.View>
      </Pressable>
      <Text style={s.titolo}>{'Cammina\nCamenella'}</Text>
      <Text style={s.frase}>{leggiPref('nome', '') ? `Ciao ${leggiPref('nome', '')}! ` : ''}{frase}</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Bottone grande testo={inCorso ? '▶ CONTINUA' : '▶ START'} onPress={start} colore={colori.arancio} />
        {ultima && <Text style={s.ultima}>{ultima}</Text>}
        {!sfondoPossibile && <Text style={s.nota}>Tieni lo schermo acceso durante la corsa: dal browser il GPS si ferma se lo schermo si spegne o cambi app.</Text>}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Bottone testo="📖 Camminate" onPress={() => navigation.navigate('Storico')} colore={colori.rossoScuro} style={{ flex: 1, marginRight: 6 }} />
        <Bottone testo="📊 Statistiche" onPress={() => navigation.navigate('Statistiche')} colore={colori.rossoScuro} style={{ flex: 1, marginLeft: 6 }} />
      </View>
      <Bottone testo="🏆 I miei record" onPress={() => navigation.navigate('Record')} colore={colori.rossoScuro} style={{ marginTop: 10 }} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colori.rosso, padding: 20, paddingTop: 44 },
  ingranaggio: { position: 'absolute', top: 50, right: 16, zIndex: 5, padding: 6 },
  avatar: { alignSelf: 'center', marginBottom: 6 },
  avatarVuoto: { width: 92, height: 92, borderRadius: 46, backgroundColor: colori.giallo, alignItems: 'center', justifyContent: 'center' },
  avatarT: { fontSize: 11, fontWeight: '800', color: colori.testo },
  titolo: { fontSize: 36, lineHeight: 40, fontWeight: '900', color: colori.giallo, textAlign: 'center' },
  frase: { fontSize: 18, color: colori.bianco, textAlign: 'center', marginTop: 8 },
  ultima: { color: colori.bianco, textAlign: 'center', marginTop: 20, fontSize: 16 },
  nota: { color: colori.giallo, textAlign: 'center', marginTop: 24, fontSize: 14 },
});
