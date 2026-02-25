# Standalone idle-server: single container, no external dependencies
# Uses PGlite (embedded Postgres), local filesystem storage, no Redis

# Stage 1: install dependencies
FROM node:20 AS deps

RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY package.json yarn.lock ./
COPY scripts ./scripts

RUN mkdir -p packages/idle-app packages/idle-server packages/idle-cli packages/idle-agent packages/idle-wire

COPY packages/idle-app/package.json packages/idle-app/
COPY packages/idle-server/package.json packages/idle-server/
COPY packages/idle-cli/package.json packages/idle-cli/
COPY packages/idle-agent/package.json packages/idle-agent/
COPY packages/idle-wire/package.json packages/idle-wire/

# Workspace postinstall requirements
COPY packages/idle-app/patches packages/idle-app/patches
COPY packages/idle-server/prisma packages/idle-server/prisma
COPY packages/idle-cli/scripts packages/idle-cli/scripts
COPY packages/idle-cli/tools packages/idle-cli/tools

RUN SKIP_IDLE_WIRE_BUILD=1 yarn install --frozen-lockfile --ignore-engines

# Stage 2: copy source and type-check
FROM deps AS builder

COPY packages/idle-wire ./packages/idle-wire
COPY packages/idle-server ./packages/idle-server

RUN yarn workspace @northglass/idle-wire build
RUN yarn workspace idle-server build

# Stage 3: runtime
FROM node:20-slim AS runner

WORKDIR /repo

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PGLITE_DIR=/data/pglite

COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/packages/idle-wire /repo/packages/idle-wire
COPY --from=builder /repo/packages/idle-server /repo/packages/idle-server

VOLUME /data
EXPOSE 3005

CMD ["sh", "-c", "node_modules/.bin/tsx packages/idle-server/sources/standalone.ts migrate && exec node_modules/.bin/tsx packages/idle-server/sources/standalone.ts serve"]
