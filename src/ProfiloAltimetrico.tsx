import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colori } from './theme';
import { CLASSI, classifica, coloreDi, pendenze, riepilogoPendenze, Soglie, trattiPendenza } from './core/pendenze';

const W = 340, H = 170, L = 38, R = 8, T = 10, B = 22;
const km = (m: number, dec = 1) => (m / 1000).toFixed(dec).replace('.', ',');
/** "dal 3%", ma "dall'8%" e "dall'11%" */
const dal = (n: number) => (/^(8|11)(\D|$)/.test(String(n)) ? `dall'${n}%` : `dal ${n}%`);
const perc = (p: number) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(Math.round(p))}%`;

/**
 * Profilo altimetrico colorato per pendenza. Il colore non è l'unico segnale: la legenda dice
 * quanti km per tipo, e toccando il grafico si leggono quota e pendenza esatte.
 */
export function ProfiloAltimetrico({ d, quote, soglie }: { d: number[]; quote: number[]; soglie: Soglie }) {
  const [larghezza, setLarghezza] = useState(W);
  const [sel, setSel] = useState<number | null>(null);
  const dati = useMemo(() => {
    if (d.length < 3) return null;
    const p = pendenze(d, quote);
    let z0 = Math.min(...quote), z1 = Math.max(...quote);
    if (z1 - z0 < 20) { const m = (z0 + z1) / 2; z0 = m - 10; z1 = m + 10; } // percorso piatto: niente zoom sul rumore
    const pad = (z1 - z0) * 0.08;
    return { p, z0: z0 - pad, z1: z1 + pad, tratti: trattiPendenza(d, quote, soglie), riep: riepilogoPendenze(d, quote, soglie) };
  }, [d, quote, soglie]);
  if (!dati) return null;
  const { p, z0, z1, tratti, riep } = dati;
  const tot = d[d.length - 1] || 1;
  const px = (x: number) => L + (x / tot) * (W - L - R);
  const py = (z: number) => T + (1 - (z - z0) / (z1 - z0)) * (H - T - B);
  const base = H - B;

  const aree = tratti.map((t) => {
    let s = `M${px(d[t.i0]).toFixed(1)},${base} `;
    for (let i = t.i0; i <= t.i1; i++) s += `L${px(d[i]).toFixed(1)},${py(quote[i]).toFixed(1)} `;
    return { d: s + `L${px(d[t.i1]).toFixed(1)},${base} Z`, colore: coloreDi(t.classe) };
  });
  const linea = d.map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(quote[i]).toFixed(1)}`).join(' ');

  // tocco: punto più vicino sulla curva
  const tocca = (locX: number) => {
    const x = (locX / larghezza) * W;
    const dist = ((x - L) / (W - L - R)) * tot;
    let best = 0;
    for (let i = 1; i < d.length; i++) if (Math.abs(d[i] - dist) < Math.abs(d[best] - dist)) best = i;
    setSel(best);
  };
  const classeSel = sel != null ? CLASSI.find((c) => c.c === classifica(p[sel], soglie))! : null;
  const presenti = CLASSI.filter((c) => riep.metri[c.c] >= 1);

  return (
    <View style={s.card}>
      <Text style={s.titolo}>Profilo altimetrico <Text style={s.unita}>(m, colorato per pendenza)</Text></Text>
      <Text style={s.lettura}>
        {sel != null && classeSel
          ? `km ${km(d[sel], 2)} · ${Math.round(quote[sel])} m · pendenza ${perc(p[sel])} (${classeSel.nome.toLowerCase()})`
          : 'Tocca o scorri il grafico per leggere quota e pendenza'}
      </Text>
      <View onLayout={(e) => setLarghezza(e.nativeEvent.layout.width || W)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => tocca(e.nativeEvent.locationX)} onResponderMove={(e) => tocca(e.nativeEvent.locationX)}
        style={{ touchAction: 'none' } as any}>
        <Svg width="100%" height={(H * larghezza) / W} viewBox={`0 0 ${W} ${H}`}>
          {aree.map((a, i) => <Path key={i} d={a.d} fill={a.colore} opacity={0.85} />)}
          <Path d={linea} stroke={colori.testo} strokeWidth={2} fill="none" strokeLinejoin="round" />
          <Line x1={L} y1={base} x2={W - R} y2={base} stroke="#E7D5C0" strokeWidth={1} />
          <SvgText x={L - 4} y={py(Math.max(...quote)) + 4} fontSize={10} fill={colori.testoChiaro} textAnchor="end">{Math.round(Math.max(...quote))}</SvgText>
          <SvgText x={L - 4} y={py(Math.min(...quote))} fontSize={10} fill={colori.testoChiaro} textAnchor="end">{Math.round(Math.min(...quote))}</SvgText>
          <SvgText x={L} y={H - 6} fontSize={10} fill={colori.testoChiaro}>0 km</SvgText>
          <SvgText x={W - R} y={H - 6} fontSize={10} fill={colori.testoChiaro} textAnchor="end">{km(tot)} km</SvgText>
          {sel != null && <>
            <Line x1={px(d[sel])} y1={T} x2={px(d[sel])} y2={base} stroke={colori.testo} strokeWidth={1} strokeDasharray="3,3" />
            <Circle cx={px(d[sel])} cy={py(quote[sel])} r={5} fill={classeSel!.colore} stroke="#fff" strokeWidth={2} />
          </>}
        </Svg>
      </View>
      <View style={{ marginTop: 6 }}>
        {presenti.map((c) => (
          <View key={c.c} style={s.voce}>
            <View style={[s.campione, { backgroundColor: c.colore }]} />
            <Text style={s.nome}>{c.nome}</Text>
            <Text style={s.valore}>{km(riep.metri[c.c], 1)} km · {Math.round((riep.metri[c.c] / tot) * 100)}%</Text>
          </View>
        ))}
      </View>
      <Text style={s.nota}>
        Pendenza massima: {perc(riep.maxSalita)} in salita{riep.maxDiscesa <= -1 ? `, ${perc(riep.maxDiscesa)} in discesa` : ''} (media su 100 m).
        {' '}Soglie: leggera {dal(soglie[0])}, impegnativa {dal(soglie[1])}, ripida {dal(soglie[2])} (si cambiano in ⚙️).
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colori.bianco, borderRadius: 18, padding: 10, marginTop: 10 },
  titolo: { fontWeight: '800', color: colori.rossoScuro, marginLeft: 4 },
  unita: { fontWeight: '400', color: colori.testoChiaro },
  lettura: { fontSize: 13, color: colori.testo, marginLeft: 4, marginTop: 4, marginBottom: 2, minHeight: 18 },
  voce: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, marginLeft: 4 },
  campione: { width: 14, height: 14, borderRadius: 4, marginRight: 8 },
  nome: { flex: 1, fontSize: 14, color: colori.testo },
  valore: { fontSize: 14, color: colori.testoChiaro, fontVariant: ['tabular-nums'] },
  nota: { fontSize: 12, color: colori.testoChiaro, marginTop: 6, marginLeft: 4 },
});
