# Idle

Code on the go — control AI coding agents from your mobile device.

Free. Open source. Code anywhere.

## Installation

```bash
npm install -g idle-coder
```

## Run From Source

From a repo checkout:

```bash
# repository root
yarn cli --help

# package directory
yarn cli --help
```

## Usage

### Claude (default)

```bash
Idle
```

This will:
1. Start a Claude Code session
2. Display a QR code to connect from your mobile device
3. Allow real-time session sharing between Claude Code and your mobile app

### Gemini

```bash
Idle gemini
```

Start a Gemini CLI session with remote control capabilities.

**First time setup:**
```bash
# Authenticate with Google
idle connect gemini
```

## Commands

### Main Commands

- `Idle` – Start Claude Code session (default)
- `Idle gemini` – Start Gemini CLI session
- `Idle codex` – Start Codex mode
- `Idle acp` – Start a generic ACP-compatible agent

### Utility Commands

- `Idle auth` – Manage authentication
- `idle connect` – Store AI vendor API keys in Idle cloud
- `Idle sandbox` – Configure sandbox runtime restrictions
- `Idle notify` – Send a push notification to your devices
- `idle daemon` – Manage background service
- `Idle doctor` – System diagnostics & troubleshooting

### Connect Subcommands

```bash
idle connect gemini     # Authenticate with Google for Gemini
idle connect claude     # Authenticate with Anthropic
idle connect codex      # Authenticate with OpenAI
idle connect status     # Show connection status for all vendors
```

### Gemini Subcommands

```bash
Idle gemini                      # Start Gemini session
Idle gemini model set <model>    # Set default model
Idle gemini model get            # Show current model
Idle gemini project set <id>     # Set Google Cloud Project ID (for Workspace accounts)
Idle gemini project get          # Show current Google Cloud Project ID
```

**Available models:** `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`

### Generic ACP Commands

```bash
Idle acp gemini                     # Run built-in Gemini ACP command
Idle acp opencode                   # Run built-in OpenCode ACP command
Idle acp opencode --verbose         # Include raw backend/envelope logs
Idle acp -- custom-agent --flag     # Run any ACP-compatible command directly
```

### Sandbox Subcommands

```bash
Idle sandbox configure  # Interactive sandbox setup wizard
Idle sandbox status     # Show current sandbox configuration
Idle sandbox disable    # Disable sandboxing
```

## Options

### Claude Options

- `-m, --model <model>` - Claude model to use (default: sonnet)
- `-p, --permission-mode <mode>` - Permission mode: auto, default, or plan
- `--claude-env KEY=VALUE` - Set environment variable for Claude Code
- `--claude-arg ARG` - Pass additional argument to Claude CLI

### Global Options

- `-h, --help` - Show help
- `-v, --version` - Show version
- `--no-sandbox` - Disable sandbox for the current Claude/Codex run

## Environment Variables

### Idle Configuration

- `IDLE_SERVER_URL` - Custom server URL (default: https://idle-api.northglass.io)
- `IDLE_WEBAPP_URL` - Custom web app URL (default: https://idle.northglass.io)
- `IDLE_HOME_DIR` - Custom home directory for Idle data (default: ~/.idle)
- `IDLE_DISABLE_CAFFEINATE` - Disable macOS sleep prevention (set to `true`, `1`, or `yes`)
- `IDLE_EXPERIMENTAL` - Enable experimental features (set to `true`, `1`, or `yes`)

### Gemini Configuration

- `GEMINI_MODEL` - Override default Gemini model
- `GOOGLE_CLOUD_PROJECT` - Google Cloud Project ID (required for Workspace accounts)

## Gemini Authentication

### Personal Google Account

Personal Gmail accounts work out of the box:

```bash
idle connect gemini
Idle gemini
```

### Google Workspace Account

Google Workspace (organization) accounts require a Google Cloud Project:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Gemini API
3. Set the project ID:

```bash
Idle gemini project set your-project-id
```

Or use environment variable:
```bash
GOOGLE_CLOUD_PROJECT=your-project-id Idle gemini
```

**Guide:** https://goo.gle/gemini-cli-auth-docs#workspace-gca

## Contributing

Interested in contributing? See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Requirements

- Node.js >= 20.0.0

### For Claude

- Claude CLI installed & logged in (`claude` command available in PATH)

### For Gemini

- Gemini CLI installed (`npm install -g @google/gemini-cli`)
- Google account authenticated via `idle connect gemini`

## License

MIT
