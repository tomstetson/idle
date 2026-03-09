# Northglass Brand Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align Idle's entire visual identity with the Northglass Labs brand, including logo mark, color palette, typography, app theme, README, and GitHub assets.

**Architecture:** Replace the Idle-specific teal/cyan palette and IBM Plex fonts with Northglass tokens (ink/amber/glass) and fonts (Space Grotesk/Inter/JetBrains Mono). Design a new "bridge" logo mark. Rewrite the README from scratch. Capture real screenshots for the hero image.

**Tech Stack:** React Native (Expo), Unistyles, expo-font, SVG, HTML-to-PNG rendering

**Design doc:** `docs/plans/2026-03-08-northglass-brand-alignment-design.md`

---

## Milestone 1: Brand Foundation (colors, fonts, SVG mark)

### Task 1: Update brand color tokens

**Files:**
- Modify: `packages/idle-app/sources/brand/colors.ts`

**Step 1: Replace color definitions**

```typescript
export const idleBrandColors = {
  ink: '#0A0F1A',
  steel: '#1E2D3D',
  iron: '#2A3A4A',
  silver: '#8B949E',
  frost: '#C8D1DB',
  glass: '#E8EDF2',
  white: '#FFFFFF',
  amber: '#C9A84C',
  amberDim: '#A07D35',
} as const;

export type IdleBrandColors = typeof idleBrandColors;
```

**Step 2: Update brand barrel export**

No changes needed to `packages/idle-app/sources/brand/index.ts` since the export name stays the same.

**Step 3: Commit**

```bash
git add packages/idle-app/sources/brand/colors.ts
git commit -m "feat: replace brand colors with Northglass palette tokens"
```

---

### Task 2: Download and bundle new fonts

**Files:**
- Create: `packages/idle-app/sources/assets/fonts/SpaceGrotesk-Bold.ttf`
- Create: `packages/idle-app/sources/assets/fonts/Inter-Regular.ttf`
- Create: `packages/idle-app/sources/assets/fonts/Inter-Medium.ttf`
- Create: `packages/idle-app/sources/assets/fonts/JetBrainsMono-Regular.ttf`
- Create: `packages/idle-app/sources/assets/fonts/JetBrainsMono-Medium.ttf`
- Remove: `packages/idle-app/sources/assets/fonts/BricolageGrotesque-Bold.ttf`
- Remove: `packages/idle-app/sources/assets/fonts/IBMPlexSans-Regular.ttf`
- Remove: `packages/idle-app/sources/assets/fonts/IBMPlexSans-Italic.ttf`
- Remove: `packages/idle-app/sources/assets/fonts/IBMPlexSans-SemiBold.ttf`
- Remove: `packages/idle-app/sources/assets/fonts/IBMPlexMono-Regular.ttf`
- Remove: `packages/idle-app/sources/assets/fonts/IBMPlexMono-Italic.ttf`
- Remove: `packages/idle-app/sources/assets/fonts/IBMPlexMono-SemiBold.ttf`
- Keep: `packages/idle-app/sources/assets/fonts/SpaceMono-Regular.ttf` (used by FontAwesome, verify before removing)

**Step 1: Download fonts from Google Fonts**

```bash
cd /tmp
# Space Grotesk Bold
curl -L "https://fonts.google.com/download?family=Space+Grotesk" -o space-grotesk.zip
unzip -o space-grotesk.zip -d space-grotesk

# Inter Regular + Medium
curl -L "https://fonts.google.com/download?family=Inter" -o inter.zip
unzip -o inter.zip -d inter

# JetBrains Mono Regular + Medium
curl -L "https://fonts.google.com/download?family=JetBrains+Mono" -o jetbrains-mono.zip
unzip -o jetbrains-mono.zip -d jetbrains-mono
```

