import { describe, it, expect } from 'vitest';
import tweetnacl from 'tweetnacl';
import {
    encodeBase64,
    decodeBase64,
    getRandomBytes,
    encryptWithDataKey,
    decryptWithDataKey,
    encryptLegacy,
    decryptLegacy,
    encrypt,
    decrypt,
    libsodiumEncryptForPublicKey,
    authChallenge,
} from './encryption';

describe('AES-256-GCM (dataKey variant)', () => {
    it('round-trip encrypt/decrypt', () => {
        const key = getRandomBytes(32);
        const data = { hello: 'world', nested: { arr: [1, 2, 3] } };
        const encrypted = encryptWithDataKey(data, key);
        const decrypted = decryptWithDataKey(encrypted, key);
        expect(decrypted).toEqual(data);
    });

    it('produces different ciphertext on each call (random nonce)', () => {
        const key = getRandomBytes(32);
        const data = 'same plaintext';
        const a = encryptWithDataKey(data, key);
        const b = encryptWithDataKey(data, key);
        // Bundles should differ because nonces are random
        expect(a).not.toEqual(b);
    });

    it('encrypted bundle starts with version byte 0', () => {
        const key = getRandomBytes(32);
        const encrypted = encryptWithDataKey('test', key);
        expect(encrypted[0]).toBe(0);
    });

    it('bundle has minimum length: 1 (version) + 12 (nonce) + 16 (auth tag) = 29', () => {
        const key = getRandomBytes(32);
        // Even an empty-ish JSON value like `null` produces some ciphertext
        const encrypted = encryptWithDataKey(null, key);
        // version(1) + nonce(12) + ciphertext(>=1) + authTag(16) >= 30
        expect(encrypted.length).toBeGreaterThanOrEqual(29);
    });

    it('decryption returns null with wrong key', () => {
        const key1 = getRandomBytes(32);
        const key2 = getRandomBytes(32);
        const encrypted = encryptWithDataKey('secret', key1);
        expect(decryptWithDataKey(encrypted, key2)).toBeNull();
    });

    it('decryption returns null for tampered data', () => {
        const key = getRandomBytes(32);
        const encrypted = encryptWithDataKey('test', key);
        // Flip a byte in the ciphertext region (after version + nonce)
        encrypted[20] ^= 0xff;
        expect(decryptWithDataKey(encrypted, key)).toBeNull();
    });

    it('decryption returns null for truncated bundle', () => {
        const key = getRandomBytes(32);
        // Too short to contain version + nonce + auth tag
        expect(decryptWithDataKey(new Uint8Array(10), key)).toBeNull();
        // Exactly at boundary: version(1) + nonce(12) + authTag(16) - 1
        expect(decryptWithDataKey(new Uint8Array(28), key)).toBeNull();
    });

    it('decryption returns null for wrong version byte', () => {
        const key = getRandomBytes(32);
        const encrypted = encryptWithDataKey('test', key);
        encrypted[0] = 1; // unsupported version
        expect(decryptWithDataKey(encrypted, key)).toBeNull();
    });

    it('decryption returns null for empty bundle', () => {
        const key = getRandomBytes(32);
        expect(decryptWithDataKey(new Uint8Array(0), key)).toBeNull();
    });
});

describe('legacy TweetNaCl SecretBox', () => {
    it('round-trip with JSON object', () => {
        const secret = getRandomBytes(32);
        const data = { message: 'hello', items: [1, 2, 3] };
        const encrypted = encryptLegacy(data, secret);
        const decrypted = decryptLegacy(encrypted, secret);
        expect(decrypted).toEqual(data);
    });

    it('round-trip with string', () => {
        const secret = getRandomBytes(32);
        const data = 'hello world';
        const encrypted = encryptLegacy(data, secret);
        const decrypted = decryptLegacy(encrypted, secret);
        expect(decrypted).toBe('hello world');
    });

    it('decryption returns null with wrong key', () => {
        const secret1 = getRandomBytes(32);
        const secret2 = getRandomBytes(32);
        const encrypted = encryptLegacy('test', secret1);
        expect(decryptLegacy(encrypted, secret2)).toBeNull();
    });

    it('bundle is longer than 24 bytes (nonce prefix)', () => {
        const secret = getRandomBytes(32);
        const encrypted = encryptLegacy('x', secret);
        // 24-byte nonce + at least some ciphertext
        expect(encrypted.length).toBeGreaterThan(24);
    });
});

