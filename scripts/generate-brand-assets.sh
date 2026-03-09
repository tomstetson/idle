#!/usr/bin/env bash
# Generate static brand assets (PNG) from SVG sources.
# Uses rsvg-convert (from librsvg) for rendering.
# Run from repo root: bash scripts/generate-brand-assets.sh
#
# v3 — Prompt mark: brush chevron + cursor between bars with ink splatter.
set -euo pipefail

ASSETS_DIR="packages/idle-app/sources/assets/images"
GITHUB_DIR=".github"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Verify rsvg-convert is available
if ! command -v rsvg-convert &>/dev/null; then
  echo "Error: rsvg-convert not found. Install with: brew install librsvg"
  exit 1
fi

echo "Generating v3 prompt mark brand assets..."

# ---------- Shared mark elements (no background) ----------
MARK_ELEMENTS='
  <!-- Top bar with splatter -->
  <rect x="200" y="280" width="624" height="16" rx="3" fill="__COLOR__" opacity="0.3"/>
  <circle cx="195" cy="288" r="4" fill="__COLOR__" opacity="0.2"/>
  <circle cx="830" cy="285" r="5" fill="__COLOR__" opacity="0.15"/>
  <circle cx="835" cy="295" r="3" fill="__COLOR__" opacity="0.2"/>
  <circle cx="188" cy="280" r="3" fill="__COLOR__" opacity="0.15"/>
  <!-- Bottom bar with splatter -->
  <rect x="200" y="728" width="624" height="16" rx="3" fill="__COLOR__" opacity="0.3"/>
  <circle cx="192" cy="736" r="4" fill="__COLOR__" opacity="0.2"/>
  <circle cx="832" cy="732" r="3" fill="__COLOR__" opacity="0.18"/>
  <circle cx="828" cy="745" r="4" fill="__COLOR__" opacity="0.15"/>
  <!-- Bold brush chevron -->
  <path d="M300,420 C308,412 320,416 344,434 C378,460 412,488 436,508 C444,514 444,518 436,524 C412,544 378,572 344,598 C320,616 308,620 300,612 C294,606 302,596 320,582 C354,558 388,532 414,514 C418,512 418,512 414,510 C388,492 354,466 320,442 C302,428 294,418 300,420 Z" fill="__COLOR__"/>
  <!-- Splatter near chevron -->
  <circle cx="456" cy="498" r="3" fill="__COLOR__" opacity="0.3"/>
  <circle cx="462" cy="530" r="2" fill="__COLOR__" opacity="0.25"/>
  <!-- Cursor line -->
  <path d="M536,448 C540,442 544,442 548,448 C552,462 554,486 554,512 C554,538 552,562 548,576 C544,582 540,582 536,576 C532,562 530,538 530,512 C530,486 532,462 536,448 Z" fill="__COLOR__"/>
'

MARK_WHITE="${MARK_ELEMENTS//__COLOR__/#FAFAFA}"
MARK_BLACK="${MARK_ELEMENTS//__COLOR__/#0A0A0A}"

# ---------- 1. icon.png (1024x1024) — mark on dark bg with rounded corners ----------
cat > "$TMP_DIR/icon.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="180" fill="#0A0A0A"/>
  ${MARK_WHITE}
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/icon.svg" -o "$ASSETS_DIR/icon.png"
echo "  icon.png (1024x1024)"

# ---------- 2. adaptive-icon.png (1024x1024) — foreground only, transparent bg ----------
cat > "$TMP_DIR/adaptive-icon.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${MARK_WHITE}
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/adaptive-icon.svg" -o "$ASSETS_DIR/adaptive-icon.png"
echo "  adaptive-icon.png (1024x1024)"

# ---------- 3. icon-adaptive.png — copy of adaptive-icon ----------
cp "$ASSETS_DIR/adaptive-icon.png" "$ASSETS_DIR/icon-adaptive.png"
echo "  icon-adaptive.png (1024x1024, copy)"

# ---------- 4. icon-monochrome.png (1024x1024) — white mark, transparent bg ----------
cat > "$TMP_DIR/icon-monochrome.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${MARK_WHITE//#FAFAFA/#FFFFFF}
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/icon-monochrome.svg" -o "$ASSETS_DIR/icon-monochrome.png"
echo "  icon-monochrome.png (1024x1024)"

# ---------- 5. favicon.png (48x48) — same as icon but small ----------
rsvg-convert -w 48 -h 48 "$TMP_DIR/icon.svg" -o "$ASSETS_DIR/favicon.png"
echo "  favicon.png (48x48)"

# ---------- 6. favicon-active.png (48x48) — same as favicon for now ----------
cp "$ASSETS_DIR/favicon.png" "$ASSETS_DIR/favicon-active.png"
echo "  favicon-active.png (48x48, copy)"

