# Idle Agent

CLI client for controlling Idle Coder agents remotely.

Unlike `idle-cli` which both runs and controls agents, `idle-agent` only controls them — creating sessions, sending messages, reading history, monitoring state, and stopping sessions.

## Installation

From the monorepo:

```bash
yarn workspace idle-agent build
```

Or link globally:

```bash
cd packages/idle-agent && npm link
```

## Authentication

Idle Agent uses account authentication via QR code, the same flow as linking a device in the Idle mobile app.

```bash
# Authenticate by scanning QR code with the Idle mobile app
idle-agent auth login

# Check authentication status
idle-agent auth status

# Clear stored credentials
idle-agent auth logout
```

Credentials are stored at `~/.idle/agent.key`.

## Commands

### List sessions

```bash
# List all sessions
idle-agent list

# List only active sessions
idle-agent list --active

# Output as JSON
idle-agent list --json
```

### Session status

```bash
# Get live session state (supports ID prefix matching)
idle-agent status <session-id>

# Output as JSON
idle-agent status <session-id> --json
```

### Create a session

```bash
# Create a new session with a tag
idle-agent create --tag my-project

# Specify a working directory
idle-agent create --tag my-project --path /home/user/project

# Output as JSON
idle-agent create --tag my-project --json
```

### Send a message

```bash
# Send a message to a session
idle-agent send <session-id> "Fix the login bug"

# Send and wait for the agent to finish
idle-agent send <session-id> "Run the tests" --wait

# Output as JSON
idle-agent send <session-id> "Hello" --json
```

### Message history

```bash
# View message history
idle-agent history <session-id>

# Limit to last N messages
idle-agent history <session-id> --limit 10

# Output as JSON
idle-agent history <session-id> --json
```

### Stop a session

```bash
idle-agent stop <session-id>
```

### Wait for idle

```bash
# Wait for agent to become idle (default 300s timeout)
idle-agent wait <session-id>

# Custom timeout
idle-agent wait <session-id> --timeout 60
```

Exit code 0 when agent becomes idle, 1 on timeout.

## Environment Variables

- `IDLE_SERVER_URL` - API server URL (default: `https://api.cluster-fluster.com`)
- `IDLE_HOME_DIR` - Home directory for credential storage (default: `~/.idle`)

## Session ID Matching

All commands that accept a `<session-id>` support prefix matching. You can provide the first few characters of a session ID and the CLI will resolve the full ID.

## Encryption

All session data is end-to-end encrypted. New sessions use AES-256-GCM with per-session keys. Existing sessions created by other clients are decrypted using the appropriate key scheme (AES-256-GCM or legacy NaCl secretbox).

## Requirements

- Node.js >= 20.0.0
- A Idle mobile app account for authentication

## Publishing to npm

Maintainers can publish a new version:

```bash
yarn release               # From repo root: choose library to release
# or directly:
yarn workspace idle-agent release
```

This flow:
- runs tests/build checks via `prepublishOnly`
- creates a release commit and `idle-agent-vX.Y.Z` tag
- creates a GitHub release with generated notes
- publishes `idle-agent` to npm

## License

MIT
