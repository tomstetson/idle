import * as React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { checkApiKeyRegistered } from '@/sync/apiServices';

/**
 * Checks whether the current user has a BYOK ElevenLabs API key registered.
 * Returns { hasKey, loading, refresh } so the voice settings screen can show
 * status and refresh after save/delete operations.
 */
export function useElevenLabsKeyStatus() {
    const auth = useAuth();
    const [hasKey, setHasKey] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    const refresh = React.useCallback(async () => {
        if (!auth.credentials) {
            setHasKey(false);
            setLoading(false);
            return;
        }
        try {
            const registered = await checkApiKeyRegistered(auth.credentials, 'elevenlabs');
            setHasKey(registered);
        } catch {
            // If the check fails (e.g., network error), assume no key
            setHasKey(false);
        } finally {
            setLoading(false);
        }
    }, [auth.credentials]);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    return { hasKey, loading, refresh };
}
