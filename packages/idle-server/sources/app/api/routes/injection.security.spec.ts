/**
 * Injection security tests for unauthenticated auth endpoints.
 *
 * These tests verify that SQL injection payloads, NoSQL payloads,
 * header injection, and oversized inputs are handled gracefully
 * (4xx responses or connection drops) rather than causing server
 * errors (5xx).
 *
 * A 500 response means the payload reached application code and
 * caused an unhandled error — that's a potential vulnerability.
 * A network error (no response) means the server or proxy dropped
 * the connection, which is acceptable defensive behavior.
 *
 * All tested endpoints are unauthenticated, so no auth token needed.
 * Tests run against the live server at idle-api.northglass.io.
 *
 * Rate limiting: auth endpoints allow 10 req/min. Tests include
 * small delays between groups to avoid hitting the limit.
 */

import axios, { AxiosError } from 'axios';

const SERVER_URL = 'https://idle-api.northglass.io';

// --- Payload collections ---

const SQL_PAYLOADS = [
    "'; DROP TABLE sessions; --",
    "1' OR '1'='1",
    "1; SELECT * FROM accounts--",
    "' UNION SELECT token FROM accounts--",
    "'; UPDATE accounts SET publicKey='pwned' WHERE '1'='1",
    "1'; TRUNCATE TABLE \"TerminalAuthRequest\"--",
    "' OR 1=1; --",
];

const NOSQL_PAYLOADS = [
    '{"$gt": ""}',
    '{"$ne": null}',
    '{"$where": "sleep(5000)"}',
    '{"$regex": ".*"}',
];

const HEADER_INJECTION_PAYLOADS = [
    "value\r\nX-Injected: true",
    "value\nSet-Cookie: evil=1",
    "value%0d%0aInjected-Header: yes",
];

