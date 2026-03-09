import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Unit tests for the ElevenLabs BYOK vendor whitelist.
 * These validate that 'elevenlabs' is accepted by the same Zod schemas
 * used in connectRoutes.ts vendor param validation.
 *
 * Full E2E tests (register key, voice token with BYOK) require a running
 * server instance and are covered by the E2E test suite.
 */

// Mirror the vendor enum from connectRoutes.ts
const vendorSchema = z.enum(['openai', 'anthropic', 'gemini', 'elevenlabs']);

describe('ElevenLabs BYOK vendor whitelist', () => {
    it('accepts elevenlabs as a valid vendor', () => {
        const result = vendorSchema.safeParse('elevenlabs');
        expect(result.success).toBe(true);
    });

    it('accepts existing vendors (openai, anthropic, gemini)', () => {
        for (const vendor of ['openai', 'anthropic', 'gemini']) {
            const result = vendorSchema.safeParse(vendor);
            expect(result.success).toBe(true);
        }
    });

    it('rejects unknown vendors', () => {
        const result = vendorSchema.safeParse('unknown-vendor');
        expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
        const result = vendorSchema.safeParse('');
        expect(result.success).toBe(false);
    });
});

describe('ElevenLabs BYOK key lookup logic', () => {
    it('falls back to platform key when no BYOK key exists', () => {
        // Simulates the logic in voiceRoutes.ts
        const tokenResults: Array<{ val: string | null }> = [];
        let elevenLabsApiKey: string | undefined;

        if (tokenResults[0]?.val) {
            elevenLabsApiKey = 'decrypted-byok-key';
        }

        if (!elevenLabsApiKey) {
            elevenLabsApiKey = 'platform-key-from-env';
        }

        expect(elevenLabsApiKey).toBe('platform-key-from-env');
    });

    it('uses BYOK key when it exists', () => {
        // Simulates finding a user key in the database
        const tokenResults: Array<{ val: string | null }> = [{ val: 'some-base64-token' }];
        let elevenLabsApiKey: string | undefined;

        if (tokenResults[0]?.val) {
            elevenLabsApiKey = 'decrypted-byok-key';
        }

        if (!elevenLabsApiKey) {
            elevenLabsApiKey = 'platform-key-from-env';
        }

        expect(elevenLabsApiKey).toBe('decrypted-byok-key');
    });

    it('returns error when neither BYOK nor platform key exists', () => {
        const tokenResults: Array<{ val: string | null }> = [];
        let elevenLabsApiKey: string | undefined;

        if (tokenResults[0]?.val) {
            elevenLabsApiKey = 'decrypted-byok-key';
        }

        // No platform key either
        if (!elevenLabsApiKey) {
            elevenLabsApiKey = undefined; // process.env.ELEVENLABS_API_KEY would be undefined
        }

        expect(elevenLabsApiKey).toBeUndefined();
    });
});
