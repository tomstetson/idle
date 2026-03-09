# Idle Comprehensive Sprint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all known bugs, complete branding, add features, harden security, and ship a verified TestFlight build.

**Architecture:** Three parallel tracks — Track A (sequential P0 bug fixes in CLI/server/app), Track B (parallel UI features and branding in idle-app), Track C (infrastructure, security, and release). Tracks B and C can proceed independently. Track C item 16 (BYOK) depends on Track A item 3 (voice fix).

**Tech Stack:** TypeScript, React Native (Expo), Fastify 5, PGlite, Prisma 6, Socket.IO, ElevenLabs SDK, PostHog, Playwright (E2E)

**Documentation Rules:** Every agent must update progress.md after completing work. Update ROADMAP.md as items complete. Write ADRs for architectural decisions. Update AGENTS.md if files/directories are added.

---

## Track A: Functional Bugs (Sequential)

### Task 1: Fix Remote Session Input Corruption

**Root Cause:** TTY input buffer not flushed between raw-mode remote teardown and Claude inheriting stdin. The 100ms delay in `RemoteModeDisplay.tsx` creates a window where keystrokes buffer in raw mode. When `claudeRemoteLauncher.ts` calls `setRawMode(false)` and Ink unmounts, buffered raw-mode bytes survive the raw→cooked transition and get inherited by the Claude child process as garbled input.

**Files:**
- Modify: `packages/idle-cli/src/claude/claudeRemoteLauncher.ts:441-462` (teardown/flush)
- Modify: `packages/idle-cli/src/ui/ink/RemoteModeDisplay.tsx:75-88` (remove 100ms delay)
- Modify: `packages/idle-cli/src/claude/claudeLocal.ts:187-188` (stdin handoff)
- Test: `packages/idle-cli/src/claude/__tests__/remoteToLocalHandoff.test.ts` (new)

**Step 1: Read the three key files to confirm current state**

Read `claudeRemoteLauncher.ts` (lines 55-70 and 435-470), `RemoteModeDisplay.tsx` (lines 70-95), and `claudeLocal.ts` (lines 180-200).

**Step 2: Write a failing test for clean stdin handoff**

```typescript
// packages/idle-cli/src/claude/__tests__/remoteToLocalHandoff.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('remote to local handoff', () => {
  it('should flush stdin buffer before handing off to local mode', () => {
    // Mock process.stdin with buffered raw-mode bytes
    const mockStdin = {
      isPaused: () => false,
      pause: vi.fn(),
      resume: vi.fn(),
      setRawMode: vi.fn(),
      read: vi.fn().mockReturnValueOnce(Buffer.from([0x1b, 0x5b, 0x41])).mockReturnValueOnce(null),
      removeAllListeners: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
    // After flush, read() should return null (buffer empty)
    // Implementation will call stdin.read() in a loop to drain
    // Then pause() before handing to child
  })

  it('should not send stale bytes to Claude process after mode switch', () => {
    // Verify that after cleanupRemoteMode(), no buffered data remains
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder test -- --run remoteToLocalHandoff`
Expected: FAIL — test file and functions don't exist yet in implementation

**Step 4: Implement TTY buffer flush in remote teardown**

In `claudeRemoteLauncher.ts`, modify the finally block (around line 441-462):

```typescript
// In the finally block, BEFORE setRawMode(false):
// 1. Remove all stdin listeners first
process.stdin.removeAllListeners('data')
process.stdin.removeAllListeners('keypress')

// 2. Drain the TTY input buffer
// Read all buffered bytes to discard them
process.stdin.resume()
while (process.stdin.read() !== null) {
  // discard buffered raw-mode bytes
}

// 3. Now safely transition out of raw mode
if (process.stdin.isTTY) {
  process.stdin.setRawMode(false)
}

// 4. Unmount Ink AFTER raw mode is off
inkInstance.unmount()

// 5. Pause stdin for handoff
process.stdin.pause()
```

**Step 5: Remove the 100ms delay in RemoteModeDisplay.tsx**

In `RemoteModeDisplay.tsx` around lines 80-82, the `await new Promise(resolve => setTimeout(resolve, 100))` introduces a keystroke buffering window. Replace with immediate callback:

```typescript
// Before (lines ~80-82):
// setConfirmationMode('switching')
// await new Promise(resolve => setTimeout(resolve, 100))
// onSwitchToLocal()

// After:
onSwitchToLocal()
```

**Step 6: Add stdin drain guard in claudeLocal.ts**

In `claudeLocal.ts` around line 187, add a drain check before spawning Claude:

```typescript
// Before spawning child process with stdio: 'inherit'
// Ensure stdin is clean
if (process.stdin.readable) {
  process.stdin.pause()
  while (process.stdin.read() !== null) { /* drain */ }
}
```

**Step 7: Run tests to verify they pass**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder test -- --run remoteToLocalHandoff`
Expected: PASS

**Step 8: Run full CLI test suite for regressions**

Run: `yarn workspace idle-coder test`
Expected: All 484+ tests pass

**Step 9: Commit**

```bash
git add packages/idle-cli/src/claude/claudeRemoteLauncher.ts packages/idle-cli/src/ui/ink/RemoteModeDisplay.tsx packages/idle-cli/src/claude/claudeLocal.ts packages/idle-cli/src/claude/__tests__/remoteToLocalHandoff.test.ts
git commit -m "fix: flush TTY input buffer on remote-to-local mode handoff

Drain stdin buffer and remove all listeners before transitioning out of
raw mode. Remove 100ms delay in RemoteModeDisplay that allowed keystroke
buffering. Add drain guard in claudeLocal before spawning child process.

