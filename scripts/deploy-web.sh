#!/usr/bin/env bash
set -euo pipefail

# Deploy the web app to idle.northglass.io
#
# Builds the Expo web export and syncs to the VPS.
# Run from repo root: ./scripts/deploy-web.sh
#
# Prerequisites:
#   - VPS_HOST env var set to your SSH host alias
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
VPS_HOST="${VPS_HOST:-releasingphish-root}"
rsync -avz --delete --chown=deployer:deployer packages/idle-app/dist/ "$VPS_HOST":/var/www/idle-app/

echo ""
echo "=== Web deploy complete! ==="
echo "Site: https://idle.northglass.io"
