# Northglass Brand Alignment Design

> Approved 2026-03-08. Full alignment of Idle branding with Northglass Labs identity.

## Summary

Align Idle's visual identity, app theme, and GitHub presence with the Northglass Labs brand. This is a "Big Bang" approach: README, logo, color palette, typography, and app theme all ship together.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Full alignment (app + GitHub) | Idle should feel like a Northglass product everywhere |
| Logo mark | New "bridge" mark, own identity | Distinct from Northglass enso, shares design language |
| Bridge style | Arc bridge (curved) | Elegant, not brutalist. Two glass bars + amber arc |
| Color palette | Full migration to Northglass tokens | ink/steel/iron/silver/frost/glass/amber replace teal/cyan/slate |
| Typography | Space Grotesk / Inter / JetBrains Mono | Match Northglass.io exactly |
| README | Net new, Northglass voice | No emojis, not AI-looking, developer's project page feel |
| Cover image | Real screenshots, two frames side by side | iPhone + terminal, ink background, no connecting arc |
| Upstream credit | Yes, credits section | Acknowledge Happy Engineering, explain divergence |

## 1. Logo Mark: The Bridge

Two vertical bars connected by a curved arc. Represents the core product: bridging your terminal to your phone.

- **Left bar**: your terminal (where the agent runs)
- **Right bar**: your phone (where you monitor it)
- **Arc**: the encrypted connection Idle provides

