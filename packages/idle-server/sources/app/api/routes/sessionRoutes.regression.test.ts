/**
 * Regression tests for PGlite Bytes serialization in session routes.
 *
 * Bug: wrapping Buffer.from() in new Uint8Array() stripped the Buffer
 * identity, causing PGlite's Prisma adapter to serialize Bytes fields
 * as JSON objects {"0":0,"1":152,...} instead of binary data.
 *
 * Fix (commit 38046952): use Buffer.from(key, 'base64') directly,
 * without the Uint8Array wrapper.
 *
 * These tests verify the underlying data type behavior that caused
 * the bug, not the route handler itself (which is covered by
 * integration tests).
 */

describe('PGlite Bytes serialization — sessionRoutes regression', () => {

    describe('Buffer.from returns a Buffer instance', () => {
        it('Buffer.from(base64) is an instance of Buffer', () => {
            const key = Buffer.from('test-encryption-key').toString('base64');
            const decoded = Buffer.from(key, 'base64');

            expect(decoded).toBeInstanceOf(Buffer);
        });

        it('Buffer.from(base64) is also an instance of Uint8Array', () => {
            // Buffer extends Uint8Array, so this should always be true.
            // PGlite relies on this relationship for correct serialization.
            const key = Buffer.from('test-encryption-key').toString('base64');
            const decoded = Buffer.from(key, 'base64');

            expect(decoded).toBeInstanceOf(Uint8Array);
        });
    });

    describe('Uint8Array wrapper strips Buffer identity', () => {
        it('new Uint8Array(Buffer) is NOT an instance of Buffer', () => {
            // This was the bug: wrapping in Uint8Array loses the Buffer
            // prototype, so PGlite's Prisma adapter couldn't recognize it
            // as binary data and fell back to JSON object serialization.
            const key = Buffer.from('test-encryption-key').toString('base64');
            const decoded = new Uint8Array(Buffer.from(key, 'base64'));

            expect(decoded).not.toBeInstanceOf(Buffer);
            expect(decoded).toBeInstanceOf(Uint8Array);
        });

        it('Uint8Array wrapper produces different constructor name', () => {
            const key = Buffer.from('test-encryption-key').toString('base64');
            const asBuffer = Buffer.from(key, 'base64');
            const asUint8Array = new Uint8Array(Buffer.from(key, 'base64'));

            expect(asBuffer.constructor.name).toBe('Buffer');
            expect(asUint8Array.constructor.name).toBe('Uint8Array');
        });
    });

    describe('Buffer base64 round-trip preserves data', () => {
        it('round-trips a known encryption key through base64', () => {
            const original = Buffer.from('AES-256-GCM-session-encryption-key!');
            const base64 = original.toString('base64');
            const restored = Buffer.from(base64, 'base64');

            expect(restored).toBeInstanceOf(Buffer);
            expect(Buffer.compare(original, restored)).toBe(0);
        });

        it('round-trips binary data with all byte values', () => {
            // Simulate a real 32-byte encryption key with arbitrary bytes
            const original = Buffer.alloc(32);
            for (let i = 0; i < 32; i++) {
                original[i] = i * 8; // 0, 8, 16, ... 248
            }
            const base64 = original.toString('base64');
            const restored = Buffer.from(base64, 'base64');

            expect(restored).toBeInstanceOf(Buffer);
            expect(restored.length).toBe(32);
            expect(Buffer.compare(original, restored)).toBe(0);
        });

        it('handles undefined/null dataEncryptionKey gracefully', () => {
            // The route uses a ternary: dataEncryptionKey ? Buffer.from(...) : undefined
            // Verify the ternary pattern works as expected
            const withKey = 'dGVzdA==';
            const withoutKey: string | undefined = undefined;

            const result1 = withKey ? Buffer.from(withKey, 'base64') : undefined;
            const result2 = withoutKey ? Buffer.from(withoutKey, 'base64') : undefined;

            expect(result1).toBeInstanceOf(Buffer);
            expect(result2).toBeUndefined();
        });
    });
});
