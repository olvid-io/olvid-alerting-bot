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

import type { AuthStatus } from "#shared/types/auth.ts";

/**
 * Single reactive source for /api/auth/status. Every page that needs
 * to know "should the mail UI show?" reads from this — one network hop
 * per session, kept in useAsyncData's cache so subsequent callers get
 * the value synchronously.
 *
 * `refresh()` is exposed so /setup can re-check after creating the
 * first admin (the needsSetup flag flips permanently at that point).
 */
export const useAuthConfig = () => {
    return useAsyncData<AuthStatus>(
        "auth-config",
        () => $fetch<AuthStatus>("/api/auth/status"),
        { default: () => ({ needsSetup: false, mailEnabled: false }) },
    );
};

