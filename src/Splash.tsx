import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colori } from './theme';
import { splashFinito } from './avvio';

/** Schermata iniziale: icona e nome, con una piccola animazione. Resta finché non si tocca lo schermo. */
export function Splash({ children }: { children: React.ReactNode }) {
  const [visibile, setVisibile] = useState(true);
  const entra = useRef(new Animated.Value(0)).current;
  const sparisce = useRef(new Animated.Value(1)).current;
  const passo = useRef(new Animated.Value(0)).current;
  const invito = useRef(new Animated.Value(0.4)).current;
  const chiuso = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entra, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      // le due dita "camminano": piccolo dondolio a destra e sinistra
      Animated.loop(Animated.sequence([
        Animated.timing(passo, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(passo, { toValue: -1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])),
    ]).start();
    // "Tocca per iniziare" pulsa piano
    Animated.loop(Animated.sequence([
      Animated.timing(invito, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(invito, { toValue: 0.4, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);

  const entraNellApp = () => {
    if (chiuso.current) return;
    chiuso.current = true;
    Animated.timing(sparisce, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => { setVisibile(false); splashFinito(); });
  };

  const rotazione = passo.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  return (
    <View style={{ flex: 1 }}>
      {children}
      {visibile && (
        <Animated.View style={[s.tutto, { opacity: sparisce }]} pointerEvents="auto">
          <Pressable onPress={entraNellApp} style={s.tocco} accessibilityRole="button" accessibilityLabel="Tocca per iniziare">
          <Animated.View style={{ transform: [{ scale: entra.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }, { rotate: rotazione }] }}>
            <Image source={require('../assets/splash-icon.png')} style={s.logo} resizeMode="contain" />
          </Animated.View>
          <Animated.Text style={[s.nome, { opacity: entra }]}>CamminaCamenella</Animated.Text>
          <Animated.Text style={[s.slogan, { opacity: entra }]}>Ogni passo conta!</Animated.Text>
          <Animated.Text style={[s.invito, { opacity: invito }]}>Tocca per iniziare 👆</Animated.Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tutto: { ...StyleSheet.absoluteFill, backgroundColor: colori.rosso, alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  tocco: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  invito: { position: 'absolute', bottom: 70, fontSize: 18, fontWeight: '700', color: colori.giallo },
  logo: { width: 220, height: 220 },
  nome: { marginTop: 8, fontSize: 36, fontWeight: '900', color: colori.giallo, letterSpacing: -0.5 },
  slogan: { marginTop: 6, fontSize: 18, color: colori.bianco },
});
