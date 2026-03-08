---
status: accepted
date: 2026-03-08
author: Claude + Tom
---
# ADR-007: PWA Auth Session Persistence Limitation

## Status
Accepted

## Context
The web app (PWA) stores auth credentials in browser session/local storage. Browsers aggressively clear storage for PWAs — particularly Safari's 7-day ITP expiry and Chrome's periodic eviction of non-visited origins. Users lose their session on browser restart or after storage eviction.

This does not affect the native iOS app, which stores credentials in the device's secure keychain — a persistent, OS-protected store that survives app restarts, updates, and reboots.

The web platform already shows different onboarding UX: "Login with mobile app" is the primary CTA on web (vs. "Create account" on native), reflecting its secondary status.

## Decision
Accept this limitation. The native iOS app is the primary platform. Web is a secondary access point for quick access, demos, and desktop convenience.

A subtle note on the web welcome screen informs users that the iOS app provides persistent sessions, setting expectations before they create an account on the web.

## Consequences

### Positive
- No additional server infrastructure for web auth persistence
- Keeps the auth model simple — device-key-based, no server-side session management
- Aligns with the product strategy: native app is the first-class experience
- Transparent to users via the welcome screen note

### Negative
- Web users may need to re-authenticate periodically (after browser restarts or storage eviction)
- Could frustrate users who only use the web app, though this is acceptable for alpha
- Web-only users on shared machines lose sessions more frequently

### Future Options
If web persistence becomes critical:
1. **Service worker storage** — more durable than localStorage, but unreliable across browsers and still subject to eviction
2. **Cookie-based auth** — persistent across restarts, but adds server-side session management complexity and changes the auth model
3. **Native app deep links** — redirect web users to the native app for auth, keep web as view-only

## Alternatives Considered

### Cookie-based auth
Use HTTP-only cookies with server-side session management instead of client-side token storage. Rejected: adds significant server complexity (session table, cookie management, CSRF protection) for a secondary platform. Changes the auth model from stateless device-key to stateful server sessions.

### Service worker storage
Store credentials in a service worker's Cache API or IndexedDB via a service worker. Rejected: browser support is inconsistent, service workers can still be evicted, and the implementation is fragile across browser updates. Does not reliably solve the problem.

### Block web access entirely
Remove the web app and require the native iOS app for all access. Rejected: too restrictive. The web app is valuable for demos, quick desktop access, and users who haven't installed the native app yet. The friction of re-auth is lower than the friction of no web access at all.