Fixes garbled input sent to Claude after returning from remote control."
```

**Step 10: Update progress.md**

---

### Task 2: Fix Session Sync for Migrated/Resumed Sessions

**Root Cause:** `runClaude.ts:53` generates a fresh `randomUUID()` tag on every invocation, including `--resume`. This creates a brand new Idle server session with no history. There is no mechanism to find an existing Idle session by `claudeSessionId` and reconnect to it.

**Files:**
- Modify: `packages/idle-cli/src/claude/runClaude.ts:53,119` (tag generation + session lookup)
- Modify: `packages/idle-cli/src/claude/session.ts:106-113` (onSessionFound)
- Modify: `packages/idle-server/sources/app/api/routes/sessionRoutes.ts:205-266` (lookup by claudeSessionId)
- Modify: `packages/idle-wire/src/schemas/` (add claudeSessionId to session lookup if needed)
- Test: `packages/idle-server/sources/__tests__/sessionResume.test.ts` (new)

**Step 1: Read the key files to confirm current state**

Read `runClaude.ts` (lines 40-60, 110-200), `session.ts` (lines 95-120), `sessionRoutes.ts` (lines 195-270).

**Step 2: Write a failing test for session resume lookup**

```typescript
// Server test: when getOrCreateSession is called with a claudeSessionId
// that matches an existing session, it should return that session (not create new)
describe('session resume sync', () => {
  it('should find existing Idle session by claudeSessionId on resume', async () => {
    // 1. Create a session with claudeSessionId set
    // 2. Call getOrCreateSession with metadata.claudeSessionId matching
    // 3. Expect the SAME session ID returned, not a new one
  })

  it('should create new session when no matching claudeSessionId exists', async () => {
    // Normal path: no match, creates new
  })
})
```

**Step 3: Run test to verify it fails**

Run: `yarn workspace @northglass/idle-server test -- --run sessionResume`
Expected: FAIL

**Step 4: Add claudeSessionId lookup to session routes**

In `sessionRoutes.ts`, modify the `getOrCreateSession` logic (around line 205-228) to first check for an existing session with matching `claudeSessionId` in metadata:

```typescript
// Before creating a new session, check if we can find an existing one by claudeSessionId
if (metadata?.claudeSessionId) {
  const existingSession = await db.session.findFirst({
    where: {
      accountId: userId,
      // Search metadata JSON for matching claudeSessionId
    },
    select: sessionSelectNoBytes,
  })
  if (existingSession) {
    // Update machine association if different
    // Return existing session
    return existingSession
  }
}
```

**Step 5: Modify runClaude.ts to pass claudeSessionId for resume**

In `runClaude.ts`, when `--resume` is detected in `claudeArgs` (or when the session starts and `onSessionFound` fires with a Claude session ID), update the Idle session's metadata to include the `claudeSessionId` so that future lookups can find it.

The key insight: on `--resume`, the CLI doesn't know the Claude session ID until Claude starts and the SessionStart hook fires. So the flow is:
1. CLI creates/gets Idle session with a tag (existing behavior)
2. Claude starts with `--resume`
3. `onSessionFound` fires with the resumed Claude session ID
4. `session.ts` calls `updateMetadata({ claudeSessionId })` — this already happens
5. On the NEXT `--resume` of the same Claude session, the CLI should look up the Idle session by `claudeSessionId` instead of creating a new one

Modify `runClaude.ts:53` to check for a `--resume` argument and, if present, attempt to extract the Claude session ID from the resume target, then pass it as part of the `getOrCreateSession` call.

**Step 6: Run tests to verify they pass**

Run: `yarn workspace @northglass/idle-server test -- --run sessionResume`
Expected: PASS

**Step 7: Run full server test suite for regressions**

Run: `yarn workspace @northglass/idle-server test`
Expected: All 129+ tests pass

**Step 8: Commit**

```bash
git add packages/idle-cli/src/claude/runClaude.ts packages/idle-cli/src/claude/session.ts packages/idle-server/sources/app/api/routes/sessionRoutes.ts packages/idle-server/sources/__tests__/sessionResume.test.ts
git commit -m "fix: sync resumed sessions to mobile by matching claudeSessionId

When --resume is used, look up existing Idle session by claudeSessionId
in metadata before creating a new one. This preserves chat history and
ensures mobile app sees the resumed session with full context.

Fixes session sync failure when using /resume in project folders."
```

**Step 9: Update progress.md and ROADMAP.md**

---

### Task 3: Fix Voice Button (ElevenLabs TTS)

**Root Cause:** Multi-layered failure: (1) `config.elevenLabsAgentId*` likely not configured in app config, (2) server returns 400 in production without `revenueCatPublicKey`, (3) the 400 fallback in `apiVoice.ts` returns `{allowed: true}` with no token, (4) `startSession` throws silently when neither token nor agentId is provided. Also, mic permission is requested but TTS shouldn't need it (though ElevenLabs Conversational AI is bidirectional and does use the mic).

**Files:**
- Modify: `packages/idle-app/sources/realtime/RealtimeSession.ts:15-95` (error handling, config validation)
- Modify: `packages/idle-app/sources/sync/apiVoice.ts:20-37` (fix request body, error handling)
- Modify: `packages/idle-server/sources/app/api/routes/voiceRoutes.ts:6-112` (fix production gating)
- Modify: `packages/idle-app/sources/realtime/RealtimeVoiceSession.tsx` (error surfacing)
- Verify: `packages/idle-app/sources/sync/appConfig.ts` (check elevenLabsAgentId config values)
- Test: `packages/idle-server/sources/__tests__/voiceToken.test.ts` (new)

**Step 1: Read all voice-related files to confirm state**

Read `RealtimeSession.ts`, `apiVoice.ts`, `voiceRoutes.ts`, `RealtimeVoiceSession.tsx`, and `appConfig.ts` (search for `elevenLabs`).

**Step 2: Verify ElevenLabs config values exist**

Check `appConfig.ts` for `elevenLabsAgentIdDev` and `elevenLabsAgentIdProd`. Check `.env.example` for the env vars. If they're empty/undefined, that's the primary failure — we need to either configure them or make the voice feature gracefully degrade.

**Step 3: Write a failing test for the voice token endpoint**

```typescript
describe('POST /v1/voice/token', () => {
  it('should return a voice token without requiring revenueCatPublicKey for alpha', async () => {
    // Alpha users shouldn't need RevenueCat subscription
    // Server should issue token with just agentId
  })

  it('should return 400 with clear error when ELEVENLABS_API_KEY is not set', async () => {
    // If server has no ElevenLabs key, return informative error
  })

  it('should return 400 when agentId is missing', async () => {
    // Validate required fields
  })
})
```

**Step 4: Run test to verify it fails**

Run: `yarn workspace @northglass/idle-server test -- --run voiceToken`
Expected: FAIL

**Step 5: Fix server voice route — remove RevenueCat gate for alpha**

In `voiceRoutes.ts`, the production check for `revenueCatPublicKey` (line 34) blocks all alpha users. For the alpha phase, bypass the RevenueCat subscription check:

```typescript
// Remove or gate the RevenueCat check for alpha
// Option: check env var IDLE_REQUIRE_SUBSCRIPTION=true to enable paywall
const requireSubscription = process.env.IDLE_REQUIRE_SUBSCRIPTION === 'true'
if (requireSubscription && !body.revenueCatPublicKey) {
  return reply.status(400).send({ allowed: false, error: 'Subscription required' })
}
```

**Step 6: Fix client apiVoice.ts — proper error handling**

In `apiVoice.ts`, the 400 fallback that returns `{ allowed: true }` is dangerous. Fix:

```typescript
// Instead of silently returning allowed:true on 400:
if (response.status !== 200) {
  const errorBody = await response.json().catch(() => ({}))
  return { allowed: false, error: errorBody.error || `Voice service error: ${response.status}` }
}
```

**Step 7: Fix RealtimeSession.ts — validate config before requesting mic**

```typescript
// Before requesting mic permission, validate we have a working config
const agentId = __DEV__ ? config.elevenLabsAgentIdDev : config.elevenLabsAgentIdProd
if (!agentId) {
  console.warn('ElevenLabs agent ID not configured')
  // Show user-visible error instead of silent failure
  return
}
```

**Step 8: Fix RealtimeVoiceSession.tsx — surface errors to user**

The `onError` handler at line 112-115 silently sets status to `'disconnected'`. Add user-visible error reporting:

```typescript
onError: (error) => {
  console.error('Voice session error:', error)
  setStatus('error')
  // Surface error message to the UI
  setErrorMessage(error.message || 'Voice connection failed')
}
```

**Step 9: Run tests**

Run: `yarn workspace @northglass/idle-server test -- --run voiceToken`
Expected: PASS

**Step 10: Run full server test suite**

Run: `yarn workspace @northglass/idle-server test`
Expected: All tests pass

**Step 11: Commit**

```bash
git add packages/idle-app/sources/realtime/RealtimeSession.ts packages/idle-app/sources/sync/apiVoice.ts packages/idle-server/sources/app/api/routes/voiceRoutes.ts packages/idle-app/sources/realtime/RealtimeVoiceSession.tsx packages/idle-server/sources/__tests__/voiceToken.test.ts
git commit -m "fix: wire up ElevenLabs TTS voice with proper error handling

