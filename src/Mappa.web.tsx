import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Punto } from './core/tipi';
import { leggiPref, scriviPref } from './preferenze';
import { colori } from './theme';

const STRATI = {
  standard: { nome: 'Standard', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19,
    attr: '© OpenStreetMap' },
  outdoor: { nome: 'Outdoor', url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png', maxZoom: 17,
    attr: '© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)' },
} as const;
type Strato = keyof typeof STRATI;

type Props = { punti: Punto[]; segui?: boolean; altezza?: number };

export function Mappa({ punti, segui = false, altezza = 280 }: Props) {
  const div = useRef<HTMLDivElement | null>(null);
  const mappa = useRef<L.Map | null>(null);
  const tile = useRef<L.TileLayer | null>(null);
  const percorso = useRef<L.LayerGroup | null>(null);
  const adattata = useRef(false);
  const [strato, setStrato] = useState<Strato>(leggiPref('mappa', 'outdoor') === 'standard' ? 'standard' : 'outdoor');

  useEffect(() => {
    if (!div.current || mappa.current) return;
    const m = L.map(div.current, { zoomControl: false, attributionControl: true }).setView([45.4, 9.2], 5);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    percorso.current = L.layerGroup().addTo(m);
    mappa.current = m;
    return () => { m.remove(); mappa.current = null; };
  }, []);

  useEffect(() => {
    const m = mappa.current; if (!m) return;
    if (tile.current) tile.current.remove();
    const s = STRATI[strato];
    tile.current = L.tileLayer(s.url, { maxZoom: s.maxZoom, attribution: s.attr }).addTo(m);
    tile.current.bringToBack();
    scriviPref('mappa', strato);
  }, [strato]);

  useEffect(() => {
    const m = mappa.current, g = percorso.current; if (!m || !g) return;
    g.clearLayers();
    if (!punti.length) return;
    // Tratti normali in rosso; tratti "stimati" (senza GPS) tratteggiati in arancio.
    let tratto: L.LatLngTuple[] = [[punti[0].lat, punti[0].lon]];
    for (let i = 1; i < punti.length; i++) {
      const p = punti[i], pt: L.LatLngTuple = [p.lat, p.lon];
      if (p.gap) {
        if (tratto.length > 1) L.polyline(tratto, { color: colori.rosso, weight: 5 }).addTo(g);
        L.polyline([tratto[tratto.length - 1], pt], { color: colori.arancio, weight: 4, dashArray: '8 10' }).addTo(g);
        tratto = [pt];
      } else tratto.push(pt);
    }
    if (tratto.length > 1) L.polyline(tratto, { color: colori.rosso, weight: 5 }).addTo(g);
    const primo = punti[0], ultimo = punti[punti.length - 1];
    L.circleMarker([primo.lat, primo.lon], { radius: 8, color: '#fff', weight: 3, fillColor: colori.verde, fillOpacity: 1 }).addTo(g);
    L.circleMarker([ultimo.lat, ultimo.lon], { radius: 9, color: '#fff', weight: 3, fillColor: colori.arancio, fillOpacity: 1 }).addTo(g);
    if (segui) m.setView([ultimo.lat, ultimo.lon], Math.max(m.getZoom(), 16));
    else if (!adattata.current) {
      adattata.current = true;
      if (punti.length > 1) m.fitBounds(L.latLngBounds(punti.map((p) => [p.lat, p.lon] as L.LatLngTuple)), { padding: [30, 30] });
      else m.setView([primo.lat, primo.lon], 16);
    }
  }, [punti, segui]);

  return (
    <View style={{ height: altezza, borderRadius: 18, overflow: 'hidden', backgroundColor: '#ddd' }}>
      {React.createElement('div', { ref: div, style: { position: 'absolute', inset: 0 } })}
      <View style={s.scelta}>
        {(Object.keys(STRATI) as Strato[]).map((k) => (
          <Pressable key={k} onPress={() => setStrato(k)} style={[s.chip, strato === k && s.chipOn]}>
            <Text style={[s.chipT, strato === k && { color: colori.bianco }]}>{STRATI[k].nome}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scelta: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', zIndex: 1000 },
  chip: { backgroundColor: 'rgba(255,255,255,0.92)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, marginLeft: 6 },
  chipOn: { backgroundColor: colori.rosso },
  chipT: { fontSize: 14, fontWeight: '700', color: colori.rossoScuro },
});
