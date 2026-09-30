/*
 * Olvid Alerting
 * Copyright © 2026 Olvid SAS
 *
 * Olvid Alerting is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * Olvid Alerting is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Olvid Alerting. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Single PrismaClient for the whole server process.
 *
 * Why a module of its own:
 *   - Prisma docs: instantiate exactly one client per process. The
 *     driver adapter holds an open connection to the DB file —
 *     duplicating it would open two handles.
 *   - Decouples data access from any specific repository. Anything in
 *     `server/` that needs raw Prisma access does `import { prisma }`
 *     here, never a direct better-sqlite3 or client import.
 *
 * Re-export the type so consumers can hint return types without depending
 * on the @prisma/client path directly.
 */

import { resolve, isAbsolute, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Normalise the URL to an absolute file path.
 *
 * better-sqlite3 resolves relative paths against `process.cwd()`, but
 * Nuxt's Nitro dev worker can spawn from a subdirectory (`.nuxt/dev/…`)
 * where `./dev.db` points at a nonexistent parent — that's exactly the
 * "Cannot open database because the directory does not exist" crash.
 *
 * Anchor is this file's location (`server/db/prisma.ts`) → project
 * root is two `..` up. Same result under `nuxt dev`, `node .output/…`,
 * and Docker regardless of cwd.
 */
const raw = process.env.DATABASE_URL ?? "file:./dev.db";
if (!raw.startsWith("file:")) {
    throw new Error(
        `DATABASE_URL must use the "file:" scheme for SQLite (got: ${raw}). ` +
        `If you previously exported DATABASE_URL for Postgres in this shell ` +
        `session, unset it (PowerShell: Remove-Item Env:DATABASE_URL) so the ` +
        `.env value takes effect.`,
    );
}
const rawPath = raw.replace(/^file:/, "");
const projectRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
);
const absolutePath = isAbsolute(rawPath)
    ? rawPath
    : resolve(projectRoot, rawPath);

// better-sqlite3 doesn't create parent directories. Ensure they exist —
// harmless if already present, essential for the Docker `/data` bind
// mount case where the folder was just created empty.
mkdirSync(dirname(absolutePath), { recursive: true });

const url = `file:${absolutePath}`;

const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });

export type { PrismaClient };
