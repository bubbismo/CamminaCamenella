import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
import { AvatarConfig, opzioniDiceBear } from './avatar';

/** SVG dell'avatar, generato sul telefono. Si toglie il blocco <metadata> (solo testo di licenza). */
export function svgAvatar(c: AvatarConfig): string {
  return createAvatar(avataaars as any, opzioniDiceBear(c)).toString().replace(/<metadata[\s\S]*?<\/metadata>/, '');
}
