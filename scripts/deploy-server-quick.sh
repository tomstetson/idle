#!/usr/bin/env bash
set -euo pipefail

# Quick-deploy idle-server to VPS, bypassing CI.
# Runs typecheck + tests locally first, then SSH deploys.
# Usage: ./scripts/deploy-server-quick.sh

echo "=== Quick Deploy: idle-server ==="
echo ""

# Step 1: Build idle-wire (server dependency)
echo "[1/4] Building idle-wire..."
yarn workspace @northglass/idle-wire build

# Step 2: Typecheck server
echo "[2/4] Typechecking idle-server..."
yarn workspace idle-server build

# Step 3: Run server tests
echo "[3/4] Running idle-server tests..."
yarn workspace idle-server test

# Step 4: Deploy via SSH
echo "[4/4] Deploying to VPS..."

# Read VPS config from environment or use defaults
VPS_HOST="${VPS_HOST:?Set VPS_HOST to your SSH host alias (e.g., export VPS_HOST=your-vps)}"

# Run git/yarn as deployer (same as CI) to avoid ownership conflicts with root
ssh "$VPS_HOST" 'cd /var/www/idle-server && sudo -u deployer git pull origin main && sudo -u deployer yarn install --frozen-lockfile && sudo systemctl restart idle-server'

# Wait for startup
echo "Waiting for server startup..."
sleep 8

# Health check
if ssh "$VPS_HOST" 'curl -sf http://localhost:3005/health > /dev/null 2>&1'; then
    echo ""
    echo "=== Deploy successful! Server is healthy. ==="
else
    echo ""
    echo "=== WARNING: Health check failed! Check server logs: ==="
    echo "  ssh $VPS_HOST 'sudo journalctl -u idle-server -n 30 --no-pager'"
    exit 1
fi
