import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { BottonePressioneLunga } from '../ui';
import { Camminata } from '../core/tipi';
import { camminataInCorso, punti } from '../archivio';
import { formatDistanza, formatDurata, formatPasso, statistiche } from '../core/geo';
import { calcolaAltimetria, calorieDaRisultato } from '../core/altimetria';
import { movimentoDi, pesoConfigurato } from '../core/altimetria/servizio';
import { pausa, riprendi, termina } from '../core/sessione';
import { statoGps } from '../tracking';
import { Mappa } from '../Mappa';
import type { Punto } from '../core/tipi';
import { calcolaParziali } from '../core/parziali';
import { fraseRecord, leggiPrefVoce, prossimiAnnunci, StatoAnnunci } from '../core/annunci';
import { calcolaPrestazioni, nuoviRecord, tipoAutomatico, Uscita } from '../core/record';
import { uscite } from '../core/recordServizio';
import { leggiPref, scriviPref } from '../preferenze';
import { parla, sbloccaVoce, zittisci } from '../voce';
import { vaiDopoStop } from '../dopoStop';

// Schermata di corsa: sfondo nero (risparmio batteria su OLED), solo numeri essenziali.
const GRIGIO = '#9A9A9A';
const GRIGIO_SCURO = '#555';
// Su web il blocco dello schermo lo gestisce tracking.web.ts (wake lock con ripristino).
const useSchermoAcceso = Platform.OS === 'web' ? () => {} : useKeepAwake;

