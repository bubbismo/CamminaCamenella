// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'grafica/*', 'public/*'],
  },
  {
    rules: {
      // In React Native gli apostrofi nei <Text> sono testo normale (l'italiano ne è pieno).
      'react/no-unescaped-entities': 'off',
      // Regole pensate per il React Compiler, che questa app non usa: solo avvisi.
      // (es. useRef(new Animated.Value(0)).current è il modo standard di fare animazioni in React Native)
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
]);
