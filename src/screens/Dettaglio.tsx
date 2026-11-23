import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bottone, Dato } from '../ui';
import { colori } from '../theme';
import {  camminata, eliminaCamminata } from '../archivio';
import type { Camminata } from '../core/tipi';
import { formatDistanza, formatDurata, formatPasso, distanzaStimata } from '../core/geo';
import { punti } from '../archivio';
import { useDialogo } from '../dialogo';
import { Mappa } from '../Mappa';
import { leggiInfo } from '../core/altimetria/servizio';
import type { Punto } from '../core/tipi';

export default function Dettaglio({ route, navigation }: any) {
  const dialogo = useDialogo();
  const [w, setW] = useState<Camminata | null>(null);
  const [stimata, setStimata] = useState(0);
  const [pts, setPts] = useState<Punto[]>([]);
  useEffect(() => {
    camminata(route.params.id).then(setW);
    punti(route.params.id).then((p) => { setPts(p); setStimata(distanzaStimata(p)); });
  }, [route.params.id]);
  const stato = w ? leggiInfo(w)?.stato_dem : undefined;
  useEffect(() => {
    // Mentre la correzione con il terreno è in corso, si aggiorna da sola.
    if (stato !== 'in_corso') return;
    let n = 0;
    const t = setInterval(() => { if (++n > 40) clearInterval(t); else camminata(route.params.id).then(setW); }, 2000);
    return () => clearInterval(t);
  }, [stato, route.params.id]);
  if (!w) return null;
  const info = leggiInfo(w);
  const kmh = w.active_ms > 0 ? (w.distance_m / 1000) / (w.active_ms / 3600000) : 0;
  return (
    <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 14 }}>
      <Text style={s.titolo}>Bravo/a! 🎉</Text>
      <Text style={s.data}>{new Date(w.started_at).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</Text>
      <Mappa punti={pts} altezza={300} />
      <View style={s.griglia}>
        <Dato etichetta="Tempo trascorso" valore={formatDurata((w.ended_at ?? w.started_at) - w.started_at)} />
        <Dato etichetta="Tempo attivo (senza pause)" valore={formatDurata(w.active_ms)} />
        <Dato etichetta="Distanza" valore={formatDistanza(w.distance_m)} />
        <Dato etichetta="Velocità media" valore={`${kmh.toFixed(1).replace('.', ',')} km/h`} />
        <Dato etichetta="Passo medio (min/km)" valore={formatPasso(w.distance_m, w.active_ms)} />
        <Dato etichetta="Salita" valore={`▲ ${Math.round(w.ascent_m)} m`} />
        <Dato etichetta="Discesa" valore={`▼ ${Math.round(w.descent_m)} m`} />
      </View>
      {info && <BloccoDislivello info={info} />}
      {stimata > 0 && <Text style={s.avviso}>⚠️ Circa {formatDistanza(stimata)} di questo percorso sono una stima in linea retta: in quel tratto il GPS non ha registrato (app sospesa).</Text>}
      <Bottone testo="🗑 Elimina" colore={colori.rossoScuro} style={{ marginTop: 20 }}
        onPress={() => dialogo({ titolo: 'Eliminare?', messaggio: 'La camminata verrà cancellata per sempre.', bottoni: [
          { testo: 'Elimina', stile: 'pericolo', onPress: async () => { await eliminaCamminata(w.id); navigation.popToTop(); } },
          { testo: 'Annulla', stile: 'secondario' },
        ] })} />
    </ScrollView>
  );
}

const FONTI: Record<string, string> = {
  gps_filtrato: 'GPS filtrato (calcolato sul telefono)',
  dem: 'Corretto con il modello del terreno',
  ripetuto: 'Mediato su un percorso già fatto',
};

function BloccoDislivello({ info }: { info: NonNullable<ReturnType<typeof leggiInfo>> }) {
  const f = (v: { salita: number; discesa: number }) => `▲ ${Math.round(v.salita)} m   ▼ ${Math.round(v.discesa)} m`;
  return (
    <View style={s.blocco}>
      <Text style={s.bloccoTitolo}>Da dove viene il dislivello</Text>
      <Text style={s.bloccoFonte}>{FONTI[info.fonte] ?? info.fonte}{info.fonte === 'dem' && info.fonte_dem ? ` · ${info.fonte_dem}` : ''}</Text>
      <Text style={s.riga}>GPS grezzo: {f(info.grezzo)}  (gonfiato dal rumore)</Text>
      <Text style={s.riga}>GPS filtrato: {f(info.filtrato)}</Text>
      {info.dem && <Text style={s.riga}>Con il terreno: {f(info.dem)}</Text>}
      {info.ripetuto && <Text style={s.riga}>Percorso ripetuto ({info.ripetizioni} uscite): {f(info.ripetuto)}</Text>}
      {info.stato_dem === 'in_corso' && <Text style={s.nota}>⏳ Correzione col terreno in corso…</Text>}
      {info.stato_dem === 'attesa' && <Text style={s.nota}>📡 Manca la rete: il dislivello verrà corretto appena torna la connessione (apri l'app).</Text>}
      {info.stato_dem === 'no' && <Text style={s.nota}>Per un dislivello più preciso attiva "Correggi la quota con la rete" nelle impostazioni. È una stima.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  blocco: { backgroundColor: colori.bianco, borderRadius: 18, padding: 14, marginTop: 10 },
  bloccoTitolo: { fontSize: 16, fontWeight: '800', color: colori.rossoScuro },
  bloccoFonte: { fontSize: 15, color: colori.arancio, fontWeight: '700', marginVertical: 4 },
  riga: { fontSize: 14, color: colori.testo, marginTop: 3 },
  nota: { fontSize: 13, color: colori.testoChiaro, marginTop: 8 },
  titolo: { fontSize: 28, fontWeight: '900', color: colori.rosso },
  data: { fontSize: 16, color: colori.testoChiaro, marginBottom: 10 },
  avviso: { color: colori.testo, backgroundColor: colori.giallo, borderRadius: 12, padding: 12, marginTop: 14 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
});
