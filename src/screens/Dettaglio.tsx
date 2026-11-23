import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bottone, Dato } from '../ui';
import { colori } from '../theme';
import {  camminata, eliminaCamminata } from '../archivio';
import type { Camminata } from '../core/tipi';
import { formatDistanza, formatDurata, formatPasso, distanzaStimata } from '../core/geo';
import { punti } from '../archivio';
import { useDialogo } from '../dialogo';
import { Mappa } from '../Mappa';
import { leggiInfo } from '../core/altimetria/servizio';
import { calcolaAltimetria, velocitaKmh } from '../core/altimetria';
import { Grafico } from '../Grafico';
import { faticaDi } from '../core/fatica';
import { tempoMovimento } from '../core/movimento';
import { calcolaParziali } from '../core/parziali';
import { movimentoDi } from '../core/altimetria/servizio';
import { TabellaParziali } from '../Parziali';
import { creaGpx, nomeFileGpx } from '../core/gpx';
import { salvaFile } from '../file';
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
  const grafici = React.useMemo(() => {
    if (pts.length < 3) return null;
    const i = w ? leggiInfo(w) : null;
    const dem = i?.dem_quote && i.dem_sigma ? { quote: i.dem_quote, sigma: i.dem_sigma } : undefined;
    const r = calcolaAltimetria(pts, { dem });
    const v = velocitaKmh(r.campioni);
    const soste = w ? movimentoDi(w, pts).soste : [];
    return {
      parziali: calcolaParziali(pts, { soste, inizio: w?.started_at, profilo: { d: r.campioni.map((c) => c.d), quote: r.quote } }),
      quota: r.campioni.map((c, k) => ({ x: c.d / 1000, y: r.quote[k] })),
      vel: r.campioni.map((c, k) => ({ x: c.d / 1000, y: v[k] })),
    };
  }, [pts, w]);
  if (!w) return null;
  const info = leggiInfo(w);
  const fatica = faticaDi(w.rpe);
  const mov = tempoMovimento(w);
  const kmh = mov > 0 ? (w.distance_m / 1000) / (mov / 3600000) : 0;
  return (
    <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 14 }}>
      <Text style={s.titolo}>Bravo/a! 🎉</Text>
      <Text style={s.data}>{new Date(w.started_at).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</Text>
      <Mappa punti={pts} altezza={300} />
      <View style={s.griglia}>
        <Dato etichetta="Tempo trascorso" valore={formatDurata((w.ended_at ?? w.started_at) - w.started_at)} />
        <Dato etichetta={w.moving_ms != null ? 'Tempo in movimento' : 'Tempo attivo (senza pause)'} valore={formatDurata(mov)} />
        <Dato etichetta="Distanza" valore={formatDistanza(w.distance_m)} />
        <Dato etichetta="Velocità media" valore={`${kmh.toFixed(1).replace('.', ',')} km/h`} />
        <Dato etichetta="Passo medio (min/km)" valore={formatPasso(w.distance_m, mov)} />
        <Dato etichetta="Calorie (stima)" valore={w.calories != null ? `≈ ${Math.round(w.calories)} kcal` : '—'} />
        <Dato etichetta="Salita" valore={`▲ ${Math.round(w.ascent_m)} m`} />
        <Dato etichetta="Discesa" valore={`▼ ${Math.round(w.descent_m)} m`} />
      </View>
      <Text style={s.nota2}>{w.calories != null
        ? `🔥 Le calorie sono una stima (equazioni ACSM per camminata e corsa, corrette per la pendenza), calcolata con ${info?.peso_kg ?? '—'} kg di peso. Non conta soste e pause. L'errore tipico è del 15-20%.`
        : '🔥 Per vedere le calorie inserisci il tuo peso in Impostazioni (⚙️ nella Home). I dati restano sul telefono.'}</Text>
      <Pressable onPress={() => navigation.navigate('Fatica', { id: w.id })} style={[s.fatica, { borderColor: fatica?.colore ?? '#E7D5C0' }]}>
        {fatica ? (<>
          <Text style={[s.faticaT, { color: fatica.colore }]}>Fatica percepita: {fatica.valore}/10 · {fatica.titolo}</Text>
          {!!w.notes && <Text style={s.faticaN}>“{w.notes}”</Text>}
          <Text style={s.faticaM}>Tocca per modificare</Text>
        </>) : <Text style={s.faticaT}>💪 Quanto è stata faticosa? Tocca per indicarlo</Text>}
      </Pressable>
      {grafici && <TabellaParziali parziali={grafici.parziali} />}
      {grafici && <>
        <Grafico titolo="Altitudine" unita="m" dati={grafici.quota} colore={colori.rosso} />
        <Grafico titolo="Velocità" unita="km/h" dati={grafici.vel} colore={colori.arancio} decimali={1} />
      </>}
      {w.moving_ms != null && w.active_ms - w.moving_ms >= 60000 && <Text style={s.nota2}>⏸ Soste riconosciute in automatico: {formatDurata(w.active_ms - w.moving_ms)}. Non contano nel tempo in movimento, nel passo e nelle calorie.</Text>}
      {info && <BloccoDislivello info={info} />}
      {stimata > 0 && <Text style={s.avviso}>⚠️ Circa {formatDistanza(stimata)} di questo percorso sono una stima in linea retta: in quel tratto il GPS non ha registrato (app sospesa).</Text>}
      <Bottone testo="📤 Esporta GPX (per altre app)" colore={colori.arancio} style={{ marginTop: 16 }}
        onPress={async () => {
          try { await salvaFile(nomeFileGpx(w.started_at), creaGpx(w, pts), 'application/gpx+xml'); }
          catch (e: any) { dialogo({ titolo: 'Esportazione non riuscita', messaggio: String(e?.message ?? e), bottoni: [{ testo: 'Ok' }] }); }
        }} />
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
  fatica: { backgroundColor: colori.bianco, borderRadius: 18, borderWidth: 3, padding: 14, marginTop: 10 },
  faticaT: { fontSize: 17, fontWeight: '800', color: colori.rossoScuro },
  faticaN: { fontSize: 15, color: colori.testo, marginTop: 6, fontStyle: 'italic' },
  faticaM: { fontSize: 12, color: colori.testoChiaro, marginTop: 6 },
  nota2: { fontSize: 13, color: colori.testoChiaro, marginTop: 8 },
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
