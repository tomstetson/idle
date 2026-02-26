# Runbook: Deploy Idle Server to IONOS VPS

## VPS Details

| Field | Value |
|-------|-------|
| **IP** | `198.71.58.100` |
| **OS** | Ubuntu 24.04.4 LTS |
| **Specs** | 2 vCPU, 2GB RAM, 80GB NVMe |
| **SSH (deploy)** | `ssh releasingphish` (user: `deployer`) |
| **SSH (root)** | `ssh releasingphish-root` (user: `root`) |
| **SSH key** | `~/.ssh/releasingphish_vps` |
| **Root password** | 1Password Agent vault, item `cnn7yi3bfqby7yi7bo24wfuglq` |
| **Provider panel** | https://cloudpanel.ionos.com |
| **Cost** | $5.02/month (PayPal) |

### What's already on this VPS

- Nginx 1.24.0 serving `northglass.io` (placeholder) and `releasingphish.com` (game)
- ufw firewall: 22, 80, 443 open
- Cloudflare proxying `northglass.io` (A record → 198.71.58.100)
- `deployer` user exists for non-root deployments

## Prerequisites

- [ ] SSH access verified: `ssh releasingphish` works
- [ ] Access to Cloudflare dashboard for northglass.io DNS
- [ ] Generate `IDLE_MASTER_SECRET` — a long random string for auth token signing and server-side encryption. **Store in 1Password.** Example: `openssl rand -hex 32`

## Choose a Deployment Mode

### Option A: Standalone (Recommended for Day 1)

Uses PGlite (embedded Postgres) + local filesystem storage. **No external Postgres, Redis, or S3 needed.** Single process, single data directory. Good for the 2GB VPS.

### Option B: Full Production

