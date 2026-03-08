import * as React from 'react';
import { Text, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { FontFamilies } from '@/constants/Typography';

interface IdleWordmarkProps {
  color?: string;
  fontSize?: number;
}

/**
 * "Idle" wordmark for settings and marketing. Uses theme text color when color not passed.
 */
export const IdleWordmark = React.memo(({ color, fontSize = 28 }: IdleWordmarkProps) => {
  const { theme } = useUnistyles();
  const textColor = color ?? theme.colors.text;
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize,
          fontFamily: FontFamilies.heading.bold,
          fontWeight: '700',
          color: textColor,
          letterSpacing: -0.5,
        }}
      >
        Idle
      </Text>
    </View>
  );
});
