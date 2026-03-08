# Alpha Security Audit

**Date:** 2026-03-08
**Auditor:** Claude Code (automated codebase analysis)
**Scope:** Idle monorepo — server, CLI, app (web + native)
**Status:** Complete (code review). Infrastructure review (A7) pending VPS SSH access.

## Executive Summary

**Overall Risk Rating: Medium**

The core security architecture is strong — E2E encryption is genuine (server cannot read session content), auth uses proper Ed25519 signatures, and sensitive API tokens are encrypted server-side. However, several issues need attention before going public:

- **2 High findings** in logging (auth token leakage, unsafe debug logging)
- **2 High findings** in protocol/architecture (no challenge replay protection, no WebSocket rate limiting)
- **15 Medium findings** across web XSS vectors, plaintext metadata, and operational concerns
- **0 Critical findings** — no immediate exploitable vulnerabilities that would block public access

**Recommendation:** Go public after fixing High-severity logging issues (A10-1, A10-4) and adding web XSS mitigations (A5-1, A5-2). The remaining Medium items should be addressed during alpha but don't block the public access decision.

| Severity | Count | Action |
|----------|-------|--------|
| Critical | 0 | — |
| High | 4 | Fix before public access |
| Medium | 15 | Fix during alpha |
| Low | 8 | Track in backlog |
| Info | 10+ | Documented, no action needed |

---

## A1: API Attack Surface

### Route Inventory

| Route | Method | Auth | Rate Limit |
|-------|--------|------|------------|
| `/` | GET | No | Global 100/min |
| `/health` | GET | No | Global |
| `/files/*` | GET | No | Global |
| `/v1/auth` | POST | No | 10/min |
| `/v1/auth/request` | POST | No | 10/min |
| `/v1/auth/request/status` | GET | No | Global |
| `/v1/auth/response` | POST | Yes | Global |
| `/v1/auth/account/request` | POST | No | 10/min |
| `/v1/auth/account/response` | POST | Yes | Global |
| `/v1/version` | POST | No | Global |
| `/v1/sessions` | GET/POST | Yes | Global |
| `/v1/sessions/:id/messages` | GET | Yes | Global |
| `/v1/sessions/:id` | DELETE | Yes | Global |
| `/v2/sessions/active` | GET | Yes | Global |
| `/v2/sessions` | GET | Yes | Global |
| `/v3/sessions/:id/messages` | GET/POST | Yes | Global |
| `/v1/account/profile` | GET | Yes | Global |
| `/v1/account/settings` | GET/POST | Yes | Global |
| `/v1/usage/query` | POST | Yes | Global |
| `/v1/machines` | GET/POST | Yes | Global |
| `/v1/machines/:id` | GET | Yes | Global |
| `/v1/push-tokens` | GET/POST | Yes | Global |
| `/v1/push-tokens/:token` | DELETE | Yes | Global |
| `/v1/feed` | GET | Yes | Global |
| `/v1/access-keys/:sid/:mid` | GET/POST/PUT | Yes | Global |
| `/v1/access-keys/:sid/handoff` | POST | Yes | Global |
| `/v1/artifacts` | GET/POST | Yes | Global |
| `/v1/artifacts/:id` | GET/POST/DELETE | Yes | Global |
| `/v1/kv/:key` | GET | Yes | Global |
| `/v1/kv` | GET/POST | Yes | Global |
| `/v1/kv/bulk` | POST | Yes | Global |
| `/v1/connect/github/params` | GET | Yes | Global |
| `/v1/connect/github/callback` | GET | No (state token) | Global |
| `/v1/connect/github/webhook` | POST | No (HMAC) | Global |
| `/v1/connect/github` | DELETE | Yes | Global |
| `/v1/connect/:vendor/register` | POST | Yes | Global |
| `/v1/connect/:vendor/token` | GET | Yes | Global |
| `/v1/connect/:vendor` | DELETE | Yes | Global |
| `/v1/connect/tokens` | GET | Yes | Global |
| `/v1/user/:id` | GET | Yes | Global |
| `/v1/user/search` | GET | Yes | Global |
| `/v1/friends/*` | GET/POST | Yes | Global |
| `/v1/voice/token` | POST | Yes | Global |

WebSocket namespace: `/v1/updates` — requires auth token at connection. All events authorized by userId extracted at connection time.

### Findings

**[A1-1] [Medium] `/v1/auth/request/status` unauthenticated, no per-route rate limit.** Can be polled to enumerate pending auth requests by public key.

