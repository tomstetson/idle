# Idle Roadmap

## Phase 1: Ship It (Complete)
- [x] Fork and rebrand codebase
- [x] Bootstrap project docs (CLAUDE.md, AGENTS.md, ADR)
- [x] Write server deployment runbook
- [x] Deploy server to IONOS VPS (standalone mode, systemd + nginx)
- [x] Configure DNS (idle-api.northglass.io via Cloudflare)
- [x] SSL — Cloudflare Origin Certificate + Full SSL mode
- [x] Cloudflare WAF — IP-locked to home (to be removed for alpha)
- [x] Homelab docs + ADR-013 + MCP vault credentials
- [x] Complete rebrand — auth URL scheme, server auth service, package authors, deploy manifests
- [x] PWA support — manifest.json, icons, iOS meta tags, build script
- [x] Deploy web app to idle.northglass.io (static export + nginx + Cloudflare SSL)
- [x] Verify web app works E2E — account creation, WebSocket connected, session UI
- [x] CLI builds and connects to production server
- [x] Publish @northglass/idle-wire to npm (v0.1.0, public)
- [x] CI/CD pipelines — deploy-server.yml + deploy-webapp.yml (GitHub Actions)
- [x] Security hardening — daemon auth, sessionStorage, symlink checks, OAuth WebView whitelist, fs.writeFile race fix
- [x] Web iOS-style theming
- [x] Fix pre-existing CI failures (Expo typecheck, runAcp test)

## Phase 1.5: Alpha Readiness (Complete)
- [x] Verify E2E encryption against reference test vectors
- [x] Add token expiry to persistent auth tokens
- [x] Add rate limiting on auth endpoints
- [x] Document architecture and security model (ARCHITECTURE.md, SECURITY.md)
- [x] Verify Cloudflare WAF configuration and document it
- [x] Update stale documentation (ROADMAP, AGENTS.md)
- [x] Test web app E2E from mobile device
- [ ] Replace logo/icon assets with custom Idle designs (placeholder currently)

## Phase 2: Alpha 1.0 (Complete)
- [x] Dev environment — root scripts, .env.example files, quick-deploy
- [x] CI — test-all.yml for all 5 packages
- [x] Regression tests for PGlite Bytes bug and web app fixes
- [x] E2E test suite (Playwright + CLI) — auth, sessions, machines, terminal connect
- [x] ADRs 002-005 (PGlite, deployment, encryption, dev/test strategy)
- [x] CONTRIBUTING.md for future sessions

## Phase 3: v1.5 Comprehensive Build

### Milestone 1: TestFlight Pipeline (Complete)
- [x] Apple Developer certs + provisioning profiles
- [x] EAS Build configuration (development + preview profiles)
- [x] GitHub Actions TestFlight CI (push to main → TestFlight)
- [x] First successful TestFlight build

### Milestone 2: CLI Stability (Complete)
- [x] Graceful shutdown — SIGINT/SIGTERM handling, socket cleanup
- [x] Reconnection logic — exponential backoff, session state recovery
- [x] CLI error boundaries — catch-all for unhandled promise rejections
- [x] Publish idle-coder pre-release to npm (idle-coder@0.14.0-0, beta tag)
- [x] Publish idle-coder stable to npm (idle-coder@0.14.0, latest tag)

### Milestone 3: Permission Handling + Session Resume (Complete)
- [x] Permission request UI — modal flow with approve/deny/always-allow
- [x] Permission auto-rules — saved preferences per tool
- [x] Session resume — reconnect to in-progress sessions from app
- [ ] Validate permissions E2E on TestFlight device (needs device)

### Milestone 4: Feature Build (Mostly Complete)
- [x] M4.1: Thinking block display — collapsible thinking sections with settings toggle
- [x] M4.2: Message timestamps — formatted time on user and agent messages
- [x] M4.3: Slash command descriptions — dynamic descriptions from SDK + expanded static fallbacks
- [x] M4.4: Session grouping by machine — collapsible machine headers with OS icons
- [x] M4.6: Push notification registration — already implemented, verified
- [x] M4.7: Push notification server delivery — Expo Push Service integration, stale token cleanup
- [x] M4.8: Auto-title fallback — 30s timer generates title from dirname + first message if Claude doesn't set one
- [x] M5.1: FlatList inverted scroll fix — Platform.OS check for web
- [x] M5.2: Session rename — modal prompt from session info screen, encrypted metadata update
- [ ] M4.5: Message editing — DEFERRED (Claude Code SDK has no editing API)
- [ ] M4.9: Image/file upload — DEFERRED to post-v1.5 (multi-package feature: app picker + wire types + server relay + CLI handling)
- [x] M4.10: Cross-machine encryption audit — confirmed user-key encryption supports handoff natively
- [x] M4.11: Cross-machine handoff endpoint — POST /v1/access-keys/:sessionId/handoff

