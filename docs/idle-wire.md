# idle-wire

This document describes the shared wire package: `@northglass/idle-wire`.

## Why this package exists

Before `idle-wire`, wire-level message and session-protocol schemas were duplicated across packages (CLI, app, server, and agent). That caused drift risk and made protocol evolution harder.

`@northglass/idle-wire` centralizes those shared schemas and types so all clients and services agree on the same wire contract.

## Package identity

- npm name: `@northglass/idle-wire`
- workspace path: `packages/idle-wire`
- package type: publishable library (not private)
- versioned dependency in consumers: `^0.1.0`

## What is shared

### 1. Wire message schemas

Shared from `@northglass/idle-wire`:
- from `messages.ts`: `SessionMessageContentSchema`, `SessionMessageSchema`, `MessageMetaSchema`, `SessionProtocolMessageSchema`, `MessageContentSchema` (top-level `role` union: `user|agent|session`), `UpdateNewMessageBodySchema`, `UpdateSessionBodySchema`, `UpdateMachineBodySchema`, `CoreUpdateContainerSchema`
- from `legacyProtocol.ts`: `UserMessageSchema` (`role: 'user'`), `AgentMessageSchema` (`role: 'agent'`), `LegacyMessageContentSchema` (`role`-discriminated union for legacy only)

These are used for encrypted message/update contracts (`new-message`, `update-session`, `update-machine`).

### 2. Session protocol schema

Shared from `@northglass/idle-wire`:
- `sessionEventSchema`
- `sessionEnvelopeSchema`
- `createEnvelope(...)`
- `SessionEnvelope` and related types

This is the canonical schema for the unified session protocol event stream.

Current role set in `sessionEnvelopeSchema`:
- `'user'` (user-originated envelope)
- `'agent'` (agent/system output envelopes)

Current session wire payload shape (decrypted message body):
- outer message `role` is always `'session'` for session-protocol records
- `content` is the session envelope object directly (not wrapped under `content.data`)
- envelope-level role remains inside `content.role` (`'user' | 'agent'`)
- envelope timestamp is required as `content.time` (Unix ms)

User text rollout toggle:
- env flag: `ENABLE_SESSION_PROTOCOL_SEND` (truthy: `1`, `true`, `yes`)
- default (disabled):
  - CLI still emits modern user payloads (`role = 'session'`, `content.role = 'user'`)
  - app consumes legacy user payloads (`role = 'user'`, `content.type = 'text'`) and drops modern user payloads
- enabled:
  - CLI emits modern user payloads (`role = 'session'`, `content.role = 'user'`)
  - app consumes modern user payloads and drops legacy user payloads

## Migration in this repository

### CLI (`packages/idle-cli`)

- Session protocol imports now reference `@northglass/idle-wire` directly.
- `src/sessionProtocol/types.ts` now re-exports from `@northglass/idle-wire` as compatibility shim.
- API wire schemas in `src/api/types.ts` now source shared message/update schemas from `@northglass/idle-wire`.

### App (`packages/idle-app`)

- Shared API message/update schemas in `sources/sync/apiTypes.ts` now import these from `@northglass/idle-wire`:
  - `ApiMessageSchema`
  - `ApiUpdateNewMessageSchema`
  - `ApiUpdateSessionStateSchema`
  - `ApiUpdateMachineStateSchema`

### Server (`packages/idle-server`)

- Prisma JSON message content type now references `SessionMessageContent` from `@northglass/idle-wire`.
- Event router uses shared `SessionMessageContent` type for `new-message` payload typing.

### Agent (`packages/idle-agent`)

- `RawMessage` now aliases `SessionMessage` from `@northglass/idle-wire`.

## Versioning model

All other workspace packages now declare a versioned dependency on `@northglass/idle-wire`.

This intentionally mirrors post-publish consumption and reduces hidden coupling to workspace-local files.

## Build and release

`@northglass/idle-wire` is configured the same way as existing publishable libraries in this repo:

- ESM/CJS/types outputs via `pkgroll`
- `build`: typecheck + bundle
- `test`: build + vitest
- `prepublishOnly`: build + test
- `release`: `release-it`
- npm publish registry configured via `publishConfig`

Use the same release entrypoint as other publishable packages:

```bash
yarn release
# choose idle-wire
```

or:

```bash
yarn workspace @northglass/idle-wire release
```

When building workspaces from a clean checkout, build `@northglass/idle-wire` first so dependent packages can resolve generated `dist` outputs.

## Publish checklist (maintainer)

1. Ensure all workspace builds/tests are green.
2. Confirm wire schema changes are backward-compatible or documented.
3. Bump and release `@northglass/idle-wire`.
4. Update downstream package versions if needed.
5. Publish dependent package updates only after the new `idle-wire` version is available.

## Notes

- `idle-wire` should stay focused on wire contracts only (types + Zod schemas + small helpers).
- Domain/business logic should remain in consumer packages.
- Keep schema additions additive where possible to minimize client breakage.
