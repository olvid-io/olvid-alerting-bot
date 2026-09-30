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
 * First-run redirect. If the deploy has no admin yet, every route
 * except /setup itself funnels there. Creating an initial admin account
 * will require knowledge of the ADMIN_KEY from .env.
 *
 * Caching: only cache the terminal `false` (setup done) — that state
 * is one-way and stable.
 */

let doneCached = false;
let inflight: Promise<boolean> | null = null;

async function getNeedsSetup(): Promise<boolean> {
    if (doneCached) return false;
    if (inflight) return inflight;
    inflight = $fetch<{ needsSetup: boolean }>("/api/auth/status")
        .then((r) => {
            if (!r.needsSetup) doneCached = true;
            return r.needsSetup;
        })
        .catch(() => false)
        .finally(() => {
            inflight = null;
        });
    return inflight;
}

export default defineNuxtRouteMiddleware(async (to) => {
    if (to.path === "/setup") return;
    const needs = await getNeedsSetup();
    if (needs) return navigateTo("/setup");
});
