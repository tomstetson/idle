# Idle Docs

This folder documents how Idle works internally, with a focus on protocol, backend architecture, deployment, and the CLI tool. Start here.

## Start Here
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System overview, traffic flow diagrams, domain layout, infrastructure.
- **[SECURITY.md](SECURITY.md)**: What's encrypted, what the server sees, and why you can trust it.
- **[ROADMAP.md](ROADMAP.md)**: What's done, what's in progress, what's planned.

## Technical Reference
- protocol.md: Wire protocol (WebSocket), payload formats, sequencing, and concurrency rules.
- api.md: HTTP endpoints and authentication flows.
- encryption.md: Encryption boundaries and on-wire encoding (full cryptographic specification).
- backend-architecture.md: Internal backend structure, data flow, and key subsystems.
- deployment.md: How to deploy the backend and required infrastructure.
- cli-architecture.md: CLI and daemon architecture and how they interact with the server.
- session-protocol.md: Unified encrypted chat event protocol.
- session-protocol-claude.md: Claude-specific session-protocol flow (local vs remote launchers, dedupe/restarts).
- permission-resolution.md: State-based permission mode resolution across app and CLI (including sandbox behavior).
- idle-wire.md: Shared wire schemas/types package and migration notes.

## Operations
- [runbooks/ionos-server-setup.md](runbooks/ionos-server-setup.md): Step-by-step server deployment guide.

## Conventions
- Paths and field names reflect the current implementation in `packages/idle-server`.
- Examples are illustrative; the canonical source is the code.
