# Attribution Control Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a user-controllable attribution toggle ("Co-Authored-By: Idle" in commits) with a first-use prompt on session creation and a settings toggle.

**Architecture:** Setting lives in the app's synced Settings schema. App injects attribution text into `meta.appendSystemPrompt` when sending messages. CLI refactored so remote mode delegates attribution to the app; interactive mode keeps using local `~/.claude/settings.json`.

**Tech Stack:** React Native (Expo), TypeScript, Zod, Vitest, Unistyles

---

## Task 1: Add Settings Fields

Add `includeCoAuthoredBy` and `attributionPromptAnswered` to the app's settings schema and defaults.

**Files:**
- Modify: `packages/idle-app/sources/sync/settings.ts:254-305` (SettingsSchema) and `:326-361` (settingsDefaults)
- Modify: `packages/idle-app/sources/sync/settings.spec.ts:~387-390` (defaults assertion)

**Step 1: Add fields to SettingsSchema**

In `packages/idle-app/sources/sync/settings.ts`, add two fields inside `SettingsSchema = z.object({...})`, after the `dismissedCLIWarnings` field (around line 304):

```typescript
    // Attribution control
    includeCoAuthoredBy: z.boolean().describe('Include Idle attribution (Co-Authored-By) in commit messages'),
    attributionPromptAnswered: z.boolean().describe('Whether the attribution prompt has been shown and answered'),
```

**Step 2: Add defaults to settingsDefaults**

In the same file, add to `settingsDefaults` object (after `dismissedCLIWarnings` entry, around line 360):

```typescript
    // Attribution defaults
    includeCoAuthoredBy: true,
    attributionPromptAnswered: false,
```

**Step 3: Update settings test**

In `packages/idle-app/sources/sync/settings.spec.ts`, find the `settingsDefaults` assertion (around line 387-390). Add the two new fields to the expected object:

```typescript
                includeCoAuthoredBy: true,
                attributionPromptAnswered: false,
```

Add them after the `dismissedCLIWarnings` line to match the order in the schema.

**Step 4: Run tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/idle-app/sources/sync/settings.ts packages/idle-app/sources/sync/settings.spec.ts
git commit -m "feat(app): add includeCoAuthoredBy and attributionPromptAnswered settings fields"
```

---

## Task 2: CLI System Prompt Split

Refactor the CLI's system prompt so remote mode uses only the base prompt (no attribution), while interactive mode continues to conditionally include attribution from local settings.

**Files:**
- Modify: `packages/idle-cli/src/claude/utils/systemPrompt.ts` (entire file)
- Modify: `packages/idle-cli/src/claude/claudeRemote.ts:12,123-124`
- Modify: `packages/idle-cli/src/claude/claudeLocal.ts` (import if used)

**Step 1: Refactor systemPrompt.ts**

Replace the entire file `packages/idle-cli/src/claude/utils/systemPrompt.ts` with:

```typescript
import { trimIdent } from "@/utils/trimIdent";
import { shouldIncludeCoAuthoredBy } from "./claudeSettings";

/**
 * Base system prompt shared across all configurations.
 * Used by both interactive and remote modes.
 */
export const baseSystemPrompt = (() => trimIdent(`
    You MUST call the "mcp__idle__change_title" tool to set and maintain an accurate chat title. This title is how the user identifies sessions at a glance across multiple machines and projects. Follow these rules:

    1. IMMEDIATELY on your first response — set a title based on the user's first message.
    2. Once you understand the real goal — update the title to be more specific (this often applies after the first exchange).
    3. When the conversation's focus shifts significantly — update the title to reflect the new focus.
    4. When you complete a major task and move on to something new — update the title.

    Title guidelines:
    - Keep titles short (under 50 characters) and action-oriented.
    - Describe WHAT is being done, not WHERE (the project path is shown separately).
    - Good: "Fix auth token refresh", "Add dark mode toggle", "Debug flaky CI tests"
    - Bad: "idle-repo", "Working on code", "Helping with project", "Chat"
`))();

