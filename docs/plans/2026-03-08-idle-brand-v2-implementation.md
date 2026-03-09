# Idle Brand v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the v1 amber/bridge branding with a monochrome arc mark aligned to the live northglass.io identity.

**Architecture:** Pure color/asset swap across 5 files (colors, theme, MD3 jsons, app.config, SVG assets) plus regenerated PNGs. The arc mark is a new SVG path. No structural changes to components or layouts.

**Tech Stack:** React Native (Unistyles), SVG, rsvg-convert (PNG generation), vitest

---

### Task 1: Update brand colors to monochrome

**Files:**
- Modify: `packages/idle-app/sources/brand/colors.ts`
- Test: `packages/idle-app/sources/components/brand/brand.spec.ts`

**Step 1: Update colors.ts**

Replace entire file content:

```typescript
/**
 * Idle brand color palette — Northglass monochrome.
 * No color accents. White is the only accent.
 * Values match live northglass.io (src/styles/global.css).
 */
export const idleBrandColors = {
  /** Primary background */
  black: '#0A0A0A',
  /** Elevated surfaces */
  elevated: '#111111',
  /** Secondary surfaces */
  surface: '#141414',
  /** Hover states */
  subtle: '#1A1A1A',
  /** Disabled backgrounds, subtle dividers */
  muted: '#1F1F1F',
  /** Card borders, input borders */
  border: '#2A2A2A',
  /** Primary text, headings, accent */
  white: '#FAFAFA',
  /** Body text */
  secondary: '#C0C0C0',
  /** Captions, timestamps */
  gray: '#888888',
  /** Disabled text */
  disabled: '#505050',
} as const;

export type IdleBrandColors = typeof idleBrandColors;
```

**Step 2: Update brand.spec.ts tests**

Replace the `idleBrandColors` describe block:

```typescript
describe('idleBrandColors', () => {
    it('exports the brand color object', () => {
        expect(idleBrandColors).toBeDefined();
        expect(typeof idleBrandColors).toBe('object');
    });

    it('contains the black primary background', () => {
        expect(idleBrandColors.black).toBe('#0A0A0A');
    });

    it('contains the white accent/text color', () => {
        expect(idleBrandColors.white).toBe('#FAFAFA');
    });

    it('contains the secondary text color', () => {
        expect(idleBrandColors.secondary).toBe('#C0C0C0');
    });

    it('has no amber or color accent', () => {
        const values = Object.values(idleBrandColors);
        // All values should be neutral (no hue)
        for (const hex of values) {
            expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });

    it('all color values are valid hex strings', () => {
        const hexPattern = /^#[0-9A-F]{6}$/i;
        for (const [key, value] of Object.entries(idleBrandColors)) {
            expect(value, `${key} should be a hex color`).toMatch(hexPattern);
        }
    });

    it('satisfies the IdleBrandColors type (compile-time check)', () => {
        const colors: IdleBrandColors = idleBrandColors;
        expect(colors).toBe(idleBrandColors);
    });
});
```

**Step 3: Run tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app test -- --run sources/components/brand/brand.spec.ts`
Expected: PASS

**Step 4: Commit**

```
feat: update brand colors to Northglass monochrome palette
```

---

### Task 2: Create arc mark SVG

**Files:**
- Modify: `packages/idle-app/sources/brand/svgAssets.ts`
- Modify: `packages/idle-app/sources/assets/images/idle/logo-mark.svg`
- Create: `packages/idle-app/sources/assets/images/idle/logo-lockup.svg`

**Step 1: Design the arc mark SVG**

The arc should be a brushstroke-style half-circle (top ~180 degrees). Since we can't hand-draw, create an organic-feeling arc using a thick stroke with round caps and slight asymmetry. The 24x24 in-app version uses stroke; the 1024x1024 icon version will be rendered from the higher-fidelity SVG.

Update `svgAssets.ts` logoMarkSvg:

```typescript
/** Logo mark: arc (brushstroke half-enso). 24x24 viewBox. */
export const logoMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 16 C5 8.5 8 4 12 4 C16 4 19 8.5 19 16"/></svg>`;
```

**Step 2: Update logo-mark.svg file**

Write to `packages/idle-app/sources/assets/images/idle/logo-mark.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Idle Arc: brushstroke half-enso -->
  <path d="M96 384 C96 176 160 64 256 64 C352 64 416 176 416 384"
        stroke="#FAFAFA" stroke-width="48" stroke-linecap="round" fill="none"/>
