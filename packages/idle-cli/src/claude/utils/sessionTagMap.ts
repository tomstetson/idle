/**
 * Persists a mapping from Claude session IDs to Idle session tags.
 *
 * When a Claude session is first created, its Idle session tag is a random UUID.
 * The Claude session ID only becomes known later (via the SessionStart hook).
 * On --resume, we need the original tag so getOrCreateSession returns the
 * existing Idle session instead of creating a new one.
 *
 * The mapping is stored in a JSON file at ~/.idle/session-tag-map.json.
 * It is bounded to MAX_ENTRIES to avoid unbounded growth.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { configuration } from '@/configuration';
import { logger } from '@/ui/logger';

const MAX_ENTRIES = 200;

interface SessionTagMapData {
    /** Map of claudeSessionId -> { tag, idleSessionId, updatedAt } */
    entries: Record<string, { tag: string; idleSessionId: string; updatedAt: number }>;
}

function mapFilePath(): string {
    return join(configuration.idleHomeDir, 'session-tag-map.json');
}

function readMap(): SessionTagMapData {
    const path = mapFilePath();
    if (!existsSync(path)) {
        return { entries: {} };
    }
    try {
        const raw = readFileSync(path, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.entries === 'object') {
            return parsed as SessionTagMapData;
        }
        return { entries: {} };
    } catch {
        return { entries: {} };
    }
}

function writeMap(data: SessionTagMapData): void {
    const path = mapFilePath();
    try {
        // Evict oldest entries if over limit
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
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        logger.debug('[sessionTagMap] Failed to write session tag map:', err);
    }
}

/**
 * Look up the Idle session tag for a given Claude session ID.
 * Returns the tag if found, null otherwise.
 */
export function lookupTagByClaudeSessionId(claudeSessionId: string): string | null {
    const data = readMap();
    const entry = data.entries[claudeSessionId];
    if (entry) {
        logger.debug(`[sessionTagMap] Found tag for Claude session ${claudeSessionId}: tag=${entry.tag}, idleSession=${entry.idleSessionId}`);
        return entry.tag;
    }
    logger.debug(`[sessionTagMap] No tag found for Claude session ${claudeSessionId}`);
    return null;
}

/**
 * Persist the mapping from a Claude session ID to an Idle session tag and ID.
 * Called when onSessionFound fires with a Claude session ID.
 */
export function persistSessionTag(claudeSessionId: string, tag: string, idleSessionId: string): void {
    const data = readMap();
    data.entries[claudeSessionId] = { tag, idleSessionId, updatedAt: Date.now() };
    writeMap(data);
    logger.debug(`[sessionTagMap] Persisted mapping: claudeSession=${claudeSessionId} -> tag=${tag}, idleSession=${idleSessionId}`);
}
