# Idle Comprehensive Sprint — Design Document

**Date:** 2026-03-08
**Status:** Approved
**Scope:** 17 work items across 3 parallel tracks
**Duration:** Open-ended (complete when done)
**Team:** Tom + Claude

---

## Context

Alpha v1.0 shipped: TestFlight build v1.6.2 build 4, server live at idle-api.northglass.io, web at idle.northglass.io, CLI at idle-coder@0.14.1. User testing revealed functional bugs, branding gaps, and infrastructure needs. This sprint addresses everything in one pass.

## Scope: 17 Work Items

| # | Item | Priority | Track |
|---|------|----------|-------|
| 1 | Remote session input corruption | P0 | A |
| 2 | Session sync / mobile hook (migrated sessions) | P0 | A |
| 3 | Voice button non-functional (ElevenLabs TTS) | P0 | A |
| 4 | Slash command auto-discovery | P1 | A |
| 5 | "Last activity" timestamps on sessions | P1 | B |
| 6 | Drag-and-drop session reordering (E2E encrypted, synced) | P1 | B |
| 7 | Replace session icons + app logo (Northglass brand) | P1 | B |
| 8 | "Yolo Mode" → "Dangerously Skip Permissions" | P1 | B |
| 9 | Settings "Features" screen verification | P1 | B |
| 10 | "Support Us" → Buy Me a Coffee link | P1 | B |
| 11 | Attribution prompt off-by-one (fires on 2nd, should be 1st) | P1 | A |
| 12 | Analytics/logging verification | P2 | C |
| 13 | Delta security audit + remediate Medium findings | P2 | C |
| 14 | Token verification — check account existence | P2 | C |
| 15 | Upstream integration (cherry-pick relevant changes) | P2 | C |
| 16 | BYOK for ElevenLabs voice | P2 | C |
| 17 | Fresh TestFlight build + verification | P2 | C |

## Track Design

### Track A — Functional Bugs (Sequential: 1→2→3→4→11)

Deep debugging in CLI/server/app. Sequential because items touch overlapping code paths (session lifecycle, socket handling, CLI remote mode).

**Item 1: Remote Session Input Corruption**
- Symptom: Returning to terminal after being remote requires multiple spacebar presses, then typed text is garbled and sent to Claude
- Root cause hypothesis: CLI's PTY raw mode not properly restored on control return; stale bytes in stdin buffer; character encoding mismatch between mobile WebSocket data and CLI terminal emulator
- Investigation: `idle-cli/src/claude/` remote mode toggle, PTY drain logic, stdin buffer management
- Fix: Proper buffer flush on control handback, PTY mode restoration, input validation before forwarding to Claude
- Test: E2E test — start remote, send from app, return to local, verify clean input

**Item 2: Session Sync / Mobile Hook (Migrated Sessions)**
- Symptom: Sessions opened via `/resume` in a project folder don't sync to mobile; chat history missing; Claude stops responding
- Root cause hypothesis: Resumed session retains original machine binding; app subscribes by machine ID; socket room not updated
- Investigation: Session resume flow in CLI, machine association on resume, socket room join/leave logic
- Fix: Update session's machine binding on resume, emit proper socket events, ensure app receives session in its subscription
- Test: E2E test — create session on machine A, resume on machine B, verify mobile sees it

**Item 3: Voice Button (ElevenLabs TTS)**
- Symptom: Mic access requested but nothing happens
- Note: This is TTS (Claude reads responses aloud), not STT (user speaks). The mic permission request may itself be a bug — TTS shouldn't need mic access
- Investigation: `/v1/voice/token` endpoint, app voice integration code, ElevenLabs SDK initialization
- Fix: Wire up ElevenLabs TTS with proper token exchange; remove mic permission if not needed for TTS
- Test: Manual verification on TestFlight (TTS is hard to E2E test)

**Item 4: Slash Command Auto-Discovery**
- Symptom: Custom/extended commands don't populate
- Note: M4.3 (slash command descriptions) marked complete — dynamic SDK discovery works for built-in, not custom
- Investigation: Command discovery flow in CLI → server → app, how custom commands are registered and broadcast
- Fix: Ensure custom command metadata propagates through the full chain
- Test: E2E test — register custom command in CLI, verify it appears in app autocomplete

**Item 11: Attribution Prompt Off-by-One**
- Symptom: First-use attribution opt-in prompt fires on 2nd session creation instead of 1st
- Root cause hypothesis: Session count check is `> 1` instead of `>= 1`, or the count is checked before the session is persisted
- Investigation: Attribution prompt trigger logic in app, session creation callback timing
- Fix: Trigger on session count reaching 1 (after creation completes)
- Test: Unit test for trigger condition; manual verification on fresh install

### Track B — Features & Branding (Parallelizable)

Mostly independent UI/app changes. Can be worked in any order.

**Item 5: "Last Activity" Timestamps**
- Add lightweight "active 5m ago" / "active 2h ago" display to session list items
- Server already tracks activity (timeout.ts background loop)
- Wire schema: Add `lastActivityAt` field to session list response (or use existing field if present)
- App: Pull user's local timezone from device, format relative time
- Test: Unit test for relative time formatting; verify field in API response

**Item 6: Drag-and-Drop Session Reordering**
- Most complex item in Track B
- **Storage:** Encrypted ordering blob in UserKVStore (existing E2E encrypted KV store)
  - Key: `session-order`
  - Value: Encrypted JSON array of session IDs in user's preferred order
  - Server sees only ciphertext — zero knowledge of ordering
