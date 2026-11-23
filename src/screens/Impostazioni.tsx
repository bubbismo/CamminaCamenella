import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colori } from '../theme';
import { Avatar } from '../Avatar';
import { leggiAvatar } from '../core/avatar';
import { leggiPref, scriviPref } from '../preferenze';
import { SOGLIA_PREDEFINITA_M } from '../core/altimetria';
import { PESO_MAX, PESO_MIN, pesoValido } from '../core/calorie';
import { useDialogo } from '../dialogo';
import { leggiBackup, nomeFileBackup, riassunto } from '../core/backup';
import { creaBackup, giorniDallUltimoBackup, ripristinaBackup, segnaBackupFatto } from '../core/backupServizio';
import { salvaFile, scegliFileTesto } from '../file';
import { riprovaCorrezioniPendenti } from '../core/altimetria/servizio';
import { SOGLIA_KMH_PREDEFINITA } from '../core/movimento';

const AUTOPAUSA = [
  { v: '0', t: 'Spenta' },
  { v: '1', t: 'Sensibile' },
  { v: '1.5', t: 'Normale' },
  { v: '3', t: 'Corsa' },
];

export default function Impostazioni({ navigation }: any) {
  const avatar = leggiAvatar();
  const dialogo = useDialogo();
  const [giorni, setGiorni] = useState(giorniDallUltimoBackup());
  const [lavoro, setLavoro] = useState(false);
  const salvaBackup = async () => {
    if (lavoro) return; setLavoro(true);
    try {
      const b = await creaBackup();
      const esito = await salvaFile(nomeFileBackup(), JSON.stringify(b), 'application/json');
      if (esito !== 'annullato') {
        segnaBackupFatto(); setGiorni(0);
        dialogo({ titolo: 'Backup pronto 💾', messaggio: `${riassunto(b)}\n\nTienilo al sicuro: su File/Drive, oppure mandatelo per email.`, bottoni: [{ testo: 'Ok' }] });
      }
    } catch (e: any) {
      dialogo({ titolo: 'Backup non riuscito', messaggio: String(e?.message ?? e), bottoni: [{ testo: 'Ok' }] });
    } finally { setLavoro(false); }
  };
  const ripristina = async () => {
    if (lavoro) return;
    try {
      const testo = await scegliFileTesto();
      if (testo == null) return;
      const b = leggiBackup(testo);
      dialogo({ titolo: 'Ripristinare questo backup?', messaggio: `${riassunto(b)}\n\nVerranno aggiunte le camminate che non sono già sul telefono; nulla viene cancellato. Peso, nome, avatar e impostazioni del backup sostituiscono quelli attuali.`,
        bottoni: [
          { testo: 'Ripristina', onPress: async () => {
            setLavoro(true);
            try {
              const r = await ripristinaBackup(b);
              dialogo({ titolo: 'Ripristino completato ✅', messaggio: `Camminate aggiunte: ${r.aggiunte}.${r.gia ? ` Già presenti (saltate): ${r.gia}.` : ''}`, bottoni: [{ testo: 'Ok', onPress: () => navigation.popToTop() }] });
            } catch (e: any) {
              dialogo({ titolo: 'Ripristino non riuscito', messaggio: String(e?.message ?? e), bottoni: [{ testo: 'Ok' }] });
            } finally { setLavoro(false); }
          } },
          { testo: 'Annulla', stile: 'secondario' },
        ] });
    } catch (e: any) {
      dialogo({ titolo: 'File non valido', messaggio: String(e?.message ?? e), bottoni: [{ testo: 'Ok' }] });
    }
  };
  const [peso, setPeso] = useState(leggiPref('peso', ''));
  const [nome, setNome] = useState(leggiPref('nome', ''));
  const pesoNum = parseFloat(peso.replace(',', '.'));
  const pesoOk = peso === '' || pesoValido(pesoNum);
  const [rete, setRete] = useState(leggiPref('rete', '0') === '1');
  const [soglia, setSoglia] = useState(leggiPref('soglia', String(SOGLIA_PREDEFINITA_M)));
  const [autopausa, setAutopausa] = useState(leggiPref('autopausa', String(SOGLIA_KMH_PREDEFINITA)));
  const descrAutopausa = autopausa === '0'
    ? 'Il tempo scorre sempre, finché non premi Pausa.'
    : `Se vai più piano di ${autopausa.replace('.', ',')} km/h per almeno 10 secondi, il tempo si ferma da solo e riparte quando riprendi a muoverti.`;
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
        <Text style={s.titolo}>Backup delle camminate</Text>
        <Text style={s.testo}>Le camminate sono salvate solo su questo telefono, dentro l'app. Se cancelli i dati del browser o cambi telefono si perdono: salva ogni tanto un backup (un file) e tienilo al sicuro.</Text>
        <Text style={[s.testo, { fontWeight: '700', color: giorni == null || giorni > 14 ? colori.rosso : colori.verde }]}>
          {giorni == null ? 'Nessun backup ancora.' : giorni === 0 ? 'Ultimo backup: oggi ✅' : `Ultimo backup: ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'} fa`}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          <Pressable onPress={salvaBackup} style={[s.chip, s.chipOn]}><Text style={[s.chipT, { color: '#fff' }]}>{lavoro ? '⏳ Attendi…' : '💾 Salva backup'}</Text></Pressable>
          <Pressable onPress={ripristina} style={s.chip}><Text style={s.chipT}>📂 Ripristina</Text></Pressable>
        </View>
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
        <Text style={s.titolo}>Pausa automatica</Text>
        <Text style={s.testo}>Ai semafori o quando ti fermi a guardare il panorama, il cronometro si ferma da solo. Velocità media, passo e calorie contano solo il tempo in movimento.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {AUTOPAUSA.map(({ v, t }) => (
            <Pressable key={v} onPress={() => { setAutopausa(v); scriviPref('autopausa', v); }} style={[s.chip, { marginBottom: 8 }, autopausa === v && s.chipOn]}>
              <Text style={[s.chipT, autopausa === v && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.testo}>{descrAutopausa}</Text>
        <Text style={[s.testo, { color: colori.testoChiaro, fontSize: 14 }]}>Vale per le prossime camminate. La pausa manuale funziona sempre.</Text>
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