/**
 * Co-authored-by credits text. Used by:
 * - Interactive mode: appended to baseSystemPrompt when local settings allow
 * - App (remote mode): sent via meta.appendSystemPrompt when user has attribution enabled
 */
export const coAuthoredCredits = (() => trimIdent(`
    When making commit messages, instead of just giving co-credit to Claude, also give credit to Idle like so:

    <main commit message>

    Generated with [Claude Code](https://claude.ai/code)
    via [Idle](https://northglass.io)

    Co-Authored-By: Claude <noreply@anthropic.com>
    Co-Authored-By: Idle <idle@northglass.io>
`))();

/**
 * Full system prompt for interactive (local terminal) mode.
 * Includes attribution based on ~/.claude/settings.json.
 */
export const systemPrompt = (() => {
  const includeCoAuthored = shouldIncludeCoAuthoredBy();
  return includeCoAuthored
    ? baseSystemPrompt + '\n\n' + coAuthoredCredits
    : baseSystemPrompt;
})();
```

Note: the email changed from `yesreply@northglass.io` to `idle@northglass.io`.

**Step 2: Update claudeRemote.ts to use baseSystemPrompt**

In `packages/idle-cli/src/claude/claudeRemote.ts`, change the import on line 12:

```typescript
// Before:
import { systemPrompt } from "./utils/systemPrompt";

// After:
import { baseSystemPrompt } from "./utils/systemPrompt";
```

Then update lines 123-124 where `systemPrompt` is used in `sdkOptions`:

```typescript
// Before:
customSystemPrompt: initial.mode.customSystemPrompt ? initial.mode.customSystemPrompt + '\n\n' + systemPrompt : undefined,
appendSystemPrompt: initial.mode.appendSystemPrompt ? initial.mode.appendSystemPrompt + '\n\n' + systemPrompt : systemPrompt,