Note: If curl from Google Fonts doesn't work, download TTF files from:
- https://github.com/nicholasgriffintn/google-fonts-to-json (or the direct GitHub repos)
- Space Grotesk: https://github.com/nicholasgriffintn/google-fonts-to-json
- Inter: https://github.com/rsms/inter/releases
- JetBrains Mono: https://github.com/JetBrains/JetBrainsMono/releases

**Step 2: Copy font files to project**

```bash
FONTS=packages/idle-app/sources/assets/fonts

# Copy new fonts (exact paths depend on zip structure, find the static TTFs)
cp /tmp/space-grotesk/static/SpaceGrotesk-Bold.ttf $FONTS/
cp /tmp/inter/static/Inter-Regular.ttf $FONTS/
cp /tmp/inter/static/Inter-Medium.ttf $FONTS/
cp /tmp/jetbrains-mono/static/JetBrainsMono-Regular.ttf $FONTS/
cp /tmp/jetbrains-mono/static/JetBrainsMono-Medium.ttf $FONTS/

# Remove old fonts
rm $FONTS/BricolageGrotesque-Bold.ttf
rm $FONTS/IBMPlexSans-Regular.ttf $FONTS/IBMPlexSans-Italic.ttf $FONTS/IBMPlexSans-SemiBold.ttf
rm $FONTS/IBMPlexMono-Regular.ttf $FONTS/IBMPlexMono-Italic.ttf $FONTS/IBMPlexMono-SemiBold.ttf
```

**Step 3: Commit**

```bash
git add packages/idle-app/sources/assets/fonts/
git commit -m "feat: bundle Northglass fonts (Space Grotesk, Inter, JetBrains Mono)"
```

---

### Task 3: Update font loading and Typography system

**Files:**
- Modify: `packages/idle-app/sources/app/_layout.tsx` (font loading section, ~lines 103-150)
- Modify: `packages/idle-app/sources/constants/Typography.ts`

**Step 1: Update Typography.ts**

```typescript
import { Platform } from 'react-native';

export const FontFamilies = {
  default: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
  },

  mono: {
    regular: 'JetBrainsMono-Regular',
    medium: 'JetBrainsMono-Medium',
  },

  heading: {
    bold: 'SpaceGrotesk-Bold',
  },

  legacy: {
    spaceMono: 'SpaceMono',
    systemMono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
};

export const getDefaultFont = (weight: 'regular' | 'medium' = 'regular') => {
  return FontFamilies.default[weight];
};

export const getMonoFont = (weight: 'regular' | 'medium' = 'regular') => {
  return FontFamilies.mono[weight];
};

export const getHeadingFont = () => {
  return FontFamilies.heading.bold;
};

export const FontWeights = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

export const Typography = {
  default: (weight: 'regular' | 'medium' = 'regular') => ({
    fontFamily: getDefaultFont(weight),
  }),

  mono: (weight: 'regular' | 'medium' = 'regular') => ({
    fontFamily: getMonoFont(weight),
  }),

  heading: () => ({
    fontFamily: getHeadingFont(),
  }),

  header: () => ({
    fontFamily: getDefaultFont('medium'),
  }),

  body: () => ({
    fontFamily: getDefaultFont('regular'),
  }),

  legacy: {
    spaceMono: () => ({
      fontFamily: FontFamilies.legacy.spaceMono,
    }),
    systemMono: () => ({
      fontFamily: FontFamilies.legacy.systemMono,
    }),
  }
};
```

**Step 2: Update font loading in _layout.tsx**

Find the `loadFonts()` function and replace the font map. Change:
- `IBMPlexSans-Regular` -> `Inter-Regular`
- `IBMPlexSans-SemiBold` -> `Inter-Medium`
- `IBMPlexSans-Italic` -> remove (Inter italic loaded on-demand if needed)
- `IBMPlexMono-Regular` -> `JetBrainsMono-Regular`
- `IBMPlexMono-SemiBold` -> `JetBrainsMono-Medium`
- `IBMPlexMono-Italic` -> remove
- `BricolageGrotesque-Bold` -> `SpaceGrotesk-Bold`

