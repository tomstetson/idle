#!/usr/bin/env bash
# Generate static brand assets (PNG) from SVG sources.
# Uses rsvg-convert (from librsvg) for rendering.
# Run from repo root: bash scripts/generate-brand-assets.sh
set -euo pipefail

ASSETS_DIR="packages/idle-app/sources/assets/images"
GITHUB_DIR=".github"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Generating brand assets..."

# ---------- 1. icon.png (1024x1024) ----------
cat > "$TMP_DIR/icon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
  <rect width="1024" height="1024" rx="192" fill="#0A0F1A"/>
  <line x1="352" y1="416" x2="352" y2="736" stroke="#E8EDF2" stroke-width="64" stroke-linecap="round"/>
  <line x1="672" y1="416" x2="672" y2="736" stroke="#E8EDF2" stroke-width="64" stroke-linecap="round"/>
  <path d="M352 416 Q512 192 672 416" stroke="#C9A84C" stroke-width="56" fill="none" stroke-linecap="round"/>
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/icon.svg" -o "$ASSETS_DIR/icon.png"
echo "  icon.png"

# ---------- 2. favicon.png (48x48) ----------
cat > "$TMP_DIR/favicon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="6" fill="#0A0F1A"/>
  <line x1="11" y1="13" x2="11" y2="23" stroke="#E8EDF2" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="21" y1="13" x2="21" y2="23" stroke="#E8EDF2" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M11 13 Q16 6 21 13" stroke="#C9A84C" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>
SVG
rsvg-convert -w 48 -h 48 "$TMP_DIR/favicon.svg" -o "$ASSETS_DIR/favicon.png"
echo "  favicon.png"

# ---------- 3. favicon-active.png (48x48) — same for now ----------
cp "$ASSETS_DIR/favicon.png" "$ASSETS_DIR/favicon-active.png"
echo "  favicon-active.png"

# ---------- 4. icon-adaptive.png (1024x1024) — transparent bg ----------
cat > "$TMP_DIR/icon-adaptive.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
  <line x1="352" y1="416" x2="352" y2="736" stroke="#E8EDF2" stroke-width="64" stroke-linecap="round"/>
  <line x1="672" y1="416" x2="672" y2="736" stroke="#E8EDF2" stroke-width="64" stroke-linecap="round"/>
  <path d="M352 416 Q512 192 672 416" stroke="#C9A84C" stroke-width="56" fill="none" stroke-linecap="round"/>
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/icon-adaptive.svg" -o "$ASSETS_DIR/icon-adaptive.png"
echo "  icon-adaptive.png"

# ---------- 5. icon-monochrome.png (1024x1024) — all white on transparent ----------
cat > "$TMP_DIR/icon-monochrome.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
  <line x1="352" y1="416" x2="352" y2="736" stroke="#FFFFFF" stroke-width="64" stroke-linecap="round"/>
  <line x1="672" y1="416" x2="672" y2="736" stroke="#FFFFFF" stroke-width="64" stroke-linecap="round"/>
  <path d="M352 416 Q512 192 672 416" stroke="#FFFFFF" stroke-width="56" fill="none" stroke-linecap="round"/>
</svg>
SVG
rsvg-convert -w 1024 -h 1024 "$TMP_DIR/icon-monochrome.svg" -o "$ASSETS_DIR/icon-monochrome.png"
echo "  icon-monochrome.png"

# ---------- 6. Logotype: bridge mark + "Idle" text ----------
# logotype-dark = glass-colored text on transparent (for dark backgrounds)
# logotype-light = ink-colored text on transparent (for light backgrounds)
# The viewBox is wide enough for mark (24 units) + gap (6) + text (~50 units) = ~80 wide, 24 tall
# We embed the font as system-ui since rsvg-convert uses system fonts

# Helper: generate logotype SVG
# Args: $1=text-color, $2=arc-color, $3=bar-color
gen_logotype_svg() {
  local text_color="$1" arc_color="$2" bar_color="$3"
  cat <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 40" fill="none">
  <!-- Bridge mark scaled to fit left side, centered vertically -->
  <g transform="translate(4, 5)">
    <line x1="7" y1="10" x2="7" y2="22" stroke="${bar_color}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="23" y1="10" x2="23" y2="22" stroke="${bar_color}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M7 10 Q15 1 23 10" stroke="${arc_color}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>
  <!-- "Idle" text -->
  <text x="38" y="28" font-family="'SF Pro Display', 'Helvetica Neue', 'Arial', sans-serif" font-size="22" font-weight="700" fill="${text_color}" letter-spacing="-0.5">Idle</text>
</svg>
SVG
}

# logotype-dark: glass text + colored mark on transparent (shown on dark bg)
gen_logotype_svg "#E8EDF2" "#C9A84C" "#E8EDF2" > "$TMP_DIR/logotype-dark.svg"
rsvg-convert -w 132 -h 40 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark.png"
rsvg-convert -w 264 -h 80 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark@2x.png"
rsvg-convert -w 396 -h 120 "$TMP_DIR/logotype-dark.svg" -o "$ASSETS_DIR/logotype-dark@3x.png"
echo "  logotype-dark.png (@1x, @2x, @3x)"

# logotype-light: ink text + colored mark on transparent (shown on light bg)
gen_logotype_svg "#0A0F1A" "#C9A84C" "#0A0F1A" > "$TMP_DIR/logotype-light.svg"
rsvg-convert -w 132 -h 40 "$TMP_DIR/logotype-light.svg" -o "$ASSETS_DIR/logotype-light.png"
rsvg-convert -w 264 -h 80 "$TMP_DIR/logotype-light.svg" -o "$ASSETS_DIR/logotype-light@2x.png"
rsvg-convert -w 396 -h 120 "$TMP_DIR/logotype-light.svg" -o "$ASSETS_DIR/logotype-light@3x.png"
echo "  logotype-light.png (@1x, @2x, @3x)"

# logotype.png = same as logotype-dark (default)
cp "$ASSETS_DIR/logotype-dark.png" "$ASSETS_DIR/logotype.png"
cp "$ASSETS_DIR/logotype-dark@2x.png" "$ASSETS_DIR/logotype@2x.png"
cp "$ASSETS_DIR/logotype-dark@3x.png" "$ASSETS_DIR/logotype@3x.png"
echo "  logotype.png (@1x, @2x, @3x)"

# ---------- 7. .github/logotype-dark.png (600x186) ----------
# Larger version for GitHub README — same design, bigger canvas
cat > "$TMP_DIR/github-logotype.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 186" fill="none">
  <!-- Bridge mark scaled up, vertically centered -->
  <g transform="translate(40, 33)">
    <line x1="25" y1="40" x2="25" y2="90" stroke="#E8EDF2" stroke-width="10" stroke-linecap="round"/>
    <line x1="95" y1="40" x2="95" y2="90" stroke="#E8EDF2" stroke-width="10" stroke-linecap="round"/>
    <path d="M25 40 Q60 5 95 40" stroke="#C9A84C" stroke-width="8" fill="none" stroke-linecap="round"/>
  </g>
  <!-- "Idle" text -->
  <text x="180" y="120" font-family="'SF Pro Display', 'Helvetica Neue', 'Arial', sans-serif" font-size="90" font-weight="700" fill="#E8EDF2" letter-spacing="-2">Idle</text>
</svg>
SVG
rsvg-convert -w 600 -h 186 "$TMP_DIR/github-logotype.svg" -o "$GITHUB_DIR/logotype-dark.png"
echo "  .github/logotype-dark.png"

echo ""
echo "Done! All brand assets generated."
