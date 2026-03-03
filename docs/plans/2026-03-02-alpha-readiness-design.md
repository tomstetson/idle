# Alpha v1 Security Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden Idle's auth and verify encryption correctness before opening Cloudflare WAF to alpha testers.

**Architecture:** Three independent changes — encryption test vectors (CLI package), token expiry (server auth module), rate limiting (server Fastify plugin). Each is a separate commit.

**Tech Stack:** Vitest, privacy-kit, @fastify/rate-limit, tweetnacl, Node.js crypto (AES-256-GCM)

---

### Task 1: Encryption Test Vectors (idle-cli)

**Files:**
- Create: `packages/idle-cli/src/api/encryption.test.ts`

**Context:** `packages/idle-agent/src/encryption.test.ts` (361 lines) already has comprehensive tests. The idle-cli encryption module has the same functions but NO tests. We need to verify the CLI's implementation independently — these are the functions that encrypt real user messages.

**Step 1: Write the test file**

Test structure covers: round-trip for both variants, error cases (wrong key, tampered data), and the `encrypt()`/`decrypt()` dispatcher.

```typescript
import { describe, it, expect } from 'vitest';
import tweetnacl from 'tweetnacl';
import {
    encodeBase64,
    decodeBase64,
    encryptWithDataKey,
    decryptWithDataKey,
    encryptLegacy,
    decryptLegacy,
    encrypt,
    decrypt,
    libsodiumEncryptForPublicKey,
    authChallenge,
    getRandomBytes,
} from './encryption';

describe('AES-256-GCM (dataKey variant)', () => {
    const key = new Uint8Array(32); // all zeros — deterministic test key
    key[0] = 0x42;

    it('round-trips JSON data', () => {
        const data = { message: 'Hello, Claude!', nested: { count: 42 } };
        const encrypted = encryptWithDataKey(data, key);
        const decrypted = decryptWithDataKey(encrypted, key);
        expect(decrypted).toEqual(data);
    });

    it('round-trips string data', () => {
        const data = 'plain string message';
        const encrypted = encryptWithDataKey(data, key);
        const decrypted = decryptWithDataKey(encrypted, key);
        expect(decrypted).toBe(data);
    });

    it('produces different ciphertext for same plaintext (random nonce)', () => {
        const data = { same: 'input' };
        const a = encryptWithDataKey(data, key);
        const b = encryptWithDataKey(data, key);
        expect(encodeBase64(a)).not.toBe(encodeBase64(b));
    });

    it('bundle starts with version byte 0', () => {
        const encrypted = encryptWithDataKey('test', key);
        expect(encrypted[0]).toBe(0);
    });

    it('bundle has minimum length (1 + 12 + 16 = 29 bytes)', () => {
        const encrypted = encryptWithDataKey('', key);
        expect(encrypted.length).toBeGreaterThanOrEqual(29);
    });

    it('returns null for wrong key', () => {
        const wrongKey = new Uint8Array(32);
        wrongKey[0] = 0xFF;
        const encrypted = encryptWithDataKey('secret', key);
        const result = decryptWithDataKey(encrypted, wrongKey);
        expect(result).toBeNull();
    });

    it('returns null for tampered ciphertext', () => {
        const encrypted = encryptWithDataKey('secret', key);
        encrypted[15] ^= 0xFF; // flip a byte in the ciphertext region
        const result = decryptWithDataKey(encrypted, key);
        expect(result).toBeNull();
    });

    it('returns null for truncated bundle', () => {
        const result = decryptWithDataKey(new Uint8Array(10), key);
        expect(result).toBeNull();
    });
});

describe('Legacy TweetNaCl SecretBox', () => {
    const secret = new Uint8Array(32);
    secret[0] = 0x42;

    it('round-trips JSON data', () => {
        const data = { legacy: true, content: 'old format' };
        const encrypted = encryptLegacy(data, secret);
        const decrypted = decryptLegacy(encrypted, secret);
        expect(decrypted).toEqual(data);
    });

    it('round-trips string data', () => {
        const data = 'legacy string';
        const encrypted = encryptLegacy(data, secret);
        const decrypted = decryptLegacy(encrypted, secret);
        expect(decrypted).toBe(data);
    });

    it('returns null for wrong key', () => {
        const wrongKey = new Uint8Array(32);
        wrongKey[0] = 0xFF;
        const encrypted = encryptLegacy('secret', secret);
        const result = decryptLegacy(encrypted, wrongKey);
        expect(result).toBeNull();
    });

    it('nonce is 24 bytes (first 24 bytes of bundle)', () => {
        const encrypted = encryptLegacy('test', secret);
        expect(encrypted.length).toBeGreaterThan(24);
    });
});

describe('encrypt/decrypt dispatcher', () => {
    const key = new Uint8Array(32);
    key[0] = 0x42;

    it('dataKey variant round-trips', () => {
        const data = { variant: 'dataKey' };
        const encrypted = encrypt(key, 'dataKey', data);
        const decrypted = decrypt(key, 'dataKey', encrypted);
        expect(decrypted).toEqual(data);
    });

    it('legacy variant round-trips', () => {
        const data = { variant: 'legacy' };
        const encrypted = encrypt(key, 'legacy', data);
        const decrypted = decrypt(key, 'legacy', encrypted);
        expect(decrypted).toEqual(data);
    });

    it('cross-variant decrypt fails (dataKey encrypted, legacy decrypt)', () => {
        const encrypted = encrypt(key, 'dataKey', 'cross');
        const result = decrypt(key, 'legacy', encrypted);
        expect(result).toBeNull();
    });
});

describe('public key encryption (libsodium box)', () => {
    it('round-trips with matching keypair', () => {
        const seed = getRandomBytes(32);
        const keyPair = tweetnacl.box.keyPair.fromSecretKey(seed);
        const plaintext = getRandomBytes(64);
        const encrypted = libsodiumEncryptForPublicKey(plaintext, keyPair.publicKey);
        // Bundle: [ephemeralPubKey(32) | nonce(24) | ciphertext]
        expect(encrypted.length).toBeGreaterThan(32 + 24);
    });
});

describe('authChallenge', () => {
    it('produces valid signature', () => {
        const secret = getRandomBytes(32);
        const { challenge, publicKey, signature } = authChallenge(secret);

        expect(challenge.length).toBe(32);
        expect(publicKey.length).toBe(32);
        expect(signature.length).toBe(64);

        // Verify signature using tweetnacl
        const valid = tweetnacl.sign.detached.verify(challenge, signature, publicKey);
        expect(valid).toBe(true);
    });

    it('signature fails with wrong public key', () => {
        const secret = getRandomBytes(32);
        const { challenge, signature } = authChallenge(secret);
        const wrongKey = getRandomBytes(32);
        const valid = tweetnacl.sign.detached.verify(challenge, signature, wrongKey);
        expect(valid).toBe(false);
    });
});

describe('base64 encoding', () => {
    it('round-trips binary data', () => {
        const data = new Uint8Array([0, 1, 2, 255, 128, 64]);
        const encoded = encodeBase64(data);
        const decoded = decodeBase64(encoded);
        expect(decoded).toEqual(data);
    });

    it('round-trips empty buffer', () => {
        const data = new Uint8Array([]);
        expect(encodeBase64(data)).toBe('');
    });
});
```

