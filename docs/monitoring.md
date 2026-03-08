# Monitoring & Troubleshooting

Practical reference for monitoring the Idle server in production.

## Health Endpoints

The server exposes two health endpoints on different ports:

### Main API (port 3000)

```
GET /health
```

Checks database connectivity via `SELECT 1`. Returns `200` with `{ status: "ok" }` or `503` with `{ status: "error", error: "Database connectivity failed" }`. No authentication required.

### Metrics Server (port 9090)

```
GET /health    — Simple liveness check (no DB query)
GET /metrics   — Prometheus-format metrics (Prisma + application)
```

The metrics server runs when `METRICS_ENABLED` is not set to `false`. Port is configurable via `METRICS_PORT` (default: 9090).

**Application metrics exposed:**
- `websocket_connections_total` — Active WebSocket connections by type (user/session/machine-scoped)
- `http_requests_total` — HTTP request counts by method, route, and status
- `http_request_duration_seconds` — Request latency histogram
- `database_records_total` — Row counts for accounts, sessions, messages, machines (updated every 60s)
- `websocket_events_total` — WebSocket events by type
- `session_alive_events_total`, `machine_alive_events_total` — Heartbeat counters

## Server Logs

Logs are written to the `.logs/` directory in the server working directory. Each server restart creates a new file.

- **Filename format:** `MM-DD-HH-MM-SS.log` (local time when the server started)
- **Log format:** JSON lines with `time` (Unix ms), `localTime` (HH:MM:ss.mmm), `module`, `level`, and message fields

### Quick Diagnostic Commands

```bash
# Check current time (logs use local time)
date

# Find the latest log files
ls -la .logs/*.log | tail -5

# Verify you're looking at the current log
tail -1 .logs/[LATEST_LOG_FILE]

# Check for errors
tail -100 .logs/*.log | grep -E "(error|Error|ERROR|failed|Failed)"

# Monitor active connections
tail -100 .logs/*.log | grep -E "(Token verified|User connected|User disconnected)"

# See which endpoints are being hit
tail -100 .logs/*.log | grep "incoming request"

# Debug socket real-time updates
tail -500 .logs/*.log | grep -A 2 -B 2 "new-session" | tail -30

# Track WebSocket events from mobile
tail -300 .logs/*.log | grep "remote-log.*mobile" | grep -E "(SyncSocket|handleUpdate)" | tail -20

# Debug machine registration and online status
tail -500 .logs/*.log | grep -E "(machine-alive|machine-register|update-machine)" | tail -20
```

### Time Format Reference

| Source | Format | Timezone |
|--------|--------|----------|
| CLI logs | `[HH:MM:SS.mmm]` | Local |
| Server logs | `time` (Unix ms) + `localTime` (HH:MM:ss.mmm) | Local |
| Mobile logs | `timestamp` (UTC), converted to `localTime` on server | UTC/Local |

## Cloudflare

Cloudflare sits in front of the API (`idle-api.northglass.io`). Use the Cloudflare dashboard for:

- **Analytics:** Request volume, bandwidth, cache hit rates, geographic distribution
- **Security events:** WAF blocks, rate limiting, threat intelligence
- **Performance:** Response times, error rates by status code

Note: Bot Fight Mode is intentionally OFF (see `docs/security/alpha-security-audit.md`, decision D1).

## Common Issues

### Server Not Responding

1. Check if the process is running: `ps aux | grep idle-server`
2. Hit the health endpoint: `curl http://localhost:3000/health`
3. If health returns 503, PGlite may have lost its connection — check logs for "Response from the Engine was empty"
4. Check `.logs/` for the most recent log file and look for startup errors

### Socket/Connection Problems

- **"Sending update to user-scoped connection" but mobile not updating** — Socket delivery is working server-side; issue is in the mobile app's update processing
- **Multiple "User disconnected" messages** — Socket instability, check network or proxy configuration
- **Sessions created but not showing** — Mobile app not processing socket updates; check for "pathname /" in mobile logs (app stuck at root screen)

### Auth Flow Issues

- **404 on `/v1/auth/response`** — Server likely restarted or crashed since the auth request was created
- **"Auth failed - user not found"** — Token is invalid or user account doesn't exist

### Environment Misconfiguration

- **Wrong server URL** — Check `IDLE_SERVER_URL` env var
- **Wrong home dir** — Check `IDLE_HOME_DIR` (should be `~/.idle-dev` for local dev, `~/.idle` for production)
- **CLI connecting to wrong server** — Use `yarn dev:local-server` (not `yarn dev`) to load `.env.dev-local-server`
