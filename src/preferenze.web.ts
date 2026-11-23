// Preferenze nel browser: localStorage (con ripiego in memoria se è bloccato).
const memoria: Record<string, string> = {};
export function leggiPref(k: string, predefinito: string): string {
  try { return (globalThis as any).localStorage?.getItem('cc_' + k) ?? memoria[k] ?? predefinito; } catch { return memoria[k] ?? predefinito; }
}
export function scriviPref(k: string, v: string) {
  memoria[k] = v;
  try { (globalThis as any).localStorage?.setItem('cc_' + k, v); } catch {}
}
