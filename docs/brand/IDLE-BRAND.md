# Idle Brand Package

Idle is a **remote coding agent platform** for the terminal: a more secure, focused fork of Happy Engineering. You control Claude Code and Codex from your phone, tablet, or browser while agents run on your machines—with end-to-end encryption and a calm, developer-first experience.

This document defines the Idle brand: positioning, voice, color palette, typography, and logo/icon usage for use across the app, web, and marketing.

---

## 1. Product positioning

| | Happy Engineering | Idle |
|---|-------------------|-----|
| **What** | Mobile/client for Claude Code & Codex | Same, with stronger security and control |
| **Feel** | Friendly, approachable | Calm, focused, trustworthy, developer-first |
| **Security** | E2E encryption | E2E encryption + hardened auth, token expiry, rate limiting, documented security model |
| **Audience** | Broad | Developers and teams who care about security and stability |

**Tagline options:** *Remote coding, fully yours.* | *Code from anywhere. Encrypted.* | *Your terminal, in your pocket.*

---

## 2. Brand voice

- **Clear, not cute** — We explain features and states plainly. No unnecessary playfulness.
- **Confident, not loud** — Security and reliability are stated, not shouted.
- **Minimal, not cold** — UI copy is short and helpful. Empty states and errors are human.

---

## 3. Color palette

Idle uses a **teal–slate** base with an **accent** for focus and action. This is distinct from Happy’s iOS-style blue/black/white and supports light and dark themes.

### Brand colors (design / marketing)

| Name | Hex | Use |
|------|-----|-----|
| **Idle Teal** | `#0D3B47` | Dark primary, headers, strong emphasis (dark mode) |
| **Idle Cyan** | `#00C9B1` | Accent: links, active states, “on”/ready, success |
| **Idle Amber** | `#E8B84C` | Optional: highlights, warnings, secondary CTAs |
| **Slate 900** | `#0F172A` | Dark surfaces (alternative to pure black) |
| **Slate 600** | `#475569` | Secondary text, borders |
| **Slate 400** | `#94A3B8` | Tertiary text, placeholders |
| **Paper** | `#F8FAFC` | Light background tint |
| **White** | `#FFFFFF` | Light surfaces, primary text on dark |

### App semantic colors (theme)

These map into the app theme; see `sources/theme.ts` and `docs/brand/color-palette.ts`.

- **Primary / accent:** Idle Cyan for interactive emphasis (links, active tab, primary button in accent variant).
- **Success:** Green remains for “connected” and positive actions; can be aligned with Idle Cyan in accent contexts.
- **Destructive:** Red unchanged for errors and destructive actions.
- **Neutrals:** Slate scale for text, borders, and backgrounds so the UI feels consistent with the teal brand.

---

## 4. Typography

- **Headings / UI:** Existing stack (e.g. Bricolage Grotesque, IBM Plex Sans) is retained. Prefer **semiBold** for section titles and **regular** for body.
- **Code / terminal:** Monospace (e.g. IBM Plex Mono, Space Mono) for code blocks and terminal content.
- **Logo wordmark:** Uppercase “IDLE” or title-case “Idle” in a clean sans; no script or decorative fonts.

---

## 5. Logo and mark

### Logo mark (symbol only)

- A **vertical “cursor” bar** with a **dot** above it: the “i” in Idle, read as both letterform and terminal cursor / idle indicator.
- Used: app icon, favicon, header, small contexts.
- Clear at 16×16px and up. Prefer the mark alone when space is tight; pair with wordmark when space allows.

### Wordmark

- **Idle** in title case (or **IDLE** in caps for lockups).
- Use the same font as app headings for consistency.

### Lockup

- Mark left of wordmark, with fixed spacing. Minimum size so the mark is at least 20px height.

### Don’t

- Stretch or rotate the mark.
- Change the mark’s proportions.
- Add effects (drop shadow, gradient) unless specified in a variant.
- Use the wordmark in competing colors (e.g. red on red).

---

## 6. Icons (in-app)

- **Tab bar:** Inbox (tray/mail), Sessions (list or bubbles), Settings (gear). Same stroke weight and size; use theme `text` / `textSecondary` for fill so they respect light/dark and active state.
- **Favicon / PWA:** Logo mark only, on transparent or theme background.
- **App icon:** Logo mark on a solid background (e.g. Idle Teal or Slate 900); avoid tiny detail.

---

## 7. Asset checklist

| Asset | Format | Sizes / notes |
|-------|--------|----------------|
| Logo mark (light) | SVG | 24×24 default; scales |
| Logo mark (dark) | SVG | Same, invert or use for dark header |
| Wordmark | SVG | For settings / marketing |
| Tab: Inbox | SVG | 24×24, single color for tint |
| Tab: Sessions | SVG | 24×24, single color for tint |
| Tab: Settings | SVG | 24×24, single color for tint |
| App icon | PNG | 1024×1024; export 192, 512 for PWA |
| Favicon | ICO/PNG | 32×32, 16×16 |
| Adaptive (Android) | PNG | Foreground + monochrome from mark |

SVGs use `currentColor` or a single fill so the app can tint them via theme (e.g. `theme.colors.header.tint`).

### Generating app icon and favicon from logo mark

The logo mark SVG is at `packages/idle-app/sources/assets/images/idle/logo-mark.svg`. To produce PNGs for Expo and PWA:

1. **App icon (1024×1024):** Export the logo mark centered on Idle Teal (`#0D3B47`) or Slate 900 (`#0F172A`) at 1024×1024. Use this for `icon.png`, then let Expo generate iOS/Android sizes.
2. **Favicon:** Export at 32×32 and 16×16 (and optionally 192, 512 for PWA manifest). Transparent or brand background.
3. **Android adaptive:** Use the same mark for foreground; a white-on-transparent version for monochrome.

You can use Figma, Inkscape, or a Node script (e.g. `sharp` + `resvg-js` or similar) to render the SVG to PNG at these sizes.

---

## 8. Comparison to Happy

- **Colors:** Idle uses teal/slate/cyan instead of iOS blue and pure black/white.
- **Logo:** Idle uses the “i” cursor mark and Idle wordmark; no reuse of Happy’s mark or wordmark.
- **Tone:** Idle is calmer and more minimal; security and control are first-class.

Use this doc and the linked theme/palette files as the single source of truth for Idle’s visual identity across the app (idle.northglass.io), CLI, and any future marketing or iOS app.