**[A1-2] [Low] `/files/*` serves files without auth.** Only active when `isLocalStorage()` is true. Has path traversal protection but any file in the storage directory is accessible.

**[A1-3] [Info] Dev logging endpoint unauthenticated.** Only registers when `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` env var is set. Acceptable for dev, but see A10-4.

---

## A2: Auth Boundary

**Token system:** `privacy-kit` library creates Ed25519-signed persistent tokens seeded from `IDLE_MASTER_SECRET`. In-memory LRU cache (10,000 entries, 1-hour TTL). Tokens embed `expiresAt` (30-day TTL).

**Challenge-response:** CLI generates random challenge, signs with private key, server verifies with `tweetnacl.sign.detached.verify()`.

### Findings

**[A2-1] [High] Auth challenge-response has no replay protection.** Challenge is entirely client-generated. Server doesn't check uniqueness, freshness, or timestamps. Captured `{publicKey, challenge, signature}` can be replayed to get fresh tokens. Mitigated by TLS in production but protocol-level weakness.

**[A2-2] [Medium] Old tokens without `expiresAt` never expire.** Backward compatibility code: `if (!extras?.expiresAt) return false`. Tokens minted before the expiry feature are immortal.

**[A2-3] [Medium] Terminal auth requests never expire in DB.** Once approved, the `response` and `responseAccountId` persist indefinitely. Re-polling gets a new token without re-approval.

**[A2-4] [Info] Malformed/truncated tokens correctly rejected.** `privacy-kit` throws on invalid input, caught and returned as 401.

**[A2-5] [Info] No auth bypasses found on authenticated endpoints.** All endpoints with user data access have proper `preHandler: app.authenticate`.

---

## A3: Credential Exposure

### What's Stored and How

| Data Type | Encryption | Risk if DB Leaked |
|-----------|-----------|-------------------|
| Session messages | E2E (AES-256-GCM, client-side) | Safe |
| Session metadata | E2E (client-side) | Safe |
| Agent state | E2E (client-side) | Safe |
| Account settings | E2E (client-side) | Safe |
| Machine metadata | E2E (client-side) | Safe |
| Artifacts | E2E (client-side) | Safe |
| KV store values | E2E (client-side, Bytes) | Safe |
| Access keys | E2E (client-side) | Safe |
| GitHub OAuth tokens | Server-side encrypted (KeyTree) | Needs IDLE_MASTER_SECRET |
| Vendor API tokens | Server-side encrypted (KeyTree) | Needs IDLE_MASTER_SECRET |
| Auth tokens | Never stored (memory cache only) | N/A |
| **Account firstName/lastName** | **Plaintext** | **Exposed** |
| **GitHub profile JSON** | **Plaintext** | **Exposed (email, bio, company)** |
| **Push notification tokens** | **Plaintext** | **Exposed** |
| **Usage/cost data** | **Plaintext JSON** | **Exposed** |

### Findings

**[A3-1] [High] `IDLE_MASTER_SECRET` is single point of failure.** Derives both the encryption key tree (vendor tokens) AND auth token signing keys. Loss = all server-encrypted credentials compromised + ability to forge any user's auth token.

**[A3-2] [Medium] PII stored in plaintext.** `Account.firstName`, `lastName`, `username` in cleartext. Design choice for social features but means DB access exposes user identity.

**[A3-3] [Medium] GitHub profile stored in plaintext.** Full JSON including email, location, company, bio.

**[A3-4] [Medium] Push tokens stored in plaintext.** Expo push tokens in cleartext. Attacker with DB read could send unsolicited notifications.

**[A3-5] [Medium] Usage/cost data unencrypted.** Token counts and dollar costs visible.

---

## A4: E2E Encryption

**Verdict: Strong.** Server genuinely cannot read session content.

- **Key generation:** 32-byte CSPRNG on both CLI (`crypto.randomBytes`) and app (`expo-crypto`).
- **Key sharing:** DEK encrypted with user's public key via NaCl authenticated box. Server stores opaque blob.
- **Algorithms:** AES-256-GCM for bulk data, TweetNaCl SecretBox for legacy, TweetNaCl Box for key exchange.
- **Nonce management:** Random nonces. Safe given per-session key isolation.
- **No server-side decryption of session content found.**

### Findings

