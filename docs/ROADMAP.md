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

## Phase 1.5: Alpha Readiness (Current)
- [x] Verify E2E encryption against reference test vectors
- [x] Add token expiry to persistent auth tokens
- [x] Add rate limiting on auth endpoints
- [x] Document architecture and security model (ARCHITECTURE.md, SECURITY.md)
- [x] Verify Cloudflare WAF configuration and document it
- [x] Update stale documentation (ROADMAP, AGENTS.md)
- [ ] Test web app E2E from mobile device
- [ ] Replace logo/icon assets with custom Idle designs (placeholder currently)

## Phase 1.5 Deferred
- [ ] Apple Developer setup + first TestFlight build (blocked — Apple Dev account pending)
- [ ] Publish idle-coder CLI to npm

## Phase 2: Improvements (Planned)
- [ ] CLI auto-title fallback (PR 3 from session title plan)
- [ ] App-side session rename (PR 4 from session title plan)
- [ ] Merge upstream changes (periodic sync with slopus/happy)
- [ ] Encrypt session tags (server currently sees session names)
- [ ] Token revocation endpoint (POST /v1/auth/logout)

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

## Phase 3: Make It Ours (Future)
- [ ] Custom landing page (separate from app, e.g., northglass.io/idle)
- [ ] Idle-specific features beyond upstream Happy
- [ ] Evaluate managed DB if VPS gets constrained
- [ ] Cloudflare Access for public alpha (email-gated, replace IP allowlist)
