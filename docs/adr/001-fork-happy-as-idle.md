---
status: accepted
date: 2026-02-25
---
# ADR-001: Fork Happy Engineering as Idle

## Status
Accepted

## Context
Happy Engineering (github.com/slopus/happy) is an open-source mobile/web client for Claude Code. After contributing three PRs (#455, #762, #763) over two months, none were merged and the last iOS release was October 2025. The slow upstream cadence blocks shipping improvements.

We need a mobile Claude Code client we can iterate on independently.

## Decision
Fork Happy under the Idle brand, maintained by Northglass LLC. Rebrand the full codebase (packages, domains, bundle IDs, CLI commands) and host our own server infrastructure.

Key choices:
- **Name**: Idle (simple, memorable, vibe-coding energy)
- **npm scope**: `@northglass` (LLC brand, not project-specific)
- **Domains**: `idle.northglass.io` (app), `idle-api.northglass.io` (server) — subdomains under LLC domain rather than standalone domain
- **Server**: IONOS VPS — already provisioned, $5/mo
- **License**: MIT (inherited from upstream)

## Consequences

### Positive
- Ship improvements immediately without waiting for upstream review
- Control the full stack (CLI, server, app, deployments)
- Build Northglass brand with a real shipped product
- Can still pull upstream changes via `git merge upstream/main`

### Negative
- Maintenance burden — must track upstream security fixes
- 2GB VPS may need upgrading if usage grows
- Apple Developer account needed for TestFlight/App Store distribution
- Must maintain translations across 10 languages independently

## Alternatives Considered

### Continue contributing upstream only
Rejected: 4+ month turnaround on PRs, no iOS releases, blocks iteration.

### Native SwiftUI rewrite
Rejected: Months of effort for feature parity. Expo/React Native works fine and ships cross-platform.

### Use a different domain (idle.engineering)
Rejected: Fragments brand. Subdomains under northglass.io consolidate identity and cost nothing.
