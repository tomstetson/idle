#!/usr/bin/env bash
# Build the Idle web app for deployment
# Usage: ./scripts/build-web.sh [output-dir]
#
# Builds the Expo web app and injects PWA meta tags that Expo doesn't
# natively support in single-output mode.

set -euo pipefail

OUTPUT_DIR="${1:-dist}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/packages/idle-app"

echo "Building Idle web app..."
cd "$APP_DIR"

rm -rf "$OUTPUT_DIR"
APP_ENV=production EXPO_NO_METRO_WORKSPACE_ROOT=1 npx expo export --platform web --output-dir "$OUTPUT_DIR"

# Inject PWA meta tags (Expo doesn't support this natively with output: "single")
echo "Injecting PWA meta tags..."
sed -i '' 's|</head>|<meta name="apple-mobile-web-app-capable" content="yes" /><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" /><meta name="apple-mobile-web-app-title" content="Idle" /><meta name="theme-color" content="#18171C" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" /><link rel="manifest" href="/manifest.json" /></head>|' "$OUTPUT_DIR/index.html"

echo "Build complete: $APP_DIR/$OUTPUT_DIR"
echo "  Files: $(find "$OUTPUT_DIR" -type f | wc -l | tr -d ' ')"
echo "  Size: $(du -sh "$OUTPUT_DIR" | cut -f1)"