describe('encrypt/decrypt dispatcher', () => {
    it('dataKey variant round-trip', () => {
        const key = getRandomBytes(32);
        const data = { test: true };
        const encrypted = encrypt(key, 'dataKey', data);
        // Should have AES-GCM version byte
        expect(encrypted[0]).toBe(0);
        expect(decrypt(key, 'dataKey', encrypted)).toEqual(data);
    });

    it('legacy variant round-trip', () => {
        const key = getRandomBytes(32);
        const data = { test: true };
        const encrypted = encrypt(key, 'legacy', data);
        expect(decrypt(key, 'legacy', encrypted)).toEqual(data);
    });

    it('cross-variant decrypt fails', () => {
        const key = getRandomBytes(32);
        // Encrypt with dataKey, try to decrypt with legacy
        const encryptedDataKey = encrypt(key, 'dataKey', 'test');
        expect(decrypt(key, 'legacy', encryptedDataKey)).toBeNull();
    });
});

describe('libsodiumEncryptForPublicKey (box encryption)', () => {
    it('round-trip with matching keypair', () => {
        const recipientKeyPair = tweetnacl.box.keyPair();
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const encrypted = libsodiumEncryptForPublicKey(data, recipientKeyPair.publicKey);

        // Manually decrypt: extract ephemeral pubkey (32), nonce (24), ciphertext
        const ephemeralPubKey = encrypted.slice(0, 32);
        const nonce = encrypted.slice(32, 56);
        const ciphertext = encrypted.slice(56);
        const decrypted = tweetnacl.box.open(ciphertext, nonce, ephemeralPubKey, recipientKeyPair.secretKey);

        expect(decrypted).toEqual(data);
    });

    it('bundle has expected structure (32 pubkey + 24 nonce + ciphertext)', () => {
        const recipientKeyPair = tweetnacl.box.keyPair();
        const data = new Uint8Array([1, 2, 3]);
        const encrypted = libsodiumEncryptForPublicKey(data, recipientKeyPair.publicKey);
        // 32 (ephemeral pubkey) + 24 (nonce) + ciphertext (data.length + 16 MAC)
        expect(encrypted.length).toBe(32 + 24 + data.length + tweetnacl.box.overheadLength);
    });

    it('decryption fails with wrong secret key', () => {
        const recipientKeyPair = tweetnacl.box.keyPair();
        const wrongKeyPair = tweetnacl.box.keyPair();
        const data = new Uint8Array([1, 2, 3]);
        const encrypted = libsodiumEncryptForPublicKey(data, recipientKeyPair.publicKey);

        const ephemeralPubKey = encrypted.slice(0, 32);
        const nonce = encrypted.slice(32, 56);
        const ciphertext = encrypted.slice(56);
        const decrypted = tweetnacl.box.open(ciphertext, nonce, ephemeralPubKey, wrongKeyPair.secretKey);

        expect(decrypted).toBeNull();
    });
});

describe('authChallenge', () => {
    it('signature is verifiable with tweetnacl', () => {
        const secret = getRandomBytes(32);
        const result = authChallenge(secret);

        expect(result.challenge.length).toBe(32);
        expect(result.publicKey.length).toBe(32);
        expect(result.signature.length).toBe(64);

        const valid = tweetnacl.sign.detached.verify(
            result.challenge,
            result.signature,
            result.publicKey,
        );
        expect(valid).toBe(true);
    });

    it('verification fails with wrong public key', () => {
        const secret1 = getRandomBytes(32);
        const secret2 = getRandomBytes(32);
        const result1 = authChallenge(secret1);
        const result2 = authChallenge(secret2);

        const valid = tweetnacl.sign.detached.verify(
            result1.challenge,
            result1.signature,
            result2.publicKey,
        );
        expect(valid).toBe(false);
    });

    it('same secret produces same publicKey but different challenges', () => {
        const secret = getRandomBytes(32);
        const r1 = authChallenge(secret);
        const r2 = authChallenge(secret);
        expect(r1.publicKey).toEqual(r2.publicKey);
        // Challenges are random, so they should differ
        expect(r1.challenge).not.toEqual(r2.challenge);
    });
});

describe('base64 encoding', () => {
    it('round-trip with binary data', () => {
        const data = new Uint8Array([0, 1, 2, 127, 128, 255]);
        const encoded = encodeBase64(data);
        const decoded = decodeBase64(encoded);
        expect(decoded).toEqual(data);
    });

    it('round-trip with empty buffer', () => {
        const data = new Uint8Array([]);
        const encoded = encodeBase64(data);
        expect(encoded).toBe('');
        expect(decodeBase64('')).toEqual(data);
    });

    it('base64url round-trip', () => {
        // Use bytes that produce + and / in standard base64
        const data = new Uint8Array([251, 239, 190]);
        const encoded = encodeBase64(data, 'base64url');
        expect(encoded).not.toMatch(/[+/=]/);
        const decoded = decodeBase64(encoded, 'base64url');
        expect(decoded).toEqual(data);
    });
});