// After:
customSystemPrompt: initial.mode.customSystemPrompt ? initial.mode.customSystemPrompt + '\n\n' + baseSystemPrompt : undefined,
appendSystemPrompt: initial.mode.appendSystemPrompt ? initial.mode.appendSystemPrompt + '\n\n' + baseSystemPrompt : baseSystemPrompt,
```

**Step 3: Check claudeLocal.ts import**

In `packages/idle-cli/src/claude/claudeLocal.ts`, check if `systemPrompt` is imported. If so, it should keep using the full `systemPrompt` (which includes attribution for interactive mode). No change needed if it already imports `systemPrompt`.

**Step 4: Run CLI tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder build && yarn workspace idle-coder test`
Expected: All tests pass (existing claudeSettings tests don't change)

**Step 5: Commit**

```bash
git add packages/idle-cli/src/claude/utils/systemPrompt.ts packages/idle-cli/src/claude/claudeRemote.ts
git commit -m "refactor(cli): split systemPrompt into base + coAuthoredCredits for remote/interactive modes"
```

---

## Task 3: App Message Meta Attribution Injection

Modify the app's `sendMessage()` to conditionally include attribution text in `meta.appendSystemPrompt`.

**Files:**
- Modify: `packages/idle-app/sources/sync/sync.ts:34` (import) and `:481-496` (sendMessage meta construction)

**Step 1: Add attribution constant**

In `packages/idle-app/sources/sync/prompt/systemPrompt.ts`, add the attribution text as a named export. Append to the end of the file:

```typescript
/**
 * Co-authored-by credits for Idle attribution.
 * Appended to the system prompt when the user has attribution enabled.
 */
export const coAuthoredCredits = trimIdent(`
    When making commit messages, instead of just giving co-credit to Claude, also give credit to Idle like so:

    <main commit message>

    Generated with [Claude Code](https://claude.ai/code)
    via [Idle](https://northglass.io)

    Co-Authored-By: Claude <noreply@anthropic.com>
    Co-Authored-By: Idle <idle@northglass.io>
`);
```

**Step 2: Modify sendMessage() to inject attribution**

In `packages/idle-app/sources/sync/sync.ts`:

1. Update the import on line 34 to also import `coAuthoredCredits`:

```typescript
// Before:
import { systemPrompt } from './prompt/systemPrompt';

// After:
import { systemPrompt, coAuthoredCredits } from './prompt/systemPrompt';
```

2. In `sendMessage()` (around line 481-496), update the meta construction to conditionally include attribution. Replace the `appendSystemPrompt: systemPrompt` line:

```typescript
        // Build appendSystemPrompt: always include base system prompt,
        // conditionally append attribution credits
        const includeAttribution = storage.getState().settings.includeCoAuthoredBy;
        const fullSystemPrompt = includeAttribution
            ? systemPrompt + '\n\n' + coAuthoredCredits
            : systemPrompt;

        // Create user message content with metadata
        const content: RawRecord = {
            role: 'user',
            content: {
                type: 'text',
                text
            },
            meta: {
                sentFrom,
                permissionMode,
                model,
                fallbackModel,
                appendSystemPrompt: fullSystemPrompt,
                ...(displayText && { displayText })
            }
        };
```

**Step 3: Run typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/idle-app/sources/sync/prompt/systemPrompt.ts packages/idle-app/sources/sync/sync.ts
git commit -m "feat(app): inject attribution credits into appendSystemPrompt based on user setting"
```

---

## Task 4: First-Use Attribution Prompt

Show a modal before the first remote session creation asking the user about attribution.

**Files:**
- Modify: `packages/idle-app/sources/app/(app)/new/index.tsx:~1034` (session creation flow)

**Step 1: Add attribution prompt logic**

In `packages/idle-app/sources/app/(app)/new/index.tsx`, add the required imports at the top of the file (if not already imported):

```typescript
import { Modal } from '@/modal';
import { useSetting } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { t } from '@/text';
```

Inside the component, read the `attributionPromptAnswered` setting:

```typescript
const attributionPromptAnswered = useSetting('attributionPromptAnswered');
```

**Step 2: Create a helper that returns a Promise resolving after the user responds**

Add a function inside the component (or near the session creation handler) that shows the attribution modal and waits for a response:

```typescript
function showAttributionPrompt(): Promise<void> {
    return new Promise((resolve) => {
        Modal.alert(
            t('attribution.promptTitle'),
            t('attribution.promptBody'),
            [
                {
                    text: t('attribution.turnOff'),
                    style: 'cancel',
                    onPress: () => {
                        sync.applySettings({
                            includeCoAuthoredBy: false,
                            attributionPromptAnswered: true,
                        });
                        resolve();
                    }
                },
                {
                    text: t('attribution.keepOn'),
                    onPress: () => {
                        sync.applySettings({
                            includeCoAuthoredBy: true,
                            attributionPromptAnswered: true,
                        });
                        resolve();
                    }
                },
            ]
        );
    });
}
```

**Step 3: Insert the prompt before session creation**

In the session creation handler, just before `machineSpawnNewSession()` is called (line ~1034), add:

```typescript
            // Show attribution prompt on first session creation
            if (!attributionPromptAnswered) {
                await showAttributionPrompt();
            }

            const result = await machineSpawnNewSession({
                // ... existing code
```

**Step 4: Run typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck`
Expected: No type errors

**Step 5: Commit**

```bash
git add packages/idle-app/sources/app/\(app\)/new/index.tsx
git commit -m "feat(app): show attribution opt-out prompt before first session creation"
```

---

## Task 5: Settings Toggle

Add an attribution toggle to the Features settings screen.

**Files:**
- Modify: `packages/idle-app/sources/app/(app)/settings/features.tsx`

**Step 1: Add the attribution toggle**

In `packages/idle-app/sources/app/(app)/settings/features.tsx`:

1. Add `includeCoAuthoredBy` to the existing `useSettingMutable` calls at the top of the component:

```typescript
const [includeCoAuthoredBy, setIncludeCoAuthoredBy] = useSettingMutable('includeCoAuthoredBy');
```

2. Add a new `ItemGroup` after the existing Experimental Features group (after the closing `</ItemGroup>` around line 88) and before the Web-only Features group:

```tsx
            {/* Attribution */}
            <ItemGroup
                title={t('settingsFeatures.attribution')}
                footer={t('settingsFeatures.attributionFooter')}
            >
                <Item
                    title={t('settingsFeatures.idleAttribution')}
                    subtitle={includeCoAuthoredBy ? t('settingsFeatures.attributionEnabled') : t('settingsFeatures.attributionDisabled')}
                    icon={<Ionicons name="heart-outline" size={29} color="#FF2D55" />}
                    rightElement={
                        <Switch
                            value={includeCoAuthoredBy}
                            onValueChange={setIncludeCoAuthoredBy}
                        />
                    }
                    showChevron={false}
                />
            </ItemGroup>
```

**Step 2: Run typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add packages/idle-app/sources/app/\(app\)/settings/features.tsx
git commit -m "feat(app): add attribution toggle to Features settings screen"
```

---

## Task 6: Internationalization (i18n)

Add translation keys for the attribution feature to all 10 language files.

**Files:**
- Modify: `packages/idle-app/sources/text/translations/en.ts` (and all 9 other language files)

**Translation files (10 total):**
- `en.ts`, `ru.ts`, `pl.ts`, `es.ts`, `ca.ts`, `it.ts`, `pt.ts`, `ja.ts`, `zh-Hans.ts`, `zh-Hant.ts`

**Step 1: Add keys to English (en.ts)**

In `packages/idle-app/sources/text/translations/en.ts`, add to the `settingsFeatures` object (around line 228, after `showThinkingDisabled`):

```typescript
        // Attribution
        attribution: 'Attribution',
        idleAttribution: 'Idle Attribution',
        attributionEnabled: 'Commits include Co-Authored-By: Idle',
        attributionDisabled: 'Attribution disabled',
        attributionFooter: 'Helps others discover Idle. Free to turn off anytime.',
```

Add a new top-level `attribution` section (after `settingsFeatures`):

```typescript
    attribution: {
        promptTitle: 'Help Others Find Idle',
        promptBody: 'Idle is free to use, but costs us to run. When attribution is on, your commits include a small Co-Authored-By: Idle tag — helping other developers discover the tool. You can change this anytime in Settings.',
        keepOn: 'Keep Attribution On',
        turnOff: 'Turn Off',
    },
```

**Step 2: Add keys to all other language files**

Use the i18n-translator agent to add equivalent translations to all 9 remaining language files. Each file needs:

1. The `settingsFeatures` additions (5 keys: `attribution`, `idleAttribution`, `attributionEnabled`, `attributionDisabled`, `attributionFooter`)
2. The new `attribution` section (4 keys: `promptTitle`, `promptBody`, `keepOn`, `turnOff`)

**Important:** Keep "Idle" and "Co-Authored-By" untranslated in all languages (they're brand names / git conventions).

**Step 3: Update the translation type**

Check `packages/idle-app/sources/text/_default.ts` — if `TranslationStructure` is manually defined (not inferred from en.ts), add the new keys there too. If it's `typeof en`, no change needed.

**Step 4: Run typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck`
Expected: No type errors (all language files match the type structure)

**Step 5: Commit**

```bash
git add packages/idle-app/sources/text/
git commit -m "feat(app): add attribution i18n translations for all 10 languages"
```

---

## Task 7: Final Verification

Verify everything works together end-to-end.

**Step 1: Run all app tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app test`
Expected: All tests pass

**Step 2: Run CLI tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder build && yarn workspace idle-coder test`
Expected: All tests pass

**Step 3: Run app typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck`
Expected: No type errors

**Step 4: Run CLI typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder typecheck`
Expected: No type errors

**Step 5: Manual smoke test (optional)**

1. Run `yarn web` in idle-app
2. Navigate to Settings > Features — verify attribution toggle appears
3. Toggle it off and on — verify subtitle changes
4. Check that `meta.appendSystemPrompt` includes/excludes attribution text (inspect via browser dev tools network tab on WebSocket messages)