export default function Attivita({ navigation }: any) {
  useSchermoAcceso();
  const [w, setW] = useState<Camminata | null>(null);
  const [st, setSt] = useState<{ distanzaM: number; salitaM: number; discesaM: number; kcal: number | null; movimentoMs: number | null; fermo: boolean }>({ distanzaM: 0, salitaM: 0, discesaM: 0, kcal: null, movimentoMs: null, fermo: false });
  const [pts, setPts] = useState<Punto[]>([]);
  const [mostraMappa, setMostraMappa] = useState(false);
  const [ora, setOra] = useState(Date.now());
  const [gps, setGps] = useState<{ acc: number | null; t: number | null; errore: string | null }>({ acc: null, t: null, errore: null });
  const [voce, setVoce] = useState(leggiPref('voce', '1') === '1');
  const annunci = useRef<StatoAnnunci | null>(null);
  // record: le uscite passate si leggono una volta; ogni categoria si annuncia una volta sola per uscita
  const passate = useRef<Uscita[] | null>(null);
  const giaDetti = useRef(new Set<string>());
  const ultimoControllo = useRef(0);
  useEffect(() => { uscite().then((u) => { passate.current = u; }).catch(() => {}); }, []);

  useEffect(() => {
    let vivo = true;
    const giro = async () => {
      const c = await camminataInCorso();
      if (!vivo) return;
      setW(c); setOra(Date.now());
      if (c) {
        const pp = await punti(c.id); setPts(pp);
        const al = calcolaAltimetria(pp), kg = pesoConfigurato(), mov = movimentoDi(c, pp);
        setSt({
          ...statistiche(pp), salitaM: al.salita, discesaM: al.discesa,
          kcal: kg ? calorieDaRisultato(al, kg, mov.soste) : null,
          movimentoMs: mov.movimentoMs, fermo: mov.fermoOra && c.status === 'recording' && pp.length > 0,
        });
        setGps(await statoGps(c.id));
        // Annunci vocali (solo con la schermata aperta: sul web è comunque l'unico modo di tracciare)
        const pv = leggiPrefVoce(leggiPref);
        const r = prossimiAnnunci(annunci.current, {
          distanzaM: statistiche(pp).distanzaM, movimentoMs: mov.movimentoMs, salitaM: al.salita,
          fermo: mov.fermoOra && c.status === 'recording' && pp.length > 0, pausa: c.status === 'paused',
          parziali: pv.attiva && pv.ogni === 'km' ? calcolaParziali(pp, { soste: mov.soste, inizio: c.started_at }) : [],
        }, pv);
        annunci.current = r.stato;
        for (const f of r.frasi) parla(f, pv.volume);
        // Nuovi record durante la corsa (ogni 5 s, dopo i primi 500 m per capire se è camminata o corsa)
        const dist = statistiche(pp).distanzaM;
        if (pv.attiva && pv.dati.includes('record') && passate.current && dist >= 500 && Date.now() - ultimoControllo.current > 5000) {
          ultimoControllo.current = Date.now();
          const p = calcolaPrestazioni(pp, { soste: mov.soste, durataMs: mov.movimentoMs, salitaM: al.salita, inizio: c.started_at });
          const u: Uscita = { id: c.id, started_at: c.started_at, tipo: tipoAutomatico(p), p };
          for (const nr of nuoviRecord(passate.current, u)) {
            if (giaDetti.current.has(nr.cat)) continue;
            giaDetti.current.add(nr.cat);
            parla(fraseRecord(nr), pv.volume);
          }
        }
      }
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
  // Tempo in movimento (si ferma da solo nelle soste); se la pausa automatica è spenta coincide col tempo attivo.
  const tempoMs = st.movimentoMs != null ? Math.min(st.movimentoMs, attivoMs) : attivoMs;

  let stato = 'Cerco il segnale GPS…', coloreStato = '#E0A000';
  if (inPausa) { stato = '⏸ In pausa'; coloreStato = GRIGIO; }
  else if (gps.errore === 'negato') { stato = '⚠️ Posizione non consentita: abilitala nelle impostazioni del browser'; coloreStato = '#FF6B6B'; }
  else if (gps.acc != null) {
    const eta = gps.t ? (ora - gps.t) / 1000 : 99;
    if (gps.acc <= 20 && eta < 15) { stato = `GPS buono (±${Math.round(gps.acc)} m)`; coloreStato = '#2EAD5B'; }
    else { stato = `GPS debole (±${Math.round(gps.acc)} m)`; coloreStato = '#E0A000'; }
  }

  return (
    <View style={s.c}>
      <Text style={[s.stato, { color: coloreStato }]}>{stato}</Text>
      {mostraMappa && <View style={{ marginTop: 10 }}><Mappa punti={pts} segui altezza={260} /></View>}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {st.fermo && <><Text style={s.autopausa}>IN PAUSA</Text><Text style={s.autopausaNota}>riparte da sola quando ti muovi</Text></>}
        <Text style={s.tempo}>{formatDurata(tempoMs)}</Text>
        <Text style={s.km}>{formatDistanza(st.distanzaM)}</Text>
        <Text style={s.sec}>Passo {formatPasso(st.distanzaM, tempoMs)} min/km   ▲ {Math.round(st.salitaM)} m   ▼ {Math.round(st.discesaM)} m</Text>
        {st.kcal != null && <Text style={s.sec}>🔥 ≈ {Math.round(st.kcal)} kcal (stima)</Text>}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Pressable onPress={() => setMostraMappa((v) => !v)} style={s.mappaBtn}>
          <Text style={{ color: GRIGIO, fontSize: 15 }}>{mostraMappa ? '🗺 Nascondi mappa' : '🗺 Mostra mappa'}</Text>
        </Pressable>
        <Pressable accessibilityLabel={voce ? 'Spegni la voce' : 'Accendi la voce'} style={s.mappaBtn}
          onPress={() => {
            const v = !voce; setVoce(v); scriviPref('voce', v ? '1' : '0');
            if (v) { sbloccaVoce(); parla('Voce accesa.', leggiPrefVoce(leggiPref).volume); } else zittisci();
          }}>
          <Text style={{ color: GRIGIO, fontSize: 15 }}>{voce ? '🔊 Voce' : '🔇 Voce spenta'}</Text>
        </Pressable>
      </View>
      <View style={s.riga}>
        <BottonePressioneLunga durataMs={1000} colore="#3A3000" testoColore="#FFD23F" style={{ flex: 1, marginRight: 8 }}
          testo={inPausa ? '▶ Riprendi' : '⏸ Pausa'} onConferma={() => (inPausa ? riprendi(w.id) : pausa(w.id))} />
        <BottonePressioneLunga durataMs={2000} colore="#4A0A0A" testoColore="#FF6B6B" style={{ flex: 1, marginLeft: 8 }}
          testo="■ STOP" onConferma={async () => { await termina(w.id); await vaiDopoStop(navigation, w.id); }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#000', padding: 16, paddingTop: 50 },
  autopausa: { fontSize: 22, fontWeight: '800', color: '#FFD23F', textAlign: 'center', letterSpacing: 4, marginBottom: 4 },
  autopausaNota: { fontSize: 14, color: GRIGIO_SCURO, textAlign: 'center', marginBottom: 6 },
  stato: { fontSize: 16, textAlign: 'center', fontWeight: '700' },
  tempo: { fontSize: 80, fontWeight: '800', color: GRIGIO, textAlign: 'center' },
  km: { fontSize: 56, fontWeight: '700', color: GRIGIO, textAlign: 'center' },
  sec: { fontSize: 16, color: GRIGIO_SCURO, textAlign: 'center', marginTop: 16 },
  mappaBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  riga: { flexDirection: 'row', paddingVertical: 12 },
  nota: { color: GRIGIO, fontSize: 20, textAlign: 'center', marginVertical: 30 },
});
