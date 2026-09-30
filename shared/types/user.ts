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

// Client-facing User shape.
//
// `login` is the identifier the user types at sign-in — always present.
// `email` is delivery-only and may be null when the account was created
// without SMTP (the admin picked a plain username as the login).
export type UserRole = "admin" | "user";

export interface User {
    id: number;
    login: string;
    email: string | null;
    name: string | null;
    role: UserRole;
    // Has the account been activated. Pending users still need to open their invite.
    activated: boolean;
    /** Olvid discussion bound to this user for auth deliveries (invite &
     *  password-reset). Bigint on the server, stringified over the wire
     *  because JSON can't serialize bigint. `null` when no channel is
     *  linked yet — see /account to add one. */
    olvidDiscussionId: string | null;
    useOlvid: boolean;
    usePassword: boolean;
}
