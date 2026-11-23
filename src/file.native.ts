// Salvare / scegliere file su Android: file temporaneo + foglio di condivisione, e selettore di sistema.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
export type Esito = 'condiviso' | 'scaricato' | 'annullato';

export async function salvaFile(nome: string, contenuto: string, mime: string): Promise<Esito> {
  const f = new File(Paths.cache, nome);
  if (f.exists) f.delete();
  f.create();
  f.write(contenuto);
  await Sharing.shareAsync(f.uri, { mimeType: mime, dialogTitle: nome });
  return 'condiviso';
}

export async function scegliFileTesto(): Promise<string | null> {
  const r = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (r.canceled || !r.result) return null;
  return r.result.text();
}
