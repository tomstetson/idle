---
status: accepted
date: 2026-03-04
author: Claude + Tom
---
# ADR-004: E2E Encryption Model

## Status
Accepted

## Context
Idle relays messages between the CLI (running on a developer's machine) and the web/mobile app (running in a browser or on a phone). These messages contain terminal output, code, file contents, and tool invocations — sensitive developer context that the server should never be able to read.

The threat model: the server is a zero-knowledge relay. Even if the VPS is compromised, an attacker should not be able to read session content. The server operator (us) should also be unable to read user sessions by design.

Requirements:
- Server cannot decrypt message content
- Each session has independent keys (compromise one session, not all)
- Key exchange must work across devices without a shared secret
- Must work in both browser (Web Crypto API) and Node.js (crypto module)

## Decision
Two-layer encryption scheme:

**Session data encryption (AES-256-GCM)**:
- Each session generates a unique `dataEncryptionKey` (DEK) on the client
- All message content, tool results, and metadata are encrypted with the DEK before transmission
- Server stores and relays encrypted blobs without decryption capability
- GCM mode provides authenticated encryption (integrity + confidentiality)

**Key exchange (TweetNaCl sealed boxes)**:
- During terminal auth flow (QR code scan or browser-based pairing), the web app and CLI exchange public keys
- TweetNaCl `sealedbox` encrypts the session DEK for the other device's public key
- Only the intended recipient can unseal and recover the DEK

Key choices:
- **AES-256-GCM** for bulk encryption: hardware-accelerated, NIST-approved, available in both Web Crypto and Node.js
- **TweetNaCl** for key exchange: small, auditable, zero-dependency library with sealed box support
- **Per-session keys**: each session has its own DEK — no master key, no key hierarchy

## Consequences

### Positive
- Strong privacy guarantee: server literally cannot read session content
- Per-session key isolation: compromising one session's key reveals nothing about others
- Proven cryptographic primitives: AES-256-GCM and NaCl are well-analyzed, widely deployed
- Works cross-platform: Web Crypto API in browsers, Node.js crypto module in CLI

### Negative
- Server-visible metadata remains unencrypted: session names/tags, timestamps, message sizes, activity patterns (online/offline, message frequency). This is a known gap, documented in SECURITY.md
- Key exchange requires interactive pairing (QR code scan or browser flow) — no passive/offline key distribution
- Lost DEK means lost session data — no recovery mechanism by design (this is a feature, not a bug)
- Two crypto libraries (Web Crypto + TweetNaCl) increases surface area compared to a single unified library

## Alternatives Considered

### Signal Protocol (Double Ratchet)
State-of-the-art forward secrecy with per-message ratcheting. Rejected: designed for ongoing conversations between two parties with key rotation. Idle sessions are 1:1 device pairings with a fixed session lifetime — the complexity of ratcheting adds no meaningful security benefit over a single session key with GCM.

### No E2E encryption (TLS only)
Rely on TLS for transport security. Rejected: TLS protects data in transit but not at rest on the server. A compromised VPS or rogue server operator could read all session content. Unacceptable for terminal output containing code, credentials, and file contents.

### TLS + server-side encryption at rest
Encrypt data on the server with a server-held key. Rejected: the server still holds the keys, so it's security theater against a server compromise. Does not meet the zero-knowledge relay requirement.
