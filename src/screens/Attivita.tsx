import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { BottonePressioneLunga } from '../ui';
import { Camminata } from '../core/tipi';
import { camminataInCorso, punti } from '../archivio';
import { formatDistanza, formatDurata, formatPasso, statistiche } from '../core/geo';
import { pausa, riprendi, termina } from '../core/sessione';
import { statoGps } from '../tracking';

// Schermata di corsa: sfondo nero (risparmio batteria su OLED), solo numeri essenziali.
const GRIGIO = '#9A9A9A';
const GRIGIO_SCURO = '#555';

export default function Attivita({ navigation }: any) {
  // Su web il blocco dello schermo lo gestisce tracking.web.ts (wake lock con ripristino).
  if (Platform.OS !== 'web') useKeepAwake();
  const [w, setW] = useState<Camminata | null>(null);
  const [st, setSt] = useState({ distanzaM: 0, salitaM: 0, discesaM: 0 });
  const [ora, setOra] = useState(Date.now());
  const [gps, setGps] = useState<{ acc: number | null; t: number | null }>({ acc: null, t: null });

  useEffect(() => {
    let vivo = true;
    const giro = async () => {
      const c = await camminataInCorso();
      if (!vivo) return;
      setW(c); setOra(Date.now());
      if (c) { setSt(statistiche(await punti(c.id))); setGps(await statoGps(c.id)); }
    };
    giro();
    const t = setInterval(giro, 1000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  if (!w) return <View style={s.c}><Text style={s.nota}>Nessuna attività in corso</Text>
    <BottonePressioneLunga testo="Indietro" durataMs={300} onConferma={() => navigation.popToTop()} /></View>;

  const inPausa = w.status === 'paused';
  const fine = inPausa ? w.paused_since! : ora;
  const attivoMs = Math.max(0, fine - w.started_at - w.paused_total_ms);

  let stato = 'Cerco il segnale GPS…', coloreStato = '#E0A000';
  if (inPausa) { stato = '⏸ In pausa'; coloreStato = GRIGIO; }
  else if (gps.acc != null) {
    const eta = gps.t ? (ora - gps.t) / 1000 : 99;
    if (gps.acc <= 20 && eta < 15) { stato = `GPS buono (±${Math.round(gps.acc)} m)`; coloreStato = '#2EAD5B'; }
    else { stato = `GPS debole (±${Math.round(gps.acc)} m)`; coloreStato = '#E0A000'; }
  }

  return (
    <View style={s.c}>
      <Text style={[s.stato, { color: coloreStato }]}>{stato}</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={s.tempo}>{formatDurata(attivoMs)}</Text>
        <Text style={s.km}>{formatDistanza(st.distanzaM)}</Text>
        <Text style={s.sec}>Passo {formatPasso(st.distanzaM, attivoMs)} min/km   ▲ {Math.round(st.salitaM)} m   ▼ {Math.round(st.discesaM)} m</Text>
      </View>
      <View style={s.riga}>
        <BottonePressioneLunga durataMs={1000} colore="#3A3000" testoColore="#FFD23F" style={{ flex: 1, marginRight: 8 }}
          testo={inPausa ? '▶ Riprendi' : '⏸ Pausa'} onConferma={() => (inPausa ? riprendi(w.id) : pausa(w.id))} />
        <BottonePressioneLunga durataMs={2000} colore="#4A0A0A" testoColore="#FF6B6B" style={{ flex: 1, marginLeft: 8 }}
          testo="■ STOP" onConferma={async () => { await termina(w.id); navigation.replace('Dettaglio', { id: w.id }); }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#000', padding: 16, paddingTop: 50 },
  stato: { fontSize: 16, textAlign: 'center', fontWeight: '700' },
  tempo: { fontSize: 80, fontWeight: '800', color: GRIGIO, textAlign: 'center' },
  km: { fontSize: 56, fontWeight: '700', color: GRIGIO, textAlign: 'center' },
  sec: { fontSize: 16, color: GRIGIO_SCURO, textAlign: 'center', marginTop: 16 },
  riga: { flexDirection: 'row', paddingVertical: 12 },
  nota: { color: GRIGIO, fontSize: 20, textAlign: 'center', marginVertical: 30 },
});
