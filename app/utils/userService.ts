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
 * Client-side gateway for /api/users/* admin endpoints.
 */

import type { InviteUserForm } from "#shared/types/auth";
import type { User } from "#shared/types/user";

export const userService = {
    list(): Promise<User[]> {
        return $fetch<User[]>("/api/users");
    },

    invite(body: InviteUserForm): Promise<InviteResponse> {
        return $fetch("/api/users/invite", { method: "POST", body });
    },

    resendInvite(id: number): Promise<InviteResponse> {
        return $fetch(`/api/users/${id}/resend-invite`, { method: "POST" });
    },

    updateName(id: number, name: string | null): Promise<User> {
        return $fetch(`/api/users/${id}`, { method: "PATCH", body: { name } });
    },

    remove(id: number): Promise<{ ok: true }> {
        return $fetch(`/api/users/${id}`, { method: "DELETE" });
    },
};