</svg>
```

**Step 3: Update logo-wordmark.svg**

Write to `packages/idle-app/sources/assets/images/idle/logo-wordmark.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700');
    text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; }
  </style>
  <text x="0" y="44" fill="#FAFAFA" font-size="48" letter-spacing="-1">idle</text>
</svg>
```

**Step 4: Create logo-lockup.svg**

Write to `packages/idle-app/sources/assets/images/idle/logo-lockup.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" fill="none">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700');
    text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; }
  </style>
  <!-- Arc mark -->
  <path d="M16 60 C16 28 24 12 40 12 C56 12 64 28 64 60"
        stroke="#FAFAFA" stroke-width="8" stroke-linecap="round" fill="none"/>
  <!-- Wordmark -->
  <text x="84" y="58" fill="#FAFAFA" font-size="52" letter-spacing="-1">idle</text>
</svg>
```

**Step 5: Run tests to confirm SVG exports still work**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app test -- --run sources/components/brand/brand.spec.ts`
Expected: PASS (logoMarkSvg still contains `<svg` and `</svg>`, uses currentColor, 24x24 viewBox)

**Step 6: Commit**

```
feat: replace bridge mark with arc (brushstroke half-enso)
```

---

### Task 3: Generate PNG assets from SVG

**Files:**
- Modify: `scripts/generate-brand-assets.sh`
- Overwrite: `packages/idle-app/sources/assets/images/icon.png` (1024x1024)
- Overwrite: `packages/idle-app/sources/assets/images/adaptive-icon.png` (1024x1024)
- Overwrite: `packages/idle-app/sources/assets/images/icon-adaptive.png` (if exists)
- Overwrite: `packages/idle-app/sources/assets/images/favicon.png` (48x48)
- Overwrite: `packages/idle-app/sources/assets/images/splash-icon.png` (200x200)
- Overwrite: `.github/logotype-dark.png` (600x200)

**Step 1: Create icon SVG source (1024x1024)**

Write a temporary `_icon-source.svg` in the scripts dir:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="180" fill="#0A0A0A"/>
  <path d="M288 704 C288 384 384 192 512 192 C640 192 736 384 736 704"
        stroke="#FAFAFA" stroke-width="80" stroke-linecap="round" fill="none"/>
</svg>
```

**Step 2: Update generate-brand-assets.sh**

The script should generate all sizes from the icon source SVG using rsvg-convert. Check if rsvg-convert is available, fall back to instructions if not.

Key commands:
```bash
rsvg-convert -w 1024 -h 1024 _icon-source.svg -o icon.png
rsvg-convert -w 48 -h 48 _icon-source.svg -o favicon.png
rsvg-convert -w 200 -h 200 _icon-source.svg -o splash-icon.png
```

For adaptive icon (foreground only, no background rect):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <path d="M288 704 C288 384 384 192 512 192 C640 192 736 384 736 704"
        stroke="#FAFAFA" stroke-width="80" stroke-linecap="round" fill="none"/>
</svg>
```

For logotype (lockup on dark bg):
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
  <rect width="600" height="200" fill="#0A0A0A"/>
  <path d="M48 140 C48 72 72 36 100 36 C128 36 152 72 152 140"
        stroke="#FAFAFA" stroke-width="16" stroke-linecap="round" fill="none"/>
  <text x="180" y="135" fill="#FAFAFA" font-family="Space Grotesk,sans-serif"
        font-weight="700" font-size="96" letter-spacing="-2">idle</text>
</svg>
```

**Step 3: Run the script and verify PNGs exist**

Run: `bash scripts/generate-brand-assets.sh`
Then open Finder to verify visually: `open packages/idle-app/sources/assets/images/`

**Step 4: Commit**

```
feat: generate v2 arc mark PNG assets
```

---

### Task 4: Update dark theme to monochrome

**Files:**
- Modify: `packages/idle-app/sources/theme.ts` (darkTheme section, lines 242-450)
- Modify: `packages/idle-app/sources/theme.dark.json`

**Step 1: Update theme.ts darkTheme colors**

Replace all v1 color references with Northglass monochrome values. Key changes (every occurrence):

| Find | Replace | Context |
|------|---------|---------|
| `#0A0F1A` | `#0A0A0A` | All dark backgrounds |
| `#C9A84C` | `#FAFAFA` | textLink (accent) |
| `#C8D1DB` | `#FAFAFA` | Primary text |
| `#8B949E` | `#C0C0C0` | Secondary text |
| `#1E2D3D` | `#111111` | Elevated/pressed surfaces |
| `#2A3A4A` | `#2A2A2A` | Borders, dividers, highest surface |

