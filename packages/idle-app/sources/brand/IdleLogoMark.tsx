import * as React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { logoMarkSvg } from './svgAssets';

interface IdleLogoMarkProps {
  size?: number;
  color?: string;
}

/**
 * Idle logo mark (the "i" cursor symbol). Use in header, favicon, app icon.
 * Pass color from theme (e.g. theme.colors.header.tint) for light/dark.
 */
export const IdleLogoMark = React.memo(({ size = 24, color = '#000000' }: IdleLogoMarkProps) => {
  const xml = logoMarkSvg.replace(/currentColor/g, color);
  return (
    <View style={{ width: size, height: size }}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
});