Update the require() paths to match new filenames.

**Step 3: Grep for direct font name references and update**

```bash
cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo
grep -r "IBMPlexMono-Regular\|IBMPlexSans\|BricolageGrotesque" packages/idle-app/sources/ --include="*.ts" --include="*.tsx" -l
```

Known direct references:
- `sources/app/(app)/restore/manual.tsx` - uses `IBMPlexMono-Regular`
- `sources/app/(app)/restore/index.tsx` - uses `IBMPlexMono-Regular`
- `sources/app/(app)/dev/logs.tsx` - uses `IBMPlexMono-Regular`
- `sources/app/(app)/dev/typography.tsx` - typography showcase

Replace all `IBMPlexMono-Regular` with `JetBrainsMono-Regular`, all `IBMPlexMono-SemiBold` with `JetBrainsMono-Medium`, etc.

**Step 4: Commit**

```bash
git add packages/idle-app/sources/constants/Typography.ts packages/idle-app/sources/app/
git commit -m "feat: migrate typography to Space Grotesk, Inter, JetBrains Mono"
```

---

### Task 4: Design bridge mark SVG

**Files:**
- Modify: `packages/idle-app/sources/brand/svgAssets.ts`
- Modify: `packages/idle-app/sources/assets/images/idle/logo-mark.svg`
- Modify: `packages/idle-app/sources/assets/images/idle/logo-wordmark.svg`

**Step 1: Create monochrome bridge mark SVG (for in-app use with currentColor)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="7" y1="10" x2="7" y2="20"/>
  <line x1="17" y1="10" x2="17" y2="20"/>
  <path d="M7 10 Q12 3 17 10" fill="none"/>
</svg>
```

**Step 2: Update svgAssets.ts**

Replace `logoMarkSvg` with the new bridge mark SVG string. Keep tab icons unchanged.

```typescript
export const logoMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="10" x2="7" y2="20"/><line x1="17" y1="10" x2="17" y2="20"/><path d="M7 10 Q12 3 17 10" fill="none"/></svg>`;
```

**Step 3: Update logo-mark.svg source file**

Write the multi-line SVG to `packages/idle-app/sources/assets/images/idle/logo-mark.svg`.

**Step 4: Update logo-wordmark.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 24" fill="none">
  <text x="0" y="18" font-family="'Space Grotesk', system-ui, sans-serif" font-size="18" font-weight="700" fill="currentColor" letter-spacing="-0.5">Idle</text>