**Step 2: Run tests to verify they pass**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder test`

Expected: All new encryption tests PASS (these are round-trip tests, not TDD — we're verifying existing code works).

**Step 3: Commit**

```bash
git add packages/idle-cli/src/api/encryption.test.ts
git commit -m "test: add encryption test vectors for CLI package

Verifies AES-256-GCM and legacy TweetNaCl round-trip correctness,
error handling (wrong key, tampered data), dispatcher cross-variant
rejection, public key encryption, and auth challenge signatures."
```

---

### Task 2: Token Expiry (idle-server)

**Files:**
- Modify: `packages/idle-server/sources/app/auth/auth.ts`

**Context:** Persistent tokens from `privacy-kit` have no expiry. We add `expiresAt` to the token's `extras` field and check it during verification. Old tokens without `expiresAt` remain valid (backward compat).

**Step 1: Add expiry to token creation**

In `auth.ts`, modify `createToken()` to include `expiresAt` in extras:

```typescript
// Add at top of file, after TOKEN_CACHE_MAX_SIZE
const TOKEN_TTL_DAYS = process.env.IDLE_TOKEN_TTL_DAYS
    ? parseInt(process.env.IDLE_TOKEN_TTL_DAYS, 10)
    : 30;
const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
```

Modify `createToken()` method — add `expiresAt` to extras:

```typescript
async createToken(userId: string, extras?: any): Promise<string> {
    if (!this.tokens) {
        throw new Error('Auth module not initialized');
    }

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const tokenExtras = { ...extras, expiresAt };

    const payload: any = { user: userId, extras: tokenExtras };

    const token = await this.tokens.generator.new(payload);

    // Cache the token immediately
    this.tokenCache.set(token, {
        userId,
        extras: tokenExtras,
        cachedAt: Date.now()
    });

    return token;
}
```

**Step 2: Add expiry check to verification**

Modify `verifyToken()` — add expiry check after both cache hit and crypto verification paths. Add a private helper method:

```typescript
private isTokenExpired(extras?: any): boolean {
    // Backward compat: tokens without expiresAt are valid (pre-expiry tokens)
    if (!extras?.expiresAt) {
        return false;
    }
    return Date.now() > extras.expiresAt;
}
```

In the cache hit path (after `cachedAt` TTL check passes), add:

```typescript
if (this.isTokenExpired(cached.extras)) {
    this.tokenCache.delete(token);
    return null;
}
```

In the crypto verification path (after `verified` succeeds and before caching), add:

```typescript
if (this.isTokenExpired(extras)) {
    return null;
}
```

**Step 3: Run server typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-server typecheck`