### Colors
- Bars: glass (#E8EDF2)
- Arc: amber (#C9A84C)
- Container: ink (#0A0F1A), rounded rect (rx=6 at 32px, scaling proportionally)

### Sizes
- 16x16, 32x32: favicon
- 180x180: apple-touch-icon
- 1024x1024: app icon
- 24x24: in-app header

### Wordmark
"Idle" in Space Grotesk Bold (700), glass (#E8EDF2), letter-spacing -0.5px. No "Labs" suffix.

## 2. Color Palette

### Token mapping

| Token | Hex | Role |
|-------|-----|------|
| ink | #0A0F1A | Backgrounds, dark surfaces |
| steel | #1E2D3D | Card backgrounds, containers |
| iron | #2A3A4A | Borders, dividers |
| silver | #8B949E | Secondary text, metadata |
| frost | #C8D1DB | Body text |
| glass | #E8EDF2 | Headings, emphasis |
| white | #FFFFFF | High-emphasis, hover states |
| amber | #C9A84C | Primary accent: links, active states, status |
| amber-dim | #A07D35 | Muted amber: hover states, subtle accents |

### Migration from current palette

| Current | Hex | Becomes | Hex |
|---------|-----|---------|-----|
| Idle Teal | #0D3B47 | ink | #0A0F1A |
| Idle Cyan | #00C9B1 | amber | #C9A84C |
| Idle Amber | #E8B84C | amber | #C9A84C |
| Slate 900 | #0F172A | ink | #0A0F1A |
| Slate 600 | #475569 | silver | #8B949E |
| Slate 400 | #94A3B8 | frost | #C8D1DB |
| Paper | #F8FAFC | glass | #E8EDF2 |

### Light theme
- Background: glass (#E8EDF2) or white
- Text: ink (#0A0F1A)
- Accent: amber (#C9A84C)
- Cards: white with iron borders

## 3. Typography

| Role | Current | New | Weight |
|------|---------|-----|--------|
| Headings | Bricolage Grotesque | Space Grotesk | 700 |
| Body/UI | IBM Plex Sans | Inter | 400/500 |
| Code/mono | IBM Plex Mono / Space Mono | JetBrains Mono | 400/500 |

Wordmark: "Idle" in Space Grotesk 700.

## 4. README

### Structure
1. Logo (bridge mark + "Idle" wordmark)
2. One-line description
3. Hero image (real screenshots, iPhone + terminal, side by side)
4. What it does (paragraph, no bullets)
5. Install (3 steps with code blocks)
6. Features (clean dashes, no emojis)
7. Architecture (monorepo component table)
8. Security (brief, confident)
9. About (Northglass Labs positioning, free forever)
10. Credits (Happy Engineering acknowledgment)
11. License

### Key copy

**One-liner:**
Remote client for Claude Code. End-to-end encrypted. Open source.

**What it does:**
Idle lets you monitor and control Claude Code sessions from your phone. Run `idle` instead of `claude` on your machine, then pick up the session from the iOS app whenever you step away. Press any key on your keyboard to take it back. All traffic between your devices is end-to-end encrypted. The relay server never sees your code.

**Features:**
- Mobile access to Claude Code sessions from iOS
- Push notifications when your agent needs input or hits an error
- Seamless device handoff, phone to terminal with one keypress
- End-to-end encrypted with AES-256-GCM and zero-knowledge relay
- Voice input for responding to agent prompts on the go
- Open source, no telemetry, no tracking

**Security:**
Security is not an afterthought. Session data is encrypted client-side before it leaves your device. The relay server handles routing, not content. It cannot read your messages, your code, or your prompts. Keys are derived per-session and never transmitted. The code is open source and auditable.

**About:**
Idle is built by Northglass Labs, a one-person open-source studio in Eastern Pennsylvania. We build small, focused tools for developers and security teams. Idle is free, will stay free, and ships under the MIT license. If you find it useful, that's the whole point.

**Credits:**
Idle is forked from Happy Engineering by Slopus. Their work on the core architecture, the CLI wrapper, encrypted relay protocol, and real-time sync, made this project possible. We've since diverged to harden security, improve scalability, and build features the upstream project hasn't prioritized, but the foundation is theirs.

### Formatting rules
- No emojis anywhere
- No em or en dashes (use commas or periods)
- Left-aligned, not centered (except logo)
- Monospace for code/commands only, not for decoration

## 5. Cover Image

- Dimensions: 1280x640
- Background: ink (#0A0F1A)
- Left: terminal screenshot in card frame (steel bg, iron border, rounded corners)
- Right: iOS app screenshot in minimal device frame
- No connecting element between them
- No text overlay
- Screenshots captured from running app (yarn web) and CLI
- Dot grid texture at low opacity optional

## 6. Files to Change

### Brand assets (create/replace)
- `brand/colors.ts` - Northglass palette tokens
- `brand/IdleLogoMark.tsx` - Bridge mark SVG component
- `brand/IdleWordmark.tsx` - Space Grotesk wordmark
- `brand/svgAssets.ts` - Bridge mark SVG string
- `assets/images/idle/logo-mark.svg` - Bridge mark source
- `assets/images/idle/logo-wordmark.svg` - New wordmark
- `assets/images/icon.png` - 1024x1024 app icon
- `assets/images/icon-adaptive.png` - Android adaptive
- `assets/images/icon-monochrome.png` - Android monochrome
- `assets/images/favicon.png` - 32x32
- `assets/images/logotype-*.png` - Light/dark logotypes

### Theme system
- `theme.ts` - Remap all semantic colors
- `theme.light.json` - MD3 light theme values
- `theme.dark.json` - MD3 dark theme values
- `theme.css` - Scrollbar colors
- `unistyles.ts` - Verify, update hardcoded colors

### Font bundling
- Add: Space Grotesk, Inter, JetBrains Mono
- Remove: Bricolage Grotesque, IBM Plex Sans, IBM Plex Mono, Space Mono
- Update Expo font loading config

### GitHub assets
- `.github/header.png` - New cover image
- `.github/logotype-dark.png` - New logotype
- `.github/mascot.png` - Remove

### Documentation
- `README.md` - Full rewrite
- `docs/brand/IDLE-BRAND.md` - Full rewrite to reflect Northglass alignment

### Sweep for hardcoded values
- Grep for old hex values (#0D3B47, #00C9B1, #E8B84C, #0F172A, #475569, #94A3B8, #F8FAFC)
- Grep for old font names (Bricolage, "IBM Plex", "Space Mono")
- Replace all occurrences with new tokens/values

## Risk areas

- Components hardcoding hex values instead of theme tokens
- Splash screen background colors (app.config.js)
- Semantic color usage: "connected" status may use cyan for meaning, needs remapping
- Font metrics differ between old and new typefaces, may affect layout
- MD3 theme JSON format has specific key names that may not map 1:1

## Out of scope

- Northglass.io website changes (updating the stale SVGs there is a separate task)
- Upstream merge strategy changes
- Feature work
