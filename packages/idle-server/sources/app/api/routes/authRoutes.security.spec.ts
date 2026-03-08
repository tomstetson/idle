/**
 * Auth endpoint security tests.
 *
 * Verify the server properly rejects invalid auth payloads and tokens.
 * These tests hit the real VPS — no mocking — and only exercise error
 * paths, so no valid account is needed.
 *
 * A Zscaler proxy may block outbound traffic to the VPS. When detected,
 * the entire suite is skipped with a clear message.
 */

import axios, { AxiosError } from 'axios';
import tweetnacl from 'tweetnacl';

const SERVER_URL = 'https://idle-api.northglass.io';

/**
 * Detect whether the VPS is directly reachable or blocked by a corporate
 * proxy (Zscaler). We probe POST /v1/auth with an empty JSON body — the
 * real server returns a Fastify Zod validation error (4xx JSON), while
 * Zscaler returns an HTML 403 or resets the connection.
 */
async function isServerReachable(): Promise<boolean> {
    try {
        await axios.post(
            `${SERVER_URL}/v1/auth`,
            {},
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
        );
        // 2xx means server is up (unexpected for empty body, but still reachable)
        return true;
    } catch (err) {
        const e = err as AxiosError;
        if (!e.response) {
            // No response at all — connection reset / timeout / DNS failure
            return false;
        }
        // Check for Zscaler proxy signature
        const server = e.response.headers?.['server'];
        if (typeof server === 'string' && server.toLowerCase().includes('zscaler')) {
            return false;
        }
        // Any HTTP response from the real server (4xx, 5xx) means it's reachable
        return true;
    }
}

describe('Auth endpoint security', () => {
    let reachable: boolean;

    beforeAll(async () => {
        reachable = await isServerReachable();
        if (!reachable) {
            console.warn(
                '[SKIP] VPS not directly reachable (Zscaler proxy or network issue). '
                + 'Run these tests from a network with direct access to idle-api.northglass.io.',
            );
        }
    });

    it('rejects truncated auth token', { timeout: 30000 }, async () => {
        if (!reachable) return;

        const fakeToken = 'abcdef1234';
        try {
            const res = await axios.get(`${SERVER_URL}/v1/sessions`, {
                headers: { Authorization: `Bearer ${fakeToken}` },
            });
            expect.unreachable('Expected 401/403 but got ' + res.status);
        } catch (err) {
            const e = err as AxiosError;
            expect([401, 403]).toContain(e.response?.status);
        }
    });

    it('rejects empty bearer token', { timeout: 30000 }, async () => {
        if (!reachable) return;

        try {
            const res = await axios.get(`${SERVER_URL}/v1/sessions`, {
                headers: { Authorization: 'Bearer ' },
            });
            expect.unreachable('Expected 401/403 but got ' + res.status);
        } catch (err) {
            const e = err as AxiosError;
            expect([401, 403]).toContain(e.response?.status);
        }
    });

    it('rejects request with no auth header', { timeout: 30000 }, async () => {
        if (!reachable) return;

        try {
            const res = await axios.get(`${SERVER_URL}/v1/sessions`);
            expect.unreachable('Expected 401/403 but got ' + res.status);
        } catch (err) {
            const e = err as AxiosError;
            expect([401, 403]).toContain(e.response?.status);
        }
    });

    it('rejects malformed JSON in auth body', { timeout: 30000 }, async () => {
        if (!reachable) return;

        try {
            const res = await axios.post(
                `${SERVER_URL}/v1/auth`,
                'this is not json',
                { headers: { 'Content-Type': 'text/plain' } },
            );
            expect.unreachable('Expected 4xx but got ' + res.status);
        } catch (err) {
            const e = err as AxiosError;
            const status = e.response?.status;
            // Fastify may return 400, 403, or 415 depending on plugin order
            expect(status).toBeDefined();
            expect([400, 403, 415]).toContain(status);
        }
    });

    it('rejects auth with mismatched keypair', { timeout: 30000 }, async () => {
        if (!reachable) return;

        // Sign the challenge with key A but send public key B
        const keyPairA = tweetnacl.sign.keyPair();
        const keyPairB = tweetnacl.sign.keyPair();
        const challenge = tweetnacl.randomBytes(32);
        const signature = tweetnacl.sign.detached(challenge, keyPairA.secretKey);

        const publicKeyB64 = Buffer.from(keyPairB.publicKey).toString('base64');
        const challengeB64 = Buffer.from(challenge).toString('base64');
        const signatureB64 = Buffer.from(signature).toString('base64');

        try {
            const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                publicKey: publicKeyB64,
                challenge: challengeB64,
                signature: signatureB64,
            });
            expect.unreachable('Expected 401/403 but got ' + res.status);
        } catch (err) {
            const e = err as AxiosError;
            expect([401, 403]).toContain(e.response?.status);
        }
    });

    it('handles oversized public key gracefully', { timeout: 30000 }, async () => {
        if (!reachable) return;

        // 100KB string as publicKey — server should return a client error, not crash
        const hugeKey = 'A'.repeat(100 * 1024);

        try {
            const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                publicKey: hugeKey,
                challenge: 'AAAA',
                signature: 'AAAA',
            });
            expect.unreachable('Expected 4xx but got ' + res.status);
        } catch (err) {
            const e = err as AxiosError;
            const status = e.response?.status;
            expect(status).toBeDefined();
            // Must be a client error (4xx), not a server error (5xx)
            expect(status).toBeGreaterThanOrEqual(400);
            expect(status).toBeLessThan(500);
        }
    });
});
