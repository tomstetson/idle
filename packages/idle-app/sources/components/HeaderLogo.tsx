import * as React from 'react';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { IdleLogoMark } from '@/brand/IdleLogoMark';

/**
 * Shared header logo component used across all main tabs.
 * Uses Idle brand mark (cursor "i"). Extracted to prevent flickering on tab switches.
 */
export const HeaderLogo = React.memo(() => {
    const { theme } = useUnistyles();
    return (
        <View style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <IdleLogoMark size={38} color={theme.colors.header.tint} />
        </View>
    );
});
