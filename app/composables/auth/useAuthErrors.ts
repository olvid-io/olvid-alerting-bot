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
 * Single mapping from server statusMessage codes to user-facing copy.
 * Auth endpoints throw H3 errors with a stable `statusMessage`
 * vocabulary (token_invalid, bad_request, user_already_active, etc.);
 * this helper turns whatever the endpoint returned into the string a
 * component should render.
 *
 * Keeping the mapping in one place means adding a new server code is a
 * one-file change instead of grep-and-replace across every page that
 * wired its own describeError.
 */

export interface AuthErrorMap {
    [statusMessage: string]: string;
}

export function useAuthErrors() {
    function statusOf(err: unknown): string | undefined {
        return (err as { statusMessage?: string })?.statusMessage;
    }

    /**
     * Look up a user-facing string for `err`. `map` is the caller's local
     * dictionary of codes it cares about; `fallback` is what to show when
     * the code is unknown (or the error doesn't carry a statusMessage —
     * network drop, generic 500). Callers keep their own copy but share
     * the lookup mechanics.
     */
    function mapAuthError(
        err: unknown,
        map: AuthErrorMap,
        fallback: string,
    ): string {
        const code = statusOf(err);
        if (code && code in map) return map[code]!;
        return fallback;
    }

    return { mapAuthError, statusOf };
}
