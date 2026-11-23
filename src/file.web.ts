// Salvare / scegliere file nel browser.
export type Esito = 'condiviso' | 'scaricato' | 'annullato';

/** Su iPhone e Android apre il foglio di condivisione (Salva su File, Drive, WhatsApp…); altrimenti scarica il file. */
export async function salvaFile(nome: string, contenuto: string, mime: string): Promise<Esito> {
  const blob = new Blob([contenuto], { type: mime });
  const n: any = navigator;
  try {
    const file = new File([blob], nome, { type: mime });
    if (n.canShare?.({ files: [file] })) {
      try { await n.share({ files: [file], title: nome }); return 'condiviso'; }
      catch (e: any) { if (e?.name === 'AbortError') return 'annullato'; /* altrimenti si scarica */ }
    }
  } catch { /* File o share non disponibili */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'scaricato';
}

/** Apre la scelta di un file e ne restituisce il testo (null se annullato). */
export function scegliFileTesto(): Promise<string | null> {
  return new Promise((ok) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    input.onchange = async () => { const f = input.files?.[0]; input.remove(); ok(f ? await f.text() : null); };
    input.addEventListener('cancel', () => { input.remove(); ok(null); });
    document.body.appendChild(input);
    input.click();
  });
}
