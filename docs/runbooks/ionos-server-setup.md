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

Before starting:
- [ ] Access to Cloudflare dashboard for northglass.io DNS
- [ ] SSH access verified: `ssh releasingphish` works

## Step 1: Install Node.js, PostgreSQL, Redis

```bash
ssh releasingphish-root

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Verify
node -v  # should be v20.x
npm -v

# PostgreSQL
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Redis
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Verify both
sudo -u postgres psql -c "SELECT version();"
redis-cli ping  # should return PONG
```

## Step 2: Create Database

```bash
sudo -u postgres psql <<SQL
CREATE USER idle WITH PASSWORD 'GENERATE_A_STRONG_PASSWORD_HERE';
CREATE DATABASE idle OWNER idle;
GRANT ALL PRIVILEGES ON DATABASE idle TO idle;
SQL
```

> **IMPORTANT**: Generate a real password. Store it in 1Password. Never commit it.

## Step 3: Set Up Application Directory

```bash
ssh releasingphish-root

# Create app directory owned by deployer
mkdir -p /var/www/idle-server
chown deployer:deployer /var/www/idle-server

# Switch to deployer for app setup
su - deployer
cd /var/www/idle-server

# Clone the repo (sparse checkout — server package only)
git clone --depth 1 https://github.com/tomstetson/idle.git .

# Install dependencies
npm install --production

# Build wire types first, then server
cd packages/idle-wire && npm run build && cd ../..
cd packages/idle-server && npm run build && cd ../..
```

## Step 4: Create Environment File

```bash
cat > /var/www/idle-server/packages/idle-server/.env <<'EOF'
NODE_ENV=production
PORT=3005
DATABASE_URL=postgresql://idle:YOUR_PASSWORD_HERE@localhost:5432/idle
REDIS_URL=redis://localhost:6379
WEBAPP_URL=https://idle.northglass.io
EOF
```

> **IMPORTANT**: Replace `YOUR_PASSWORD_HERE` with the password from Step 2. This file should be 600 permissions.

```bash
chmod 600 /var/www/idle-server/packages/idle-server/.env
```

## Step 5: Run Prisma Migrations

```bash
cd /var/www/idle-server/packages/idle-server
npx prisma migrate deploy
```

## Step 6: Create systemd Service

```bash
ssh releasingphish-root

cat > /etc/systemd/system/idle-server.service <<'EOF'
[Unit]
Description=Idle Server
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=deployer
WorkingDirectory=/var/www/idle-server/packages/idle-server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/var/www/idle-server/packages/idle-server/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable idle-server
systemctl start idle-server
systemctl status idle-server
```

## Step 7: Configure Nginx Reverse Proxy

```bash
ssh releasingphish-root

cat > /etc/nginx/sites-available/idle-api <<'NGINX'
server {
    listen 80;
    server_name api.idle.northglass.io;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (Socket.IO)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/idle-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> **Note**: SSL handled by Cloudflare (Full mode). Nginx listens on :80, Cloudflare terminates TLS.

## Step 8: Configure DNS (Cloudflare)

In Cloudflare dashboard for `northglass.io`:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `idle` | `198.71.58.100` | Proxied (orange cloud) |
| A | `api.idle` | `198.71.58.100` | Proxied (orange cloud) |

The `idle.northglass.io` record will serve the web app (future Expo web build via Nginx).
The `api.idle.northglass.io` record routes to the server via the Nginx reverse proxy.

## Step 9: Open Firewall (if needed)

Port 80 and 443 should already be open. Verify:

```bash
sudo ufw status
# Should show 22, 80, 443 allowed
```

## Step 10: Verify

```bash
# From your Mac:
curl -s https://api.idle.northglass.io/health | jq .

# Should return something like:
# { "status": "ok" }
```

If the health endpoint doesn't exist yet, check the server routes for the actual path:
```bash
ssh releasingphish
journalctl -u idle-server -f  # watch server logs
```

## Updating the Server

```bash
ssh releasingphish
cd /var/www/idle-server
git pull
cd packages/idle-wire && npm run build && cd ../..
cd packages/idle-server && npm run build && cd ../..
cd packages/idle-server && npx prisma migrate deploy

# Restart
sudo systemctl restart idle-server
sudo systemctl status idle-server
```

## Troubleshooting

| Problem | Check |
|---------|-------|
| Server won't start | `journalctl -u idle-server -n 50` |
| Database connection failed | Verify `.env` DATABASE_URL, `systemctl status postgresql` |
| Redis connection failed | `redis-cli ping`, `systemctl status redis-server` |
| 502 Bad Gateway | Server not running or wrong port. Check `systemctl status idle-server` |
| WebSocket disconnects | Nginx proxy timeout settings, Cloudflare WebSocket setting (must be ON) |
| DNS not resolving | Check Cloudflare, wait for propagation, `dig api.idle.northglass.io` |

## Resource Constraints

This is a 2GB RAM VPS also running Nginx + two static sites. Monitor memory:

```bash
free -h
htop
```

PostgreSQL and Redis on a 2GB box is tight. If memory becomes an issue:
- Tune PostgreSQL `shared_buffers` down to 256MB
- Set Redis `maxmemory 256mb` with `maxmemory-policy allkeys-lru`
- Consider moving DB to a managed service if traffic grows
