---
status: accepted
date: 2026-03-08
author: Claude + Tom
---
# ADR-006: Public Access Without Cloudflare Zero Trust

## Status
Accepted

## Context
Idle's web app at `idle.northglass.io` and API at `idle-api.northglass.io` were being considered for Cloudflare Zero Trust gating (free tier, up to 50 users) to restrict access during alpha. The question: is Idle safe to expose publicly, or does it need an auth gateway?

A comprehensive security audit (docs/security/alpha-security-audit.md) was conducted covering 10 areas: API attack surface, auth boundary, credential exposure, E2E encryption, web app vectors, rate limiting, infrastructure, data at rest, dependencies, and logging.

Key findings:
- **0 Critical** vulnerabilities — no immediate exploitable issues blocking public access
- **4 High** findings — auth token logging, unsafe debug endpoint, no WebSocket rate limiting, no challenge replay protection
- **15 Medium** findings — XSS vectors (Mermaid SVG, javascript: links), plaintext PII, no CSP headers, localStorage secrets on web
- **E2E encryption is genuine** — server cannot read session content, keys, or agent state
- **Auth is cryptographic** — Ed25519 device-key challenge-response, no passwords or emails to leak

The API is already protected by cryptographic auth (no valid device key = no access). The web app is the primary attack surface, but it's a secondary platform (native mobile app is primary).

## Decision
Go public without Cloudflare Zero Trust. Fix 4 High-severity items and 2 XSS mitigations before opening access:

**Must fix before public:**
1. **A10-1**: Stop logging auth token prefix in `enableAuthentication.ts` (5 min)
2. **A10-2**: Remove `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=true` from committed `.env.dev` files (5 min)
3. **A5-1**: Sanitize Mermaid SVG output with DOMPurify in `MermaidRenderer.tsx` (30 min)
4. **A5-2**: Filter `javascript:` protocol from markdown links in `parseMarkdownSpans.ts` (15 min)

**Fix during alpha (non-blocking):**
- WebSocket connection rate limiting (A6-1)
- Content-Security-Policy headers (A5-3)
- Legacy token expiry (A2-2)
- Auth request TTL (A2-3)
- Correct SECURITY.md about vendor key encryption (A4-1)
- Reduce debug logging of decrypted content (A10-5)

## Consequences

### Positive
- Simpler architecture — no Cloudflare Zero Trust dependency, one less infrastructure component to manage
- Lower friction for alpha testers — no Cloudflare auth prompt before the app's own device-key auth
- No 50-user limit from Cloudflare free tier
- Forces proper security posture rather than relying on perimeter gating

### Negative
- Public API surface means any vulnerability is immediately exploitable (vs. gated behind CF auth)
- Must fix the 4 High items before opening — adds ~1 hour of remediation work to the alpha timeline
- No defense-in-depth for the web app until CSP headers are added (Medium priority)
- Monitoring and alerting become more important with public exposure

## Alternatives Considered

### Cloudflare Zero Trust (free tier)
Gate both web app and API behind Cloudflare Access. Rejected: the API already has cryptographic auth that's stronger than Cloudflare's email-based access. Double-gating adds complexity and friction without meaningful security gain. The 50-user limit also constrains alpha growth unnecessarily.

### Gate web only, leave API public
Put Cloudflare Access on `idle.northglass.io` but leave `idle-api.northglass.io` open. Rejected: the API is the more security-critical surface and it's already properly authenticated. Gating only the web app protects the less-critical surface while adding user friction.

### Delay public access until all findings are fixed
Wait for all 27 findings (High + Medium + Low) to be resolved. Rejected: Medium and Low findings don't represent exploitable vulnerabilities that would block public access. The 4 High items are fixable in ~1 hour. Waiting for full remediation delays alpha unnecessarily.
