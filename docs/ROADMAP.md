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

## Phase 3: Pre-Alpha Development (Complete)

All pre-alpha milestones completed. Version numbers reset to v0.1.0 across all packages for clean alpha launch.

### TestFlight Pipeline
- [x] Apple Developer certs + provisioning profiles
- [x] EAS Build configuration (development + preview profiles)
- [x] GitHub Actions TestFlight CI (push to main → TestFlight)

### CLI Stability
- [x] Graceful shutdown, reconnection logic, error boundaries
- [x] Published idle-coder to npm (now reset to v0.1.0, alpha tag)

### Features
- [x] Permission request UI — modal flow with approve/deny/always-allow
- [x] Session resume — reconnect to in-progress sessions from app
- [x] Thinking blocks, message timestamps, slash commands, session grouping
- [x] Push notifications (Expo Push Service integration)
- [x] Auto-title fallback, session rename, cross-machine handoff
- [x] Session reordering (Move to Top) with E2E encrypted ordering
- [x] BYOK for ElevenLabs voice
- [ ] Message editing — DEFERRED (Claude Code SDK has no editing API)
- [ ] Image/file upload — DEFERRED (multi-package feature)

### Security & Polish
- [x] Delta security audit — all High findings fixed
- [x] Token account verification, integer injection fix, auth request TTL
- [x] console.log data leak fix, DEK cache write guard

### Branding
- [x] Brand v3 prompt mark — brush chevron + cursor between bars with ink splatter
- [x] Northglass font stack — Space Grotesk, Inter, JetBrains Mono
- [x] Transparent logotype PNGs, theme-aware dark/light variants
- [x] Web deploy pipeline — scripts/deploy-web.sh, ADR-008

## Phase 4: Alpha v0.1.0 (Current)

All packages aligned at v0.1.0. Fresh start for public alpha.

- [x] Reset all package versions to v0.1.0
- [x] Publish idle-coder@0.1.0 to npm (alpha tag)
- [x] Old npm versions unpublished/deprecated
- [ ] TestFlight build with brand v3 assets (new native binary required)
- [ ] Verify Settings Features screen (manual QA)
- [ ] Validate permissions E2E on TestFlight device

## Phase 5: Future
- [ ] UI redesign pass — modernize layout, typography, interaction patterns
- [ ] Custom landing page (northglass.io/idle)
- [ ] Image/file upload in sessions (deferred from pre-alpha)
- [ ] Message editing when SDK supports it
- [ ] Upstream compatibility tracking — detect Claude Code / Codex breaking changes
- [ ] Full drag-and-drop session reordering (currently: Move to Top swipe)
- [ ] Evaluate managed DB if VPS gets constrained
- [ ] Publish full package suite to npm (@northglass/agent)
- [ ] PostHog activation with privacy policy
- [ ] Validate "server configuration" option works on web and app
- [ ] Session groups (name-only, drag to group)
- [ ] Hold-to-reorder with grip icon (replace swipe UX)