</svg>
```

**Step 5: Commit**

```bash
git add packages/idle-app/sources/brand/svgAssets.ts packages/idle-app/sources/assets/images/idle/
git commit -m "feat: replace cursor-dot logo with bridge mark"
```

---

### Task 5: Update IdleWordmark component

**Files:**
- Modify: `packages/idle-app/sources/brand/IdleWordmark.tsx`

**Step 1: Update to use Space Grotesk**

```typescript
import * as React from 'react';
import { Text, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { FontFamilies } from '@/constants/Typography';

interface IdleWordmarkProps {
  color?: string;
  fontSize?: number;
}

export const IdleWordmark = React.memo(({ color, fontSize = 28 }: IdleWordmarkProps) => {
  const { theme } = useUnistyles();
  const textColor = color ?? theme.colors.text;
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize,
          fontFamily: FontFamilies.heading.bold,
          fontWeight: '700',
          color: textColor,
          letterSpacing: -0.5,
        }}
      >
        Idle
      </Text>
    </View>
  );
});
```

**Step 2: Commit**

```bash
git add packages/idle-app/sources/brand/IdleWordmark.tsx
git commit -m "feat: update wordmark to Space Grotesk Bold"
```

---

## Milestone 2: Theme Migration

### Task 6: Update theme.ts with Northglass palette

**Files:**
- Modify: `packages/idle-app/sources/theme.ts`

This is the largest single file change. Every semantic color that references the old palette needs remapping.

**Step 1: Update light theme colors**

Key changes in the light theme object:
- `textLink: '#00C9B1'` -> `textLink: '#C9A84C'` (amber replaces cyan as accent)
- `header.tint: '#0D3B47'` -> `header.tint: '#0A0F1A'` (ink replaces teal)
- `header.background` -> update to match new palette
- Surface colors, dividers, secondary text -> remap to steel/iron/silver/frost/glass tokens
- Status colors (green for connected, red for error) stay as-is (semantic, not brand)

**Step 2: Update dark theme colors**

Key changes in the dark theme object:
- `textLink: '#00C9B1'` -> `textLink: '#C9A84C'`
- Background surfaces -> use ink (#0A0F1A) as primary background
- Card backgrounds -> steel (#1E2D3D)
- Borders/dividers -> iron (#2A3A4A)
- Secondary text -> silver (#8B949E)
- Primary text -> frost (#C8D1DB)
- Headings/emphasis -> glass (#E8EDF2)

**Step 3: Verify no cyan (#00C9B1) or teal (#0D3B47) hex values remain**

```bash
grep -n "#00C9B1\|#0D3B47" packages/idle-app/sources/theme.ts
```

Expected: 0 matches

**Step 4: Commit**

```bash
git add packages/idle-app/sources/theme.ts
git commit -m "feat: migrate theme colors to Northglass ink/amber/glass palette"
```

---

### Task 7: Update Material Design 3 theme JSONs

**Files:**
- Modify: `packages/idle-app/sources/theme.light.json`
- Modify: `packages/idle-app/sources/theme.dark.json`

**Step 1: Update light theme JSON**

Remap MD3 tokens to Northglass-derived values:
- `primary` -> amber-derived (`#C9A84C`)
- `background` -> glass/white (`#FFFFFF`)
- `surface` -> glass (`#E8EDF2`)
- `error` -> keep red (semantic)

**Step 2: Update dark theme JSON**

- `primary` -> amber (`#C9A84C`)
- `background` -> ink (`#0A0F1A`)
- `surface` -> steel (`#1E2D3D`)
- `error` -> keep red (semantic)

**Step 3: Commit**

```bash
git add packages/idle-app/sources/theme.light.json packages/idle-app/sources/theme.dark.json
git commit -m "feat: update MD3 theme tokens for Northglass palette"
```

---

### Task 8: Update app.config.js splash screens and icon background

**Files:**
- Modify: `packages/idle-app/app.config.js`

**Step 1: Update splash screen colors**

```javascript
// iOS splash
ios: {
    backgroundColor: "#E8EDF2",  // glass (light)
    dark: {
        backgroundColor: "#0A0F1A",  // ink (dark)
    }
},
// Android splash
android: {
    image: "./sources/assets/images/splash-android-light.png",
    backgroundColor: "#E8EDF2",  // glass
    dark: {
        image: "./sources/assets/images/splash-android-dark.png",
        backgroundColor: "#0A0F1A",  // ink
    }
}
```

**Step 2: Update adaptive icon background color**

Find `backgroundColor` in the android adaptive icon section and change to ink:
```javascript
backgroundColor: "#0A0F1A"
```

**Step 3: Commit**

```bash
git add packages/idle-app/app.config.js
git commit -m "feat: update splash and icon colors for Northglass palette"
```

---

### Task 9: Update theme.css scrollbar colors

**Files:**
- Modify: `packages/idle-app/sources/theme.css`

No changes needed. The file uses CSS variables (`--colors-surface-high`, `--colors-divider`, etc.) that will automatically pick up the new theme values from Unistyles. Verify by reading the file.

---

### Task 10: Sweep for hardcoded old hex values

**Step 1: Search for all old values across the app package**