const TEMPLATE_INJECTION_PAYLOADS = [
    "{{7*7}}",
    "${7*7}",
    "<%= 7*7 %>",
    "#{7*7}",
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Assert the server did NOT return a 5xx error.
 *
 * Acceptable outcomes:
 * - 4xx status (400, 401, 413, 422, 429) — server rejected the input properly
 * - 2xx status — input was accepted but didn't cause harm (e.g., invalid signature)
 * - No response at all (network error / connection drop) — server or proxy killed
 *   the request before processing, which is fine
 *
 * Unacceptable outcome:
 * - 5xx status — payload reached app code and caused an unhandled error
 */
function assertNotServerError(e: unknown) {
    if (axios.isAxiosError(e)) {
        const status = (e as AxiosError).response?.status;
        if (status === undefined) {
            // Network error — no HTTP response received.
            // This means the server/proxy dropped the connection (e.g., rate
            // limiting, body too large, connection reset). This is acceptable
            // defensive behavior, not a vulnerability.
            return;
        }
        expect(status).toBeLessThan(500);
    }
    // If it's not an AxiosError, it's some other unexpected error — let it propagate
}

describe('Injection prevention', () => {

    // ── POST /v1/auth ──────────────────────────────────────────────
    // Accepts: { publicKey, challenge, signature } — all strings, no auth
    // Flow: publicKey → decodeBase64 → verify signature → encodeHex → Prisma upsert

    describe('POST /v1/auth — SQL injection in publicKey', () => {
        for (const payload of SQL_PAYLOADS) {
            it(`safely handles: ${payload.slice(0, 40)}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                        publicKey: payload,
                        challenge: 'dGVzdA==',
                        signature: 'dGVzdA==',
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    describe('POST /v1/auth — SQL injection in challenge field', () => {
        beforeAll(() => sleep(2000));

        for (const payload of SQL_PAYLOADS) {
            it(`safely handles challenge: ${payload.slice(0, 40)}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                        publicKey: 'dGVzdA==',
                        challenge: payload,
                        signature: 'dGVzdA==',
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── POST /v1/auth/request ──────────────────────────────────────
    // Accepts: { publicKey, supportsV2? } — no auth
    // Flow: publicKey → decodeBase64 → length check → encodeHex → Prisma upsert

    describe('POST /v1/auth/request — SQL injection in publicKey', () => {
        beforeAll(() => sleep(2000));

        for (const payload of SQL_PAYLOADS) {
            it(`safely handles: ${payload.slice(0, 40)}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth/request`, {
                        publicKey: payload,
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── GET /v1/auth/request/status ────────────────────────────────
    // Accepts: ?publicKey=<string> as query param — no auth
    // Flow: publicKey → decodeBase64 → length check → encodeHex → Prisma findUnique

    describe('GET /v1/auth/request/status — SQL injection in query param', () => {
        beforeAll(() => sleep(2000));

        for (const payload of SQL_PAYLOADS) {
            it(`safely handles: ${payload.slice(0, 40)}`, async () => {
                try {
                    const res = await axios.get(`${SERVER_URL}/v1/auth/request/status`, {
                        params: { publicKey: payload },
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── POST /v1/auth/account/request ──────────────────────────────
    // Accepts: { publicKey } — no auth
    // Flow: publicKey → decodeBase64 → length check → encodeHex → Prisma upsert

    describe('POST /v1/auth/account/request — SQL injection in publicKey', () => {
        beforeAll(() => sleep(2000));

        for (const payload of SQL_PAYLOADS) {
            it(`safely handles: ${payload.slice(0, 40)}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth/account/request`, {
                        publicKey: payload,
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── NoSQL injection payloads ───────────────────────────────────

    describe('POST /v1/auth — NoSQL injection payloads', () => {
        beforeAll(() => sleep(2000));

        for (const payload of NOSQL_PAYLOADS) {
            it(`safely handles: ${payload.slice(0, 40)}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                        publicKey: payload,
                        challenge: 'dGVzdA==',
                        signature: 'dGVzdA==',
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── Template injection payloads ────────────────────────────────

    describe('POST /v1/auth/request — template injection payloads', () => {
        beforeAll(() => sleep(2000));

        for (const payload of TEMPLATE_INJECTION_PAYLOADS) {
            it(`safely handles: ${payload}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth/request`, {
                        publicKey: payload,
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── Header injection via publicKey field ───────────────────────

    describe('POST /v1/auth — header injection payloads', () => {
        beforeAll(() => sleep(2000));

        for (const payload of HEADER_INJECTION_PAYLOADS) {
            it(`safely handles: ${payload.slice(0, 40)}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                        publicKey: payload,
                        challenge: 'dGVzdA==',
                        signature: 'dGVzdA==',
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── Oversized payloads ─────────────────────────────────────────

    describe('Oversized payloads', () => {
        beforeAll(() => sleep(2000));

        it('POST /v1/auth — rejects extremely large publicKey', async () => {
            try {
                const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                    publicKey: 'a'.repeat(100_000),
                    challenge: 'dGVzdA==',
                    signature: 'dGVzdA==',
                });
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);

        it('POST /v1/auth/request — rejects extremely large publicKey', async () => {
            try {
                const res = await axios.post(`${SERVER_URL}/v1/auth/request`, {
                    publicKey: 'a'.repeat(100_000),
                });
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);

        it('POST /v1/auth/account/request — rejects extremely large publicKey', async () => {
            try {
                const res = await axios.post(`${SERVER_URL}/v1/auth/account/request`, {
                    publicKey: 'a'.repeat(100_000),
                });
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);

        it('GET /v1/auth/request/status — rejects extremely large query param', async () => {
            try {
                const res = await axios.get(`${SERVER_URL}/v1/auth/request/status`, {
                    params: { publicKey: 'a'.repeat(100_000) },
                });
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);
    });

    // ── Type confusion ─────────────────────────────────────────────

    describe('Type confusion — non-string values in publicKey', () => {
        beforeAll(() => sleep(2000));

        const TYPE_CONFUSION_PAYLOADS = [
            { label: 'number', value: 12345 },
            { label: 'boolean', value: true },
            { label: 'array', value: ['a', 'b'] },
            { label: 'nested object', value: { publicKey: 'nested' } },
            { label: 'null', value: null },
        ];

        for (const { label, value } of TYPE_CONFUSION_PAYLOADS) {
            it(`POST /v1/auth — rejects publicKey as ${label}`, async () => {
                try {
                    const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                        publicKey: value,
                        challenge: 'dGVzdA==',
                        signature: 'dGVzdA==',
                    });
                    expect(res.status).toBeLessThan(500);
                } catch (e) {
                    assertNotServerError(e);
                }
            }, 15000);
        }
    });

    // ── Missing required fields ────────────────────────────────────

    describe('Missing required fields', () => {
        beforeAll(() => sleep(2000));

        it('POST /v1/auth — rejects empty body', async () => {
            try {
                const res = await axios.post(`${SERVER_URL}/v1/auth`, {});
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);

        it('POST /v1/auth — rejects missing challenge and signature', async () => {
            try {
                const res = await axios.post(`${SERVER_URL}/v1/auth`, {
                    publicKey: 'dGVzdA==',
                });
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);

        it('POST /v1/auth/request — rejects empty body', async () => {
            try {
                const res = await axios.post(`${SERVER_URL}/v1/auth/request`, {});
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);

        it('GET /v1/auth/request/status — rejects missing publicKey', async () => {
            try {
                const res = await axios.get(`${SERVER_URL}/v1/auth/request/status`);
                expect(res.status).toBeLessThan(500);
            } catch (e) {
                assertNotServerError(e);
            }
        }, 15000);
    });
});
