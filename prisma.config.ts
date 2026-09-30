// Prisma CLI config. Loaded from `prisma.config.ts` at the repo root
// (Prisma 7 auto-detects this path). Consumed by the CLI only
// (`prisma generate`, `prisma db push`, `prisma migrate deploy`).
//
// The RUNTIME Prisma client is constructed in server/db/prisma.ts with
// an explicit adapter, so nothing in the running app depends on this
// config — it exists purely for tooling.
//
// `DATABASE_URL` is read directly from process.env. `prisma generate`
// doesn't need a real URL (it only inspects the schema), so we fall
// back to a placeholder in build stages where the env var isn't
// injected. At container runtime the compose env_file provides the
// real URL, and `db push` / `migrate deploy` connect correctly.

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./.prisma-build-placeholder.db",
  },
});
