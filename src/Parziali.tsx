import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colori } from './theme';
import { estremi, formatPassoS, Parziale } from './core/parziali';

/**
 * Tabella dei parziali per km: passo (barra più lunga = più veloce), dislivello del km.
 * Il km più veloce e il più lento sono indicati anche a parole, non solo col colore.
 */
export function TabellaParziali({ parziali }: { parziali: Parziale[] }) {
  if (!parziali.length || !parziali.some((p) => p.completo)) return null;
  const { veloce, lento } = estremi(parziali);
  const velMax = Math.max(...parziali.filter((p) => p.passoSKm > 0).map((p) => 1 / p.passoSKm));
  return (
    <View style={s.card}>
      <Text style={s.titolo}>Parziali per km</Text>
      <Text style={s.sotto}>Passo in min/km, senza soste e pause. Barra più lunga = più veloce.</Text>
      <View style={[s.riga, { borderBottomWidth: 0, paddingVertical: 2 }]}>
        <Text style={[s.km, s.intest]}>km</Text>
        <View style={{ flex: 1 }} />
        <Text style={[s.passo, s.intest]}>passo</Text>
        <Text style={[s.dz, s.intest]}>dislivello (m)</Text>
      </View>
      {parziali.map((p) => {
        const colore = p.n === veloce ? colori.verde : p.n === lento ? colori.rosso : colori.arancio;
        const quota = p.passoSKm > 0 ? (1 / p.passoSKm) / velMax : 0;
        return (
          <View key={p.n} style={s.riga}>
            <Text style={s.km}>{p.completo ? p.n : `${(p.metri / 1000).toFixed(2).replace('.', ',')}`}</Text>
            <View style={{ flex: 1 }}>
              <View style={s.binario}>
                <View style={[s.barra, { width: `${Math.max(4, quota * 100)}%`, backgroundColor: colore, opacity: p.completo ? 1 : 0.5 }]} />
              </View>
              {(p.n === veloce || p.n === lento || !p.completo) && (
                <Text style={s.etichetta}>{p.n === veloce ? '🐇 il più veloce' : p.n === lento ? '🐢 il più lento' : 'ultimo tratto: passo equivalente'}</Text>
              )}
            </View>
            <Text style={s.passo}>{formatPassoS(p.passoSKm)}</Text>
            <Text style={s.dz}>{p.salita >= 1 || p.discesa >= 1 ? `▲${Math.round(p.salita)} ▼${Math.round(p.discesa)}` : '—'}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colori.bianco, borderRadius: 18, padding: 14, marginTop: 10 },
  titolo: { fontSize: 16, fontWeight: '800', color: colori.rossoScuro },
  sotto: { fontSize: 13, color: colori.testoChiaro, marginTop: 2, marginBottom: 6 },
  riga: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3E6D6' },
  km: { width: 40, fontSize: 15, fontWeight: '800', color: colori.testo },
  binario: { height: 14, justifyContent: 'center' },
  barra: { height: 12, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  etichetta: { fontSize: 12, color: colori.testoChiaro, marginTop: 2 },
  passo: { width: 56, textAlign: 'right', fontSize: 16, fontWeight: '800', color: colori.testo, fontVariant: ['tabular-nums'] },
  dz: { width: 78, textAlign: 'right', fontSize: 13, color: colori.testoChiaro, fontVariant: ['tabular-nums'] },
  intest: { fontSize: 11, fontWeight: '400', color: colori.testoChiaro },
});
