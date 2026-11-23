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
import { DATI_VOCE, DatoVoce, FREQUENZE, frasePeriodica, leggiPrefVoce, VOLUMI } from '../core/annunci';
import { parla, sbloccaVoce, statoVoce } from '../voce';
import { PRESET_SOGLIE } from '../core/pendenze';

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
  const [pv, setPv] = useState(leggiPrefVoce(leggiPref));
  const aggiornaVoce = (k: string, v: string) => { scriviPref(k, v); setPv(leggiPrefVoce(leggiPref)); };
  const statoV = statoVoce();
  const provaVoce = () => {
    sbloccaVoce();
    const p = leggiPrefVoce(leggiPref);
    parla(frasePeriodica({ distanzaM: 2000, movimentoMs: 24 * 60000 + 10000, salitaM: 85, fermo: false, pausa: false,
      parziali: [{ n: 2, daM: 1000, aM: 2000, metri: 1000, ms: 716000, passoSKm: 716, salita: 40, discesa: 0, completo: true }] }, p), p.volume);
  };
  const [pendenze, setPendenze] = useState(leggiPref('pendenze', PRESET_SOGLIE[0].v));
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
        <View style={s.riga}>
          <Text style={s.titolo}>Annunci vocali</Text>
          <Switch value={pv.attiva} trackColor={{ true: colori.rosso, false: '#ccc' }} thumbColor="#fff"
            onValueChange={(v) => { aggiornaVoce('voce', v ? '1' : '0'); if (v) sbloccaVoce(); }} />
        </View>
        <Text style={s.testo}>Durante la camminata una voce ti dice a che punto sei, senza guardare il telefono. Se ti disturba (es. in montagna) spegnila qui, oppure al volo con 🔊 nella schermata di corsa.</Text>
        {pv.attiva && <>
          <Text style={s.sottotitolo}>Quando</Text>
          <View style={s.chips}>
            {FREQUENZE.map(({ v, t }) => (
              <Pressable key={v} onPress={() => aggiornaVoce('voce_ogni', v)} style={[s.chip, s.chipM, pv.ogni === v && s.chipOn]}>
                <Text style={[s.chipT, pv.ogni === v && { color: '#fff' }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.sottotitolo}>Cosa dire</Text>
          <View style={s.chips}>
            {DATI_VOCE.map(({ v, t }) => {
              const on = pv.dati.includes(v);
              const nuovi: DatoVoce[] = on ? pv.dati.filter((d) => d !== v) : [...pv.dati, v];
              return (
                <Pressable key={v} onPress={() => aggiornaVoce('voce_dati', nuovi.join(','))} style={[s.chip, s.chipM, on && s.chipOn]}>
                  <Text style={[s.chipT, on && { color: '#fff' }]}>{on ? '✓ ' : ''}{t}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.sottotitolo}>Volume</Text>
          <View style={s.chips}>
            {VOLUMI.map(({ v, t }) => (
              <Pressable key={v} onPress={() => aggiornaVoce('voce_volume', String(v))} style={[s.chip, s.chipM, pv.volume === v && s.chipOn]}>
                <Text style={[s.chipT, pv.volume === v && { color: '#fff' }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={provaVoce} style={[s.chip, s.chipM, { alignSelf: 'flex-start', marginTop: 4 }]}><Text style={s.chipT}>🔊 Prova la voce</Text></Pressable>
          {statoV === 'no' && <Text style={[s.testo, { color: colori.rosso }]}>⚠️ Questo browser non ha la sintesi vocale.</Text>}
          {statoV === 'nessuna_it' && <Text style={[s.testo, { color: colori.rosso }]}>⚠️ Su questo dispositivo non c'è una voce italiana installata: per non mandare il testo a servizi esterni, l'app resta in silenzio. Puoi aggiungerne una nelle impostazioni del telefono (Sintesi vocale / Contenuti letti ad alta voce).</Text>}
          <Text style={s.privacy}>🔒 Le frasi le legge la voce del telefono, senza rete. Su iPhone la voce non si sente con il telefono in modalità silenziosa (interruttore laterale), e il volume dipende anche dai tasti del telefono. Gli annunci funzionano con l'app aperta e lo schermo acceso, come il GPS. Con gli auricolari Bluetooth collegati, la voce esce lì.</Text>
        </>}
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
        <Text style={s.titolo}>Colori del profilo altimetrico</Text>
        <Text style={s.testo}>Da che pendenza una salita è leggera (giallo), impegnativa (arancio) o ripida (rosso). Pianeggiante in verde, discesa in blu.</Text>
        <View style={s.chips}>
          {PRESET_SOGLIE.map(({ v, t }) => (
            <Pressable key={v} onPress={() => { setPendenze(v); scriviPref('pendenze', v); }} style={[s.chip, s.chipM, pendenze === v && s.chipOn]}>
              <Text style={[s.chipT, pendenze === v && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.testo}>{(PRESET_SOGLIE.find((x) => x.v === pendenze) ?? PRESET_SOGLIE[0]).d.replace(/^./, (c) => c.toUpperCase())}.</Text>
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
  chipM: { marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  sottotitolo: { fontSize: 15, fontWeight: '800', color: colori.testo, marginTop: 12 },
  chipT: { fontSize: 16, fontWeight: '700', color: colori.rossoScuro },
});
