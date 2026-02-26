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
- [ ] Replace logo/icon assets
- [ ] Create @northglass npm org
- [ ] Verify `yarn install && yarn web` works end-to-end against production server
- [ ] Apple Developer setup + first TestFlight build (blocked — Apple Dev account pending)

## Phase 2: Improvements (Planned)
- [ ] CLI auto-title fallback (PR 3 from session title plan)
- [ ] App-side session rename (PR 4 from session title plan)
- [ ] Merge upstream changes (periodic sync with slopus/happy)

## Phase 3: Make It Ours (Future)
- [ ] Custom landing page at idle.northglass.io
- [ ] Idle-specific features beyond upstream Happy
- [ ] Evaluate managed DB if VPS gets constrained