External Postgres + Redis + optional S3. More moving parts but supports horizontal scaling. See [Full Production Mode](#option-b-full-production-mode) at the bottom.

---

## Option A: Standalone Mode

### Step 1: Install Node.js + Build Tools

```bash
ssh releasingphish-root

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs ffmpeg

# Yarn
npm install -g yarn@1.22.22

# Verify
node -v    # v20.x
yarn -v    # 1.22.22
```

### Step 2: Clone and Build

```bash
# Switch to deployer
su - deployer
mkdir -p /var/www/idle-server
cd /var/www/idle-server

# Clone
git clone --depth 1 https://github.com/tomstetson/idle.git .

# Install dependencies (builds idle-wire automatically via postinstall)
yarn install

# Verify idle-wire built
ls packages/idle-wire/dist/   # should have index.mjs, index.cjs, etc.
```

### Step 3: Create Environment File

```bash
cat > /var/www/idle-server/.env.production <<'EOF'
# === Required ===
IDLE_MASTER_SECRET=PASTE_YOUR_SECRET_HERE
PORT=3005
PUBLIC_URL=https://idle-api.northglass.io

# === Data storage ===
DATA_DIR=/var/www/idle-server/data
PGLITE_DIR=/var/www/idle-server/data/pglite

# === Optional ===
NODE_ENV=production
METRICS_ENABLED=false
EOF
```

```bash
chmod 600 /var/www/idle-server/.env.production
mkdir -p /var/www/idle-server/data
```

> **IMPORTANT**: Replace `PASTE_YOUR_SECRET_HERE` with the output of `openssl rand -hex 32`. Store in 1Password. Changing this later invalidates all existing auth tokens.

### Step 4: Test It

```bash
cd /var/www/idle-server/packages/idle-server

# Run migration + serve (standalone entrypoint)
env $(cat /var/www/idle-server/.env.production | xargs) \
  npx tsx sources/standalone.ts migrate

env $(cat /var/www/idle-server/.env.production | xargs) \
  npx tsx sources/standalone.ts serve

# In another terminal:
curl http://localhost:3005/health
# Should return: {"status":"ok"}
```

Ctrl-C when verified, then proceed to systemd.

### Step 5: Create systemd Service

```bash
ssh releasingphish-root

cat > /etc/systemd/system/idle-server.service <<'EOF'
[Unit]
Description=Idle Server (standalone)
After=network.target

[Service]
Type=simple
User=deployer
WorkingDirectory=/var/www/idle-server/packages/idle-server
ExecStartPre=/usr/bin/npx tsx sources/standalone.ts migrate
ExecStart=/usr/bin/npx tsx sources/standalone.ts serve
Restart=on-failure
RestartSec=5
EnvironmentFile=/var/www/idle-server/.env.production

# Hardening
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/var/www/idle-server/data

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable idle-server
systemctl start idle-server
systemctl status idle-server
```

### Step 6: Configure Nginx Reverse Proxy

```bash
ssh releasingphish-root

cat > /etc/nginx/sites-available/idle-api <<'NGINX'
server {
    listen 80;
    server_name idle-api.northglass.io;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (Socket.IO needs long-lived connections)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # File uploads — increase body size limit
    client_max_body_size 50m;
}
NGINX

ln -sf /etc/nginx/sites-available/idle-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> **SSL**: Handled by Cloudflare (Full mode). Nginx listens on :80, Cloudflare terminates TLS and proxies to your VPS.

### Step 7: Configure DNS (Cloudflare)

In Cloudflare dashboard for `northglass.io`:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `api.idle` | `198.71.58.100` | Proxied (orange cloud) |
| A | `idle` | `198.71.58.100` | Proxied (orange cloud) |

Also: **Settings → Network → WebSockets → ON** (required for Socket.IO).

Wait 1-2 minutes for propagation.

### Step 8: Verify End-to-End

```bash
# From your Mac:
curl -s https://idle-api.northglass.io/health | python3 -m json.tool
# Expected: {"status": "ok"}

# Test WebSocket upgrade (Socket.IO handshake):
curl -s "https://idle-api.northglass.io/socket.io/?EIO=4&transport=polling" | head -c 100
# Should return a JSON sid (session ID), not an error
```

### Step 9: Verify Firewall

```bash
ssh releasingphish-root
ufw status
# Should show 22, 80, 443 allowed
# Port 3005 should NOT be open externally — only via Nginx
```

---

## Updating the Server

```bash
ssh releasingphish
cd /var/www/idle-server

git pull
yarn install                    # rebuilds idle-wire via postinstall

sudo systemctl restart idle-server
sudo systemctl status idle-server
```

Standalone mode auto-runs migrations on startup (the `ExecStartPre` step), so no manual migration needed.

---

## Monitoring

```bash
# Service status
sudo systemctl status idle-server

# Live logs
sudo journalctl -u idle-server -f

# Last 50 lines
sudo journalctl -u idle-server -n 50

# Disk usage (PGlite data)
du -sh /var/www/idle-server/data/

# Memory (2GB VPS — watch this)
free -h
```

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Server won't start | `journalctl -u idle-server -n 50` |
| "IDLE_MASTER_SECRET is required" | `.env.production` exists and is readable by deployer |
| 502 Bad Gateway | Server not running or wrong port. `systemctl status idle-server` |
| WebSocket disconnects | Cloudflare dashboard → Network → WebSockets must be ON |
| DNS not resolving | `dig idle-api.northglass.io` — check Cloudflare propagation |
| Permission denied on data/ | `chown -R deployer:deployer /var/www/idle-server/data` |
| PGlite corruption | Stop server, `rm -rf data/pglite`, restart (runs fresh migration) |
| Out of memory | Tune with `NODE_OPTIONS="--max-old-space-size=512"` in .env |

---

## Resource Constraints

This is a 2GB RAM VPS also running Nginx + two static sites.

Standalone mode uses ~200-400MB (Node + PGlite). If memory becomes tight:
- Add `NODE_OPTIONS="--max-old-space-size=512"` to `.env.production`
- Consider moving to a 4GB VPS ($8/month on IONOS)
- Or switch to Option B with managed Postgres to offload DB memory

---

## Option B: Full Production Mode

Use this when you outgrow standalone mode or need horizontal scaling.

### Additional Prerequisites

- PostgreSQL 15+ (external or on-VPS)
- Redis 7+ (external or on-VPS)
- S3-compatible storage (optional — falls back to local filesystem)

### Install Postgres + Redis on VPS

```bash
ssh releasingphish-root

apt-get install -y postgresql postgresql-contrib redis-server
systemctl enable postgresql redis-server
systemctl start postgresql redis-server

# Create database
sudo -u postgres psql <<SQL
CREATE USER idle WITH PASSWORD 'GENERATE_A_STRONG_PASSWORD_HERE';
CREATE DATABASE idle OWNER idle;
GRANT ALL PRIVILEGES ON DATABASE idle TO idle;
SQL
```

### Environment File (Full Mode)

```bash
cat > /var/www/idle-server/.env.production <<'EOF'
# === Required ===
IDLE_MASTER_SECRET=PASTE_YOUR_SECRET_HERE
PORT=3005
DATABASE_URL=postgresql://idle:YOUR_DB_PASSWORD@localhost:5432/idle
REDIS_URL=redis://localhost:6379
PUBLIC_URL=https://idle-api.northglass.io

# === Optional S3 (omit for local filesystem) ===
# S3_HOST=your-s3-host
# S3_ACCESS_KEY=your-key
# S3_SECRET_KEY=your-secret
# S3_BUCKET=idle
# S3_PUBLIC_URL=https://files.idle.northglass.io

# === Optional integrations ===
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# GITHUB_REDIRECT_URI=https://idle-api.northglass.io/v1/connect/github/callback
# ELEVENLABS_API_KEY=...

NODE_ENV=production
METRICS_ENABLED=false
EOF

chmod 600 /var/www/idle-server/.env.production
```

### systemd Service (Full Mode)

```bash
cat > /etc/systemd/system/idle-server.service <<'EOF'
[Unit]
Description=Idle Server
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=deployer
WorkingDirectory=/var/www/idle-server/packages/idle-server
ExecStart=/usr/bin/npx tsx sources/main.ts
Restart=on-failure
RestartSec=5
EnvironmentFile=/var/www/idle-server/.env.production
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable idle-server
```

### Run Migrations (Full Mode)

```bash
cd /var/www/idle-server/packages/idle-server
env $(cat /var/www/idle-server/.env.production | xargs) npx prisma migrate deploy
```

The rest of the steps (Nginx, DNS, firewall, verification) are identical to Option A.
