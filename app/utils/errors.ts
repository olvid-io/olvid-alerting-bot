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

type ErrorWithBody = {
    data?: { message?: string; statusMessage?: string };
    message?: string;
};

/**
 * Pull the most user-friendly message out of an unknown caught error.
 * Probes (in order): `data.message`, `data.statusMessage`, `message`.
 * Falls back to the provided string when none of those is a string.
 */
export const getErrorMessage = (e: unknown, fallback = ""): string => {
    if (typeof e === "string") return e;
    if (typeof e !== "object" || e === null) return fallback;
    const err = e as ErrorWithBody;
    return (
        err.data?.message ?? err.data?.statusMessage ?? err.message ?? fallback
    );
};

/**
 * Pull the structured `.data` body off an ofetch-style error so it can be
 * logged separately from the message. Returns undefined when the caught
 * value has no `.data` field — log the raw error in that case.
 */
export const getErrorData = (e: unknown): unknown => {
    if (typeof e !== "object" || e === null || !("data" in e)) return undefined;
    return (e as ErrorWithBody).data;
};
