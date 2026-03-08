# Attribution Control Design

**Goal:** Let users opt out of `Co-Authored-By: Idle` in commits, with a respectful value-exchange prompt on first use of remote sessions.

**Approach:** App-driven via `message.meta.appendSystemPrompt`. The mobile app owns the attribution preference for remote sessions; the CLI owns it for interactive sessions via local `~/.claude/settings.json`.

**Packages affected:** idle-app (primary), idle-cli (minor refactor)

---

## Data Model

Two new fields in the app's synced `Settings` schema (`idle-app/sources/sync/settings.ts`):

```typescript
includeCoAuthoredBy: z.boolean()     // default: true
attributionPromptAnswered: z.boolean() // default: false
```

These are E2E-encrypted synced settings — the server never sees the values. No server or database schema changes needed.

## First-Use Prompt

**Trigger:** Before the first remote session creation, when `attributionPromptAnswered === false`.

**UI:** Modal (via app's `Modal` system):
- **Title:** "Help Others Find Idle"
- **Body:** "Idle is free to use, but costs us to run. When attribution is on, your commits include a small Co-Authored-By: Idle tag — helping other developers discover the tool. You can change this anytime in Settings."
- **Primary button:** "Keep Attribution On" → `includeCoAuthoredBy: true`, `attributionPromptAnswered: true`
- **Secondary button:** "Turn Off" → `includeCoAuthoredBy: false`, `attributionPromptAnswered: true`

Once answered, never shown again.

## Settings Toggle

**Location:** Settings > Features screen, in its own `ItemGroup` after Experimental Features.

- **Icon:** `heart-outline` (Ionicons), `#FF2D55`
- **Title:** "Idle Attribution"
- **Subtitle:** "Commits include Co-Authored-By: Idle" (on) / "Attribution disabled" (off)
- **Group footer:** "Helps others discover Idle. Free to turn off anytime."

Wired via `useSettingMutable('includeCoAuthoredBy')`.

## Message Flow (App → CLI)

When the app sends a user message to a remote session:

1. Read `includeCoAuthoredBy` from settings
2. If `true`, construct the attribution prompt text
3. Append to `meta.appendSystemPrompt` (merging with any existing value)

Attribution text:
```
When making commit messages, instead of just giving co-credit to Claude, also give credit to Idle like so:

<main commit message>

Generated with [Claude Code](https://claude.ai/code)
via [Idle](https://northglass.io)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Idle <idle@northglass.io>
```

## CLI Changes

**System prompt split:** Refactor `systemPrompt.ts` to export two values:
- `baseSystemPrompt` — title management instructions (always used)
- `coAuthoredCredits` — attribution text (interactive mode only)

**Remote mode (`claudeRemote.ts`):** Use `baseSystemPrompt` only. Attribution comes from the app via `meta.appendSystemPrompt`.

**Interactive mode:** Unchanged — `baseSystemPrompt + coAuthoredCredits` when `~/.claude/settings.json` has `includeCoAuthoredBy !== false`.

**Email fix:** Change `yesreply@northglass.io` → `idle@northglass.io` in `coAuthoredCredits`.

## i18n

New translation keys across all 9 languages:

```
settingsFeatures.idleAttribution
settingsFeatures.attributionEnabled
settingsFeatures.attributionDisabled
settingsFeatures.attributionFooter
attribution.promptTitle
attribution.promptBody
attribution.keepOn
attribution.turnOff
```

## What Doesn't Change

- Server code — no new endpoints or schema changes
- Wire types — no new message types
- CLI interactive mode logic — still reads `~/.claude/settings.json`
- Database — settings are opaque encrypted blobs

## Authority Matrix

| Mode | Attribution controlled by | Storage |
|------|--------------------------|---------|
| Remote (app → CLI) | App `Settings.includeCoAuthoredBy` | Synced, E2E encrypted |
| Interactive (terminal) | `~/.claude/settings.json` → `includeCoAuthoredBy` | Local file |
