// Finestre di dialogo uguali su Android e web (Alert.alert non funziona sul web).
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colori } from './theme';

export type BottoneDialogo = { testo: string; onPress?: () => void; stile?: 'normale' | 'pericolo' | 'secondario' };
type Dati = { titolo: string; messaggio?: string; bottoni: BottoneDialogo[] } | null;

const Ctx = createContext<(d: NonNullable<Dati>) => void>(() => {});
export const useDialogo = () => useContext(Ctx);

export function DialogoProvider({ children }: { children: React.ReactNode }) {
  const [d, setD] = useState<Dati>(null);
  const mostra = useCallback((x: NonNullable<Dati>) => setD(x), []);
  return (
    <Ctx.Provider value={mostra}>
      {children}
      <Modal transparent visible={!!d} animationType="fade" onRequestClose={() => setD(null)}>
        <View style={s.sfondo}>
          <View style={s.box}>
            <Text style={s.titolo}>{d?.titolo}</Text>
            {!!d?.messaggio && <Text style={s.msg}>{d.messaggio}</Text>}
            {d?.bottoni.map((b, i) => (
              <Pressable key={i} style={[s.btn, b.stile === 'pericolo' && { backgroundColor: colori.rossoScuro },
                b.stile === 'secondario' && { backgroundColor: '#EEE' }]}
                onPress={() => { setD(null); b.onPress?.(); }}>
                <Text style={[s.btnTesto, b.stile === 'secondario' && { color: colori.testo }]}>{b.testo}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: colori.bianco, borderRadius: 24, padding: 20 },
  titolo: { fontSize: 22, fontWeight: '800', color: colori.rossoScuro, marginBottom: 8 },
  msg: { fontSize: 16, color: colori.testo, marginBottom: 14 },
  btn: { backgroundColor: colori.rosso, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnTesto: { color: colori.bianco, fontSize: 18, fontWeight: '800' },
});
