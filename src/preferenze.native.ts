// Preferenze su Android: archivio chiave-valore di expo-sqlite (persistente).
import Storage from 'expo-sqlite/kv-store';
export function leggiPref(k: string, predefinito: string): string {
  try { return Storage.getItemSync('cc_' + k) ?? predefinito; } catch { return predefinito; }
}
export function scriviPref(k: string, v: string) {
  try { Storage.setItemSync('cc_' + k, v); } catch {}
}
