// Dopo lo Stop: se sono stati battuti dei record si fa festa, poi si chiede la fatica percepita.
import { recordBattuti } from './core/recordServizio';

export async function vaiDopoStop(navigation: any, id: number, sostituisci = true) {
  let record: Awaited<ReturnType<typeof recordBattuti>> = [];
  try { record = await recordBattuti(id); } catch { /* i record non devono mai bloccare il salvataggio */ }
  const vai = sostituisci ? navigation.replace : navigation.navigate;
  if (record.length) vai('Festa', { id, record }); else vai('Fatica', { id });
}