```bash
cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo
grep -rn "#0D3B47\|#00C9B1\|#E8B84C\|#0F172A\|#475569\|#94A3B8\|#F8FAFC" packages/idle-app/sources/ --include="*.ts" --include="*.tsx" --include="*.css"
```

**Step 2: Replace any remaining hardcoded values**

Each match needs individual evaluation:
- If it's in a test file (brand.spec.ts) -> update assertions to new values
- If it's in a component -> replace with theme token reference or new hex
- If it's in a config -> update to Northglass equivalent

**Step 3: Search for old font names**

```bash
grep -rn "Bricolage\|IBMPlex\|IBM Plex\|Space.Mono" packages/idle-app/sources/ --include="*.ts" --include="*.tsx"
```

Replace all with new font names.

**Step 4: Commit**

```bash
git add -A packages/idle-app/sources/
git commit -m "fix: replace remaining hardcoded old brand values"
```

---

## Milestone 3: App Icon Assets

### Task 11: Generate static brand assets (favicon, app icon, logotypes)

**Files:**
- Modify: `packages/idle-app/sources/assets/images/icon.png`
- Modify: `packages/idle-app/sources/assets/images/icon-adaptive.png`
- Modify: `packages/idle-app/sources/assets/images/icon-monochrome.png`
- Modify: `packages/idle-app/sources/assets/images/favicon.png`
- Modify: `packages/idle-app/sources/assets/images/logotype-light.png` (and @2x, @3x)
- Modify: `packages/idle-app/sources/assets/images/logotype-dark.png` (and @3x)

**Step 1: Create two-color bridge mark SVG for icon generation**

This is the static version with explicit colors (not currentColor):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
  <rect width="1024" height="1024" rx="192" fill="#0A0F1A"/>
  <line x1="352" y1="416" x2="352" y2="736" stroke="#E8EDF2" stroke-width="64" stroke-linecap="round"/>
  <line x1="672" y1="416" x2="672" y2="736" stroke="#E8EDF2" stroke-width="64" stroke-linecap="round"/>
  <path d="M352 416 Q512 192 672 416" stroke="#C9A84C" stroke-width="56" fill="none" stroke-linecap="round"/>
</svg>
```

**Step 2: Render SVG to PNG at required sizes**

Use a Node script or sharp/resvg-js to convert:
```bash
# Install resvg if needed
npx @aspect-build/rules_js//tools:resvg-cli icon.svg -w 1024 -h 1024 -o icon.png
```

Alternative: use Playwright to render an HTML page with the SVG and screenshot at exact dimensions.

Generate:
- `icon.png` at 1024x1024
- `favicon.png` at 32x32
- `icon-adaptive.png` at 1024x1024 (foreground only, no background rect, transparent)
- `icon-monochrome.png` at 1024x1024 (all white, transparent background)

**Step 3: Generate logotype PNGs**

Create an SVG with bridge mark + "Idle" wordmark side by side, render at 1x, 2x, 3x for both light and dark variants.

Light variant: ink mark + ink text on transparent
Dark variant: glass/amber mark + glass text on transparent

**Step 4: Commit**

```bash
git add packages/idle-app/sources/assets/images/
git commit -m "feat: generate Northglass-aligned app icon and logotype assets"
```

---

## Milestone 4: README and GitHub Assets

### Task 12: Capture real screenshots

**Step 1: Start the web app**

```bash
cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo
yarn web
```

**Step 2: Use Playwright to capture app screenshot**

Navigate to the web app, find a session view with content, capture at iPhone dimensions (390x844).

**Step 3: Capture terminal screenshot**

Run `idle` in a terminal with a visible session, capture the terminal window.

**Step 4: Save raw screenshots**

Save to `.github/screenshots/` for source, will compose in next task.

---

### Task 13: Create README cover image

**Files:**
- Modify: `.github/header.png`

**Step 1: Build HTML composition**

Create a temporary HTML file with:
- 1280x640 viewport
- ink (#0A0F1A) background
- Optional: dot grid texture at low opacity
- Left: terminal screenshot in a card frame (steel bg, iron border, rounded corners)
- Right: phone screenshot in a minimal device frame (thin glass-colored border)
- Even spacing, no connecting elements

**Step 2: Render to PNG with Playwright**

```bash
npx playwright screenshot --viewport-size=1280,640 composition.html .github/header.png
```

**Step 3: Commit**

```bash
git add .github/header.png
git commit -m "feat: create Northglass-styled README cover image"
```

---

### Task 14: Update GitHub assets

**Files:**
- Modify: `.github/logotype-dark.png`
- Remove: `.github/mascot.png`

**Step 1: Generate dark logotype PNG**

Render the bridge mark + "Idle" wordmark in glass (#E8EDF2) + amber (#C9A84C) on transparent background. ~400px wide.

**Step 2: Remove mascot**

```bash
rm .github/mascot.png
```

**Step 3: Commit**

```bash
git add .github/logotype-dark.png
git rm .github/mascot.png
git commit -m "feat: update GitHub logotype, remove mascot"
```

---

### Task 15: Write new README.md

**Files:**
- Modify: `README.md` (full rewrite)

**Step 1: Write the README**

Full contents (see design doc for approved copy):

```markdown
<div align="center">
  <img src="/.github/logotype-dark.png" width="200" alt="Idle"/>
