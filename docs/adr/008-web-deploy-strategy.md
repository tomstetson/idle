# ADR-008: Web Deployment Strategy

**Status:** accepted
**Date:** 2026-03-09

## Context

The Idle app is built with Expo and targets three platforms: iOS (TestFlight), Android, and web (idle.northglass.io).

EAS Update (OTA) delivers JS bundle updates to native apps via channels (`preview`, `production`). However, **OTA does not apply to web** — the web app is a static export (`expo export --platform web`) served by Nginx on the VPS.

Previously, `yarn ota` only pushed to the EAS `preview` branch, leaving the web app stale. Deploying web required manual steps: export, rsync to VPS.

The TestFlight binary is hardcoded to the `production` channel (`app.config.js: expo-channel-name: "production"`), so `yarn ota` (which pushes to `preview`) doesn't reach TestFlight users either.

## Decision

Separate deployment commands for each target, with a combined command for convenience:

| Command | Target | What it does |
|---------|--------|------------|
| `yarn ota` | Native (preview) | Changelog parse + typecheck + `eas update --branch preview` |
| `yarn ota:production` | Native (production/TestFlight) | EAS workflow for production channel |
| `yarn deploy:web` | Web (idle.northglass.io) | Wire build + typecheck + expo export + rsync to VPS |
| `yarn deploy:all` | Native (preview) + Web | `yarn ota` then `deploy:web` |
| `./scripts/deploy-server-quick.sh` | API server (idle-api.northglass.io) | Wire build + typecheck + tests + ssh pull/restart |

The web deploy script (`scripts/deploy-web.sh`) handles the full pipeline: build idle-wire, typecheck, `expo export --platform web`, rsync with `--delete` to `/var/www/idle-app/`.

## Consequences

- **One command for web**: `yarn deploy:web` from idle-app directory, or `./scripts/deploy-web.sh` from repo root
- **Combined deploy**: `yarn deploy:all` updates both native (preview) and web in one step
- **TestFlight requires explicit production push**: `yarn ota:production` — intentionally separate since production pushes need deliberate action
- **Web deploys are fast**: ~15 seconds (export + rsync), no CI/CD pipeline
- **VPS dependency**: Web deploy requires SSH access to `releasingphish-root`

## Alternatives Considered

1. **Vercel/Netlify for web** — Would decouple from VPS but adds another service. The VPS already hosts the API server, so co-locating keeps infra simple.
2. **GitHub Actions for auto-deploy on push** — Good for later, but premature for alpha. Manual deploys give control during rapid iteration.