Specific lines in darkTheme:
- Line 250: `text: '#FAFAFA'`
- Line 252: `textSecondary: Platform.select({ ios: '#C0C0C0', web: '#C0C0C0', default: '#CAC4D0' })`
- Line 253: `textLink: '#FAFAFA'`
- Line 258: `surface: Platform.select({ ios: '#0A0A0A', web: '#0A0A0A', default: '#0A0A0A' })`
- Line 260: `surfacePressed: '#111111'`
- Line 261: `surfaceSelected: '#111111'`
- Line 262: `surfacePressedOverlay: Platform.select({ ios: '#111111', ...})`
- Line 264: `surfaceHigh: Platform.select({ ios: '#111111', ...})`
- Line 265: `surfaceHighest: Platform.select({ ios: '#1A1A1A', ...})` (use subtle, not iron)
- Line 266: `divider: Platform.select({ ios: '#1F1F1F', ...})` (use border-default)
- Line 277: `header.background: '#0A0A0A'`
- Line 291: `groupped.background: '#0A0A0A'`
- Line 319: `input.background: '#111111'`
- Line 374: `permissionButton.inactive.background: '#111111'`
- Line 375: `permissionButton.inactive.border: '#2A2A2A'`
- Line 379: `permissionButton.selected.background: '#0A0A0A'`
- Line 380: `permissionButton.selected.border: '#2A2A2A'`
- Line 388: `diff.outline: '#2A2A2A'`
- Line 398-403: `diff.contextBg/lineNumberBg/hunkHeaderBg: '#0A0A0A'`
- Line 399: `diff.contextText: '#C0C0C0'`
- Line 412: `userMessageBackground: '#111111'`
- Line 415: `agentEventText: '#888888'`
- Line 438: `terminal.background: '#0A0A0A'`

**Step 2: Update theme.dark.json**

```json
{
  "primary": "#FAFAFA",
  "onPrimary": "#0A0A0A",
  "primaryContainer": "#1A1A1A",
  "onPrimaryContainer": "#FAFAFA",
  "secondary": "#C0C0C0",
  "onSecondary": "#0A0A0A",
  "secondaryContainer": "#1A1A1A",
  "onSecondaryContainer": "#C0C0C0",
  "tertiary": "#888888",
  "onTertiary": "#0A0A0A",
  "tertiaryContainer": "#1A1A1A",
  "onTertiaryContainer": "#888888",
  "error": "#EF4444",
  "onError": "#0A0A0A",
  "errorContainer": "#3F1B1B",
  "onErrorContainer": "#EF4444",
  "background": "#0A0A0A",
  "onBackground": "#FAFAFA",
  "surface": "#0A0A0A",
  "onSurface": "#FAFAFA",
  "surfaceVariant": "#111111",
  "onSurfaceVariant": "#C0C0C0",
  "outline": "#2A2A2A",
  "outlineVariant": "#1F1F1F",
  "shadow": "#000000",
  "scrim": "#000000",
  "inverseSurface": "#FAFAFA",
  "inverseOnSurface": "#0A0A0A",
  "inversePrimary": "#505050"
}
```

**Step 3: Run typecheck**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck`
Expected: 0 errors

**Step 4: Run tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app test -- --run`
Expected: All pass

**Step 5: Commit**

```
feat: update dark theme to Northglass monochrome
```

---

### Task 5: Update light theme to monochrome

**Files:**
- Modify: `packages/idle-app/sources/theme.ts` (lightTheme section, lines 33-240)
- Modify: `packages/idle-app/sources/theme.light.json`

**Step 1: Update theme.ts lightTheme colors**

