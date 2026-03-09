import { AuthCredentials } from '@/auth/tokenStorage';
import { getServerUrl } from './serverConfig';
import { config } from '@/config';
import { storage } from './storage';

export interface VoiceTokenResponse {
    allowed: boolean;
    token?: string;
    agentId?: string;
    error?: string;
}

export async function fetchVoiceToken(
    credentials: AuthCredentials,
    sessionId: string
): Promise<VoiceTokenResponse> {
    const serverUrl = getServerUrl();
    const userId = storage.getState().profile.id;
    console.log(`[Voice] User ID: ${userId}`);

    // Get agent ID from config
    const agentId = __DEV__
        ? config.elevenLabsAgentIdDev
        : config.elevenLabsAgentIdProd;

    if (!agentId) {
        throw new Error('Agent ID not configured');
    }

    const response = await fetch(`${serverUrl}/v1/voice/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId,
            agentId
        })
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = (errorBody as any).error || `Voice service error: ${response.status}`;
        console.error(`[Voice] Token request failed: ${response.status}`, errorMessage);
        return { allowed: false, error: errorMessage };
    }

    return await response.json();
}