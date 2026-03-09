import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lookupKeyByTag, cacheKeyForTag } from '../sessionKeyCache';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { configuration } from '@/configuration';

const cacheFile = join(configuration.idleHomeDir, 'session-key-cache.json');

function cleanupCache() {
    try {
        if (existsSync(cacheFile)) unlinkSync(cacheFile);
    } catch { /* ignore */ }
}

describe('sessionKeyCache', () => {
    beforeEach(cleanupCache);
    afterEach(cleanupCache);

    it('returns null for unknown tag', () => {
        expect(lookupKeyByTag('nonexistent')).toBeNull();
    });

    it('caches and retrieves a key by tag', () => {
        const key = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
            17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
        cacheKeyForTag('test-tag-1', key);
        const retrieved = lookupKeyByTag('test-tag-1');
        expect(retrieved).not.toBeNull();
        expect(Buffer.from(retrieved!).toString('base64')).toBe(Buffer.from(key).toString('base64'));
    });

    it('returns null after cache file is removed', () => {
        const key = new Uint8Array(32).fill(42);
        cacheKeyForTag('tag-a', key);
        cleanupCache();
        expect(lookupKeyByTag('tag-a')).toBeNull();
    });

    it('handles multiple tags independently', () => {
        const key1 = new Uint8Array(32).fill(1);
        const key2 = new Uint8Array(32).fill(2);
        cacheKeyForTag('tag-1', key1);
        cacheKeyForTag('tag-2', key2);

        const r1 = lookupKeyByTag('tag-1');
        const r2 = lookupKeyByTag('tag-2');
        expect(r1![0]).toBe(1);
        expect(r2![0]).toBe(2);
    });

    it('overwrites existing key for same tag', () => {
        const key1 = new Uint8Array(32).fill(10);
        const key2 = new Uint8Array(32).fill(20);
        cacheKeyForTag('same-tag', key1);
        cacheKeyForTag('same-tag', key2);

        const result = lookupKeyByTag('same-tag');
        expect(result![0]).toBe(20);
    });

    it('file has restricted permissions', () => {
        const key = new Uint8Array(32).fill(99);
        cacheKeyForTag('perm-tag', key);

        const { statSync } = require('node:fs');
        const stats = statSync(cacheFile);
        const mode = (stats.mode & 0o777).toString(8);
        expect(mode).toBe('600');
    });
});
