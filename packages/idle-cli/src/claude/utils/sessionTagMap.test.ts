import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lookupTagByClaudeSessionId, persistSessionTag } from './sessionTagMap';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Mock configuration to use a temp directory
vi.mock('@/configuration', () => {
    const os = require('node:os');
    const path = require('node:path');
    const crypto = require('node:crypto');
    const tmpDir = path.join(os.tmpdir(), `idle-test-${crypto.randomUUID()}`);
    const fs = require('node:fs');
    fs.mkdirSync(tmpDir, { recursive: true });
    return {
        configuration: {
            idleHomeDir: tmpDir
        }
    };
});

// Mock logger
vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn()
    }
}));

import { configuration } from '@/configuration';

function mapFilePath(): string {
    return join(configuration.idleHomeDir, 'session-tag-map.json');
}

function cleanupMapFile(): void {
    const path = mapFilePath();
    if (existsSync(path)) {
        unlinkSync(path);
    }
}

describe('sessionTagMap', () => {
    beforeEach(() => {
        cleanupMapFile();
    });

    afterEach(() => {
        cleanupMapFile();
    });

    it('returns null when no mapping exists', () => {
        const result = lookupTagByClaudeSessionId('non-existent-session');
        expect(result).toBeNull();
    });

    it('returns null when map file does not exist', () => {
        const result = lookupTagByClaudeSessionId('abc-123');
        expect(result).toBeNull();
    });

    it('persists and retrieves a mapping', () => {
        persistSessionTag('claude-session-1', 'tag-abc', 'idle-session-1');

        const result = lookupTagByClaudeSessionId('claude-session-1');
        expect(result).toBe('tag-abc');
    });

    it('returns null for unrelated session ID after persist', () => {
        persistSessionTag('claude-session-1', 'tag-abc', 'idle-session-1');

        const result = lookupTagByClaudeSessionId('claude-session-2');
        expect(result).toBeNull();
    });

    it('overwrites previous mapping for same Claude session ID', () => {
        persistSessionTag('claude-session-1', 'tag-old', 'idle-session-old');
        persistSessionTag('claude-session-1', 'tag-new', 'idle-session-new');

        const result = lookupTagByClaudeSessionId('claude-session-1');
        expect(result).toBe('tag-new');
    });

    it('handles multiple distinct Claude session IDs', () => {
        persistSessionTag('session-a', 'tag-a', 'idle-a');
        persistSessionTag('session-b', 'tag-b', 'idle-b');
        persistSessionTag('session-c', 'tag-c', 'idle-c');

        expect(lookupTagByClaudeSessionId('session-a')).toBe('tag-a');
        expect(lookupTagByClaudeSessionId('session-b')).toBe('tag-b');
        expect(lookupTagByClaudeSessionId('session-c')).toBe('tag-c');
    });

    it('evicts oldest entries when over MAX_ENTRIES limit', () => {
        // Write 201 entries (limit is 200)
        for (let i = 0; i < 201; i++) {
            persistSessionTag(`session-${i}`, `tag-${i}`, `idle-${i}`);
        }

        // Read the map file to verify it was trimmed
        const raw = readFileSync(mapFilePath(), 'utf8');
        const data = JSON.parse(raw);
        const entryCount = Object.keys(data.entries).length;
        expect(entryCount).toBeLessThanOrEqual(200);

        // The latest entry should still be present
        expect(lookupTagByClaudeSessionId('session-200')).toBe('tag-200');
    });

    it('handles corrupted map file gracefully', () => {
        const { writeFileSync } = require('node:fs');
        writeFileSync(mapFilePath(), 'not valid json');

        // Should not throw, returns null
        const result = lookupTagByClaudeSessionId('any-session');
        expect(result).toBeNull();

        // Should be able to persist after corruption (overwrites)
        persistSessionTag('new-session', 'new-tag', 'new-idle');
        expect(lookupTagByClaudeSessionId('new-session')).toBe('new-tag');
    });

    it('handles map file with wrong structure gracefully', () => {
        const { writeFileSync } = require('node:fs');
        writeFileSync(mapFilePath(), JSON.stringify({ wrong: 'shape' }));

        const result = lookupTagByClaudeSessionId('any-session');
        expect(result).toBeNull();
    });
});