**[A4-1] [Medium] SECURITY.md inaccurate about vendor API keys.** Doc claims vendor keys are client-encrypted ("readable only by your devices"). Actually server-encrypted with `IDLE_MASTER_SECRET`. Server operator CAN read these.

**[A4-2] [Low] Known AES encoding bug.** Comment in `encryptor.ts`: "there is a bug in the AES implementation and it works only with normal strings." Doesn't weaken crypto but affects reliability.

---

## A5: Web App Security Vectors

### Findings

**[A5-1] [Medium] XSS via Mermaid SVG rendering.** `MermaidRenderer.tsx` uses unsafe HTML rendering with unsanitized `mermaid.render()` output. SVG can contain script elements. Content comes from Claude responses (not arbitrary users), but a real vector if shared sessions are added. **Fix: Sanitize SVG output with DOMPurify.**

**[A5-2] [Medium] No `javascript:` protocol filtering on markdown links.** `parseMarkdownSpans.ts` passes URLs verbatim to `<Link>`. A markdown link like `[click](javascript:alert(1))` would execute on web. **Fix: Allowlist `https:`, `http:`, `mailto:` protocols.**

**[A5-3] [Medium] No Content-Security-Policy headers.** No CSP on the web app. If XSS is achieved, no defense-in-depth. **Fix: Add restrictive CSP.**

**[A5-4] [Medium] Master secret in localStorage on web.** Auth token AND the secret that derives all encryption keys sit in unencrypted `localStorage`. XSS = full account compromise. Native (iOS/Android) correctly uses Keychain/Keystore via expo-secure-store.

**[A5-5] [Info] CSRF-safe.** Bearer token auth in headers (not cookies).

**[A5-6] [Low] No open redirects.** All URLs hardcoded or from trusted sources.

---

## A6: Rate Limiting

### Current State

- **Auth endpoints:** 10 req/min (POST /v1/auth, /v1/auth/request, /v1/auth/account/request)
- **Global:** 100 req/min (all other endpoints)
- **WebSocket:** None
- **Localhost exempt:** `127.0.0.1` bypasses all rate limiting

### Findings

**[A6-1] [High] WebSocket connections have no rate limiting.** No connection rate limit, no per-event throttling. A single stolen token could open unlimited connections and flood events, exhausting server memory. **Fix: Add connection limits per user and per-event throttling.**

**[A6-2] [Medium] `127.0.0.1` exempt from all rate limiting.** If proxy doesn't properly set `X-Forwarded-For`, or attacker gains host access, unlimited requests.

**[A6-3] [Medium] Global 100/min may be too generous for data endpoints.** Endpoints like `GET /v1/sessions` (150 sessions), `GET /v1/artifacts`, `GET /v1/connect/tokens` allow rapid data exfiltration with a stolen token.

---

## A7: Infrastructure Review

**Status: Pending.** Requires SSH into IONOS VPS to verify:
- Open ports (expect only 22, 80, 443)
- SSH key-based auth
- PGlite directory permissions
- Nginx security headers
- Cloudflare bypass via direct IP

---

## A8: Data at Rest

**[A8-1] [Medium] PGlite data directory unencrypted on filesystem.** Anyone with shell access to the VPS has full DB read access. All application-level access controls bypassed.

**[A8-2] [Low] KV store keys in plaintext.** Explicitly unencrypted for indexing. Key names alone are low-sensitivity.

**[A8-3] [Low] Feed items in plaintext.** Friend request/accepted events with user IDs.

See A3 for complete field-level classification.

---

## A9: Dependency and Supply Chain

### Critical Package Versions (All Current)

| Package | Version | Status |
|---------|---------|--------|
| tweetnacl | 1.0.3 | Latest, no CVEs |
| fastify | 5.7.2 | Current |
| socket.io | 4.8.3 | Current |
| @prisma/client | 6.19.2 | Current |
| axios | 1.13.4/1.13.6 | Current |
| expo | 54.0.32 | Current SDK |

### Findings

**[A9-1] [Medium] `.env.dev` files tracked by git.** Contains dev placeholders but normalizes risky pattern. `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=true` is set in committed files.

**[A9-2] [Medium] `privacy-kit@0.0.25` is pre-1.0.** Load-bearing for auth crypto (token generation, verification, key tree). Pre-1.0 packages may have unstable APIs and less security review.

**[A9-3] [Low] Bundled pre-compiled binaries.** `difft` and `rg` in `tools/archives/` — no checksum verification on extraction.

