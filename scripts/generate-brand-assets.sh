#!/usr/bin/env bash
# Generate static brand assets (PNG) from SVG sources.
# Uses rsvg-convert (from librsvg) for rendering.
# Run from repo root: bash scripts/generate-brand-assets.sh
#
# v2 — Arc mark design: single brushstroke arc, white on black.
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

echo "Generating v2 arc mark brand assets..."

# ---------- 1. icon.png (1024x1024) — arc mark on dark bg with rounded corners ----------
cat > "$TMP_DIR/icon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="180" fill="#0A0A0A"/>
  <path d="M288 704 C288 384 384 192 512 192 C640 192 736 384 736 704"
        stroke="#FAFAFA" stroke-width="80" stroke-linecap="round" fill="none"/>
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/icon.svg" -o "$ASSETS_DIR/icon.png"
echo "  icon.png (1024x1024)"

# ---------- 2. adaptive-icon.png (1024x1024) — foreground only, transparent bg ----------
cat > "$TMP_DIR/adaptive-icon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <path d="M288 704 C288 384 384 192 512 192 C640 192 736 384 736 704"
        stroke="#FAFAFA" stroke-width="80" stroke-linecap="round" fill="none"/>
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/adaptive-icon.svg" -o "$ASSETS_DIR/adaptive-icon.png"
echo "  adaptive-icon.png (1024x1024)"

# ---------- 3. icon-adaptive.png — copy of adaptive-icon ----------
cp "$ASSETS_DIR/adaptive-icon.png" "$ASSETS_DIR/icon-adaptive.png"
echo "  icon-adaptive.png (1024x1024, copy)"

# ---------- 4. icon-monochrome.png (1024x1024) — white stroke, transparent bg ----------
cat > "$TMP_DIR/icon-monochrome.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <path d="M288 704 C288 384 384 192 512 192 C640 192 736 384 736 704"
        stroke="#FFFFFF" stroke-width="80" stroke-linecap="round" fill="none"/>
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
# Helper: generate logotype SVG with arc mark + "idle" text
# Args: $1=bg-color, $2=stroke-color, $3=text-color
gen_logotype_svg() {
  local bg_color="$1" stroke_color="$2" text_color="$3"
  cat <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
  <rect width="600" height="200" fill="${bg_color}"/>
  <path d="M48 150 C48 76 72 36 100 36 C128 36 152 76 152 150"
        stroke="${stroke_color}" stroke-width="16" stroke-linecap="round" fill="none"/>
  <text x="180" y="138" fill="${text_color}" font-family="sans-serif"
        font-weight="700" font-size="96" letter-spacing="-2">idle</text>
</svg>
SVG
}

# logotype-dark: light text on dark bg (for dark backgrounds / GitHub README)
gen_logotype_svg "#0A0A0A" "#FAFAFA" "#FAFAFA" > "$TMP_DIR/logotype-dark.svg"
rsvg-convert -w 600 -h 200 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark.png"
rsvg-convert -w 1200 -h 400 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark@2x.png"
rsvg-convert -w 1800 -h 600 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark@3x.png"
echo "  logotype-dark.png (@1x, @2x, @3x)"

# logotype-light: dark text on light bg (for light backgrounds)
gen_logotype_svg "#FAFAFA" "#0A0A0A" "#0A0A0A" > "$TMP_DIR/logotype-light.svg"
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
echo "Done! All v2 arc mark brand assets generated."
