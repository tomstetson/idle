/**
 * Caches plaintext session encryption keys (DEKs) locally, keyed by session tag.
 *
 * Problem: When resuming a session, the CLI generates a fresh random DEK in
 * getOrCreateSession(). The server returns the original encrypted DEK, but the
 * CLI can't decrypt it (no private key). So resumed sessions end up encrypting
 * with a different key than the original — breaking decryption on the app side.
 *
 * Fix: After creating a new session, cache the plaintext DEK. On resume, look
 * up the cached key instead of generating a new one. If the cache miss, fall
 * back to generating a new key (not worse than before).
 *
 * Stored at ~/.idle/session-key-cache.json. Bounded to MAX_ENTRIES.
 * Keys are stored as base64 — this file should have 0600 permissions.
 */

import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { configuration } from '@/configuration';
import { logger } from '@/ui/logger';

const MAX_ENTRIES = 200;

interface SessionKeyCacheData {
    /** Map of sessionTag -> { key (base64), updatedAt } */
    entries: Record<string, { key: string; updatedAt: number }>;
}

function cacheFilePath(): string {
    return join(configuration.idleHomeDir, 'session-key-cache.json');
}

function readCache(): SessionKeyCacheData {
    const path = cacheFilePath();
    if (!existsSync(path)) {
        return { entries: {} };
    }
    try {
        const raw = readFileSync(path, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.entries === 'object') {
            return parsed as SessionKeyCacheData;
        }
        return { entries: {} };
    } catch {
        return { entries: {} };
    }
}

function writeCache(data: SessionKeyCacheData): void {
    const path = cacheFilePath();
    try {
        const keys = Object.keys(data.entries);
        if (keys.length > MAX_ENTRIES) {
            const sorted = keys.sort((a, b) =>
                (data.entries[a].updatedAt ?? 0) - (data.entries[b].updatedAt ?? 0)
            );
            const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES);
            for (const key of toRemove) {
                delete data.entries[key];
            }
        }
        writeFileSync(path, JSON.stringify(data, null, 2), { mode: 0o600 });
        // Ensure permissions even if file already existed
        chmodSync(path, 0o600);
    } catch (err) {
        logger.debug('[sessionKeyCache] Failed to write cache:', err);
    }
}

/**
 * Look up a cached encryption key for a session tag.
 * Returns the key as Uint8Array if found, null otherwise.
 */
export function lookupKeyByTag(tag: string): Uint8Array | null {
    const data = readCache();
    const entry = data.entries[tag];
    if (entry) {
        logger.debug(`[sessionKeyCache] Cache hit for tag ${tag}`);
        return new Uint8Array(Buffer.from(entry.key, 'base64'));
    }
    logger.debug(`[sessionKeyCache] Cache miss for tag ${tag}`);
    return null;
}

/**
 * Cache the encryption key for a session tag.
 */
export function cacheKeyForTag(tag: string, key: Uint8Array): void {
    const data = readCache();
    data.entries[tag] = {
        key: Buffer.from(key).toString('base64'),
        updatedAt: Date.now()
    };
    writeCache(data);
    logger.debug(`[sessionKeyCache] Cached key for tag ${tag}`);
}