**[A9-4] [Low] `http-proxy@1.18.1` is from 2020.** Used for CLI-local proxy. Limited attack surface but unmaintained.

**[A9-5] [Info] All yarn.lock URLs point to official registries.** Clean supply chain.

**[A9-6] [Info] No malicious postinstall scripts.** All four are benign (wire build, prisma generate, tool extraction, patch-package).

---

## A10: Logging

### Findings

**[A10-1] [High] Auth token prefix logged on every request.** `enableAuthentication.ts` logs first 50 chars of Authorization header. Format is `Bearer ` (7 chars) + 43 chars of token. Enough to reconstruct tokens from logs. **Fix: Log only `has header: true/false`.**

**[A10-2] [High] DANGEROUSLY_LOG sends decrypted data to unauthenticated endpoint.** When enabled: CLI sends all debug logs including decrypted content over HTTP. Endpoint accepts without auth. Enabled by default in committed `.env.dev` files. **Fix: Remove from committed env files, add auth to endpoint, add startup warning.**

**[A10-3] [Medium] Public keys logged in full.** Auth routes log complete public keys. Creates unnecessary correlation data.

**[A10-4] [Medium] GitHub OAuth state token logged on failure.** Enables replay within 5-minute TTL window if logs compromised.

**[A10-5] [Medium] Decrypted message content logged to CLI files.** `apiSession.ts` logs decrypted message bodies via `debugLargeJson`. Written to `~/.idle-dev/logs/`. Truncated but substantial content can leak.

**[A10-6] [Medium] Investigation tool content fully logged.** On failure, full content (code, files, user data) logged without truncation.

**[A10-7] [Low] No Pino request serializer redaction configured.** Fastify uses default Pino logger without custom redact paths.

---

## Prioritized Remediation

### Must Fix Before Public Access

| ID | Finding | Effort |
|----|---------|--------|
| A10-1 | Stop logging auth token prefix | 5 min |
| A10-2 | Remove DANGEROUSLY_LOG from committed env files | 5 min |
| A5-1 | Sanitize Mermaid SVG with DOMPurify | 30 min |
| A5-2 | Filter javascript: protocol from markdown links | 15 min |

### Fix During Alpha

| ID | Finding | Effort |
|----|---------|--------|
| A6-1 | Add WebSocket connection rate limiting | 1-2 hrs |
| A5-3 | Add Content-Security-Policy headers | 30 min |
| A4-1 | Correct SECURITY.md about vendor API keys | 15 min |
| A10-3 | Truncate public keys in logs | 15 min |
| A10-5 | Reduce debug logging of decrypted content | 30 min |
| A2-2 | Expire legacy tokens without expiresAt | 30 min |
| A2-3 | Add TTL to terminal auth requests | 30 min |

### Track in Backlog

| ID | Finding | Notes |
|----|---------|-------|
| A2-1 | Challenge replay protection | Mitigated by TLS, complex protocol change |
| A3-1 | IDLE_MASTER_SECRET SPOF | Architecture issue, needs key rotation design |
| A5-4 | localStorage secrets on web | Web is secondary platform |
| A8-1 | PGlite unencrypted on disk | Standard for embedded DBs |
| A9-2 | privacy-kit pre-1.0 | Monitor, pin version |

---

## Accepted Risks & Decisions

**[D1] Cloudflare Bot Fight Mode remains OFF.** The API has its own auth boundary — all data endpoints require bearer tokens with Ed25519-signed challenge-response authentication. Bot Fight Mode is designed for web scraping prevention (CAPTCHAs, JS challenges), not API protection. Enabling it would interfere with legitimate CLI and mobile API traffic without meaningful security benefit. The marginal value for an API-only endpoint behind token auth does not justify the risk of blocking real clients.

**[D3] PostHog analytics present but inactive in current deployment.** The mobile app (`idle-app`) includes a full PostHog integration via `posthog-react-native` with ~20 event types (auth, messaging, paywall, voice, friends). However, analytics only activate when `EXPO_PUBLIC_POSTHOG_API_KEY` is set — this key is commented out in `.env.example` and not configured in production. The tracking module (`packages/idle-app/sources/track/`) uses null-safe optional chaining (`tracking?.capture()`), so all calls are no-ops when the key is absent. Users also have an `analyticsOptOut` setting that controls PostHog's opt-in/opt-out state. No analytics data is currently being collected. The CLI and server packages contain no analytics/tracking code.
