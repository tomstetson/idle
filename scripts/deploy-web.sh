#!/usr/bin/env bash
set -euo pipefail

# Deploy the web app to idle.northglass.io
#
# Builds the Expo web export and syncs to the VPS.
# Run from repo root: ./scripts/deploy-web.sh
#
# Prerequisites:
#   - SSH access to releasingphish-root
#   - idle-wire must be built (script handles this)

echo "=== Deploy Web: idle.northglass.io ==="

echo "[1/4] Building idle-wire..."
yarn workspace @northglass/idle-wire build

echo "[2/4] Typechecking idle-app..."
yarn workspace idle-app typecheck

echo "[3/4] Exporting web build..."
cd packages/idle-app
npx expo export --platform web
cd ../..

echo "[4/4] Syncing to VPS..."
rsync -avz --delete packages/idle-app/dist/ releasingphish-root:/var/www/idle-app/

echo ""
echo "=== Web deploy complete! ==="
echo "Site: https://idle.northglass.io"
