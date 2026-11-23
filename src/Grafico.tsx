import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { colori } from './theme';

export type PuntoGrafico = { x: number; y: number | null };

/** Grafico ad area semplice (x = distanza in km). Salta i valori nulli. */
export function Grafico({ titolo, unita, dati, colore = colori.rosso, larghezza = 340, altezza = 130, decimali = 0 }:
  { titolo: string; unita: string; dati: PuntoGrafico[]; colore?: string; larghezza?: number; altezza?: number; decimali?: number }) {
  const ok = dati.filter((d): d is { x: number; y: number } => d.y != null && Number.isFinite(d.y));
  if (ok.length < 2) return null;
  const L = 36, R = 8, T = 8, B = 22;
  const xs = ok.map((d) => d.x), ys = ok.map((d) => d.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 1) { y0 -= 0.5; y1 += 0.5; }
  const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad;
  const px = (x: number) => L + ((x - x0) / Math.max(1e-9, x1 - x0)) * (larghezza - L - R);
  const py = (y: number) => T + (1 - (y - y0) / (y1 - y0)) * (altezza - T - B);
  const linea = ok.map((d, i) => `${i ? 'L' : 'M'}${px(d.x).toFixed(1)},${py(d.y).toFixed(1)}`).join(' ');
  const area = `${linea} L${px(ok[ok.length - 1].x).toFixed(1)},${altezza - B} L${px(ok[0].x).toFixed(1)},${altezza - B} Z`;
  const f = (v: number) => v.toFixed(decimali).replace('.', ',');
  return (
    <View style={{ backgroundColor: colori.bianco, borderRadius: 18, padding: 10, marginTop: 10 }}>
      <Text style={{ fontWeight: '800', color: colori.rossoScuro, marginLeft: 4 }}>{titolo} <Text style={{ fontWeight: '400', color: colori.testoChiaro }}>({unita})</Text></Text>
      <Svg width="100%" height={altezza} viewBox={`0 0 ${larghezza} ${altezza}`}>
        <Line x1={L} y1={altezza - B} x2={larghezza - R} y2={altezza - B} stroke="#E7D5C0" strokeWidth={1} />
        <Line x1={L} y1={T} x2={L} y2={altezza - B} stroke="#E7D5C0" strokeWidth={1} />
        <Path d={area} fill={colore} opacity={0.18} />
        <Path d={linea} stroke={colore} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        <SvgText x={L - 4} y={py(y1 - pad) + 4} fontSize={10} fill={colori.testoChiaro} textAnchor="end">{f(y1 - pad)}</SvgText>
        <SvgText x={L - 4} y={py(y0 + pad)} fontSize={10} fill={colori.testoChiaro} textAnchor="end">{f(y0 + pad)}</SvgText>
        <SvgText x={L} y={altezza - 6} fontSize={10} fill={colori.testoChiaro}>{x0.toFixed(1).replace('.', ',')} km</SvgText>
        <SvgText x={larghezza - R} y={altezza - 6} fontSize={10} fill={colori.testoChiaro} textAnchor="end">{x1.toFixed(1).replace('.', ',')} km</SvgText>
      </Svg>
    </View>
  );
}
