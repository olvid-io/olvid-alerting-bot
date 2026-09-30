# syntax=docker/dockerfile:1.7
#
# Three-stage build for the Alerting Bot Nuxt app.
#
#   1. deps    — production-only node_modules, native modules compiled
#                for Linux/musl. Used at runtime.
#   2. build   — full deps + prisma generate + `nuxt build` → .output.
#                Discarded after the runner stage copies from it.
#   3. runner  — the tiny image we actually ship. No compilers, no dev
#                deps; just openssl + prod node_modules + .output + the
#                prisma schema (so `prisma migrate deploy` can run later).
#
# The .dockerignore excludes host node_modules on purpose — that folder
# would carry native binaries built for Windows/macOS which don't load
# on Alpine. Every native module (better-sqlite3, …) is compiled inside
# the deps stage against the container's Linux/musl.

# 1. Base — pinned Node, tiny footprint.
FROM node:26-alpine AS base
WORKDIR /app

# 2. Production dependencies stage.
#    Alpine's musl needs python3 + a C toolchain to compile better-sqlite3
#    (and any other native module) from source. These tools are only
#    present in this transient stage — the final image has neither.
FROM base AS deps
RUN apk add --no-cache python3 make g++ openssl
COPY --link package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --link prisma            ./prisma
COPY --link prisma.config.ts  ./prisma.config.ts
RUN npx prisma generate

# 3. Build stage. Full install (dev deps needed for `nuxt build`,
#    `prisma generate`, TypeScript, Vite, …), then produce .output.
FROM base AS build
RUN apk add --no-cache python3 make g++ openssl
COPY --link package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --link . .
RUN npm run build

# 4. Runner. Copies just the artifacts and prod node_modules. No
#    compilers, no dev deps — smaller image, smaller attack surface.
FROM base AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3000

# `prisma/` ships so `npx prisma migrate deploy` can be invoked against
# the running container in the future. Also carries the SQL migrations
# folder once one is generated.
COPY --from=deps  /app/node_modules      ./node_modules
COPY --from=build /app/.output           ./.output
COPY --from=build /app/prisma            ./prisma
COPY --from=build /app/prisma.config.ts  ./prisma.config.ts
COPY --link       package.json           ./

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node .output/server/index.mjs"]

