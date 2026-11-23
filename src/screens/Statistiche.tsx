import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colori } from '../theme';
import { elencoCamminate } from '../archivio';
import type { Camminata } from '../core/tipi';
import { calcolaStatistiche, Periodo, variazione } from '../core/statistiche';
import { GraficoBarre } from '../GraficoBarre';

const PERIODI: { k: Periodo; nome: string; titolo: string; prima: string }[] = [
  { k: 'settimana', nome: 'Settimana', titolo: 'Ultimi 7 giorni', prima: 'ai 7 giorni prima' },
  { k: 'mese', nome: 'Mese', titolo: 'Ultimi 30 giorni', prima: 'ai 30 giorni prima' },
  { k: 'anno', nome: 'Anno', titolo: 'Ultimi 12 mesi', prima: 'ai 12 mesi prima' },
];
const virgola = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const migliaia = (v: number) => Math.round(v).toLocaleString('it-IT');

function Riquadro({ valore, etichetta, diff, prima }: { valore: string; etichetta: string; diff?: number | null; prima?: string }) {
  return (
    <View style={s.riq}>
      <Text style={s.riqV}>{valore}</Text>
      <Text style={s.riqE}>{etichetta}</Text>
      {diff != null && <Text style={s.riqD}>{diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {Math.abs(diff)}% rispetto {prima}</Text>}
    </View>
  );
}

export default function Statistiche() {
  const [camminate, setCamminate] = useState<Camminata[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('settimana');
  useFocusEffect(useCallback(() => { elencoCamminate().then(setCamminate); }, []));
  const st = useMemo(() => calcolaStatistiche(camminate, periodo), [camminate, periodo]);
  const P = PERIODI.find((p) => p.k === periodo)!;
  const ogni = periodo === 'mese' ? 5 : 1;
  const conCalorie = camminate.some((w) => w.calories != null);

  return (
    <ScrollView style={{ backgroundColor: colori.crema }} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <View style={s.scelta}>
        {PERIODI.map((p) => (
          <Pressable key={p.k} onPress={() => setPeriodo(p.k)} style={[s.chip, periodo === p.k && s.chipOn]}>
            <Text style={[s.chipT, periodo === p.k && { color: '#fff' }]}>{p.nome}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.titolo}>{P.titolo}</Text>
      <View style={s.griglia}>
        <Riquadro valore={`${virgola(st.totale.km)} km`} etichetta="Distanza" diff={variazione(st.totale.km, st.precedente.km)} prima={P.prima} />
        <Riquadro valore={`${migliaia(st.totale.kcal)} kcal`} etichetta="Calorie (stima)" diff={variazione(st.totale.kcal, st.precedente.kcal)} prima={P.prima} />
        <Riquadro valore={String(st.totale.n)} etichetta={st.totale.n === 1 ? 'Camminata' : 'Camminate'} />
        <Riquadro valore={`${virgola(st.totale.ore)} h`} etichetta="Tempo in movimento" />
        <Riquadro valore={`${migliaia(st.totale.salita)} m`} etichetta="Dislivello in salita" />
      </View>
      <GraficoBarre key={`km-${periodo}`} titolo="Distanza" unita="km" colore={colori.rosso} etichettaOgni={ogni}
        barre={st.fasce.map((f) => ({ valore: f.km, breve: f.breve, lunga: f.lunga }))} formato={(v) => virgola(v, v < 10 ? 1 : 0)} />
      <GraficoBarre key={`kcal-${periodo}`} titolo="Calorie" unita="kcal" colore={colori.arancio} etichettaOgni={ogni}
        barre={st.fasce.map((f) => ({ valore: f.kcal, breve: f.breve, lunga: f.lunga }))} formato={migliaia} />
      {!conCalorie && camminate.length > 0 && <Text style={s.nota}>Le calorie si calcolano solo se hai inserito il tuo peso (⚙️ Impostazioni).</Text>}
      <Text style={s.nota}>Le calorie sono una stima. Il confronto è con il periodo di uguale durata appena precedente.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scelta: { flexDirection: 'row', backgroundColor: colori.bianco, borderRadius: 16, padding: 4 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  chipOn: { backgroundColor: colori.rosso },
  chipT: { fontSize: 15, fontWeight: '800', color: colori.rossoScuro },
  titolo: { fontSize: 20, fontWeight: '900', color: colori.rosso, marginTop: 14, marginBottom: 4 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  riq: { flexGrow: 1, flexBasis: '45%', backgroundColor: colori.bianco, borderRadius: 16, padding: 12, margin: 4 },
  riqV: { fontSize: 24, fontWeight: '900', color: colori.testo },
  riqE: { fontSize: 13, color: colori.testoChiaro, marginTop: 2 },
  riqD: { fontSize: 12, color: colori.testoChiaro, marginTop: 4 },
  nota: { fontSize: 13, color: colori.testoChiaro, marginTop: 10 },
});
