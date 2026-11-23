import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { colori } from './theme';
import { splashFinito } from './avvio';

/** Schermata iniziale: icona e nome, con una piccola animazione. Uguale a quella HTML che si vede mentre il sito si carica. */
export function Splash({ children, durataMs = 1700 }: { children: React.ReactNode; durataMs?: number }) {
  const [visibile, setVisibile] = useState(true);
  const entra = useRef(new Animated.Value(0)).current;
  const sparisce = useRef(new Animated.Value(1)).current;
  const passo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entra, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      // le due dita "camminano": piccolo dondolio a destra e sinistra
      Animated.loop(Animated.sequence([
        Animated.timing(passo, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(passo, { toValue: -1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(sparisce, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => { setVisibile(false); splashFinito(); });
    }, durataMs);
    return () => clearTimeout(t);
  }, []);

  const rotazione = passo.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  return (
    <View style={{ flex: 1 }}>
      {children}
      {visibile && (
        <Animated.View style={[s.tutto, { opacity: sparisce }]} pointerEvents="auto">
          <Animated.View style={{ transform: [{ scale: entra.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }, { rotate: rotazione }] }}>
            <Image source={require('../assets/splash-icon.png')} style={s.logo} resizeMode="contain" />
          </Animated.View>
          <Animated.Text style={[s.nome, { opacity: entra }]}>CamminaCamenella</Animated.Text>
          <Animated.Text style={[s.slogan, { opacity: entra }]}>Ogni passo conta!</Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tutto: { ...StyleSheet.absoluteFill, backgroundColor: colori.rosso, alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  logo: { width: 220, height: 220 },
  nome: { marginTop: 8, fontSize: 36, fontWeight: '900', color: colori.giallo, letterSpacing: -0.5 },
  slogan: { marginTop: 6, fontSize: 18, color: colori.bianco },
});
