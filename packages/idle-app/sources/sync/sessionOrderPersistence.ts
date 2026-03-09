/**
 * Encrypted persistence for session ordering via UserKVStore.
 *
 * The user's preferred session order is stored as an encrypted JSON array
 * of session IDs in the KV store under key "session-order". The server
 * only sees ciphertext — zero knowledge of ordering.
 *
 * Uses the same encryptRaw/decryptRaw pattern as settings sync.
 */

import { kvGet, kvSet } from './apiKv';
import { Encryption } from './encryption/encryption';
import { AuthCredentials } from '@/auth/tokenStorage';
import { log } from '@/log';

const SESSION_ORDER_KEY = 'session-order';

/** Cached state to avoid re-fetching on every render */
let cachedOrder: string[] = [];
let cachedVersion: number = -1;

/**
 * Load the session order from the encrypted KV store.
 * Returns the order array, or an empty array if no order is saved.
 */
export async function loadSessionOrder(
    credentials: AuthCredentials,
    encryption: Encryption
): Promise<string[]> {
    try {
        const item = await kvGet(credentials, SESSION_ORDER_KEY);
        if (!item) {
            cachedOrder = [];
            cachedVersion = -1;
            return [];
        }

        // Decrypt the value (server stores ciphertext)
        const decrypted = await encryption.decryptRaw(item.value);
        if (!decrypted || !Array.isArray(decrypted)) {
            cachedOrder = [];
            cachedVersion = item.version;
            return [];
        }

        cachedOrder = decrypted as string[];
        cachedVersion = item.version;
        return cachedOrder;
    } catch (error) {
        log.log('sessionOrder: Failed to load session order');
        return cachedOrder; // Return last known good order on failure
    }
}

/**
 * Save the session order to the encrypted KV store.
 * Encrypts the order array client-side before sending to server.
 */
export async function saveSessionOrder(
    credentials: AuthCredentials,
    encryption: Encryption,
    order: string[]
): Promise<void> {
    try {
        const encrypted = await encryption.encryptRaw(order);
        const newVersion = await kvSet(credentials, SESSION_ORDER_KEY, encrypted, cachedVersion);
        cachedOrder = order;
        cachedVersion = newVersion;
    } catch (error) {
        log.log('sessionOrder: Failed to save session order');
        // On version mismatch, re-fetch and retry once
        if (error instanceof Error && error.message.includes('version-mismatch')) {
            try {
                await loadSessionOrder(credentials, encryption);
                const encrypted = await encryption.encryptRaw(order);
                const newVersion = await kvSet(credentials, SESSION_ORDER_KEY, encrypted, cachedVersion);
                cachedOrder = order;
                cachedVersion = newVersion;
            } catch (retryError) {
                log.log('sessionOrder: Retry save failed');
            }
        }
    }
}

/**
 * Get the cached session order without a network call.
 * Returns empty array if order hasn't been loaded yet.
 */
export function getCachedSessionOrder(): string[] {
    return cachedOrder;
}

/**
 * Reset the cached order (for logout or testing).
 */
export function resetSessionOrderCache(): void {
    cachedOrder = [];
    cachedVersion = -1;
}
