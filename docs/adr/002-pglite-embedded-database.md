---
status: accepted
date: 2026-03-04
author: Claude + Tom
---
# ADR-002: PGlite as Embedded Database

## Status
Accepted

## Context
The Idle server needs a database for session state, user accounts, and message metadata. The deployment target is a $5/month IONOS VPS (2GB RAM) that already runs nginx and the Node.js server process. Running a separate PostgreSQL instance adds memory pressure (~100-200MB baseline) and operational burden (upgrades, backups, connection management) that's disproportionate for an alpha-stage product with a single user.

Requirements:
- PostgreSQL-compatible SQL (Prisma ORM generates Postgres-dialect queries)
- Zero additional processes or services to manage
- Works within a single Node.js process on a memory-constrained VPS
- Supports Prisma migrations for schema evolution

## Decision
Use PGlite — an embedded PostgreSQL implementation compiled to WASM that runs inside the Node.js process. The server starts PGlite in-process, and Prisma connects via PGlite's Prisma adapter.

Key choices:
- **Storage**: PGlite writes to a local directory on the VPS filesystem (not in-memory)
- **ORM**: Prisma with `@prisma/adapter-pg-lite` — same schema, same migrations as full Postgres
- **Migration path**: If we outgrow PGlite, swap the adapter for a real Postgres connection string — Prisma schema stays identical

## Consequences

### Positive
- Zero ops: no database server to install, configure, monitor, or upgrade
- Single process: server + database in one systemd unit, one restart command
- Prisma migrations work identically — `prisma migrate deploy` runs the same SQL
- Tiny memory footprint compared to a full PostgreSQL instance
- Easy backups: copy the data directory

### Negative
- Single-writer constraint: only one Node.js process can access the database at a time — no horizontal scaling
- PGlite's Prisma adapter has serialization quirks: `Bytes` fields must use `Buffer.from()` directly, not `new Uint8Array(Buffer.from())`, or they serialize as JSON objects instead of binary blobs (discovered in production, fixed in commit 38046952)
- Limited ecosystem: fewer community resources for debugging PGlite-specific issues
- No connection pooling, no `pg_dump`, no standard Postgres tooling

## Alternatives Considered

### Managed PostgreSQL (e.g., Supabase, Neon, Railway)
Full-featured Postgres with connection pooling, backups, and monitoring. Rejected: adds $5-15/month cost, introduces a network dependency for every query, and is overkill for a single-user alpha. The migration path exists if needed — swap the Prisma adapter.

### SQLite via better-sqlite3
Lightweight embedded database with broad adoption. Rejected: Prisma's SQLite adapter uses a different SQL dialect (no `JSONB`, different date handling), which would mean maintaining separate migration paths. PGlite gives us Postgres compatibility for free.

### Turso / LibSQL
SQLite-compatible distributed database with an embedded mode. Rejected: Prisma adapter was immature at time of evaluation, and the distributed features add complexity we don't need for a single-server deployment.
