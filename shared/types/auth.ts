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

// Request/response shapes for auth endpoints. Only forms that back a
// v-model on the client get a named interface — single-field payloads
// like { token } or { email } are inlined at the call site.
import type { User, UserRole } from "./user";

/**
 * Minimum password length
 */
export const PASSWORD_MIN_LEN = 8;

// The sign-in form. `login` accepts either an email address or a plain
// username, depending on how the account was created.
export interface CredentialsForm {
    login: string;
    password: string;
}

// First-run admin setup. Two steps in the UI, one server payload:
//   1. `adminKey` proves the operator controls the deploy (matched
//      against the `ADMIN_KEY` env var).
//   2. Everything else is the operator inviting THEMSELVES — same
//      shape as an admin-issued invite (channel + delivery target +
//      login + name), with role implicitly set to "admin" server-side.
// No password here: the operator sets it by opening the received
// invite URL, exactly like every other user does after being invited.
export interface SetupForm {
    adminKey: string;
    login: string;
    name?: string;
    channel: InviteChannel;
    /** Required when `channel === "mail"`. */
    email?: string;
    /** Required when `channel === "olvid"`. BigInt stringified. */
    olvidDiscussionId?: string;
}

/** Response for POST /auth/setup. Same envelope as InviteResponse —
 *  the client shows the same reveal / feedback UX as the admin's
 *  regular invite flow. */
export interface SetupResponse {
    inviteUrl: string;
    channel: InviteChannel;
    delivered: boolean;
}

// Accept-invite is just a password step — the admin already set login,
// name, and role at invite time and the user isn't allowed to override
// them. `token` proves the URL is valid.
export interface AcceptInviteForm {
    token: string;
    password: string;
    useOlvid: boolean;
    usePassword: boolean;
}

// Reset-password body — same shape as accept-invite but a different
// endpoint (and token purpose) so the two flows can evolve independently.
export interface ResetPasswordForm {
    token: string;
    password: string;
}

/**
 * Delivery channel the admin picks at invite time.
 *   mail   — server emails an invite URL (requires `email` + SMTP).
 *   link   — server returns the URL for the admin to share manually.
 *   olvid  — server DMs the URL through the Olvid daemon (requires
 *            `olvidDiscussionId`; also persisted on the user row so
 *            future password resets can reach them the same way).
 */
export type InviteChannel = "mail" | "link" | "olvid";

// Invite payload. `login` (username) is always required and chosen by
// the admin. `email` accompanies the mail path; `olvidDiscussionId` the
// olvid path. `channel` supersedes the old `sendMail?: boolean` two-value
// switch — a discriminated union scales cleanly for future channels.
export interface InviteUserForm {
    login: string;
    email?: string;
    name?: string;
    role: UserRole;
    channel: InviteChannel;
    /** BigInt stringified over the wire — JSON has no bigint. */
    olvidDiscussionId?: string;
}

// Server response for POST /users/invite and /resend-invite. The URL
// is always included so the admin can copy it out-of-band regardless
// of whether the mail/DM was sent. `delivered` supersedes `mailed` —
// same semantic ("we handed it to the outgoing channel and it accepted")
// but no longer email-specific. `channel` echoes back which delivery
// path the server actually used — clients switch on it to render
// channel-specific feedback ("emailed to X" vs "DM'd on Olvid" vs
// "copy the link").
export interface InviteResponse {
    user: User;
    inviteUrl: string;
    channel: InviteChannel;
    delivered: boolean;
    /** For legacy callers that still read the old field name. Will be
     *  removed once every consumer has migrated to `delivered`. */
    mailed: boolean;
}

/**
 * Response for POST /auth/request-password-reset. Never leaks whether
 * the login exists (200 + delivered:false on unknown login), but does
 * tell the caller which channel got used — the UI switches on this to
 * render "check your Olvid", "check your mail", or "contact your admin".
 */
export type ResetChannel = "olvid" | "mail" | "none";

export interface RequestPasswordResetResponse {
    ok: true;
    delivered: boolean;
    channel: ResetChannel;
}

// Server response for GET /api/auth/status. `mailEnabled` is derived
// once at boot from the SMTP env vars — the client uses it to gate
// every mail-related UI surface.
export interface AuthStatus {
    needsSetup: boolean;
    mailEnabled: boolean;
}


export interface OlvidAuthIdentity {
    name: string | null;
    photo: string | null;
}

export type InviteAcceptIdentity = OlvidAuthIdentity & { login: string, hasOlvid: boolean }
