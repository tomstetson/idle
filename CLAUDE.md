# Idle — Mobile & Web Client for Claude Code

Fork of [Happy Engineering](https://github.com/slopus/happy), rebranded and maintained by Northglass LLC.

## Tech Stack

- **Monorepo**: Yarn workspaces (yarn 1.22)
- **idle-app**: React Native (Expo), Unistyles theming, Expo Router
- **idle-cli**: Node.js/TypeScript, Claude Code SDK, Socket.IO
- **idle-server**: Node.js/TypeScript, Fastify 5, PGlite (embedded PostgreSQL), Socket.IO
- **idle-agent**: Node.js/TypeScript CLI for programmatic agent control
- **idle-wire**: Shared message types (Zod schemas) used by all packages

## Commands

```bash
# Install dependencies (from repo root)
yarn install

# Run the web app locally
yarn web

# Run CLI in dev mode
yarn cli

# Typecheck all packages
yarn workspace idle-coder typecheck
yarn workspace idle-app typecheck

# Run CLI tests
yarn workspace idle-coder test

# Run all package tests
yarn test

# Run E2E tests (requires `yarn web` running in another terminal)
yarn test:e2e

# Build CLI
yarn workspace idle-coder build

# Build wire types (needed before other packages)
yarn workspace @northglass/idle-wire build

# Quick-deploy server to VPS (bypasses CI)
./scripts/deploy-server-quick.sh

# Deploy web app to idle.northglass.io (export + rsync to VPS)
./scripts/deploy-web.sh              # from repo root
yarn workspace idle-app deploy:web   # from anywhere

# Deploy native OTA + web together
yarn workspace idle-app deploy:all

# Deploy OTA to TestFlight/production (separate, intentional)
yarn workspace idle-app ota:production
```

### Deploy Targets

| Target | Command | Channel/Destination |
|--------|---------|-------------------|
| Web (idle.northglass.io) | `./scripts/deploy-web.sh` | Static files → VPS `/var/www/idle-app/` |
| Native preview | `yarn ota` (from idle-app) | EAS Update → `preview` branch |
| Native production (TestFlight) | `yarn ota:production` | EAS Update → `production` branch |
| API server | `./scripts/deploy-server-quick.sh` | VPS systemd restart |

**Note:** EAS OTA does not apply to web. Web requires a separate static export + deploy.

## Directory Structure

```
packages/
├── idle-app/       # React Native mobile + web app (Expo)
├── idle-cli/       # CLI wrapper for Claude Code (npm: idle-coder)
├── idle-server/    # WebSocket relay server (Prisma + PostgreSQL)
├── idle-agent/     # Programmatic agent CLI (npm: @northglass/agent)
└── idle-wire/      # Shared types (npm: @northglass/idle-wire)
docs/               # Architecture docs, protocol specs, plans
scripts/            # Build and release scripts
```

## Key Architecture

- **E2E Encryption**: All session data encrypted client-side (AES-256-GCM or legacy TweetNaCl) before leaving device
- **Dual mode**: CLI runs Claude interactively (terminal) or remotely (controlled from app)
- **Real-time sync**: Socket.IO for session state, messages, permissions between CLI ↔ server ↔ app
- **MCP tools**: CLI registers MCP tools (e.g., `change_title`) that Claude can call during sessions

## Branding / Domains

- **npm scope**: `@northglass`
- **App bundle**: `com.northglass.idle`
- **Web app**: `idle.northglass.io`
- **API server**: `idle-api.northglass.io`
- **CLI command**: `idle` (npm package: `idle-coder`)
- **Home dir**: `~/.idle/` (dev: `~/.idle-dev/`)

## Upstream

Forked from `slopus/happy`. To pull upstream changes:

```bash
git fetch upstream
git merge upstream/main
# Resolve conflicts — most will be in rebranded strings
```

Remote `upstream` points to `https://github.com/slopus/happy`.

## Gotchas

- **Build order matters**: `idle-wire` must build before other packages (`yarn workspace @northglass/idle-wire build`)
- **Env files**: CLI uses `--env-file` flag, not dotenv. See `packages/idle-cli/.env.dev`
- **No mocking in tests**: Tests make real API calls (per upstream convention)
- **Yarn 1**: Not yarn berry. Use `yarn` not `yarn install --immutable`
- **Import aliases**: All packages use `@/` → `src/` via tsconfig paths
- **Unistyles**: App uses `react-native-unistyles` for theming, not StyleSheet directly
- **PGlite Bytes bug (CRITICAL)**: Prisma 6 + PGlite has a two-sided Bytes field bug:
  - **WRITES**: Prisma serializes Uint8Array as JSON `{"0":199,...}`. Fix: raw SQL `decode($1, 'base64')`
  - **READS**: pglite-prisma-adapter returns bytea as JSON objects, causing P2023. Fix: exclude Bytes from ALL Prisma selects, fetch via raw SQL `encode(col, 'base64')`
  - See `encodeBytesField.ts` for helpers: `fetchBytesField`, `fetchBytesFieldMap`, `fetchMultipleBytesFields`
  - Pattern: define `*SelectNoBytes` constant per model, use in all Prisma queries
- **Dev workflow**: `yarn web` runs local Expo with hot reload, already points at VPS API (no config needed)

## Code Style (from upstream)

- Strict TypeScript, no untyped code
- Named exports preferred
- ALL imports at top of file — never mid-code
- Minimal classes — prefer functions
- No trivial getters/setters
- File-based logging in CLI (avoid console output that disturbs Claude terminal)
