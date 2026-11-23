import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { colori } from './theme';

export type Barra = { valore: number; breve: string; lunga: string };

/** Scala "tonda" per l'asse: 1, 2, 5 × 10^k. */
function massimoTondo(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** Barra con la cima arrotondata (4 px) e la base appoggiata sull'asse. */
function barra(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M ${x} ${y + h} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h} Z`;
}

/** Grafico a barre di una sola misura: il titolo la nomina, il tocco su una barra mostra il valore esatto. */
export function GraficoBarre({ titolo, unita, barre, colore, formato, etichettaOgni = 1 }: {
  titolo: string; unita: string; barre: Barra[]; colore: string; formato: (v: number) => string; etichettaOgni?: number;
}) {
  const [larghezza, setLarghezza] = useState(0);
  const [scelta, setScelta] = useState<number | null>(null);
  const H = 170, SX = 40, DX = 6, SU = 10, GIU = 22;
  const max = massimoTondo(Math.max(0, ...barre.map((b) => b.valore)));
  const pw = Math.max(0, larghezza - SX - DX), ph = H - SU - GIU;
  const passo = barre.length ? pw / barre.length : 0;
  const spazio = Math.max(2, Math.min(8, passo * 0.25));
  const bw = Math.max(2, passo - spazio);
  const y = (v: number) => SU + ph - (v / max) * ph;
  const sel = scelta != null ? barre[scelta] : null;
  // sull'asse bastano i numeri tondi
  const asse = (v: number) => (max >= 10 || v === 0 ? Math.round(v).toLocaleString('it-IT') : formato(v));
  const tutti0 = barre.every((b) => b.valore <= 0);

  return (
    <View style={s.box}>
      <Text style={s.titolo}>{titolo} <Text style={s.unita}>({unita})</Text></Text>
      <Text style={s.info}>{sel ? `${sel.lunga}: ${formato(sel.valore)} ${unita}` : tutti0 ? 'Nessuna camminata in questo periodo' : 'Tocca una barra per vedere il valore'}</Text>
      <View onLayout={(e: LayoutChangeEvent) => setLarghezza(e.nativeEvent.layout.width)} style={{ height: H }}>
        {larghezza > 0 && (
          <Svg width={larghezza} height={H}>
            {[0, 0.5, 1].map((f) => (
              <React.Fragment key={f}>
                <Line x1={SX} x2={larghezza - DX} y1={y(max * f)} y2={y(max * f)} stroke={f === 0 ? '#CDB9A8' : '#EFE3D6'} strokeWidth={1} />
                <SvgText x={SX - 6} y={y(max * f) + 4} fontSize={10} fill={colori.testoChiaro} textAnchor="end">{asse(max * f)}</SvgText>
              </React.Fragment>
            ))}
            {barre.map((b, i) => {
              const h = (b.valore / max) * ph;
              const x = SX + i * passo + spazio / 2;
              return (
                <React.Fragment key={i}>
                  {b.valore > 0 && <Path d={barra(x, y(b.valore), bw, h)} fill={colore} opacity={scelta == null || scelta === i ? 1 : 0.35} />}
                  {i % etichettaOgni === 0 || i === barre.length - 1
                    ? <SvgText x={x + bw / 2} y={H - 6} fontSize={10} fill={scelta === i ? colori.testo : colori.testoChiaro} fontWeight={scelta === i ? 'bold' : 'normal'} textAnchor="middle">{b.breve}</SvgText>
                    : null}
                </React.Fragment>
              );
            })}
          </Svg>
        )}
        {/* zone di tocco: tutta l'altezza della colonna, più grandi della barra */}
        <View style={[StyleSheet.absoluteFill, { left: SX, right: DX, flexDirection: 'row' }]}>
          {barre.map((b, i) => (
            <Pressable key={i} style={{ flex: 1 }} onPress={() => setScelta(scelta === i ? null : i)}
              accessibilityLabel={`${b.lunga}: ${formato(b.valore)} ${unita}`} />
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: colori.bianco, borderRadius: 18, padding: 12, marginTop: 12 },
  titolo: { fontSize: 16, fontWeight: '800', color: colori.rossoScuro },
  unita: { fontWeight: '400', color: colori.testoChiaro },
  info: { fontSize: 14, color: colori.testo, marginTop: 4, marginBottom: 6, minHeight: 18 },
});
