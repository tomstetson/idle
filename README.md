<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/.github/logotype-dark.png"/>
    <source media="(prefers-color-scheme: light)" srcset="/.github/logotype-light.png"/>
    <img src="/.github/logotype-dark.png" width="180" alt="Idle"/>
  </picture>
</div>

<p align="center">
Remote client for Claude Code. End-to-end encrypted. Open source.
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/Idle-claude-code-client/id6748571505">iOS App</a> ·
  <a href="https://idle.northglass.io">Web App</a> ·
  <a href="https://northglass.io">Northglass Labs</a>
</p>

<img width="1280" alt="Idle — remote client for Claude Code" src="/.github/header.png" />

## What it does

Idle lets you monitor and control Claude Code sessions from your phone. Run `idle` instead of `claude` on your machine, then pick up the session from the iOS app whenever you step away. Press any key on your keyboard to take it back. All traffic between your devices is end-to-end encrypted. The relay server never sees your code.

## Install

**1. Download the app**

[App Store](https://apps.apple.com/us/app/Idle-claude-code-client/id6748571505) · [Web App](https://idle.northglass.io)

**2. Install the CLI**

```bash
npm install -g idle-coder@alpha
```

**3. Run it**

```bash
# Instead of: claude
idle

# Instead of: codex
idle codex
```

## Features

- Mobile access to Claude Code sessions from iOS
- Push notifications when your agent needs input or hits an error
- Seamless device handoff, phone to terminal with one keypress
- End-to-end encrypted with AES-256-GCM and zero-knowledge relay
- Voice input for responding to agent prompts on the go
- Open source, no telemetry, no tracking

## How it works

Run `idle` instead of `claude` to start your coding agent through our CLI wrapper. The CLI connects to a relay server over WebSocket. When you open the Idle app on your phone, you see the live session and can send messages, approve permissions, or just watch. Press any key on your keyboard to take the session back to your terminal. The relay server routes encrypted payloads between devices but cannot decrypt them.

## Architecture

| Package | Description |
|---------|-------------|
| [idle-app](packages/idle-app) | React Native mobile and web client (Expo) |
| [idle-cli](packages/idle-cli) | CLI wrapper for Claude Code and Codex |
| [idle-agent](packages/idle-agent) | Programmatic agent control CLI |
| [idle-server](packages/idle-server) | WebSocket relay server for encrypted sync |
| [idle-wire](packages/idle-wire) | Shared message types and Zod schemas |

## Security

Security is not an afterthought. Session data is encrypted client-side before it leaves your device. The relay server handles routing, not content. It cannot read your messages, your code, or your prompts. Keys are derived per-session and never transmitted. The code is open source and auditable.

## About

Idle is built by [Northglass Labs](https://northglass.io), a security and software studio in Eastern Pennsylvania. Born from a decade of incident response and information security work, we build the tools we kept wishing existed — small, focused, and open source by default. No telemetry, no tracking, no enterprise sales pitch. Just software that works.

## Acknowledgments

Idle builds on ideas and core concepts from [Happy Engineering](https://github.com/slopus/happy) by Slopus.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

## License

MIT License. See [LICENSE](LICENSE) for details.
