# Idle Brand Guide

Idle is a Northglass Labs project. A remote client for Claude Code with end-to-end encryption and push notifications. This document defines the visual identity, aligned with the Northglass Labs parent brand.

---

## 1. Relationship to Northglass

Idle is the flagship product of Northglass Labs. It shares the Northglass color palette, typography, and design language, but has its own logo mark. Think of it as a product within a studio, not a sub-brand.

---

## 2. Brand voice

Inherited from Northglass:

- **Clear, not cute.** Features and states are explained plainly.
- **Confident, not loud.** Security and reliability are stated, not shouted.
- **Minimal, not cold.** UI copy is short and helpful. Empty states and errors are human.
- **Register:** Casual but competent. Sounds like a developer's README, not a marketing page.

---

## 3. Logo mark: The Bridge

Two vertical bars connected by a curved arc. Represents the core product: bridging your terminal to your phone through an encrypted connection.

- **Left bar:** your terminal (where the agent runs)
- **Right bar:** your phone (where you monitor)
- **Arc:** the encrypted connection Idle provides

### In-app (monochrome, currentColor)

Uses `currentColor` for theme tinting via react-native-svg. Renders in the header tint color.

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="7" y1="10" x2="7" y2="20"/>
  <line x1="17" y1="10" x2="17" y2="20"/>
  <path d="M7 10 Q12 3 17 10" fill="none"/>
</svg>
```

### Static assets (two-color)

For app icons, favicons, and OG images:

- **Container:** ink (#0A0F1A) rounded rect
- **Bars:** glass (#E8EDF2)
- **Arc:** amber (#C9A84C)

### Wordmark

"Idle" in Space Grotesk Bold (700), letter-spacing -0.5px. No "Labs" suffix.

### Rules

- Do not stretch, rotate, or change proportions.
- Do not add effects (drop shadow, gradient) unless specified.
- Mark alone in tight spaces. With wordmark when space allows.
- Clear at 16x16px and up.

---

## 4. Color palette

Northglass Labs palette, shared across all Northglass products.

| Token | Hex | Role |
|-------|-----|------|
| ink | `#0A0F1A` | Backgrounds, dark surfaces |
| steel | `#1E2D3D` | Card backgrounds, containers |
| iron | `#2A3A4A` | Borders, dividers |
| silver | `#8B949E` | Secondary text, metadata |
| frost | `#C8D1DB` | Body text |
| glass | `#E8EDF2` | Headings, emphasis |
| white | `#FFFFFF` | High-emphasis, hover states |
| amber | `#C9A84C` | Primary accent: links, active states, status |
| amber-dim | `#A07D35` | Muted amber: hover states, subtle accents |

### Usage in app themes

- **Accent:** amber replaces the previous cyan for links, active tabs, and interactive elements.
- **Dark theme surfaces:** ink (base), steel (elevated), iron (borders).
- **Dark theme text:** frost (body), glass (headings), silver (secondary).
- **Light theme:** glass/white backgrounds, ink text, amber accent.
- **Semantic colors** (green for success, red for error) are unchanged.

Source: `packages/idle-app/sources/brand/colors.ts`

---

## 5. Typography

| Role | Font | Weight |
|------|------|--------|
| Headings | Space Grotesk | 700 (Bold) |
| Body / UI | Inter | 400 (Regular), 500 (Medium) |
| Code / mono | JetBrains Mono | 400 (Regular), 500 (Medium) |

Source: `packages/idle-app/sources/constants/Typography.ts`

Font files: `packages/idle-app/sources/assets/fonts/`

---

## 6. Icons (in-app)

Tab bar icons (inbox, sessions, settings) use stroke-based SVGs with `currentColor`. They inherit theme colors automatically and need no brand-specific updates.

Source: `packages/idle-app/sources/brand/svgAssets.ts`

---

## 7. Asset inventory

| Asset | Format | Sizes | Path |
|-------|--------|-------|------|
| Bridge mark (mono) | SVG | 24x24 | `assets/images/idle/logo-mark.svg` |
| Wordmark | SVG | 80x24 | `assets/images/idle/logo-wordmark.svg` |
| App icon | PNG | 1024x1024 | `assets/images/icon.png` |
| Favicon | PNG | 48x48 | `assets/images/favicon.png` |
| Android adaptive | PNG | 1024x1024 | `assets/images/icon-adaptive.png` |
| Android monochrome | PNG | 1024x1024 | `assets/images/icon-monochrome.png` |
| Logotype (dark) | PNG | 1x, 2x, 3x | `assets/images/logotype-dark*.png` |
| Logotype (light) | PNG | 1x, 2x, 3x | `assets/images/logotype-light*.png` |
| GitHub logotype | PNG | 600x186 | `.github/logotype-dark.png` |
| GitHub header | PNG | 1280x640 | `.github/header.png` |

All paths relative to `packages/idle-app/sources/` unless noted otherwise.

### Regenerating assets

```bash
./scripts/generate-brand-assets.sh
```

---

## 8. Domains and identifiers

| Property | Value |
|----------|-------|
| Web app | idle.northglass.io |
| API server | idle-api.northglass.io |
| iOS bundle | com.northglass.idle |
| npm package | idle-coder |
| npm scope | @northglass |
| CLI command | idle |
