import { db } from '@/storage/db';
import { log } from '@/utils/log';

interface PushPayload {
    to: string;
    title: string;
    body: string;
    badge?: number;
    sound?: 'default';
    data?: Record<string, unknown>;
}

/**
 * Send push notification to all registered devices for an account.
 * Uses Expo Push Service to deliver via APNs/FCM.
 * Automatically removes stale tokens on DeviceNotRegistered errors.
 */
export async function pushSendToAccount(accountId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    const tokens = await db.accountPushToken.findMany({
        where: { accountId },
        select: { id: true, token: true },
    });

    if (tokens.length === 0) return;

    const messages: PushPayload[] = tokens.map(t => ({
        to: t.token,
        title,
        body: body.length > 100 ? body.substring(0, 97) + '...' : body,
        sound: 'default',
        data,
    }));

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        if (response.ok) {
            const result = await response.json() as { data?: Array<{ status: string; details?: { error?: string } }> };
            // Remove stale tokens
            const staleTokenIds: string[] = [];
            if (result.data && Array.isArray(result.data)) {
                for (let i = 0; i < result.data.length; i++) {
                    if (result.data[i].status === 'error' && result.data[i].details?.error === 'DeviceNotRegistered') {
                        staleTokenIds.push(tokens[i].id);
                    }
                }
            }
            if (staleTokenIds.length > 0) {
                await db.accountPushToken.deleteMany({
                    where: { id: { in: staleTokenIds } },
                });
                log({ module: 'push' }, `Removed ${staleTokenIds.length} stale push tokens for account ${accountId}`);
            }
        }
    } catch (error) {
        log({ module: 'push', level: 'error' }, `Failed to send push notification: ${error}`);
    }
}