# ---------- 7. splash-icon.png (200x200) — same as icon but 200px ----------
rsvg-convert -w 200 -h 200 "$TMP_DIR/icon.svg" -o "$ASSETS_DIR/splash-icon.png"
echo "  splash-icon.png (200x200)"

# ---------- 8. Logotype variants ----------
# Helper: generate logotype SVG with prompt mark + "idle" text
# Uses a scaled-down version of the mark in a 600x200 frame
# Args: $1=bg-color, $2=mark-color, $3=text-color
gen_logotype_svg() {
  local mark_color="$1" text_color="$2"
  cat <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80">
  <g transform="translate(4,4) scale(0.07)">
    <!-- Top bar -->
    <rect x="200" y="280" width="624" height="16" rx="3" fill="${mark_color}" opacity="0.55"/>
    <circle cx="195" cy="288" r="4" fill="${mark_color}" opacity="0.35"/>
    <circle cx="830" cy="285" r="5" fill="${mark_color}" opacity="0.3"/>
    <!-- Bottom bar -->
    <rect x="200" y="728" width="624" height="16" rx="3" fill="${mark_color}" opacity="0.55"/>
    <circle cx="832" cy="732" r="3" fill="${mark_color}" opacity="0.3"/>
    <!-- Chevron -->
    <path d="M300,420 C308,412 320,416 344,434 C378,460 412,488 436,508 C444,514 444,518 436,524 C412,544 378,572 344,598 C320,616 308,620 300,612 C294,606 302,596 320,582 C354,558 388,532 414,514 C418,512 418,512 414,510 C388,492 354,466 320,442 C302,428 294,418 300,420 Z" fill="${mark_color}"/>
    <!-- Splatter near chevron -->
    <circle cx="456" cy="498" r="3" fill="${mark_color}" opacity="0.4"/>
    <circle cx="462" cy="530" r="2" fill="${mark_color}" opacity="0.3"/>
    <!-- Cursor -->
    <path d="M536,448 C540,442 544,442 548,448 C552,462 554,486 554,512 C554,538 552,562 548,576 C544,582 540,582 536,576 C532,562 530,538 530,512 C530,486 532,462 536,448 Z" fill="${mark_color}"/>
  </g>
  <text x="84" y="57" fill="${text_color}" font-family="sans-serif"
        font-weight="700" font-size="50" letter-spacing="-1.5">idle</text>
</svg>
SVG
}

# logotype-dark: light mark + text on transparent bg (for dark backgrounds)
gen_logotype_svg "#FAFAFA" "#FAFAFA" > "$TMP_DIR/logotype-dark.svg"
rsvg-convert -w 600 -h 200 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark.png"
rsvg-convert -w 1200 -h 400 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark@2x.png"
rsvg-convert -w 1800 -h 600 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark@3x.png"
echo "  logotype-dark.png (@1x, @2x, @3x)"

# logotype-light: dark mark + text on transparent bg (for light backgrounds)
gen_logotype_svg "#0A0A0A" "#0A0A0A" > "$TMP_DIR/logotype-light.svg"
rsvg-convert -w 600 -h 200 "$TMP_DIR/logotype-light.svg" -o "$ASSETS_DIR/logotype-light.png"
rsvg-convert -w 1200 -h 400 "$TMP_DIR/logotype-light.svg" -o "$ASSETS_DIR/logotype-light@2x.png"
rsvg-convert -w 1800 -h 600 "$TMP_DIR/logotype-light.svg" -o "$ASSETS_DIR/logotype-light@3x.png"
echo "  logotype-light.png (@1x, @2x, @3x)"

# logotype.png = default (same as logotype-dark)
cp "$ASSETS_DIR/logotype-dark.png" "$ASSETS_DIR/logotype.png"
cp "$ASSETS_DIR/logotype-dark@2x.png" "$ASSETS_DIR/logotype@2x.png"
cp "$ASSETS_DIR/logotype-dark@3x.png" "$ASSETS_DIR/logotype@3x.png"
echo "  logotype.png (@1x, @2x, @3x)"

# ---------- 9. .github/logotype-dark.png (600x200) ----------
mkdir -p "$GITHUB_DIR"
rsvg-convert -w 600 -h 200 "$TMP_DIR/logotype-dark.svg" -o "$GITHUB_DIR/logotype-dark.png"
echo "  .github/logotype-dark.png"

# ---------- 10. .github/logotype-light.png (600x200) ----------
rsvg-convert -w 600 -h 200 "$TMP_DIR/logotype-light.svg" -o "$GITHUB_DIR/logotype-light.png"
echo "  .github/logotype-light.png"

echo ""
echo "Done! All v3 prompt mark brand assets generated."