Remove RevenueCat subscription gate for alpha phase. Fix silent failure
in apiVoice.ts 400 fallback. Validate ElevenLabs agentId config before
requesting mic permission. Surface voice errors to user instead of
silently disconnecting.

Fixes voice button requesting mic access then doing nothing."
```

**Step 12: Update progress.md**

---

### Task 4: Fix Slash Command Auto-Discovery

**Root Cause:** The metadata extractor in `metadataExtractor.ts` launches a background SDK query and aborts immediately after capturing the `system/init` event. Project-specific custom commands (from `.claude/commands/`) may not be included in the init message or may load after the abort. Additionally, `commandDescriptions` is not in the CLI's `Metadata` Zod type at `types.ts:256-257`, so it may be stripped during validation.

**Files:**
- Modify: `packages/idle-cli/src/claude/sdk/metadataExtractor.ts:26-51` (delay abort, capture custom commands)
- Modify: `packages/idle-cli/src/api/types.ts:256-257` (add commandDescriptions to Metadata type)
- Test: `packages/idle-cli/src/claude/sdk/__tests__/metadataExtractor.test.ts` (new or extend existing)

**Step 1: Read metadataExtractor.ts and types.ts**

Read `metadataExtractor.ts` fully and `types.ts` around lines 245-270.

**Step 2: Write a failing test**

```typescript
describe('metadataExtractor', () => {
  it('should include commandDescriptions in extracted metadata', () => {
    // Verify the Metadata type accepts commandDescriptions
  })

  it('should capture project-specific custom commands', () => {
    // Verify extractor waits long enough for custom commands to load
  })
})
```

**Step 3: Run test to verify it fails**

Run: `yarn workspace idle-coder test -- --run metadataExtractor`
Expected: FAIL

**Step 4: Add commandDescriptions to Metadata type**

In `types.ts`, add `commandDescriptions` to the Metadata Zod schema:

```typescript
// Around line 256-257, add:
commandDescriptions: z.record(z.string(), z.string()).optional(),
```

**Step 5: Delay abort in metadataExtractor to capture custom commands**

In `metadataExtractor.ts`, instead of aborting immediately after init:

```typescript
// Instead of immediate abort after system/init:
// Wait a short delay for custom commands to load, then abort
setTimeout(() => {
  abortController.abort()
}, 2000) // 2 seconds should be enough for custom command discovery
```

Or better: listen for a secondary event that indicates command discovery is complete, if the SDK emits one.

**Step 6: Run tests**

Run: `yarn workspace idle-coder test -- --run metadataExtractor`
Expected: PASS

**Step 7: Run full CLI test suite**

Run: `yarn workspace idle-coder test`
Expected: All tests pass

**Step 8: Commit**

```bash
git add packages/idle-cli/src/claude/sdk/metadataExtractor.ts packages/idle-cli/src/api/types.ts packages/idle-cli/src/claude/sdk/__tests__/metadataExtractor.test.ts
git commit -m "fix: include custom slash commands in auto-discovery

Add commandDescriptions to Metadata Zod type so it survives validation.
Delay metadata extractor abort to allow project-specific custom commands
to load from .claude/commands/ directories.

Fixes custom slash commands not appearing in app autocomplete."
```

**Step 9: Update progress.md**

---

### Task 5: Fix Attribution Prompt Off-by-One

**Root Cause:** The attribution prompt at `new/index.tsx:1069-1072` reads `attributionPromptAnswered` from `useSetting()`, which is reactive. The `sync.applySettings({ attributionPromptAnswered: true })` call inside `showAttributionPrompt()` is async — the React state may not reflect the write immediately. However, the reported behavior (fires on 2nd not 1st) suggests the initial server sync delivers a stale `true` value that gets overwritten on a subsequent render cycle.

**Files:**
- Modify: `packages/idle-app/sources/app/(app)/new/index.tsx:1069-1072` (fix trigger logic)
- Modify: `packages/idle-app/sources/app/(app)/new/index.tsx:104-134` (`showAttributionPrompt`)
- Test: Manual verification on fresh install (unit test for the condition)

**Step 1: Read the new session wizard file**

Read `packages/idle-app/sources/app/(app)/new/index.tsx` focusing on lines 95-140 and 1060-1080, plus the `useSetting` call at line 335.

**Step 2: Analyze the exact trigger condition**

Trace the full lifecycle:
1. Fresh install → `attributionPromptAnswered` default is `false`
2. Settings sync from server may deliver a different value
3. First session create → check the condition
4. Need to understand timing of when settings sync completes vs when user first creates a session

**Step 3: Fix the trigger logic**

The most robust fix: use a ref to track whether the prompt has been shown in THIS app session, independent of the sync'd setting. Read the sync'd setting for persistence, but use a local ref for the immediate trigger:

```typescript
const attributionPromptShownRef = useRef(false)

// In the submit handler:
if (!attributionPromptAnswered && !attributionPromptShownRef.current) {
  attributionPromptShownRef.current = true
  await showAttributionPrompt()
}
```

And ensure `showAttributionPrompt` calls `sync.applySettings` synchronously before returning.

**Step 4: Manual verification**

Test on web (`yarn web`) with a fresh account:
1. Create first session → attribution prompt should appear
2. Answer the prompt
3. Create second session → prompt should NOT appear
4. Clear app data, reload → prompt should appear on first session again

**Step 5: Commit**

```bash
git add packages/idle-app/sources/app/(app)/new/index.tsx
git commit -m "fix: show attribution prompt on first session creation, not second

