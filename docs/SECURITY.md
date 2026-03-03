# Idle Security Model

## TL;DR

Idle uses end-to-end encryption. The server is a dumb relay — it stores your messages but **cannot read them**. Only your devices (phone, laptop) have the keys to decrypt your conversations with Claude.

This is the same model used by Signal: the server operator is untrusted by design.

## What's Encrypted

| What | Algorithm | Who Can Read It |
|------|-----------|----------------|
| All messages (your prompts, Claude's responses) | AES-256-GCM | Only your devices |
| Session metadata (titles, summaries) | AES-256-GCM | Only your devices |
| Claude's agent state | AES-256-GCM | Only your devices |
| API keys you store (Claude, OpenAI, etc.) | privacy-kit sealed box | Only your devices |
| File contents you share | AES-256-GCM | Only your devices |

## What the Server CAN See

The server knows these things (necessary for routing messages):

- **That you have an account** — an opaque identifier, not your name or email
- **That you have sessions** — session IDs and unencrypted session tags (e.g., "Claude session #3")
- **When messages were sent** — timestamps and sequence numbers
- **Which machine runs a session** — machine ID for routing
- **Message size** — the encrypted blob has a visible length

The server **cannot** see what's inside any message, what you asked Claude, what Claude responded, or what files you're working on.

## How It Works

### Your Master Secret

When you first set up Idle, a 32-byte random secret is generated on your device. This secret never leaves your device — it's stored in your phone's secure keystore or your laptop's `~/.idle/` directory.

From this master secret, Idle derives:
- A **public/private keypair** for key exchange
- A **content key** for encrypting/decrypting session data

### Per-Session Keys

Each coding session gets its own random 32-byte encryption key. This means:
- Compromising one session's key doesn't expose other sessions
- The server stores each session key — but encrypted with YOUR public key
- Only your private key (derived from your master secret) can unwrap it

### Message Flow

```
You type a prompt
        │
        ▼
CLI encrypts with session key (AES-256-GCM)
        │
        ▼
Encrypted blob sent to server
        │
Server stores blob, relays to your phone
        │
        ▼
Phone decrypts with same session key
        │
        ▼
You see the message on your phone
```

The server handles step 3 — it receives an opaque blob and forwards it. It never has the session key.

### Key Exchange

How does your phone get the session key if the server can't see it?

1. CLI generates a session key
2. CLI encrypts the key with your **public key** (from your master secret)
3. Server stores this encrypted package
4. Your phone downloads the encrypted package
5. Phone decrypts with your **private key**
6. Both devices now have the same session key

The server transported the key but couldn't unwrap it — like a sealed envelope.

## Authentication

Idle uses **cryptographic challenge-response** authentication, not passwords:

1. Your device generates a signing keypair from your master secret
2. To authenticate, it signs a random challenge with your private key
3. The server verifies the signature with your public key
4. If valid, the server issues a persistent token

This means:
- No passwords to steal or phish
- No email addresses stored on the server
- Authentication proves you hold the master secret without revealing it

### Pairing Devices

When you add a new device (e.g., connecting your phone to your laptop's CLI):
1. Your phone displays a QR code
2. The QR code contains a one-time secret
3. Your laptop scans it and authenticates through the server
4. Both devices are now linked to the same account

## Network Security

- **TLS everywhere**: All traffic encrypted in transit via Cloudflare (HTTPS/WSS)
- **Cloudflare WAF**: Access restricted by IP allowlist (configurable per deployment)
- **No direct VPS access**: Backend port (3005) not exposed — only reachable through Nginx reverse proxy
- **WebSocket authenticated**: Every Socket.IO connection requires a valid token at handshake; unauthenticated connections are immediately disconnected

## Limitations and Known Gaps

Being transparent about what isn't perfect:

- **Session tags are unencrypted**: The server can see session names like "my-project". Message content is encrypted, but the label is not.
- **Server metadata is visible**: The server knows how many sessions you have, when you're active, and message sizes — even though it can't read content.

### Recently Addressed

- **Token expiry** — Auth tokens now expire after 30 days (configurable via `IDLE_TOKEN_TTL_DAYS`). Old tokens without expiry remain valid for backward compatibility.
- **Rate limiting** — Auth endpoints are rate-limited to 10 requests/min per IP. All other endpoints: 100 requests/min. Localhost is exempt.
- **Encryption test vectors** — CLI encryption functions are independently verified against reference tests (AES-256-GCM, TweetNaCl, auth challenge signatures).

## For Self-Hosters

If you run your own Idle server:
- **You still can't read user messages** — the encryption is client-side, not server-side
- **Protect `IDLE_MASTER_SECRET`** — this is used for auth token signing, not message encryption. If leaked, an attacker could forge auth tokens (but still not read messages)
- **Back up PGlite data** — `data/pglite/` contains encrypted session data. Loss = loss of session history (but keys live on client devices)

## Technical Details

For the full cryptographic specification (algorithms, binary layouts, key derivation):
- [encryption.md](encryption.md) — Encryption implementation details
- [protocol.md](protocol.md) — Wire protocol specification
- [session-protocol.md](session-protocol.md) — Encrypted session event protocol
