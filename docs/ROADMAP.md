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

## Phase 1.5 Deferred
- [ ] Apple Developer setup + first TestFlight build (blocked — Apple Dev account pending) → moved to Phase 3
- [ ] Publish idle-coder CLI to npm → moved to Phase 2

## Phase 2: Alpha 1.0 (In Progress)

### Completed
- [x] Dev environment — root scripts, .env.example files, quick-deploy
- [x] CI — test-all.yml for all 5 packages
- [x] Regression tests for PGlite Bytes bug and web app fixes
- [x] E2E test suite (Playwright + CLI) — auth, sessions, machines, terminal connect
- [x] ADRs 002-005 (PGlite, deployment, encryption, dev/test strategy)
- [x] CONTRIBUTING.md for future sessions

### Core Stability
- [ ] CLI auto-title fallback (PR 3 from session title plan)
- [ ] App-side session rename (PR 4 from session title plan)
- [ ] Merge upstream changes (periodic sync with slopus/happy)
- [ ] Encrypt session tags (server currently sees session names)
- [ ] Token revocation endpoint (POST /v1/auth/logout)
- [ ] Upstream compatibility tracking — detect when Claude Code or Codex ship breaking changes or new features that Idle needs to adopt (Claude Code is priority; Codex is secondary)

### Terminal Management
- [ ] Re-arrange terminal connections — drag-and-drop or manual ordering of connected terminals in the sidebar/list
- [ ] Group terminals by machine/host — visually cluster terminals by the host they're connected to, with collapsible host sections

### Message Editing
- [ ] Edit already-sent messages in Claude Code sessions — mirror the upstream Claude Code feature where pressing Up arrow edits the last queued message; surface this in the Idle app UI

### Slash Commands
- [ ] More robust auto-discovery of `/` commands — dynamically detect available slash commands from the connected CLI rather than maintaining a static list; handle new commands added upstream without manual updates

### Publishing & Hosting
- [ ] Publish idle-coder CLI to npm (moved from Phase 1.5)
- [ ] Open idle.northglass.io for public use — remove IP allowlist, add Cloudflare Access email-gate or open registration
- [ ] Publish full package suite to npm for easy `npm install -g idle-coder` onboarding

## Backlog (UI/UX Issues)
- [ ] "Connect Terminal" page: dark text on dark background (heading barely visible)
- [ ] "connected" indicator shows green before user accepts terminal connection
- [ ] GitHub connection flow doesn't work
- [ ] Send button active with no session connected — should show "not connected" message
- [ ] PWA auth doesn't persist across close/reopen (iOS standalone localStorage isolation — needs investigation)
- [ ] Investigate Cloudflare WAF: Bot Fight Mode blocks CLI requests (had to disable globally)
- [ ] Verify analytics/tracking functions actually send data (trackAccountCreated, trackLogout, etc.)
- [ ] Set up monitoring dashboard — Cloudflare analytics + app-level usage metrics
- [ ] Verify anonymous data collection works end-to-end

## Phase 3: UI Redesign & Native Apps (Future)

### UI/UX Redesign
- [ ] Custom landing page (separate from app, e.g., northglass.io/idle)
- [ ] UI redesign pass — modernize layout, typography, and interaction patterns across web and mobile
- [ ] Idle-specific features beyond upstream Happy

### Native iOS App
- [ ] Apple Developer setup + first TestFlight build (blocked — Apple Dev account pending; moved from Phase 1.5)
- [ ] Build and ship native iOS app via App Store once developer account is approved

### Infrastructure
- [ ] Evaluate managed DB if VPS gets constrained
- [ ] Cloudflare Access for public alpha (email-gated, replace IP allowlist)
