import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { AvatarConfig } from './core/avatar';
import { svgAvatar } from './core/avatarSvg';

/** Disegna l'avatar sul telefono: nessuna rete, nessuna foto. */
export function Avatar({ config, size = 96 }: { config: AvatarConfig; size?: number }) {
  const xml = useMemo(() => svgAvatar(config), [JSON.stringify(config)]);
  return <SvgXml xml={xml} width={size} height={size} />;
}
