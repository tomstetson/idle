# Idle Roadmap

## Phase 1: Ship It (Complete)
- [x] Fork and rebrand codebase
- [x] Bootstrap project docs (CLAUDE.md, AGENTS.md, ADR)
- [x] Write server deployment runbook
- [x] Deploy server to IONOS VPS (standalone mode, systemd + nginx)
- [x] Configure DNS (idle-api.northglass.io via Cloudflare)
- [x] SSL — Cloudflare Origin Certificate + Full SSL mode
- [x] Cloudflare WAF — IP-locked to home
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
- [ ] Publish idle-coder pre-release to npm (needs npm auth)

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

### Milestone 5: Polish & Open Up (In Progress)
- [x] M5.1: Web scroll fix (completed under M4)
- [x] M5.2: Session rename (completed under M4)
- [ ] M5.3: Cloudflare Access email-gate (needs CF dashboard)
- [x] M5.4: Update documentation (this update)
- [ ] M5.5: Final TestFlight build (after all features complete)

## Backlog (UI/UX Issues)
- [ ] "Connect Terminal" page: dark text on dark background (heading barely visible)
- [ ] "connected" indicator shows green before user accepts terminal connection
- [ ] GitHub connection flow doesn't work
- [ ] Send button active with no session connected — should show "not connected" message
- [ ] PWA auth doesn't persist across close/reopen (iOS standalone localStorage isolation)
- [ ] Investigate Cloudflare WAF: Bot Fight Mode blocks CLI requests (had to disable globally)
- [ ] Verify analytics/tracking functions actually send data
- [ ] Set up monitoring dashboard — Cloudflare analytics + app-level usage metrics
- [ ] Replace logo/icon assets with custom Idle designs (placeholder currently)
- [ ] Merge upstream changes (periodic sync with slopus/happy)
- [ ] Encrypt session tags (server currently sees session names)
- [ ] Token revocation endpoint (POST /v1/auth/logout)

## Phase 4: Future
- [ ] UI redesign pass — modernize layout, typography, interaction patterns
- [ ] Custom landing page (northglass.io/idle)
- [ ] Image/file upload in sessions (deferred from v1.5)
- [ ] Message editing when SDK supports it
- [ ] Upstream compatibility tracking — detect Claude Code / Codex breaking changes
- [ ] Re-arrange terminal connections — drag-and-drop ordering
- [ ] Evaluate managed DB if VPS gets constrained
- [ ] Publish full package suite to npm
