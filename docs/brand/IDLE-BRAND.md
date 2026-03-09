# Idle Brand Guide v2

Idle is a Northglass product. A remote client for Claude Code with end-to-end encryption and push notifications.

---

## 1. Identity

Idle is the flagship product of Northglass LLC. It inherits the Northglass monochrome design language, typography, and voice. Idle is a product within a studio, not a sub-brand.

**Brand voice** (inherited from Northglass):

- Clear, not cute. Features and states are explained plainly.
- Confident, not loud. Security and reliability are stated, not shouted.
- Minimal, not cold. UI copy is short and helpful. Empty states and errors are human.
- Register: casual but competent. Sounds like a developer's README, not a marketing page.

---

## 2. The Arc mark

A single brushstroke half-enso (open arc). The top half of a circle, drawn from lower-left to lower-right with rounded endpoints.

**What it represents:** The Northglass enso is a full circle. The Idle arc is the top half -- an incomplete circle, suggesting an ongoing process (your agent, working in the background while you are idle).

**Variants:**

### In-app (monochrome, currentColor)

Uses `currentColor` so theme tinting works automatically via `react-native-svg`.

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="3" stroke-linecap="round">
  <path d="M5 16 C5 8.5 8 4 12 4 C16 4 19 8.5 19 16"/>
</svg>
```

React component: `<IdleLogoMark size={24} color={theme.colors.header.tint} />`

### Static assets (monochrome)

For app icons, favicons, and OG images. White arc on black background.

- Container: `#0A0A0A` rounded rect
- Arc stroke: `#FAFAFA`

No color accents. No amber. No gradients.

### Wordmark

"idle" in lowercase Space Grotesk Bold (700), letter-spacing -0.02em. No "Labs" suffix, no "Northglass" prefix.

React component: `<IdleWordmark fontSize={28} />`

SVG wordmark uses `letter-spacing="-1"` at 48px font-size (equivalent to -0.02em).

---

## 3. Color palette

Pure monochrome. No color accents. White is the only accent. Values match live northglass.io.

### Core tokens

| Token | Hex | Role |
|-------|-----|------|
| black | `#0A0A0A` | Primary background |
| elevated | `#111111` | Elevated surfaces |
| surface | `#141414` | Secondary surfaces |
| subtle | `#1A1A1A` | Hover states |
| muted | `#1F1F1F` | Disabled backgrounds, subtle dividers |
| border | `#2A2A2A` | Card borders, input borders |
| white | `#FAFAFA` | Primary text, headings, accent |
| secondary | `#C0C0C0` | Body text |
| gray | `#888888` | Captions, timestamps |
| disabled | `#505050` | Disabled text |

### Theme usage

**Dark mode** (default):
- Backgrounds: black (base), elevated (cards), surface (secondary panels)
- Text: white (headings, emphasis), secondary (body), gray (captions), disabled (inactive)
- Borders: border token for dividers and inputs
- Accent: white -- interactive elements, links, active states use white, not a color

**Light mode:**
- Backgrounds: white (`#FAFAFA`) base, light grays for elevation
- Text: black (`#0A0A0A`) primary, grays for secondary
- Accent: black -- same principle, opposite polarity

**Semantic colors** (green for success, red for error, yellow for warning) are the only non-monochrome values in the system. They are functional, not brand.

Source: `packages/idle-app/sources/brand/colors.ts`

---

## 4. Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Headings | Space Grotesk | 700 (Bold) | Wordmark font |
| Body / UI | Inter | 400, 500 | Regular and Medium |
| Code / mono | JetBrains Mono | 400, 500 | Terminal output, code blocks |

Source: `packages/idle-app/sources/constants/Typography.ts`
Font files: `packages/idle-app/sources/assets/fonts/`

---

## 5. Asset locations

### SVG source files

| Asset | Path |
|-------|------|
| Arc mark (512x512) | `packages/idle-app/sources/assets/images/idle/logo-mark.svg` |
| Wordmark | `packages/idle-app/sources/assets/images/idle/logo-wordmark.svg` |
| Lockup (mark + wordmark) | `packages/idle-app/sources/assets/images/idle/logo-lockup.svg` |

### React components

| Component | Export | Package |
|-----------|--------|---------|
| `IdleLogoMark` | Arc mark, takes `size` and `color` props | `idle-app/sources/brand/` |
| `IdleWordmark` | Text wordmark, takes `fontSize` and `color` props | `idle-app/sources/brand/` |
| `IdleTabIcon` | Tab bar icons (inbox, sessions, settings) | `idle-app/sources/brand/` |

### Generated PNG assets

| Asset | Path |
|-------|------|
| PWA icon 192 | `packages/idle-app/public/icon-192.png` |
| PWA icon 512 | `packages/idle-app/public/icon-512.png` |
| Apple touch icon | `packages/idle-app/public/apple-touch-icon.png` |
| App icon (Expo) | `packages/idle-app/logo.png` |
| Tauri icons | `packages/idle-app/src-tauri/icons/` |
| GitHub logotype (dark) | `.github/logotype-dark.png` |
| GitHub logotype (light) | `.github/logotype-light.png` |
| GitHub header | `.github/header.png` |

### In-app SVG strings

All tab and mark SVGs are defined as string constants in `packages/idle-app/sources/brand/svgAssets.ts` and rendered via `SvgXml`. They use `currentColor` for theme integration.

---

## 6. Usage rules

- Do not stretch, rotate, or change proportions of the arc mark.
- Do not add effects (drop shadow, gradient, glow) unless specified in a design comp.
- Do not add color to the mark or wordmark. The brand is monochrome.
- Arc mark alone in tight spaces. With wordmark (lockup) when horizontal space allows.
- Minimum size: 16x16px for the arc mark.
- On dark backgrounds: white (`#FAFAFA`) mark. On light backgrounds: black (`#0A0A0A`) mark.
- Never pair the arc with the old amber accent (`#C9A84C`) or blue-tinted darks (`#0A0F1A`). Those are v1, retired.

---

## 7. Domains and identifiers

| Property | Value |
|----------|-------|
| Web app | idle.northglass.io |
| API server | idle-api.northglass.io |
| iOS bundle | com.northglass.idle |
| npm package | idle-coder |
| npm scope | @northglass |
| CLI command | idle |