Add ref guard to prevent race between async settings sync and prompt
trigger. Ensures prompt fires exactly once on the first session create
regardless of server sync timing."
```

**Step 6: Update progress.md**

---

## Track B: Features & Branding (Parallelizable)

### Task 6: Add "Last Activity" Timestamps to Sessions

**Context:** `activeAt` (Unix ms) is already in the server session response. `formatLastSeen()` in `sessionUtils.ts:206` already produces "5 minutes ago" text. Currently only shown for disconnected sessions. Need to show for all sessions.

**Files:**
- Modify: `packages/idle-app/sources/utils/sessionUtils.ts:22-73` (`useSessionStatus` — add timestamp for active sessions)
- Modify: `packages/idle-app/sources/components/SessionsList.tsx:425-572` (`SessionItem` — display timestamp)
- Test: Unit test for timestamp display logic

**Step 1: Read sessionUtils.ts and SessionsList.tsx**

Read `sessionUtils.ts` lines 1-80 and 200-240, `SessionsList.tsx` lines 420-575.

**Step 2: Write a failing test**

```typescript
describe('useSessionStatus', () => {
  it('should show relative time for active sessions', () => {
    const session = { activeAt: Date.now() - 300000, isActive: true } // 5 min ago
    // Expected: status includes "5m ago" or similar
  })

  it('should show "just now" for very recent activity', () => {
    const session = { activeAt: Date.now() - 5000, isActive: true }
    // Expected: "just now" or "active now"
  })
})
```

**Step 3: Run test to verify it fails**

Run: `yarn workspace idle-app test -- --run sessionUtils`
Expected: FAIL

**Step 4: Modify useSessionStatus to include timestamp for all sessions**

In `sessionUtils.ts`, modify the active session path to include a relative time alongside the "online" status:

```typescript
// For active sessions, instead of just showing "Online":
// Show "Online · 5m ago" or "Online · just now"
if (isOnline) {
  const relativeTime = formatLastSeen(session.activeAt, false)
  statusText = `${t('status.online')} · ${relativeTime}`
}
```

**Step 5: Run tests**

Run: `yarn workspace idle-app test -- --run sessionUtils`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/idle-app/sources/utils/sessionUtils.ts
git commit -m "feat: show last activity timestamp on all session list items

Display relative time ('5m ago', 'just now') alongside online/offline
status for all sessions. Uses existing formatLastSeen utility and
activeAt field already in the server response."
```

---

### Task 7: Implement Drag-and-Drop Session Reordering

**Context:** Sessions currently render in a plain FlatList sorted by `updatedAt`. Need to add drag-and-drop with persistent ordering stored as an E2E encrypted blob in UserKVStore.

**Files:**
- Modify: `packages/idle-app/package.json` (add react-native-draggable-flatlist)
- Modify: `packages/idle-app/sources/components/SessionsList.tsx:409-421` (replace FlatList)
- Modify: `packages/idle-app/sources/sync/storage.ts:152-282` (apply custom order)
- Create: `packages/idle-app/sources/sync/sessionOrder.ts` (encrypted ordering logic)
- Test: `packages/idle-app/sources/sync/__tests__/sessionOrder.test.ts` (new)

**Step 1: Read SessionsList.tsx, storage.ts, and apiKv.ts**

Read `SessionsList.tsx` lines 400-430, `storage.ts` lines 145-285, `apiKv.ts` fully.