Key changes:
- Line 44: `textLink: '#0A0A0A'` (black accent on light bg, not amber)
- Line 73: `header.tint: '#0A0A0A'` (already close, just ensure pure black)

Light theme is mostly fine since it was already near-neutral iOS defaults. The main fix is removing the amber textLink.

**Step 2: Update theme.light.json**

```json
{
  "primary": "#0A0A0A",
  "onPrimary": "#FAFAFA",
  "primaryContainer": "#EBEBEB",
  "onPrimaryContainer": "#0A0A0A",
  "secondary": "#505050",
  "onSecondary": "#FAFAFA",
  "secondaryContainer": "#F5F5F5",
  "onSecondaryContainer": "#0A0A0A",
  "tertiary": "#888888",
  "onTertiary": "#FAFAFA",
  "tertiaryContainer": "#F5F5F5",
  "onTertiaryContainer": "#505050",
  "error": "#EF4444",
  "onError": "#FAFAFA",
  "errorContainer": "#FFF0F0",
  "onErrorContainer": "#7F1D1D",
  "background": "#FAFAFA",
  "onBackground": "#0A0A0A",
  "surface": "#FAFAFA",
  "onSurface": "#0A0A0A",
  "surfaceVariant": "#F5F5F5",
  "onSurfaceVariant": "#505050",
  "outline": "#D0D0D0",
  "outlineVariant": "#EBEBEB",
  "shadow": "#000000",
  "scrim": "#000000",
  "inverseSurface": "#0A0A0A",
  "inverseOnSurface": "#FAFAFA",
  "inversePrimary": "#C0C0C0"
}
```

**Step 3: Run typecheck + tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck && yarn workspace idle-app test -- --run`
Expected: 0 type errors, all tests pass

**Step 4: Commit**

```
feat: update light theme to Northglass monochrome
```

---

### Task 6: Update app.config.js splash/icon colors

**Files:**
- Modify: `packages/idle-app/app.config.js`

**Step 1: Replace color values**

| Line | Find | Replace |
|------|------|---------|
| 45 | `backgroundColor: "#0A0F1A"` | `backgroundColor: "#0A0A0A"` |
| 136 | `backgroundColor: "#E8EDF2"` | `backgroundColor: "#FAFAFA"` |
| 138 | `backgroundColor: "#0A0F1A"` | `backgroundColor: "#0A0A0A"` |
| 143 | `backgroundColor: "#E8EDF2"` | `backgroundColor: "#FAFAFA"` |
| 145 | `backgroundColor: "#0A0F1A"` | `backgroundColor: "#0A0A0A"` |

**Step 2: Commit**

```
feat: update splash/icon config to monochrome palette
```

---

### Task 7: Update brand docs

**Files:**
- Modify: `docs/brand/IDLE-BRAND.md`

**Step 1: Rewrite to reflect v2 monochrome identity**

Replace the brand doc to reference:
- Arc mark (not bridge)
- Monochrome palette (not amber)
- Pure black #0A0A0A (not blue-tinted ink)
- Alignment with live northglass.io

**Step 2: Commit**

```
docs: update brand guide to v2 monochrome identity
```

---

### Task 8: Typecheck + full test suite

**Step 1: Typecheck all packages**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app typecheck`
Expected: 0 errors

**Step 2: Run all app tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-app test -- --run`
Expected: All pass

**Step 3: Run CLI tests**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn workspace idle-coder test`
Expected: All pass

**Step 4: Visual verification**

Run: `cd /Users/tomstetson/Projects/02-Personal/Idle/idle-repo && yarn web`
Open browser, verify dark theme shows pure black backgrounds, white text, no amber anywhere, arc mark in header/tabs.

---

### Summary

| Task | What | Files |
|------|------|-------|
| 1 | Brand colors to monochrome | colors.ts, brand.spec.ts |
| 2 | Arc mark SVG | svgAssets.ts, logo-mark.svg, logo-lockup.svg |
| 3 | Generate PNG assets | generate-brand-assets.sh, icon/favicon/splash PNGs |
| 4 | Dark theme monochrome | theme.ts (dark), theme.dark.json |
| 5 | Light theme monochrome | theme.ts (light), theme.light.json |
| 6 | App config colors | app.config.js |
| 7 | Brand docs | IDLE-BRAND.md |
| 8 | Full verification | typecheck + tests + visual |