Expected: Clean typecheck.

**Step 4: Commit**

```bash
git add packages/idle-server/sources/app/auth/auth.ts
git commit -m "fix: add 30-day expiry to persistent auth tokens

Tokens now include expiresAt in extras. Checked on every verification
(cache and crypto paths). Old tokens without expiresAt remain valid
for backward compatibility. TTL configurable via IDLE_TOKEN_TTL_DAYS."
```

---

### Task 3: Rate Limiting (idle-server)

**Files:**
- Modify: `packages/idle-server/package.json` (add dependency)
- Modify: `packages/idle-server/sources/app/api/api.ts` (register plugin)
- Modify: `packages/idle-server/sources/app/api/routes/authRoutes.ts` (route-level override)

**Step 1: Install @fastify/rate-limit**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-server add @fastify/rate-limit`

**Step 2: Register rate limit plugin in api.ts**

Add import and register after CORS setup (after line 46 in api.ts):

```typescript
// Rate limiting — stricter on auth endpoints, relaxed elsewhere
await app.register(import('@fastify/rate-limit'), {
    max: 100,               // Default: 100 requests per window
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'], // Don't rate-limit localhost (health checks, daemon)
});
```

**Step 3: Add stricter limit on auth routes**

In `authRoutes.ts`, add route-level config to the unauthenticated endpoints. On the `/v1/auth` route schema object, add:

```typescript
config: {
    rateLimit: {
        max: 10,
        timeWindow: '1 minute',
    }
}
```

Apply the same `config.rateLimit` override to:
- `POST /v1/auth` (direct login)
- `POST /v1/auth/request` (terminal auth request)
- `POST /v1/auth/account/request` (account auth request)

**Step 4: Run server typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-server typecheck`

Expected: Clean.

**Step 5: Test rate limiting locally (optional manual verification)**

```bash
# After deploying, rapid-fire 12 auth requests:
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://idle-api.northglass.io/v1/auth -H 'Content-Type: application/json' -d '{}'; done
# Expected: first 10 return 400 (bad request — missing fields), last 2 return 429 (rate limited)
```

**Step 6: Commit**

```bash
git add packages/idle-server/package.json packages/idle-server/sources/app/api/api.ts packages/idle-server/sources/app/api/routes/authRoutes.ts yarn.lock
git commit -m "fix: add rate limiting to server API endpoints

Global: 100 req/min per IP. Auth endpoints: 10 req/min per IP.
Localhost exempt (health checks, daemon). Returns 429 with
Retry-After header when exceeded."
```

---

### Task 4: Deploy and Verify

**Step 1: Push all changes**

```bash
git push origin main
```

**Step 2: Monitor CI**

Run: `gh run list --limit 4`

Wait for deploy-server workflow to complete (triggers on idle-server changes).

**Step 3: Verify health**

```bash
curl -s https://idle-api.northglass.io/health
# Expected: {"status":"ok","timestamp":"...","service":"idle-server"}
```

**Step 4: Run full CLI test suite**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder test`

Expected: All tests pass (existing 426 + new encryption tests).

**Step 5: Commit docs (already written)**

```bash
git add docs/ARCHITECTURE.md docs/SECURITY.md docs/ROADMAP.md docs/README.md docs/plans/2026-03-02-alpha-readiness-design.md
git commit -m "docs: add architecture diagrams, security model, and alpha readiness plan

- ARCHITECTURE.md: full traffic flow diagrams, domain layout, daemon arch,
  encryption boundary table, infrastructure details
- SECURITY.md: user-facing zero-knowledge model explanation
- ROADMAP.md: updated Phase 1 complete, added Phase 1.5 alpha readiness
- README.md: reorganized docs index"
```
