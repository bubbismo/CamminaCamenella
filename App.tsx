import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colori } from './src/theme';
import Home from './src/screens/Home';
import Attivita from './src/screens/Attivita';
import Storico from './src/screens/Storico';
import Dettaglio from './src/screens/Dettaglio';
import Fatica from './src/screens/Fatica';
import Impostazioni from './src/screens/Impostazioni';
import { DialogoProvider } from './src/dialogo';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <DialogoProvider>
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colori.rosso }, headerTintColor: colori.bianco }}>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="Attivita" component={Attivita} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="Storico" component={Storico} options={{ title: 'Le mie camminate' }} />
        <Stack.Screen name="Impostazioni" component={Impostazioni} options={{ title: 'Impostazioni' }} />
        <Stack.Screen name="Fatica" component={Fatica} options={{ title: 'Com\'è andata?', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="Dettaglio" component={Dettaglio} options={{ title: 'Dettaglio' }} />
      </Stack.Navigator>
    </NavigationContainer>
    </DialogoProvider>
  );
}
