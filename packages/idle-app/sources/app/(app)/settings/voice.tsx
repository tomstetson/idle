import React from 'react';
import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { useSettingMutable } from '@/sync/storage';
import { useUnistyles } from 'react-native-unistyles';
import { StyleSheet } from 'react-native-unistyles';
import { findLanguageByCode, getLanguageDisplayName, LANGUAGES } from '@/constants/Languages';
import { t } from '@/text';
import { useAuth } from '@/auth/AuthContext';
import { useIdleAction } from '@/hooks/useIdleAction';
import { Modal } from '@/modal';
import { registerApiKey, disconnectService } from '@/sync/apiServices';
import { useElevenLabsKeyStatus } from '@/hooks/useElevenLabsKeyStatus';

export default React.memo(function VoiceSettingsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const auth = useAuth();
    const [voiceAssistantLanguage] = useSettingMutable('voiceAssistantLanguage');
    const [apiKey, setApiKey] = React.useState('');
    const { hasKey, refresh: refreshKeyStatus } = useElevenLabsKeyStatus();

    // Find current language or default to first option
    const currentLanguage = findLanguageByCode(voiceAssistantLanguage) || LANGUAGES[0];

    // Save BYOK key
    const [saving, handleSave] = useIdleAction(React.useCallback(async () => {
        const trimmed = apiKey.trim();
        if (!trimmed) {
            Modal.alert(t('common.error'), t('settingsVoice.apiKeyEmpty'));
            return;
        }
        await registerApiKey(auth.credentials!, 'elevenlabs', trimmed);
        setApiKey('');
        await refreshKeyStatus();
        Modal.alert(t('common.success'), t('settingsVoice.apiKeySaved'));
    }, [apiKey, auth.credentials, refreshKeyStatus]));

    // Delete BYOK key
    const [deleting, handleDelete] = useIdleAction(React.useCallback(async () => {
        const confirmed = await Modal.confirm(
            t('settingsVoice.apiKeyDelete'),
            t('settingsVoice.apiKeyDeleted'),
            { confirmText: t('settingsVoice.apiKeyDelete'), destructive: true }
        );
        if (confirmed) {
            await disconnectService(auth.credentials!, 'elevenlabs');
            await refreshKeyStatus();
        }
    }, [auth.credentials, refreshKeyStatus]));

    return (
        <ItemList style={{ paddingTop: 0 }}>
            {/* Language Settings */}
            <ItemGroup
                title={t('settingsVoice.languageTitle')}
                footer={t('settingsVoice.languageDescription')}
            >
                <Item
                    title={t('settingsVoice.preferredLanguage')}
                    subtitle={t('settingsVoice.preferredLanguageSubtitle')}
                    icon={<Ionicons name="language-outline" size={29} color="#007AFF" />}
                    detail={getLanguageDisplayName(currentLanguage)}
                    onPress={() => router.push('/settings/voice/language')}
                />
            </ItemGroup>

            {/* BYOK ElevenLabs API Key */}
            <ItemGroup
                title={t('settingsVoice.apiKeyTitle')}
                footer={t('settingsVoice.apiKeyDescription')}
            >
                <Item
                    title={t('settingsVoice.apiKeyLabel')}
                    subtitle={hasKey
                        ? t('settingsVoice.apiKeyRegistered')
                        : t('settingsVoice.apiKeyNotRegistered')}
                    icon={<Ionicons name="key-outline" size={29} color={hasKey ? '#34C759' : '#FF9500'} />}
                    showChevron={false}
                />
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.divider }]}
                        placeholder={t('settingsVoice.apiKeyPlaceholder')}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={apiKey}
                        onChangeText={setApiKey}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
                <Item
                    title={t('settingsVoice.apiKeySave')}
                    icon={<Ionicons name="checkmark-circle-outline" size={29} color="#007AFF" />}
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving || !apiKey.trim()}
                    showChevron={false}
                />
                {hasKey && (
                    <Item
                        title={t('settingsVoice.apiKeyDelete')}
                        icon={<Ionicons name="trash-outline" size={29} color="#FF3B30" />}
                        onPress={handleDelete}
                        loading={deleting}
                        disabled={deleting}
                        destructive
                        showChevron={false}
                    />
                )}
            </ItemGroup>
        </ItemList>
    );
});

const styles = StyleSheet.create((theme) => ({
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 15,
        backgroundColor: theme.colors.input.background,
    },
}));
