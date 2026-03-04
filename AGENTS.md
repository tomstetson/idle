# Idle — Navigation Guide

Mobile and web client for Claude Code, forked from Happy Engineering. Monorepo with 5 packages.

## Key Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `CLAUDE.md` | Build commands, architecture, gotchas | First — always |
| `CONTRIBUTING.md` | Dev setup, testing, deployment guide for new sessions | Onboarding or resuming after a break |
| `package.json` | Workspace config, scripts | Setting up or debugging builds |
| `scripts/deploy-server-quick.sh` | Quick-deploy server to VPS (bypasses CI) | Manual server deploys |
| `docs/ARCHITECTURE.md` | Traffic flow diagrams, domain layout, encryption boundaries | Understanding how components connect |
| `docs/SECURITY.md` | Zero-knowledge model, what's encrypted, known gaps | Security review or explaining privacy model |
| `docs/adr/002-pglite-embedded-database.md` | ADR for PGlite as embedded database | Understanding DB choice |
| `docs/adr/003-deployment-architecture.md` | ADR for VPS + Cloudflare deployment | Understanding hosting setup |
| `docs/adr/004-e2e-encryption-model.md` | ADR for encryption design | Understanding crypto model |
| `docs/adr/005-dev-test-strategy.md` | ADR for dev/test approach | Understanding test philosophy |
| `docs/` | Protocol specs, plans, runbooks | Deep dives on wire protocol or encryption format |

## Packages

| Package | Purpose | When to Read |
|---------|---------|--------------|
| `packages/idle-app/` | React Native app (iOS, Android, web) | UI changes, display logic |
| `packages/idle-cli/` | CLI that wraps Claude Code | Session management, MCP tools, daemon |
| `packages/idle-server/` | WebSocket relay + API server | Server-side logic, deployments |
| `packages/idle-agent/` | Programmatic agent control | Agent API, automation |
| `packages/idle-wire/` | Shared Zod types | Adding/changing message schemas |
| `packages/idle-e2e/` | E2E tests (Playwright + CLI child process) | Running or adding integration tests |

## App Package Deep Dive (`packages/idle-app/`)

| Path | Purpose |
|------|---------|
| `sources/components/` | Reusable UI components (session lists, avatars, status dots) |
| `sources/app/(app)/` | Expo Router screens (session, machine, settings, new session) |
| `sources/sync/` | Storage, encryption, socket sync, session state management |
| `sources/utils/` | Helpers (session names, OS icons, path formatting) |
| `sources/text/translations/` | i18n — 10 language files |
| `app.config.js` | Expo config (bundle IDs, schemes, associated domains) |

## CLI Package Deep Dive (`packages/idle-cli/`)

| Path | Purpose |
|------|---------|
| `src/api/` | Server communication, encryption, WebSocket session client |
| `src/claude/` | Claude Code SDK integration, MCP tools, system prompt |
| `src/daemon/` | Background daemon (start/stop/status, doctor) |
| `src/commands/` | CLI command handlers (auth, connect, config) |
| `src/persistence.ts` | Local storage for keys and settings |
| `src/configuration.ts` | Env vars, paths, server URLs |

## Common Tasks

| Task | How |
|------|-----|
| Change session display | Edit `packages/idle-app/sources/components/ActiveSessionsGroup*.tsx` |
| Change session title behavior | Edit `packages/idle-cli/src/claude/utils/systemPrompt.ts` + `startIdleServer.ts` |
| Add a translation key | Add to all 10 files in `packages/idle-app/sources/text/translations/` + `_default.ts` |
| Change what metadata CLI sends | Edit `packages/idle-cli/src/utils/createSessionMetadata.ts` |
| Modify wire types | Edit `packages/idle-wire/src/`, rebuild, then update consumers |
| Configure env vars | Copy `.env.example` to `.env` in each package (idle-app, idle-cli, idle-server) |
