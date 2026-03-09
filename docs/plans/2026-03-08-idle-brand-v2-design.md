# Idle Brand v2 Design

Supersedes: `2026-03-08-northglass-brand-alignment-design.md`

## Context

The v1 brand alignment introduced amber accents and a geometric bridge mark. Neither matches the current Northglass brand, which has moved to pure monochrome (black + white only) with a hand-traced ensō as the core symbol. This redesign brings Idle fully in line with the live northglass.io identity.

## The Mark: Idle Arc

A single brushstroke arc spanning roughly 180 degrees -- the top half of an ensō. Same organic brush quality as the Northglass ensō: thick in the middle, tapering at the ends, visible brush texture. The opening faces downward.

**Relationship to parent brand:**
- Northglass ensō = ~340 degree circle with small gap (completeness, mastery)
- Idle arc = ~180 degree arc with large opening (readiness, connection, the open channel)

**Metaphor:** The incomplete half, waiting for connection. A portal, a threshold. Idle connects your phone to your terminal -- it's the open end of the circuit.

**Technical approach:** Filled compound SVG path (same as the ensō in `enso-path.ts`), not a stroke-based circle. viewBox 0 0 1024 1024. The path should look like it was drawn by the same hand with the same brush as the ensō.

**Variants:**
1. App icon (1024x1024): Arc centered on #0A0A0A background, iOS squircle
2. Favicon (48x48): Same arc, scaled
3. Inline mark: Arc next to "idle" wordmark in horizontal lockup
4. Tab bar icon: Simplified thin-stroke version for in-app navigation (currentColor)

## Color Palette

Full monochrome. No amber, no blue tints, no color accents. Matches live northglass.io exactly.

### Backgrounds (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | #0A0A0A | Page body, main background |
| bg-elevated | #111111 | Cards, modals, dropdowns |
| bg-surface | #141414 | Secondary surfaces, code blocks |
| bg-subtle | #1A1A1A | Hover states, active rows |
| bg-muted | #1F1F1F | Disabled backgrounds |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | #FAFAFA | Headings, primary content |
| text-secondary | #C0C0C0 | Body text, descriptions |
| text-muted | #888888 | Captions, timestamps, metadata |
| text-disabled | #505050 | Disabled states |

### Borders

| Token | Hex | Usage |
|-------|-----|-------|
| border-default | #1F1F1F | Subtle dividers |
| border-strong | #2A2A2A | Card borders, input borders |
| border-focus | #FAFAFA | Focus rings |

### Accent

White (#FAFAFA) is the only accent. Links, interactive elements, active states all use white. No color.

### Semantic (Status Only)

| Name | Hex | Usage |
|------|-----|-------|
| Success | #10B981 | Verified, passing |
| Warning | #F59E0B | Attention needed |
| Error | #EF4444 | Failed, critical |
| Info | #3B82F6 | Informational |

### Light Theme

| Token | Hex |
|-------|-----|
| bg-primary | #FAFAFA |
| bg-elevated | #FFFFFF |
| bg-surface | #F5F5F5 |
| bg-subtle | #EBEBEB |
| text-primary | #0A0A0A |
| text-secondary | #505050 |
| text-muted | #888888 |
| border-default | #EBEBEB |
| border-strong | #D0D0D0 |

## Typography

No changes from current setup -- already matches Northglass.

| Context | Font | Weight |
|---------|------|--------|
| Headings | Space Grotesk | 500-700 |
| Body | Inter | 300-600 |
| Code | JetBrains Mono | 400-500 |

**Wordmark:** "idle" in lowercase Space Grotesk Bold, letter-spacing -0.02em. Lowercase differentiates from parent ("NORTHGLASS LABS" is uppercase with 0.15em tracking).

**Lockup:** Arc mark + "idle" wordmark, horizontally aligned.

## Asset Deliverables

### App Icons (PNG from SVG source)

| Asset | Size | Path |
|-------|------|------|
| iOS app icon | 1024x1024 | packages/idle-app/sources/assets/images/icon.png |
| Adaptive icon fg | 1024x1024 | packages/idle-app/sources/assets/images/adaptive-icon.png |
| Favicon | 48x48 | packages/idle-app/sources/assets/images/favicon.png |
| Splash icon | 200x200 | packages/idle-app/sources/assets/images/splash-icon.png |

### SVG Sources

| Asset | Path |
|-------|------|
| Arc mark | packages/idle-app/sources/assets/images/idle/logo-mark.svg |
| Wordmark | packages/idle-app/sources/assets/images/idle/logo-wordmark.svg |
| Full lockup | packages/idle-app/sources/assets/images/idle/logo-lockup.svg |

### GitHub / Web

| Asset | Size | Path |
|-------|------|------|
| Logotype (dark bg) | 600x200 | .github/logotype-dark.png |
| Logotype (light bg) | 600x200 | .github/logotype-light.png |

### Code Components

| Component | File |
|-----------|------|
| logoMarkSvg (arc) | packages/idle-app/sources/brand/svgAssets.ts |
| idleBrandColors | packages/idle-app/sources/brand/colors.ts |

### Theme Files

| File | Changes |
|------|---------|
| theme.ts | Unistyles dark/light with Northglass monochrome tokens |
| theme.dark.json | MD3 tokens aligned to #0A0A0A palette |
| theme.light.json | MD3 tokens aligned to #FAFAFA palette |
| app.config.js | Splash colors: light #FAFAFA, dark #0A0A0A |

### Generation Pipeline

SVG to PNG via rsvg-convert in scripts/generate-brand-assets.sh.

## What Changes from v1

| Area | v1 (current) | v2 (this design) |
|------|-------------|-------------------|
| Mark | Bridge (two bars + geometric arc) | Arc (single brushstroke half-ensō) |
| Accent color | Amber #C9A84C | White #FAFAFA |
| Dark bg | Blue-tinted #0A0F1A | Pure black #0A0A0A |
| Text colors | Blue-tinted (frost, silver) | Neutral grays (C0C0C0, 888888) |
| Border colors | Blue-tinted | Neutral (#1F1F1F, #2A2A2A) |
| Light bg | Blue-tinted #E8EDF2 | Pure #FAFAFA |
| Brand identity | Northglass-adjacent | Northglass-native |