### Milestone 5: Polish & Open Up (Complete)
- [x] M5.1: Web scroll fix (completed under M4)
- [x] M5.2: Session rename (completed under M4)
- [x] M5.3: Public access — ADR-006 accepted, security audit passed, IP restriction removal pending (CF dashboard)
- [x] M5.4: Update documentation (this update)
- [x] M5.5: Final TestFlight build (v1.7.0 — comprehensive sprint)

### Milestone 6: Comprehensive Sprint (Complete)
- [x] M6.1: Fix remote session input corruption — TTY buffer drain on mode handoff
- [x] M6.2: Fix session sync for resumed sessions — local tag cache mapping
- [x] M6.3: Fix voice button (ElevenLabs TTS) — 5-layer failure repair
- [x] M6.4: Fix slash command auto-discovery — cwd + commandDescriptions type
- [x] M6.5: Fix attribution prompt off-by-one — ref guard for timing race
- [x] M6.6: Last activity timestamps on all sessions
- [x] M6.7: Session reordering (Move to Top) with E2E encrypted ordering
- [x] M6.8: Northglass brand v2 — monochrome arc mark, updated themes
- [x] M6.9: Rename "Yolo Mode" → "Dangerously Skip Permissions" (11 languages)
- [x] M6.10: Support Us → Buy Me a Coffee link
- [x] M6.11: Delta security audit — all High fixed, 2 new Medium patched
- [x] M6.12: Token account verification — cached existence check in auth middleware
- [x] M6.13: Upstream cherry-pick — ToolSearch UI hiding
- [x] M6.14: BYOK for ElevenLabs voice — settings UI + server key fallback
- [x] M6.15: Security fixes — integer injection (NEW-1), auth request TTL (NEW-5)
- [ ] M6.16: Verify Settings Features screen (manual QA)
- [ ] M6.17: Final TestFlight build v1.7.0

## Backlog (UI/UX Issues)
- [x] "Connect Terminal" page: dark text on dark background — verified uses theme tokens (C1)
- [x] "connected" indicator shows green before user accepts terminal connection — fixed (C3)
- [x] GitHub connection flow doesn't work — UI removed, deferred to Phase 4 (C4)
- [x] Send button active with no session connected — disabled when offline (C2)
- [x] PWA auth doesn't persist across close/reopen — documented in ADR-007 (D2)
- [x] Investigate Cloudflare WAF: Bot Fight Mode — documented as accepted risk (D1)
- [x] Verify analytics/tracking functions — PostHog dormant by design, ready to activate (D3)
- [x] Set up monitoring dashboard — documented health endpoints + Prometheus (D4)
- [x] Replace logo/icon assets — Northglass brand v2 monochrome arc mark
- [x] Merge upstream changes — cherry-picked ToolSearch hiding (d343330c)
- [x] Encrypt session tags — N/A, tags are random UUIDs; session names in encrypted metadata
- [x] Token revocation endpoint (POST /v1/auth/logout) — in-memory revoked set
- [x] Fix DEK mismatch on session resume — local session key cache
- [x] Fix 404 handler auth header logging (NEW-3) — log only UA, not full headers
- [x] Pin Mermaid CDN version (NEW-4) — pinned to 11.12.1
- [x] App Store Connect API script — scripts/check-testflight.sh
- [x] Brand v3 prompt mark — brush chevron + cursor between bars with ink splatter
- [x] Northglass font stack — Space Grotesk (headings), Inter (body), JetBrains Mono (code)
- [x] Transparent logotype PNGs (RGBA) — fixes white box on dark theme
- [x] Fix logotype theme inversion — dark mode now loads correct variant
- [x] Web deploy pipeline — scripts/deploy-web.sh, ADR-008, yarn deploy:web
- [x] Security: console.log data leak — sync.ts decrypted content moved to file logger
- [x] Security: DEK cache only writes on fresh key generation (prevents resume corruption)
- [x] Blinking green terminal dot on login logotype
- [x] Restore page "secret key" button styled as visible button
- [x] Header mark container fix (32→44px, mark 38px)

## Phase 4: Future
- [ ] UI redesign pass — modernize layout, typography, interaction patterns
- [ ] Custom landing page (northglass.io/idle)
- [ ] Image/file upload in sessions (deferred from v1.5)
- [ ] Message editing when SDK supports it
- [ ] Upstream compatibility tracking — detect Claude Code / Codex breaking changes
- [ ] Full drag-and-drop session reordering (currently: Move to Top swipe)
- [ ] Evaluate managed DB if VPS gets constrained
- [ ] Publish full package suite to npm
- [ ] PostHog activation with privacy policy
- [ ] Validate "server configuration" option works on web and app
- [ ] Session groups (name-only, drag to group)
- [ ] Hold-to-reorder with grip icon (replace swipe UX)
