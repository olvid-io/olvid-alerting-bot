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
 * User-administration state + actions. Pulled out of pages/users.vue so
 * the page stays a thin controller: it wires user-triggered events to
 * composable methods and renders the response state. Reactive fields
 * exposed here:
 *   - users       : the current list, refreshed after every mutation.
 *   - loading     : true while the initial /api/users list is in flight.
 *   - inviteUrls  : per-user cache of the last invite URL we generated,
 *                   so row-level "Copy link" is a one-tap operation.
 *   - revealedInvite : the invite response currently displayed in the
 *                   reveal modal (null when closed).
 *   - pendingDelete  : the user pending a delete confirmation
 *                   (null when the confirm dialog is closed).
 *   - pendingResend  : the user pending a resend-invite confirmation.
 *   - resendSuccess  : the user for whom a resend just succeeded,
 *                    surfaced as an acknowledgement modal.
 *  All fetch calls go through userService — no `$fetch` here.
 */

import { reactive, ref } from "vue";
import type { User } from "#shared/types/user";
import type { InviteResponse } from "#shared/types/auth";
import { userService } from "~/utils/userService";

export function useUserAdmin() {
    const users = ref<User[]>([]);
    const loading = ref(false);
    const inviteUrls = reactive<Record<number, string>>({});
    const revealedInvite = ref<InviteResponse | null>(null);
    const pendingDelete = ref<User | null>(null);
    const pendingResend = ref<User | null>(null);
    const resendSuccess = ref<User | null>(null);

    async function load() {
        loading.value = true;
        try {
            users.value = await userService.list();
        } finally {
            loading.value = false;
        }
    }

    /**
     * Called by the invite modal on successful create. Caches the URL
     * for row-level "Copy link" and picks one of two follow-ups:
     *   - Manual "link" channel → open the reveal modal so the admin can
     *     copy the URL right now (that's the whole point of that path).
     *   - Delivered mail / Olvid → nothing; the URL already reached the
     *     invitee.
     *   - Failed mail / Olvid → fall back to the reveal modal so the
     *     admin can still hand the link over out of band.
     */
    async function onInvited(res: InviteResponse) {
        inviteUrls[res.user.id] = res.inviteUrl;
        await load();

        if (res.channel === "link") {
            revealedInvite.value = res;
            return;
        }

        if (res.channel === "mail" && res.delivered) return;
        if (res.channel === "olvid" && res.delivered) return;

        // mail / olvid picked but delivery failed — surface the reveal so
        // the admin has a fallback path to hand over the URL.
        revealedInvite.value = res;
    }

    function closeReveal() {
        revealedInvite.value = null;
    }

    function askResend(u: User) {
        pendingResend.value = u;
    }

    function cancelResend() {
        pendingResend.value = null;
    }

    async function confirmResend() {
        const u = pendingResend.value;
        if (!u) return;
        pendingResend.value = null;
        const res = await userService.resendInvite(u.id);
        inviteUrls[u.id] = res.inviteUrl;
        resendSuccess.value = u;
    }

    function closeResendSuccess() {
        resendSuccess.value = null;
    }

    /**
     * Row-level "Copy link" for any pending user. Silently reissues via
     * resend-invite when we don't have a cached URL yet.
     */
    async function copyInviteLink(u: User) {
        let url = inviteUrls[u.id];
        if (!url) {
            const res = await userService.resendInvite(u.id);
            url = res.inviteUrl;
            inviteUrls[u.id] = url;
        }
        revealedInvite.value = {
            user: u,
            inviteUrl: url,
            channel: "link",
            delivered: false,
            mailed: false,
        };
    }

    function askRemove(u: User) {
        pendingDelete.value = u;
    }

    function cancelRemove() {
        pendingDelete.value = null;
    }

    async function confirmRemove() {
        const u = pendingDelete.value;
        if (!u) return;
        pendingDelete.value = null;
        await userService.remove(u.id);
        delete inviteUrls[u.id];
        await load();
    }

    return {
        users,
        loading,
        inviteUrls,
        revealedInvite,
        pendingDelete,
        pendingResend,
        resendSuccess,
        load,
        onInvited,
        closeReveal,
        askResend,
        cancelResend,
        confirmResend,
        closeResendSuccess,
        copyInviteLink,
        askRemove,
        cancelRemove,
        confirmRemove,
    };
}
