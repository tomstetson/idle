---
status: accepted
date: 2026-03-04
author: Claude + Tom
---
# ADR-005: Dev/Test Strategy

## Status
Accepted

## Context
Several bugs shipped to production that should have been caught earlier: PGlite `Bytes` serialization (commit 38046952), auth state persistence across refreshes, and tab bar padding on iOS web. The deploy cycle to the VPS takes ~3 minutes, making test-by-deploy painfully slow for UI iteration.

Manual testing against the VPS was the only verification method. No automated tests existed beyond the upstream CLI test suite. Every change required a full deploy to discover if it worked.

Requirements:
- Fast UI development loop (seconds, not minutes)
- Automated regression tests for every production bug
- CI enforcement so broken code can't merge to main
- Tests must catch integration bugs (not just unit-level logic)

## Decision
Hybrid development environment with layered testing:

**Local development**:
- Web app runs locally via `yarn web` (Expo hot reload, instant feedback)
- CLI runs locally in dev mode, connecting to the VPS server
- Both local clients point at the production VPS server for real E2E behavior

**Testing layers**:
- **Unit tests**: Per-package test suites (vitest/jest) covering business logic, encryption, serialization
- **E2E tests**: Playwright for web app + CLI child process for terminal interactions, both hitting the VPS
- **CI pipeline**: `test-all.yml` runs all 5 package test suites on every push to main and on PRs
- **Regression policy**: every production bug gets a regression test before the fix is merged

**Test infrastructure**:
- Playwright for browser-based E2E (web app flows, auth, session management)
- CLI tests spawn `idle` as a child process and assert on stdout/stderr
- No mocking of server responses — tests hit the real VPS server (upstream convention)

## Consequences

### Positive
- Instant hot reload for UI changes (sub-second feedback vs. 3-minute deploy cycle)
- Regression tests prevent re-shipping known bugs
- CI catches type errors, test failures, and lint issues before merge
- Real server integration means tests catch environment-specific bugs (like the PGlite Bytes issue that only manifested in the VPS environment)

### Negative
- E2E tests depend on VPS health — if the server is down, tests fail for infrastructure reasons, not code reasons
- Not fully offline-capable: local dev still requires VPS connectivity for server-dependent features
- More CI minutes (running 5 package test suites on every push)
- Initial setup investment: writing the test harness delays feature work in the short term

## Alternatives Considered

### Full local stack (local server + local PGlite)
Run the entire stack locally for fully offline development. Rejected: the PGlite Bytes serialization bug only manifested in the VPS deployment environment, not locally. Environment drift between local and production is the exact class of bug we're trying to catch. A full local stack would have missed it.

### VPS-only development (deploy to test)
Continue the current model of deploying every change to the VPS and testing manually. Rejected: 3-minute feedback loops make UI iteration unacceptably slow. CSS tweaks, layout fixes, and interaction polish need sub-second feedback to be productive.

### Mocked tests only (no real server)
Mock all server responses for fast, deterministic, offline tests. Rejected: mocks encode assumptions about server behavior. Integration bugs like PGlite serialization, WebSocket reconnection, and auth flow edge cases only surface when hitting the real server. Mocks provide false confidence for this class of bug.
