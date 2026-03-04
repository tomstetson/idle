import tweetnacl from 'tweetnacl';
import axios from 'axios';

export const SERVER_URL = process.env.IDLE_E2E_SERVER_URL || 'https://idle-api.northglass.io';

export interface TestAccount {
    publicKey: string;
    secretKey: Uint8Array;
    token: string;
}

/**
 * Create a test account by authenticating with the server's challenge-response flow.
 *
 * How it works:
 * 1. Generate an ed25519 signing keypair (tweetnacl.sign)
 * 2. Create a random 32-byte challenge
 * 3. Sign the challenge with the secret key
 * 4. POST { publicKey, challenge, signature } (all base64) to /v1/auth
 * 5. Server verifies the signature, upserts the account, returns a JWT token
 */
export async function createTestAccount(): Promise<TestAccount> {
    // Generate a random 32-byte seed, then derive an ed25519 signing keypair
    const seed = tweetnacl.randomBytes(32);
    const keypair = tweetnacl.sign.keyPair.fromSeed(seed);

    // Create a random 32-byte challenge and sign it
    const challenge = tweetnacl.randomBytes(32);
    const signature = tweetnacl.sign.detached(challenge, keypair.secretKey);

    // Encode everything as base64 for the wire format
    const publicKeyB64 = Buffer.from(keypair.publicKey).toString('base64');
    const challengeB64 = Buffer.from(challenge).toString('base64');
    const signatureB64 = Buffer.from(signature).toString('base64');

    const response = await axios.post(`${SERVER_URL}/v1/auth`, {
        publicKey: publicKeyB64,
        challenge: challengeB64,
        signature: signatureB64,
    });

    if (!response.data.success || !response.data.token) {
        throw new Error(`Auth failed: ${JSON.stringify(response.data)}`);
    }

    return {
        publicKey: publicKeyB64,
        secretKey: seed,
        token: response.data.token,
    };
}

/**
 * Clean up a test account's sessions and machines.
 *
 * Calls DELETE endpoints to remove server-side state created during tests.
 * Failures are logged but not thrown — cleanup is best-effort.
 */
export async function cleanupTestAccount(account: TestAccount): Promise<void> {
    const client = axios.create({
        baseURL: SERVER_URL,
        headers: { Authorization: `Bearer ${account.token}` },
    });

    try {
        await client.delete('/v1/sessions');
    } catch {
        // Best-effort cleanup — server may not support bulk delete
    }

    try {
        await client.delete('/v1/machines');
    } catch {
        // Best-effort cleanup
    }
}
