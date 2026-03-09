import { RoundButton } from "@/components/RoundButton";
import { useAuth } from "@/auth/AuthContext";
import { Text, View, Image, Platform, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as React from 'react';
import { encodeBase64 } from "@/encryption/base64";
import { authGetToken } from "@/auth/authGetToken";
import { router, useRouter } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { getRandomBytesAsync } from "expo-crypto";
import { useIsLandscape } from "@/utils/responsive";
import { Typography } from "@/constants/Typography";
import { trackAccountCreated, trackAccountRestored } from '@/track';
import { HomeHeaderNotAuth } from "@/components/HomeHeader";
import { MainView } from "@/components/MainView";
import { t } from '@/text';

/** Blinking green terminal cursor dot — placed next to the logotype on the login screen. */
function TerminalDot() {
    const opacity = React.useRef(new Animated.Value(1)).current;
    React.useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.15, duration: 900, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [opacity]);
    return (
        <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759', opacity, marginLeft: 8, alignSelf: 'center' }} />
    );
}

export default function Home() {
    const auth = useAuth();
    if (!auth.isAuthenticated) {
        return <NotAuthenticated />;
    }
    return (
        <Authenticated />
    )
}

function Authenticated() {
    return <MainView variant="phone" />;
}

function NotAuthenticated() {
    const { theme } = useUnistyles();
    const auth = useAuth();
    const router = useRouter();
    const isLandscape = useIsLandscape();
    const insets = useSafeAreaInsets();

    const createAccount = async () => {
        try {
            const secret = await getRandomBytesAsync(32);
            const token = await authGetToken(secret);
            if (token && secret) {
                await auth.login(token, encodeBase64(secret, 'base64url'));
                trackAccountCreated();
            }
        } catch (error) {
            console.error('Error creating account', error);
        }
    }

    const portraitLayout = (
        <View style={styles.portraitContainer}>
            <View style={styles.logoWithDot}>
                <Image
                    source={theme.dark ? require('@/assets/images/logotype-dark.png') : require('@/assets/images/logotype-light.png')}
                    resizeMode="contain"
                    style={styles.logo}
                />
                <TerminalDot />
            </View>
            <Text style={styles.title}>
                {t('welcome.title')}
            </Text>
            <Text style={styles.subtitle}>
                {t('welcome.subtitle')}
            </Text>
            {Platform.OS !== 'android' && Platform.OS !== 'ios' ? (
                <>
                    <View style={styles.buttonContainer}>
                        <RoundButton
                            title={t('welcome.loginWithMobileApp')}
                            onPress={() => {
                                trackAccountRestored();
                                router.push('/restore');
                            }}
                        />
                    </View>
                    <View style={styles.buttonContainerSecondary}>
                        <RoundButton
                            size="normal"
                            title={t('welcome.createAccount')}
                            action={createAccount}
                            display="inverted"
                        />
                    </View>
                    <Text style={styles.webSessionNote}>
                        {t('welcome.webSessionNote')}
                    </Text>
                </>
            ) : (
                <>
                    <View style={styles.buttonContainer}>
                        <RoundButton
                            title={t('welcome.createAccount')}
                            action={createAccount}
                        />
                    </View>
                    <View style={styles.buttonContainerSecondary}>
                        <RoundButton
                            size="normal"
                            title={t('welcome.linkOrRestoreAccount')}
                            onPress={() => {
                                trackAccountRestored();
                                router.push('/restore');
                            }}
                            display="inverted"
                        />
                    </View>
                </>
            )}
        </View>
    );

    const landscapeLayout = (
        <View style={[styles.landscapeContainer, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.landscapeInner}>
                <View style={styles.landscapeLogoSection}>
                    <View style={styles.logoWithDot}>
                        <Image
                            source={theme.dark ? require('@/assets/images/logotype-dark.png') : require('@/assets/images/logotype-light.png')}
                            resizeMode="contain"
                            style={styles.logo}
                        />
                        <TerminalDot />
                    </View>
                </View>
                <View style={styles.landscapeContentSection}>
                    <Text style={styles.landscapeTitle}>
                        {t('welcome.title')}
                    </Text>
                    <Text style={styles.landscapeSubtitle}>
                        {t('welcome.subtitle')}
                    </Text>
                    {Platform.OS !== 'android' && Platform.OS !== 'ios'
                        ? (<>
                            <View style={styles.landscapeButtonContainer}>
                                <RoundButton
                                    title={t('welcome.loginWithMobileApp')}
                                    onPress={() => {
                                        trackAccountRestored();
                                        router.push('/restore');
                                    }}
                                />
                            </View>
                            <View style={styles.landscapeButtonContainerSecondary}>
                                <RoundButton
                                    size="normal"
                                    title={t('welcome.createAccount')}
                                    action={createAccount}
                                    display="inverted"
                                />
                            </View>
                            <Text style={styles.webSessionNote}>
                                {t('welcome.webSessionNote')}
                            </Text>
                        </>)
                        : (<>
                            <View style={styles.landscapeButtonContainer}>
                                <RoundButton
                                    title={t('welcome.createAccount')}
                                    action={createAccount}
                                />
                            </View>
                            <View style={styles.landscapeButtonContainerSecondary}>
                                <RoundButton
                                    size="normal"
                                    title={t('welcome.linkOrRestoreAccount')}
                                    onPress={() => {
                                        trackAccountRestored();
                                        router.push('/restore');
                                    }}
                                    display="inverted"
                                />
                            </View>
                        </>)
                    }
                </View>
            </View>
        </View>
    );

    return (
        <>
            <HomeHeaderNotAuth />
            {isLandscape ? landscapeLayout : portraitLayout}
        </>
    )
}

const styles = StyleSheet.create((theme) => ({
    // NotAuthenticated styles
    portraitContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoWithDot: {
        flexDirection: 'row' as const,
        alignItems: 'center',
    },
    logo: {
        width: 300,
        height: 90,
    },
    title: {
        marginTop: 16,
        textAlign: 'center',
        fontSize: 24,
        ...Typography.default('medium'),
        color: theme.colors.text,
    },
    subtitle: {
        ...Typography.default(),
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
        marginHorizontal: 24,
        marginBottom: 64,
    },
    buttonContainer: {
        maxWidth: 280,
        width: '100%',
        marginBottom: 16,
    },
    buttonContainerSecondary: {
    },
    // Landscape styles
    landscapeContainer: {
        flexBasis: 0,
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    landscapeInner: {
        flexGrow: 1,
        flexBasis: 0,
        maxWidth: 800,
        flexDirection: 'row',
    },
    landscapeLogoSection: {
        flexBasis: 0,
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 24,
    },
    landscapeContentSection: {
        flexBasis: 0,
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 24,
    },
    landscapeTitle: {
        textAlign: 'center',
        fontSize: 24,
        ...Typography.default('medium'),
        color: theme.colors.text,
    },
    landscapeSubtitle: {
        ...Typography.default(),
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    landscapeButtonContainer: {
        width: 280,
        marginBottom: 16,
    },
    landscapeButtonContainerSecondary: {
        width: 280,
    },
    // Subtle hint shown only on web — persistent sessions require the native app
    webSessionNote: {
        ...Typography.default(),
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 20,
        textAlign: 'center',
        opacity: 0.7,
    },
}));