</div>

<br/>

Remote client for Claude Code. End-to-end encrypted. Open source.

<img width="1280" alt="Idle — terminal to phone" src="/.github/header.png" />

## What it does

Idle lets you monitor and control Claude Code sessions from your phone. Run `idle` instead of `claude` on your machine, then pick up the session from the iOS app whenever you step away. Press any key on your keyboard to take it back. All traffic between your devices is end-to-end encrypted. The relay server never sees your code.

## Install

**1. Download the app**

[App Store](https://apps.apple.com/us/app/Idle-claude-code-client/id6748571505) · [Web App](https://idle.northglass.io)

**2. Install the CLI**

\`\`\`bash
npm install -g idle-coder
\`\`\`

**3. Run it**

\`\`\`bash
# Instead of: claude
idle

# Instead of: codex
idle codex
\`\`\`

## Features

- Mobile access to Claude Code sessions from iOS
- Push notifications when your agent needs input or hits an error
- Seamless device handoff, phone to terminal with one keypress
- End-to-end encrypted with AES-256-GCM and zero-knowledge relay
- Voice input for responding to agent prompts on the go
- Open source, no telemetry, no tracking

## How it works

Run `idle` instead of `claude` to start your coding agent through our CLI wrapper. The CLI connects to a relay server over WebSocket. When you open the Idle app on your phone, you see the live session and can send messages, approve permissions, or just watch. Press any key on your keyboard to take the session back to your terminal. The relay server routes encrypted payloads between devices but cannot decrypt them.

## Architecture

| Package | Description |
|---------|-------------|
| [idle-app](packages/idle-app) | React Native mobile and web client (Expo) |
| [idle-cli](packages/idle-cli) | CLI wrapper for Claude Code and Codex |
| [idle-agent](packages/idle-agent) | Programmatic agent control CLI |
| [idle-server](packages/idle-server) | WebSocket relay server for encrypted sync |
| [idle-wire](packages/idle-wire) | Shared message types and Zod schemas |

## Security

Security is not an afterthought. Session data is encrypted client-side before it leaves your device. The relay server handles routing, not content. It cannot read your messages, your code, or your prompts. Keys are derived per-session and never transmitted. The code is open source and auditable.

## About

Idle is built by [Northglass Labs](https://northglass.io), a one-person open-source studio in Eastern Pennsylvania. We build small, focused tools for developers and security teams. Idle is free, will stay free, and ships under the MIT license. If you find it useful, that's the whole point.

## Credits

Idle is forked from [Happy Engineering](https://github.com/slopus/happy) by Slopus. Their work on the core architecture, the CLI wrapper, encrypted relay protocol, and real-time sync, made this project possible. We've since diverged to harden security, improve scalability, and build features the upstream project hasn't prioritized, but the foundation is theirs.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

## License

MIT License. See [LICENSE](LICENSE) for details.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with Northglass brand voice"
```

---

### Task 16: Rewrite brand guide

**Files:**
- Modify: `docs/brand/IDLE-BRAND.md`

**Step 1: Rewrite to reflect Northglass alignment**

Replace entire contents with updated guide covering:
- Bridge mark description and usage rules
- Northglass palette tokens (ink through amber-dim)
- Typography (Space Grotesk / Inter / JetBrains Mono)
- Voice and tone (inherited from Northglass: casual but competent, understated confidence)
- Asset checklist with new file paths
- Relationship to parent brand (Northglass Labs)

**Step 2: Commit**

```bash
git add docs/brand/IDLE-BRAND.md
git commit -m "docs: rewrite brand guide for Northglass alignment"
```

---

## Milestone 5: Verification

### Task 17: Run typecheck

**Step 1: Build wire types first**

```bash
cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo
yarn workspace @northglass/idle-wire build
```

**Step 2: Typecheck app**

```bash
yarn workspace idle-app typecheck
```

Expected: 0 errors. If there are errors from renamed font types (e.g., `semiBold` -> `medium`), fix them.

**Step 3: Typecheck CLI**

```bash
yarn workspace idle-coder typecheck
```

Expected: 0 errors (CLI doesn't use brand colors).

---

### Task 18: Run tests

**Step 1: Run all tests**

```bash
yarn test
```

**Step 2: If brand.spec.ts fails, update assertions**

The test at `packages/idle-app/sources/components/brand/brand.spec.ts` likely asserts old hex values. Update to new values:
- `#0D3B47` -> `#0A0F1A` (ink)
- `#00C9B1` -> `#C9A84C` (amber)

**Step 3: Re-run tests**

```bash
yarn test
```

Expected: all pass.

---

### Task 19: Visual verification

**Step 1: Start web app**

```bash
yarn web
```

**Step 2: Check visually**

Open in browser and verify:
- Header shows bridge mark in correct color
- Links/accent elements use amber, not cyan
- Fonts render as Space Grotesk (headings), Inter (body), JetBrains Mono (code)
- Light and dark themes both look correct
- No leftover teal or cyan anywhere

**Step 3: If issues found, fix and commit individually**

---

### Task 20: Final commit (if any remaining changes)

```bash
git add -A
git commit -m "feat: complete Northglass brand alignment"
```

---

## Task Dependency Graph

```
M1: Foundation
  T1 (colors) ─────┐
  T2 (fonts) ──┐    │
  T3 (typo) ◄──┘    │
  T4 (SVG mark) ────┤
  T5 (wordmark) ◄───┘

M2: Theme Migration
  T6 (theme.ts) ◄── T1
  T7 (MD3 JSON) ◄── T1
  T8 (app.config) ◄── T1
  T9 (theme.css) - verify only
  T10 (sweep) ◄── T1, T3

M3: Icon Assets
  T11 (icons) ◄── T4

M4: README & GitHub
  T12 (screenshots) ◄── M2 (needs new theme running)
  T13 (cover image) ◄── T12
  T14 (GitHub assets) ◄── T4
  T15 (README) ◄── T13, T14
  T16 (brand guide) ◄── all above

M5: Verification
  T17 (typecheck) ◄── M1, M2
  T18 (tests) ◄── M1, M2
  T19 (visual) ◄── all above
  T20 (final commit) ◄── T17, T18, T19
```

## Parallelization Opportunities

These tasks can run as independent subagents:
- T1 + T2 + T4 (colors, fonts, SVG mark are independent)
- T6 + T7 + T8 (theme files are independent of each other, depend on T1)
- T14 + T15 (GitHub assets and README are independent, both need T13)