**Step 2: Install react-native-draggable-flatlist**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app add react-native-draggable-flatlist`

**Step 3: Write a failing test for session ordering logic**

```typescript
// packages/idle-app/sources/sync/__tests__/sessionOrder.test.ts
describe('session ordering', () => {
  it('should apply custom order to session list', () => {
    const sessions = [
      { id: 'a', updatedAt: 100 },
      { id: 'b', updatedAt: 200 },
      { id: 'c', updatedAt: 300 },
    ]
    const customOrder = ['c', 'a', 'b']
    const result = applySessionOrder(sessions, customOrder)
    expect(result.map(s => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('should append new sessions not in custom order to the end', () => {
    const sessions = [
      { id: 'a', updatedAt: 100 },
      { id: 'b', updatedAt: 200 },
      { id: 'new', updatedAt: 300 },
    ]
    const customOrder = ['b', 'a']
    const result = applySessionOrder(sessions, customOrder)
    expect(result.map(s => s.id)).toEqual(['b', 'a', 'new'])
  })

  it('should silently prune deleted session IDs from order', () => {
    const sessions = [{ id: 'a', updatedAt: 100 }]
    const customOrder = ['deleted', 'a', 'also-deleted']
    const result = applySessionOrder(sessions, customOrder)
    expect(result.map(s => s.id)).toEqual(['a'])
  })
})
```

**Step 4: Run test to verify it fails**

Run: `yarn workspace idle-app test -- --run sessionOrder`
Expected: FAIL

**Step 5: Create sessionOrder.ts with ordering logic**

```typescript
// packages/idle-app/sources/sync/sessionOrder.ts
import { kvGet, kvSet } from './apiKv'
import { encrypt, decrypt } from '../encryption/aes'

const SESSION_ORDER_KEY = 'session-order'

export function applySessionOrder<T extends { id: string }>(
  sessions: T[],
  customOrder: string[]
): T[] {
  const sessionMap = new Map(sessions.map(s => [s.id, s]))
  const ordered: T[] = []

  // Apply custom order (skip IDs not in sessions — prunes deleted)
  for (const id of customOrder) {
    const session = sessionMap.get(id)
    if (session) {
      ordered.push(session)
      sessionMap.delete(id)
    }
  }

  // Append remaining sessions not in custom order
  for (const session of sessionMap.values()) {
    ordered.push(session)
  }

  return ordered
}

export async function loadSessionOrder(credentials: Credentials): Promise<string[]> {
  try {
    const result = await kvGet(credentials, SESSION_ORDER_KEY)
    if (!result?.value) return []
    const decrypted = await decrypt(result.value, credentials.dek)
    return JSON.parse(decrypted)
  } catch {
    return []
  }
}

export async function saveSessionOrder(
  credentials: Credentials,
  order: string[]
): Promise<void> {
  const encrypted = await encrypt(JSON.stringify(order), credentials.dek)
  await kvSet(credentials, SESSION_ORDER_KEY, encrypted)
}
```

**Step 6: Run tests**

Run: `yarn workspace idle-app test -- --run sessionOrder`
Expected: PASS

**Step 7: Integrate DraggableFlatList in SessionsList.tsx**

Replace the `FlatList` with `DraggableFlatList` from `react-native-draggable-flatlist`. Add `onDragEnd` handler that calls `saveSessionOrder`. Wire `renderItem` to include drag handle.

**Step 8: Integrate ordering in storage.ts**

In `buildSessionListViewData` (line 152), after sorting by `updatedAt`, apply the custom order from the loaded session order array.

**Step 9: Write ADR for encrypted session ordering**

Create `docs/adr/008-encrypted-session-ordering.md`:
- Context: Users want to reorder sessions; server should not see ordering
- Decision: Store ordering as encrypted blob in UserKVStore
- Consequences: Sync is automatic via existing KV sync; ordering is per-user; no server schema changes needed

**Step 10: Run full app test suite**

Run: `yarn workspace idle-app test`
Expected: All tests pass

**Step 11: Manual verification on web**

Run `yarn web`, verify drag-and-drop works, order persists after refresh.

**Step 12: Commit**

```bash
git add packages/idle-app/sources/sync/sessionOrder.ts packages/idle-app/sources/sync/__tests__/sessionOrder.test.ts packages/idle-app/sources/components/SessionsList.tsx packages/idle-app/sources/sync/storage.ts packages/idle-app/package.json docs/adr/008-encrypted-session-ordering.md
git commit -m "feat: add drag-and-drop session reordering with E2E encrypted ordering

Store session order as encrypted blob in UserKVStore (zero-knowledge).
Use react-native-draggable-flatlist for cross-platform drag support.
New sessions append to end; deleted sessions pruned silently.

ADR-008 documents the encryption model for session ordering."
```

---

### Task 8: Replace Session Icons + App Logo (Northglass Brand)

**Context:** SVG assets in `brand/svgAssets.ts` are already updated with the Northglass bridge mark. PNG assets (`icon.png`, `logotype-*.png`, etc.) still need replacing. Design docs exist at `docs/plans/2026-03-08-northglass-brand-alignment-*`.

**Files:**
- Modify: `packages/idle-app/sources/assets/images/icon.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/icon-adaptive.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/icon-monochrome.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/icon-notification.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/favicon.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/logotype-light.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/logotype-dark.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/splash-android-light.png` (replace)
- Modify: `packages/idle-app/sources/assets/images/splash-android-dark.png` (replace)
- Reference: `docs/plans/2026-03-08-northglass-brand-alignment-design.md`
- Reference: `scripts/generate-brand-assets.sh`

**Step 1: Read the brand alignment design doc**

Read `docs/plans/2026-03-08-northglass-brand-alignment-design.md` for full spec.

**Step 2: Read the asset generation script**

Read `scripts/generate-brand-assets.sh` to understand how PNGs are generated from SVGs.

**Step 3: Generate new PNG assets from SVG sources**

Run the generation script (or create renders from the SVG components):

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && bash scripts/generate-brand-assets.sh`

If the script doesn't exist or doesn't cover all assets, generate manually using the SVG mark from `svgAssets.ts`. Sizes needed per `app.config.js`:
- `icon.png`: 1024x1024 (app store icon)
- `icon-adaptive.png`: 1024x1024 (Android adaptive)
- `icon-monochrome.png`: 1024x1024 (Android monochrome)
- `icon-notification.png`: 96x96 (notification)
- `favicon.png`: 48x48 (web)
- `logotype-light.png`: wordmark on light background
- `logotype-dark.png`: wordmark on dark background
- `splash-android-light.png`: splash screen light
- `splash-android-dark.png`: splash screen dark

**Step 4: Replace the PNG files**

Copy generated assets to `packages/idle-app/sources/assets/images/`.

**Step 5: Verify on web**

Run `yarn web` and check: favicon, splash screen, app icon, welcome screen logotype.

**Step 6: Commit**

```bash
git add packages/idle-app/sources/assets/images/
git commit -m "feat: replace all app icons and logos with Northglass brand assets

Update icon.png, adaptive icon, monochrome icon, notification icon,
favicon, logotype (light/dark), and splash screens with Northglass
bridge mark design. SVG sources were already updated in brand/."
```

---

### Task 9: Rename "Yolo Mode" to "Dangerously Skip Permissions"

**Context:** 41 files contain "yolo" but only display strings need changing. The underlying mode keys (`bypassPermissions`, `yolo`, `safe-yolo`) are protocol identifiers and must stay as-is.

**Files:**
- Modify: `packages/idle-app/sources/text/translations/en.ts:441-483` (display strings)
- Modify: All 10 other translation files in `packages/idle-app/sources/text/translations/`
- Modify: `packages/idle-cli/src/index.ts:567,647` (CLI help text)
- DO NOT modify: `settings.ts` enum values, `modelModeOptions.ts` keys, wire protocol values

**Step 1: Read en.ts translation strings**

Read `packages/idle-app/sources/text/translations/en.ts` lines 430-490.

**Step 2: Update English translations**

```typescript
// Change display names only:
bypassPermissions: 'Dangerously Skip Permissions',  // was 'Yolo'
badgeBypassAllPermissions: 'Skip Perms',  // was 'Yolo' — short form for badges
// For Codex/Gemini modes:
safeYolo: 'Safe Auto',  // was 'Safe YOLO'
yolo: 'Full Auto',  // was 'YOLO'
```

**Step 3: Update all 10 other language files**

Apply equivalent translations. For non-English, the concept "Dangerously Skip Permissions" should be localized appropriately. The key names stay the same.

Languages to update: `ja.ts`, `pl.ts`, `pt.ts`, `ru.ts`, `zh-Hant.ts`, `zh-Hans.ts`, `es.ts`, `it.ts`, `ca.ts`, `fr.ts` (if exists).

**Step 4: Update CLI help text**

In `packages/idle-cli/src/index.ts` around line 647, update the description of `--yolo`:

```typescript
// Keep --yolo as the flag name (backward compat alias)
// Update the description:
'--yolo: Alias for --dangerously-skip-permissions (bypasses all permission prompts)'
```

**Step 5: Verify no "Yolo" remains in user-visible strings**

Run: Grep for `Yolo` and `YOLO` in translation files to confirm all instances updated.

**Step 6: Commit**

```bash
git add packages/idle-app/sources/text/translations/ packages/idle-cli/src/index.ts
git commit -m "refactor: rename 'Yolo Mode' to 'Dangerously Skip Permissions' in UI

Update display strings in all 11 language files. CLI --yolo flag kept
as backward-compatible alias with updated help text. Protocol-level
mode keys unchanged (bypassPermissions, yolo, safe-yolo)."
```

---

### Task 10: Verify Settings "Features" Screen

**Context:** Manual QA pass on Enhanced Session Wizard and Markdown Copy v2 toggles in `features.tsx` (145 lines).

**Files:**
- Verify: `packages/idle-app/sources/app/(app)/settings/features.tsx`
- Verify: `packages/idle-app/sources/sync/settings.ts:267` (useEnhancedSessionWizard)
- Verify: `packages/idle-app/sources/sync/localSettings.ts:13` (markdownCopyV2)

**Step 1: Read the features screen**

Read `features.tsx` fully.

**Step 2: Manual QA on web**

Run `yarn web` and navigate to Settings → Features:
1. Toggle Enhanced Session Wizard ON → create a new session → verify the enhanced wizard appears
2. Toggle Enhanced Session Wizard OFF → create a new session → verify the standard wizard appears
3. Toggle Markdown Copy v2 ON → long-press a message → verify copy modal appears
4. Toggle Markdown Copy v2 OFF → long-press a message → verify native selection behavior

**Step 3: Document findings**

If everything works: note as verified. If broken: create follow-up bug tasks with specific details.

**Step 4: Commit if any fixes needed**

```bash
git commit -m "fix: [describe specific fix if needed]"
```

---

### Task 11: Link "Support Us" to Buy Me a Coffee

**Context:** Currently opens RevenueCat paywall via `handleSubscribe`. Replace with `Linking.openURL` to BMAC page.

**Files:**
- Modify: `packages/idle-app/sources/components/SettingsView.tsx:65-73,178-187`
- Modify: `packages/idle-app/sources/text/translations/en.ts:142-144` (update strings)
- Modify: All other translation files for the same keys

**Step 1: Read SettingsView.tsx**

Read `SettingsView.tsx` lines 60-80 and 175-190.

**Step 2: Get the BMAC URL from user**

Need to know the exact Buy Me a Coffee URL to link to. If not yet created, use a placeholder and note it.

**Step 3: Replace handleSubscribe with Linking.openURL**

```typescript
import { Linking } from 'react-native'

const BMAC_URL = 'https://buymeacoffee.com/northglass' // or whatever the actual URL is

const handleSupportUs = () => {
  Linking.openURL(BMAC_URL)
}
```

**Step 4: Update the Item component**

```typescript
<Item
    title={t('settings.supportUs')}
    subtitle={t('settings.supportUsSubtitle')}
    icon={<Ionicons name="heart" size={29} color="#FF3B30" />}
    showChevron={true}
    onPress={handleSupportUs}
/>
```

**Step 5: Update translations**

```typescript
supportUs: 'Support Us',
supportUsSubtitle: 'Buy us a coffee',
supportUsSubtitlePro: 'Thank you for your support!',
```

**Step 6: Verify on web**

Run `yarn web`, navigate to Settings, tap "Support Us", verify correct URL opens.

**Step 7: Commit**

```bash
git add packages/idle-app/sources/components/SettingsView.tsx packages/idle-app/sources/text/translations/
git commit -m "feat: link Support Us button to Buy Me a Coffee page

Replace RevenueCat paywall with direct BMAC link. Always clickable
regardless of subscription status."
```

---

## Track C: Infrastructure & Security

### Task 12: Analytics/Logging Verification

**Context:** PostHog SDK is integrated with 22 tracked events but no API key is configured. Either activate it or clean it up.

**Files:**
- Verify: `packages/idle-app/sources/track/tracking.ts` (PostHog init)
- Verify: `packages/idle-app/sources/track/index.ts` (22 event functions)
- Verify: `packages/idle-app/sources/sync/appConfig.ts` (key name mismatch)
- Modify: `packages/idle-app/.env.example` (document correct env var)
- Decision: Activate PostHog or remove it?

**Step 1: Read tracking infrastructure**

Read `tracking.ts`, `track/index.ts`, `appConfig.ts` (search for postHog).

**Step 2: Verify the env var name mismatch**

The research found: `.env.example` uses `EXPO_PUBLIC_POSTHOG_API_KEY` but `appConfig.ts` override uses `EXPO_PUBLIC_POSTHOG_KEY`. Verify which name `app.config.js` actually reads and passes through.

**Step 3: Decision point — ask user**

Present options:
- A: Activate PostHog — create a PostHog project, add API key to production env
- B: Remove PostHog — clean out all references, reduce bundle size
- C: Keep dormant — fix the env var mismatch, document how to activate, don't activate yet

**Step 4: Implement the decision**

If A: Fix env var name consistency, add key to production build, verify events fire.
If B: Remove `posthog-react-native` dependency, delete `track/` directory, remove `PostHogProvider` from `_layout.tsx`.
If C: Fix env var name mismatch, update `.env.example` documentation.

**Step 5: Verify server logging**

Check server Pino logger config. Verify no auth tokens or sensitive data in logs (audit finding A10). Check that `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` is NOT set in production env.

**Step 6: Commit**

```bash
git commit -m "chore: [fix analytics env var mismatch / activate PostHog / remove PostHog]"
```

---

### Task 13: Delta Security Audit

**Context:** Original audit from March 8 found 27 issues (0 Critical, 4 High, 15 Medium, 8 Low). Some High findings are confirmed fixed. Need to verify Medium findings and check for new attack surface.

**Files:**
- Read: `docs/security/alpha-security-audit.md` (full audit)
- Create: `docs/security/delta-security-audit.md` (new audit results)
- Verify: All server routes, socket handlers, auth middleware

**Step 1: Read the full original audit**

Read `docs/security/alpha-security-audit.md` completely — all 15 Medium findings.

**Step 2: Verify High findings are still fixed**

- A10-1 (auth token prefix logged): Check `enableAuthentication.ts` — should log boolean only
- A6-1 (no WebSocket rate limiting): Check `socket.ts` — should have rate limiting
- A2-3 (terminal auth requests never expire): Check `authRoutes.ts` — should have TTL
- A10-2 (DANGEROUSLY_LOG in env): Check production env

**Step 3: Audit each Medium finding**

Go through all 15 Medium findings, check current code, mark as:
- **Resolved** — code has been fixed
- **Still Open** — needs remediation
- **Accepted Risk** — documented and accepted

**Step 4: Check for new attack surface**

- Any new endpoints since audit? (Research says: no new routes added)
- Any new socket events? (Research says: no new handlers added)
- Voice integration: review `voiceRoutes.ts` for token handling security
- BYOK flow (once implemented): review key storage security
- Any new user input paths?

**Step 5: Write delta audit document**

Create `docs/security/delta-security-audit.md` with:
- Date, scope, methodology
- Status of all original findings
- Any new findings from code changes
- Remediation plan for open items

**Step 6: Remediate any new High findings immediately**

If any new High findings are discovered, fix them before moving on.

**Step 7: Commit**

```bash
git add docs/security/delta-security-audit.md
git commit -m "docs: add delta security audit — verify original findings, check new surface

All original High findings confirmed fixed. [N] of 15 Medium findings
resolved. [M] new findings identified from voice/BYOK integration.
No new Critical or High findings."
```

---

### Task 14: Add Account Existence Check to Token Verification

**Context:** Auth middleware at `enableAuthentication.ts` verifies token signature and expiry but never checks if the account still exists in the DB. Deleted user tokens pass auth until expiry; writes fail on FK constraints.

**Files:**
- Modify: `packages/idle-server/sources/app/api/utils/enableAuthentication.ts:6-27`
- Modify: `packages/idle-server/sources/app/auth/auth.ts:92-145` (add account cache)
- Create: `packages/idle-server/sources/__tests__/tokenAccountVerification.test.ts`
- Create: `docs/adr/009-token-account-verification.md`

**Step 1: Read auth middleware and token verification**

Read `enableAuthentication.ts` fully and `auth.ts` lines 85-150.

**Step 2: Write a failing test**

```typescript
describe('token account verification', () => {
  it('should return 401 when token is valid but account is deleted', async () => {
    // 1. Create account
    // 2. Get token
    // 3. Delete account from DB
    // 4. Make authenticated request
    // 5. Expect 401, not FK constraint error
  })

  it('should return 200 when token is valid and account exists', async () => {
    // Normal path
  })

  it('should cache account existence to avoid DB hammering', async () => {
    // Make multiple requests with same token
    // Verify DB is only queried once (within cache TTL)
  })
})
```

**Step 3: Run test to verify it fails**

Run: `yarn workspace @northglass/idle-server test -- --run tokenAccountVerification`
Expected: FAIL (deleted account request returns FK error, not 401)

**Step 4: Add account existence check to auth middleware**

In `enableAuthentication.ts`, after the token verification succeeds (line 22):

```typescript
// After: request.userId = verified.userId
// Add account existence check:
const accountExists = await auth.verifyAccountExists(verified.userId)
if (!accountExists) {
  return reply.status(401).send({ error: 'Account not found' })
}
```

**Step 5: Add account existence cache to auth.ts**

In `auth.ts`, add a cached account existence check:

```typescript
// Add alongside existing token cache:
const accountExistsCache = new LRUCache<string, boolean>({
  max: 10000,
  ttl: 60 * 60 * 1000, // 1 hour — same as token cache
})

async verifyAccountExists(userId: string): Promise<boolean> {
  const cached = accountExistsCache.get(userId)
  if (cached !== undefined) return cached

  const account = await db.account.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  const exists = account !== null
  accountExistsCache.set(userId, exists)
  return exists
}

// Also: invalidate cache when account is deleted
invalidateAccountCache(userId: string): void {
  accountExistsCache.delete(userId)
}
```

**Step 6: Run tests**

Run: `yarn workspace @northglass/idle-server test -- --run tokenAccountVerification`
Expected: PASS

**Step 7: Run full server test suite**

Run: `yarn workspace @northglass/idle-server test`
Expected: All tests pass

**Step 8: Write ADR**

Create `docs/adr/009-token-account-verification.md`:
- Context: Tokens don't verify account existence, causing FK errors on deleted accounts
- Decision: Add cached account lookup in auth middleware
- Consequences: One additional DB query per cache miss (1-hour TTL); clean 401 errors instead of FK crashes

**Step 9: Commit**

```bash
git add packages/idle-server/sources/app/api/utils/enableAuthentication.ts packages/idle-server/sources/app/auth/auth.ts packages/idle-server/sources/__tests__/tokenAccountVerification.test.ts docs/adr/009-token-account-verification.md
git commit -m "fix: verify account exists during token auth, return 401 for deleted accounts

Add cached account existence check in auth middleware. LRU cache with
1-hour TTL prevents DB hammering. Deleted accounts now get clean 401
instead of FK constraint errors on subsequent requests.

ADR-009 documents the design decision."
```

---

### Task 15: Upstream Integration (Cherry-Pick)

**Context:** 75+ commits ahead of upstream (slopus/happy). Cherry-pick relevant changes — security fixes, SDK compatibility, protocol updates. Skip branding/naming changes.

**Files:**
- Reference: `.git/config` (upstream remote)
- Modify: Various files depending on what upstream has changed

**Step 1: Fetch upstream and review recent changes**

```bash
cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo
git fetch upstream
git log upstream/main --oneline -40
```

**Step 2: Identify cherry-pick candidates**

Look for:
- Claude Code SDK compatibility changes
- Security fixes
- Protocol/wire format updates
- Bug fixes in shared logic

Skip:
- Branding/naming changes (we've diverged)
- Feature additions that conflict with our customizations
- Dependencies we've already updated

**Step 3: Cherry-pick in small batches**

```bash
# For each candidate commit:
git cherry-pick <commit-hash>
# Resolve conflicts if any
# Run tests after each batch
```

**Step 4: Run full test suite after each batch**

Run: `yarn test`
Expected: All tests pass

**Step 5: Commit (cherry-picks create their own commits)**

If conflicts required changes, commit the resolution:

```bash
git commit -m "chore: integrate upstream changes from slopus/happy

Cherry-picked [N] commits: [brief description of what was integrated].
Skipped branding changes and features that conflict with Idle customizations."
```

**Step 6: Update progress.md**

---

### Task 16: Implement BYOK for ElevenLabs Voice

**Depends on:** Task 3 (voice must be working first)

**Context:** The existing BYOK pattern for OpenAI/Anthropic/Gemini uses `ServiceAccountToken` model and `/v1/connect/:vendor/register` endpoint. Replicate for ElevenLabs. Store key E2E encrypted.

**Files:**
- Modify: `packages/idle-server/prisma/schema.prisma` (add elevenlabs to vendor if needed)
- Modify: `packages/idle-server/sources/app/api/routes/voiceRoutes.ts` (check for user's BYOK key)
- Modify: `packages/idle-server/sources/app/api/routes/connectRoutes.ts` (add elevenlabs vendor)
- Modify: `packages/idle-app/sources/app/(app)/settings/voice.tsx` (add API key input)
- Create: `packages/idle-server/sources/__tests__/voiceBYOK.test.ts`

**Step 1: Read the existing BYOK pattern**

Read `connectRoutes.ts` focusing on the `/v1/connect/:vendor/register` endpoint. Read `ServiceAccountToken` in `schema.prisma`. Read `voice.tsx` settings screen.

**Step 2: Write a failing test**

```typescript
describe('BYOK voice', () => {
  it('should use user ElevenLabs key when registered', async () => {
    // 1. Register user's ElevenLabs API key via /v1/connect/elevenlabs/register
    // 2. Request voice token
    // 3. Verify server used user's key (not platform key)
  })

  it('should fall back to platform key when no BYOK registered', async () => {
    // No user key registered → uses server ELEVENLABS_API_KEY
  })

  it('should allow deleting BYOK key', async () => {
    // DELETE /v1/connect/elevenlabs → removes user's key
    // Next voice token request uses platform key
  })
})
```

**Step 3: Run test to verify it fails**

Run: `yarn workspace @northglass/idle-server test -- --run voiceBYOK`
Expected: FAIL

**Step 4: Add elevenlabs to vendor support in connectRoutes**

Check if the `vendor` parameter validation in `connectRoutes.ts` already accepts arbitrary strings or has a whitelist. If whitelist, add `'elevenlabs'`. The `ServiceAccountToken` model already has a `vendor` string field — no schema change needed if it's not an enum.

**Step 5: Modify voice token endpoint to check for BYOK key**

In `voiceRoutes.ts`, before using the server's `ELEVENLABS_API_KEY`:

```typescript
// Check if user has their own ElevenLabs key
const userToken = await db.serviceAccountToken.findFirst({
  where: { accountId: userId, vendor: 'elevenlabs' },
  select: serviceAccountTokenSelectNoBytes,
})

let apiKey: string
if (userToken) {
  // Decrypt user's key
  const decryptedKey = await fetchBytesField(db, 'ServiceAccountToken', userToken.id, 'token')
  apiKey = Buffer.from(decryptedKey, 'base64').toString('utf-8')
} else {
  apiKey = process.env.ELEVENLABS_API_KEY!
}
```

**Step 6: Add API key input to voice settings screen**

In `voice.tsx`, add a text input for the ElevenLabs API key:

```typescript
<TextInput
  placeholder="sk-..."
  secureTextEntry
  value={elevenLabsKey}
  onChangeText={setElevenLabsKey}
/>
<Button title="Save Key" onPress={handleSaveElevenLabsKey} />
```

The `handleSaveElevenLabsKey` calls `/v1/connect/elevenlabs/register` with the key.

**Step 7: Run tests**

Run: `yarn workspace @northglass/idle-server test -- --run voiceBYOK`
Expected: PASS

**Step 8: Run full test suite**

Run: `yarn workspace @northglass/idle-server test`
Expected: All tests pass

**Step 9: Write ADR**

Create `docs/adr/010-byok-voice-keys.md`:
- Context: Users may want to use their own ElevenLabs API key
- Decision: Reuse existing ServiceAccountToken BYOK pattern
- Consequences: No new models; user keys encrypted server-side; fallback to platform key

**Step 10: Commit**

```bash
git add packages/idle-server/sources/app/api/routes/voiceRoutes.ts packages/idle-server/sources/app/api/routes/connectRoutes.ts packages/idle-app/sources/app/(app)/settings/voice.tsx packages/idle-server/sources/__tests__/voiceBYOK.test.ts docs/adr/010-byok-voice-keys.md
git commit -m "feat: add BYOK support for ElevenLabs voice API keys

Users can register their own ElevenLabs key via settings. Server checks
for user key before falling back to platform key. Keys stored encrypted
via existing ServiceAccountToken BYOK pattern.

ADR-010 documents the architecture."
```

---

### Task 17: Final TestFlight Build + Verification

**Depends on:** All other tasks complete

**Files:**
- Modify: `packages/idle-app/app.config.js:17` (bump version if needed)
- Reference: `packages/idle-app/eas.json` (build profiles)

**Step 1: Run the full test suite**

```bash
cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo
yarn test
```

Expected: All tests pass (target ~670+ with new tests from this sprint)

**Step 2: Typecheck all packages**

```bash
yarn workspace idle-coder typecheck
yarn workspace idle-app typecheck
```

Expected: No type errors

**Step 3: Bump app version**

In `app.config.js` line 17, bump version from `1.6.2` to `1.7.0` (this is a feature release):

```javascript
version: "1.7.0",
```

**Step 4: Deploy server changes**

```bash
./scripts/deploy-server-quick.sh
```

Verify server is healthy: `curl https://idle-api.northglass.io/health`

**Step 5: Build for TestFlight**

```bash
cd packages/idle-app
eas build --profile production --platform ios
```

Wait for build to complete.

**Step 6: Submit to TestFlight**

```bash
eas submit --profile production --platform ios
```

**Step 7: Manual QA checklist on device**

After TestFlight build is available, verify all 16 items on a physical device:

- [ ] 1. Remote → local mode: clean input, no garbled text
- [ ] 2. Resume session: mobile sees full history
- [ ] 3. Voice button: TTS works (or graceful error if no ElevenLabs config)
- [ ] 4. Slash commands: custom commands appear in autocomplete
- [ ] 5. Attribution prompt: fires on first session, not second
- [ ] 6. Last activity timestamps: visible on all sessions
- [ ] 7. Drag-and-drop: reorder sessions, order persists
- [ ] 8. App icon and logos: Northglass brand throughout
- [ ] 9. "Dangerously Skip Permissions": no more "Yolo" in UI
- [ ] 10. Features screen: both toggles work
- [ ] 11. Support Us: opens BMAC page
- [ ] 12. Analytics: events firing (if activated) or cleanly inactive
- [ ] 13. Security: no regressions
- [ ] 14. Token auth: deleted accounts get 401
- [ ] 15. Voice BYOK: can enter own ElevenLabs key
- [ ] 16. Overall stability: no crashes during normal usage

**Step 8: Update all documentation**

- Update ROADMAP.md — mark all sprint items as complete
- Update AGENTS.md — add any new files/directories
- Update progress.md — clear completed items, note TestFlight build version
- Update MEMORY.md — note new patterns, key decisions

**Step 9: Commit version bump and doc updates**

```bash
git add packages/idle-app/app.config.js docs/ROADMAP.md AGENTS.md .claude/context/progress.md
git commit -m "chore: release v1.7.0 — comprehensive sprint complete

17 items: 5 P0 bug fixes, 6 P1 features/branding, 6 P2 infra/security.
TestFlight build submitted. All tests passing (~670+)."
```

---

## Dependency Summary

```
Task 1 (input corruption) → Task 2 (session sync) → Task 3 (voice) → Task 4 (slash commands) → Task 5 (attribution)
                                                        ↓
                                                    Task 16 (BYOK) ← depends on voice working

Tasks 6-11 (Track B) → independent, can run in parallel with Track A

Task 12 (analytics) → independent
Task 13 (security audit) → Task 14 (token verification)
Task 15 (upstream) → independent

ALL tasks → Task 17 (TestFlight build)
```

## Documentation Checklist (Every Agent Must Follow)

After completing any task:
1. Update `progress.md` with current task state
2. If new files created: update `AGENTS.md`
3. If architectural decision made: write ADR in `docs/adr/`
4. If ROADMAP item completed: check it off in `docs/ROADMAP.md`
5. Run relevant tests and include results in commit or progress notes
