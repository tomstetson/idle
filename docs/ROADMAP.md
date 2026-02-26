# Idle Roadmap

## Phase 1: Ship It (Current)
- [x] Fork and rebrand codebase
- [x] Bootstrap project docs (CLAUDE.md, AGENTS.md, ADR)
- [x] Write server deployment runbook
- [x] Deploy server to IONOS VPS (standalone mode, systemd + nginx)
- [x] Configure DNS (idle-api.northglass.io via Cloudflare)
- [x] SSL — Cloudflare Origin Certificate + Full SSL mode
- [x] Cloudflare WAF — IP-locked to home (72.94.103.120 / Tailscale travel-vpn)
- [x] Homelab docs + ADR-013 + MCP vault credentials
- [x] Complete rebrand — auth URL scheme, server auth service, package authors, deploy manifests
- [x] PWA support — manifest.json, icons, iOS meta tags, build script
- [x] Deploy web app to idle.northglass.io (static export + nginx + Cloudflare SSL)
- [x] Verify web app works E2E — account creation, WebSocket connected, session UI
- [x] CLI builds and connects to production server
- [ ] Replace logo/icon assets with custom Idle designs (currently using generated placeholders)
- [ ] Create @northglass npm org and publish idle-coder + idle-wire
- [ ] Apple Developer setup + first TestFlight build (blocked — Apple Dev account pending)

## Phase 2: Improvements (Planned)
- [ ] CLI auto-title fallback (PR 3 from session title plan)
- [ ] App-side session rename (PR 4 from session title plan)
- [ ] Merge upstream changes (periodic sync with slopus/happy)

## Phase 3: Make It Ours (Future)
- [ ] Custom landing page at idle.northglass.io
- [ ] Idle-specific features beyond upstream Happy
- [ ] Evaluate managed DB if VPS gets constrained
