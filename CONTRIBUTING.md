# Contributing to Idle

Guide for human contributors and future Claude sessions working on the Idle codebase.

Idle is a fork of [Happy Engineering](https://github.com/slopus/happy) — a mobile/web client for Claude Code. It's maintained by Northglass LLC as a monorepo with 5 packages.

## Session Startup (Claude)

Read these files in order before doing anything else:

1. `CLAUDE.md` — Build commands, architecture, gotchas
2. `AGENTS.md` — Navigation map (what's where, when to read it)
3. `.claude/context/progress.md` — Current task state (pick up where it left off)
4. `docs/ROADMAP.md` — What's planned and what's done

If `progress.md` exists and has in-progress tasks, resume those before starting new work.

## Prerequisites

- **Node.js 20+**
- **Yarn 1.22** (NOT Yarn Berry — this is classic Yarn with workspaces)
- **SSH access to VPS** (only needed for deploy — see [deployment.md](docs/deployment.md))
- Git remote `upstream` pointing to `https://github.com/slopus/happy.git`

## Quick Start

```bash
# Clone and install
git clone https://github.com/tomstetson/idle.git
cd idle
yarn install

# Build shared types first (other packages depend on this)
yarn workspace @northglass/idle-wire build

# Run the web app locally (connects to VPS API by default)
yarn web
# → Opens at http://localhost:8081
```

The local web app talks to the production server at `idle-api.northglass.io`. No local server setup needed for frontend work.

## Package Overview

| Package | npm Name | Purpose | Key Commands |
|---------|----------|---------|-------------|
| `idle-app` | idle-app | React Native + Expo web app (iOS, web) | `yarn web`, `yarn workspace idle-app test`, `yarn workspace idle-app typecheck` |
| `idle-cli` | idle-coder | Node.js CLI wrapping Claude Code | `yarn cli`, `yarn workspace idle-coder test`, `yarn workspace idle-coder build` |
| `idle-server` | idle-server | Fastify + PGlite server | `yarn workspace idle-server test`, `yarn workspace idle-server build` |
| `idle-wire` | @northglass/idle-wire | Shared Zod types/schemas | `yarn workspace @northglass/idle-wire build`, `yarn workspace @northglass/idle-wire test` |
| `idle-agent` | @northglass/agent | Programmatic agent control | `yarn workspace @northglass/agent test` |

### Build Order

**idle-wire must build before everything else.** It exports shared types that all other packages import. If you see import errors or missing type definitions, rebuild wire first:

```bash
yarn workspace @northglass/idle-wire build
```

## Development Workflow

### Frontend (Web App)

```bash
yarn workspace @northglass/idle-wire build  # if types changed
yarn web                                      # starts Expo web dev server on :8081
```

Hot reload works. The app connects to the VPS API server by default.

### CLI

```bash
yarn workspace @northglass/idle-wire build  # if types changed
yarn cli                                      # runs CLI in dev mode
```

The CLI uses `--env-file` for environment config (not dotenv). See `packages/idle-cli/.env.dev`.

### Server

The server runs on the IONOS VPS in production. For local development:

```bash
yarn workspace idle-server dev    # needs local .env with DATABASE_URL, REDIS_URL, etc.
```

See `docs/deployment.md` for required environment variables (DATABASE_URL, IDLE_MASTER_SECRET, REDIS_URL, S3_* vars).

## Running Tests

### Per-Package Tests

```bash
# All packages at once
yarn test

# Individual packages
yarn test:wire
yarn test:server
yarn test:cli
yarn test:app
yarn test:agent
```

### Typecheck

```bash
yarn workspace idle-coder typecheck
yarn workspace idle-app typecheck
yarn workspace idle-server build    # server typecheck is part of build
```

### E2E Tests

E2E tests live in `packages/idle-e2e/` and use Playwright.

### CI

All pushes to `main` and PRs run the `test-all.yml` workflow: builds wire first, then tests all 5 packages in parallel. Additional CI:

- `typecheck.yml` — TypeScript checks
- `cli-smoke-test.yml` — CLI build verification
- `deploy-server.yml` — Triggered on changes to `packages/idle-server/` or `packages/idle-wire/`
- `deploy-webapp.yml` — Triggered on changes to `packages/idle-app/`

## Deploying

### Quick Deploy (Manual)

Runs typecheck + tests locally, then SSH deploys to VPS:

```bash
./scripts/deploy-server-quick.sh
```

What it does: builds wire, typechecks server, runs server tests, then SSHes to VPS to pull + restart.

### CI Deploy (Recommended)

Push to `main`. The GitHub Actions workflows handle the rest:

- **Server changes** (`packages/idle-server/`, `packages/idle-wire/`): `deploy-server.yml` runs typecheck + tests, then SSH deploys
- **Web app changes** (`packages/idle-app/`): `deploy-webapp.yml` builds the Expo static export and deploys to VPS nginx

Both require GitHub secrets for SSH access (see workflow files for details).

### Infrastructure

- **Server**: VPS with systemd service, behind Nginx reverse proxy
- **Web app**: Static Expo export served by Nginx
- **DNS/SSL**: Cloudflare (idle.northglass.io, idle-api.northglass.io)
- **WAF**: Cloudflare with configurable IP allowlist

See [deployment.md](docs/deployment.md) for full infrastructure details and self-hosting instructions.

## Syncing Upstream

Idle tracks `slopus/happy` as the `upstream` remote. To pull in their changes:

```bash
git fetch upstream
git merge upstream/main
# Resolve conflicts — expect them in files listed below
```

Most conflicts will be in rebranded strings (package names, URLs, bundle IDs). The files below have substantive changes beyond branding, so pay extra attention during merges.

### Modified Upstream Files (Merge Conflict Risk)

These files have Idle-specific logic changes. If upstream modifies them, expect conflicts:

| File | What Changed |
|------|-------------|
| `packages/idle-app/sources/auth/tokenStorage.ts` | sessionStorage replaced with localStorage (PWA persistence) |
| `packages/idle-app/sources/auth/AuthContext.tsx` | Logout redirect behavior |
| `packages/idle-app/sources/components/AgentInput.tsx` | Default labels hidden |
| `packages/idle-app/sources/components/TabBar.tsx` | PWA safe-area padding |
| `packages/idle-server/sources/app/api/routes/sessionRoutes.ts` | PGlite Buffer.from() fix |
| `packages/idle-server/sources/app/api/routes/machinesRoutes.ts` | PGlite Buffer.from() fix |
| `packages/idle-server/sources/app/kv/kvMutate.ts` | PGlite Buffer.from() fix |

## Git Conventions

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add session rename from app
fix: PGlite buffer handling in session routes
chore: update dependencies
docs: add deployment runbook
refactor: extract encryption helpers
test: add E2E tests for auth flow
```

### Co-Author Trailers

Include this trailer when Claude generates the commit:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pre-Commit Hooks

Never use `--no-verify`. Pre-commit hooks run Gitleaks (secrets scanning) and email guards. They are configured globally via `core.hooksPath`. If a hook fails, fix the issue — don't skip it.

## Common Gotchas

### PGlite Buffer Handling

PGlite Bytes fields must use `Buffer.from()`, **never** `new Uint8Array(Buffer.from())`. The double-wrap corrupts data silently. If you see garbled encrypted data from the server, check Buffer handling first.

```typescript
// CORRECT
const bytes = Buffer.from(data, 'base64');

// WRONG — corrupts data silently
const bytes = new Uint8Array(Buffer.from(data, 'base64'));
```

### Cloudflare Bot Fight Mode

Bot Fight Mode blocks CLI (non-browser) requests to the API. If CLI auth starts failing with 403s, check if it's been re-enabled on `idle-api.northglass.io`.

### macOS vs Linux sed

macOS requires `sed -i ''` (empty string argument), Linux requires `sed -i` (no argument). Scripts that run in both environments (local + CI) need to handle this.

### Build Order

If you see mysterious type errors or missing exports, rebuild idle-wire:

```bash
yarn workspace @northglass/idle-wire build
```

This is the single most common fix for "it doesn't compile" issues.

### Yarn Version

This is Yarn 1 (classic), not Yarn Berry. Use `yarn install`, not `yarn install --immutable` (that's the CI flag for frozen lockfile). Locally, plain `yarn install` is fine.

### Import Aliases

All packages use `@/` aliased to `src/` (or `sources/`) via tsconfig paths. Don't use relative paths like `../../src/utils` — use `@/utils` instead.

## Code Style

Established conventions:

- Strict TypeScript — no `any` without justification
- Named exports preferred over default exports
- All imports at the top of the file — never mid-code
- Functions over classes
- No trivial getters/setters
- File-based logging in CLI (avoid console output that disturbs Claude terminal)
- `react-native-unistyles` for theming in the app (not raw StyleSheet)

## Project Documentation Map

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Commands, architecture, gotchas (Claude's primary reference) |
| `AGENTS.md` | Navigation guide — what's where, when to read it |
| `CONTRIBUTING.md` | This file — onboarding and workflow guide |
| `docs/ARCHITECTURE.md` | Traffic flow diagrams, domain layout, encryption boundaries |
| `docs/SECURITY.md` | Zero-knowledge model, what's encrypted, known gaps |
| `docs/deployment.md` | Server deployment details, env vars, Docker/K8s configs |
| `docs/ROADMAP.md` | Feature roadmap with phase tracking |
| `docs/protocol.md` | Wire protocol specification |
| `docs/encryption.md` | E2E encryption format and implementation |
| `docs/adr/` | Architecture Decision Records |
