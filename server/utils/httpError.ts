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

// Boundary error mapper. Every server route funnels unexpected errors
// through toHttpError() so we return a stable status + statusMessage
// contract to the client instead of leaking Prisma stacks or Zod
// internals. Rule of thumb:
//
//   - H3Errors (thrown by createError) are already shaped by the handler —
//     re-throw unchanged.
//   - ZodError → 400 "bad_request" (field-level detail is intentionally
//     dropped from statusMessage; enable it in `data` if you need it).
//   - Prisma known-request errors: P2002 unique constraint → 409, P2025
//     record-not-found → 404.
//   - Everything else → 500 "internal_error". The original error is
//     re-logged so ops can still see it, but never echoed to clients.
//
// readBodyOr400 is a thin wrapper around readValidatedBody that turns a
// ZodError into 400 up front — otherwise the raw ZodError propagates
// through Nitro as an unshaped 500.

import type { H3Event } from "h3";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("HTTP Error");

type H3ErrorShape = {
    statusCode: number;
    statusMessage?: string;
    data?: unknown;
};

function isH3Error(err: unknown): err is H3ErrorShape {
    return (
        typeof err === "object" &&
        err !== null &&
        "statusCode" in err &&
        typeof (err as { statusCode: unknown }).statusCode === "number"
    );
}

export function toHttpError(err: unknown, context?: string) {
    if (isH3Error(err)) return err;

    if (err instanceof ZodError) {
        return createError({ statusCode: 400, statusMessage: "bad_request" });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            return createError({ statusCode: 409, statusMessage: "conflict" });
        }
        if (err.code === "P2025") {
            return createError({ statusCode: 404, statusMessage: "not_found" });
        }
    }

    if (context) appLog.error(`-${context}-`, err);
    else appLog.error(err);
    return createError({ statusCode: 500, statusMessage: "internal_error" });
}

export async function readBodyOr400<T>(
    event: H3Event,
    schema: ZodType<T>,
): Promise<T> {
    try {
        return await readValidatedBody(event, schema.parse);
    } catch (err) {
        if (err instanceof ZodError) {
            throw createError({ statusCode: 400, statusMessage: "bad_request" });
        }
        throw err;
    }
}