- **App:** Use `react-native-draggable-flatlist` (supports React Native + web)
  - Decrypt ordering on load, apply to FlatList
  - On drag complete: update local state, encrypt new order, persist to KV store
  - New sessions: append to end of ordering array
  - Deleted sessions: pruned on next load (stale IDs silently removed)
- **Performance:** Ordering is a small array of UUIDs — encrypt/decrypt is negligible
- **Sync:** KV store already syncs across devices; ordering follows automatically
- Test: Unit tests for ordering logic + encryption round-trip; manual drag-and-drop verification

**Item 7: Northglass Brand Icons + Logo**
- `feat/northglass-brand-alignment` branch has work started
- Design docs at `docs/plans/2026-03-08-northglass-brand-alignment-*`
- Replace generic session icons with Northglass-branded set
- Update main app logo across all platforms (iOS icon, web favicon, splash screen)
- Test: Visual verification on web + TestFlight

**Item 8: "Yolo Mode" → "Dangerously Skip Permissions"**
- String replacement across app + i18n files (11 languages)
- Search for "yolo" (case-insensitive) in all packages
- Update UI labels, tooltips, and any CLI flags/docs that reference it
- Test: Grep for remaining "yolo" references; verify UI labels

**Item 9: Settings "Features" Screen Verification**
- Manual QA pass on Enhanced Session Wizard and Markdown Copy v2
- Toggle each feature on/off, verify behavior changes
- If broken: file as separate bugs to fix in this sprint
- Test: Manual verification checklist

**Item 10: "Support Us" → Buy Me a Coffee**
- Add URL link in settings
- Straightforward — find the Support Us button, wire up the URL
- Test: Verify link opens correct page

### Track C — Infrastructure & Security (Items 12-17)

**Item 12: Analytics/Logging Verification**
- PostHog present but inactive (no API key) per audit finding D3
- Decision: Either configure PostHog with a real key OR remove dead analytics code
- If keeping: set up PostHog project, add key to server env, verify events transmit
- If removing: clean out all PostHog references
- Test: Verify events appear in PostHog dashboard (if keeping) or grep confirms removal

**Item 13: Delta Security Audit**
- Baseline: March 8 audit (27 findings: 0 Critical, 4 High fixed, 15 Medium, 8 Low)
- Approach: Diff codebase against audit baseline, focus on new attack surface
- Scope:
  - New endpoints added since audit
  - New socket events
  - Voice integration (ElevenLabs token handling)
  - BYOK key handling (once implemented)
  - Any new user input paths
  - Re-verify 15 Medium findings — mark resolved or still open
- Output: Updated audit doc (`docs/security/delta-security-audit.md`)
- Remediate any High findings immediately; Medium findings addressed in this sprint

**Item 14: Token Account Verification**
- Current: Token verification only checks signature + expiry, NOT account existence
- Risk: Deleted user's token passes auth; writes fail on FK constraints
- Fix: Add account existence check to auth middleware
  - Single DB query: `SELECT id FROM Account WHERE id = ?`
  - Cache result for token lifetime (avoid DB hammering)
  - Return 401 with clear error when account deleted
- Test: E2E test — create account → get token → delete account → verify 401

**Item 15: Upstream Integration**
- 75+ commits ahead of upstream (slopus/happy)
- Approach: Cherry-pick, not bulk merge
- Focus on: Claude Code SDK compatibility changes, security fixes, protocol updates
- Skip: Branding/naming changes (we've diverged intentionally)
- Test: Full test suite after each cherry-pick batch

**Item 16: BYOK for ElevenLabs Voice**
- **Depends on:** Item 3 (voice must work first)
- Settings screen: ElevenLabs API key input field
- Storage: UserKVStore (E2E encrypted, same as session ordering)
- Server: Voice token endpoint checks for user's BYOK key first, falls back to platform key
- Security: Key never stored in plaintext on server; encrypted client-side like all KV data
- Test: Integration test — store key, retrieve, verify voice token uses it

**Item 17: Fresh TestFlight Build**
- **Depends on:** All other items complete
- Final gate: full test suite passes, all items verified
- Build via EAS, submit to TestFlight
- Manual verification on device: walk through all 16 fixed items
- Test: Manual QA checklist covering every sprint item

## Dependency Graph

```
Track A (sequential):
  1 → 2 → 3 → 4 → 11

Track B (parallel, no deps):
  5, 6, 7, 8, 9, 10

Track C (mostly parallel):
  12 (independent)
  13 (independent, informs 14)
  14 (after 13)
  15 (independent)
  16 (after Track A item 3)
  17 (after ALL items)
```

## Documentation Requirements

Throughout this sprint:
- **progress.md**: Updated by every agent after completing work
- **ROADMAP.md**: Items marked complete as they're finished
- **AGENTS.md**: Updated if new files/directories are added
- **ADRs**: New ADR for any architectural decisions (drag-and-drop encryption model, BYOK architecture, token verification strategy)
- **Security audit doc**: New delta audit document
- **Design docs**: This document serves as the sprint design reference

## Testing Strategy

- Each bug fix gets a regression test (E2E or unit)
- Drag-and-drop: unit tests for ordering logic + encryption round-trip
- BYOK: integration test for key storage/retrieval
- Token fix: E2E test (create → token → delete → verify 401)
- Security findings: verification tests where automatable
- Current baseline: 643 tests passing; target: ~670+ after new tests
- Full suite must pass before TestFlight build (#17)

## Completion Criteria

- [ ] All 17 items implemented and verified
- [ ] Test suite passes (target ~670+)
- [ ] Delta security audit complete, no unresolved High findings
- [ ] TestFlight build submitted and manually verified
- [ ] ROADMAP.md, AGENTS.md, progress.md all updated
- [ ] Any new ADRs written and committed
