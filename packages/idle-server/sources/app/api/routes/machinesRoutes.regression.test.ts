/**
 * Regression tests for PGlite Bytes serialization in machine routes.
 *
 * Bug: wrapping Buffer.from() in new Uint8Array() stripped the Buffer
 * identity, causing PGlite's Prisma adapter to serialize Bytes fields
 * as JSON objects {"0":0,"1":152,...} instead of binary data. This
 * broke machine registration when a dataEncryptionKey was provided.
 *
 * Fix (commit 38046952): use Buffer.from(key, 'base64') directly,
 * without the Uint8Array wrapper.
 *
 * These tests verify the same underlying type behavior as the session
 * regression tests, scoped to the machine registration context.
 */

describe('PGlite Bytes serialization — machinesRoutes regression', () => {

    describe('dataEncryptionKey type identity', () => {
        it('Buffer.from preserves Buffer identity for Prisma', () => {
            // The fixed code path: Buffer.from(dataEncryptionKey, 'base64')
            const dataEncryptionKey = Buffer.from('machine-key-data').toString('base64');
            const forPrisma = Buffer.from(dataEncryptionKey, 'base64');

            expect(forPrisma).toBeInstanceOf(Buffer);
            expect(forPrisma.constructor.name).toBe('Buffer');
        });

        it('Uint8Array wrapper would break Prisma serialization', () => {
            // The old buggy code path: new Uint8Array(Buffer.from(...))
            const dataEncryptionKey = Buffer.from('machine-key-data').toString('base64');
            const forPrisma = new Uint8Array(Buffer.from(dataEncryptionKey, 'base64'));

            // This is what caused the bug: PGlite doesn't recognize plain
            // Uint8Array as binary and serializes it as a JSON object
            expect(forPrisma).not.toBeInstanceOf(Buffer);
            expect(forPrisma.constructor.name).toBe('Uint8Array');
        });
    });

    describe('data integrity through base64 encoding', () => {
        it('preserves key bytes through the encoding round-trip', () => {
            // Simulate the flow: client sends base64 -> server decodes -> Prisma stores
            const clientKey = Buffer.alloc(32);
            crypto.getRandomValues(clientKey);
            const base64FromClient = clientKey.toString('base64');

            const serverDecoded = Buffer.from(base64FromClient, 'base64');

            expect(serverDecoded).toBeInstanceOf(Buffer);
            expect(serverDecoded.length).toBe(32);
            expect(Buffer.compare(clientKey, serverDecoded)).toBe(0);
        });

        it('handles nullish dataEncryptionKey per the route ternary', () => {
            // The route: dataEncryptionKey ? Buffer.from(dataEncryptionKey, 'base64') : undefined
            const cases: Array<{ input: string | null | undefined; expectBuffer: boolean }> = [
                { input: 'dGVzdA==', expectBuffer: true },
                { input: null, expectBuffer: false },
                { input: undefined, expectBuffer: false },
            ];

            for (const { input, expectBuffer } of cases) {
                const result = input ? Buffer.from(input, 'base64') : undefined;
                if (expectBuffer) {
                    expect(result).toBeInstanceOf(Buffer);
                } else {
                    expect(result).toBeUndefined();
                }
            }
        });
    });
});
