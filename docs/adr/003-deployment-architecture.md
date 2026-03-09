---
status: accepted
date: 2026-03-04
author: Claude + Tom
---
# ADR-003: Deployment Architecture

## Status
Accepted

## Context
Idle has two deployable components: a Node.js WebSocket server (idle-server) and a static web app (idle-app, built with Expo). Both need public HTTPS endpoints. The project is alpha-stage, single developer, budget-constrained, and serving one user.

An IONOS VPS (2GB RAM, $5/month) was already provisioned. Cloudflare (free plan) already handles DNS for northglass.io.

## Decision
Run everything on the single IONOS VPS behind Cloudflare:

- **Server**: `idle-server` runs as a systemd service (`idle-server.service`) under a dedicated `deployer` user with hardened unit config (ProtectSystem=strict, PrivateTmp=yes, NoNewPrivileges=yes)
- **Web app**: Static Expo export served by nginx at `idle.northglass.io`
- **API**: Reverse-proxied by nginx at `idle-api.northglass.io` → localhost server port
- **SSL**: Cloudflare Origin Certificate on the VPS + Cloudflare Full mode (encrypted end-to-end)
- **WAF**: Cloudflare IP allowlist restricts `idle.northglass.io` to home IP only during alpha
- **DNS**: Cloudflare-proxied A records for both subdomains
- **CI/CD**: GitHub Actions deploys via SSH — `deploy-server.yml` (typecheck + test, then SSH git pull + restart) and `deploy-webapp.yml` (Expo build, tar + SSH to nginx directory)

## Consequences

### Positive
- $5/month total hosting cost (VPS already paid for)
- Simple mental model: one box, two nginx configs, one systemd service
- Cloudflare free tier provides SSL, DDoS protection, and IP-based access control
- systemd handles process lifecycle (auto-restart on crash, boot start)
- Service hardening limits blast radius if server is compromised
- CI/CD keeps deploys consistent and auditable

### Negative
- Single point of failure: VPS down = everything down
- No horizontal scaling — single-writer PGlite (see ADR-002) reinforces this constraint
- Bot Fight Mode conflicts with CLI requests (non-browser User-Agent gets challenged) — had to disable globally on the zone, reducing bot protection
- Deploy cycle is ~3 minutes (CI build + SSH + restart), not instant
- 2GB RAM shared between nginx, idle-server, PGlite, and any other services on the box

## Alternatives Considered

### Serverless (AWS Lambda, Cloudflare Workers)
Eliminates server management entirely. Rejected: PGlite requires persistent filesystem access that ephemeral containers don't provide. WebSocket connections need long-lived processes, not request-response lambdas.

### Managed hosting (Vercel, Fly.io, Railway)
Handles scaling, SSL, and deploys automatically. Rejected: more expensive ($7-25/month), and PGlite's data persistence model is unclear on platforms that may restart or relocate containers. The VPS gives us full control over the filesystem.

### Self-hosted Kubernetes
Maximum flexibility and scaling. Rejected: massive operational overhead for a single-developer alpha product. Would require learning k8s ops, writing Helm charts, and running etcd — all to serve one user.
