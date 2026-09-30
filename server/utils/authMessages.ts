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

// Auth-flow message templates helpers. Each helper returns the
// channel-shaped payload the delivery client expects:

// One file so the two channels can't drift apart — same flow, same
// copy tone, same URL shape. Renamed from authEmails.ts when Olvid was
// added as a delivery channel; the old name only covered half the
// surface. `HTML` sends only (no plain-text alternative) — keep inline
// styles simple.

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function shell(title: string, body: string): string {
    return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
    <h2 style="margin:0 0 16px 0">${escapeHtml(title)}</h2>
    ${body}
    <p style="margin-top:32px;color:#888;font-size:12px">Olvid - Olvid Alerting</p>
  </div>`;
}

function ctaButton(href: string, label: string): string {
    return `<p style="margin:24px 0"><a href="${href}" style="background:#2f65f5;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(label)}</a></p>
  <p style="color:#666;font-size:13px">Or copy this link into your browser:<br/><span style="word-break:break-all">${href}</span></p>`;
}

function inviteUrl(origin: string, token: string): string {
    return `${origin}/invite?token=${encodeURIComponent(token)}`;
}

function resetUrl(origin: string, token: string): string {
    return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

// Welcome (on new one-to-one discussion)
export function welcomeMessage() {
    return "🚨 **Olvid Alerting**" +
        "\n\nWelcome to Olvid Alerting. This bot can monitor data sources online (JSON, XML, Webhooks...) and send alerts via Olvid or Email." +
        "\n\nTo get an access for managing requests, contact your administrator for getting an account."
}

// ── Invite (mail) ───────────────────────────────────────────────────
export function inviteEmail(origin: string, token: string, invitedBy?: string) {
    const url = inviteUrl(origin, token);
    const who = invitedBy ? escapeHtml(invitedBy) : "an administrator";
    return {
        subject: "You've been invited to Olvid Alerting",
        html: shell(
            "You've been invited",
            `<p>${who} has invited you to join Olvid Alerting. Click the button below to set your password and activate your account. The link expires in 7 days.</p>
      ${ctaButton(url, "Accept invitation")}`,
        ),
    };
}

// ── Invite (Olvid DM) ───────────────────────────────────────────────
// Plain text (Olvid's daemon renders markdown-lite at best). Line
// breaks are respected in Olvid's chat surface.
export function inviteOlvidMessage(
    origin: string,
    token: string,
    invitedBy?: string,
    login?: string,
): string {
    const url = inviteUrl(origin, token);
    const who = invitedBy ?? "an administrator";
    const loginLine = login ? `\nYour login: ${login}` : "";
    return (
        `🚨 **Olvid Alerting**\n\nYou've been invited to Olvid Alerting by ${who}.` +
        loginLine +
        `\n\nOpen this link to set your password and activate your account (expires in 7 days) :\n${url}`
    );
}

// ── Email verify (mail) ─────────────────────────────────────────────
export function verifyEmail(origin: string, token: string) {
    const url = `${origin}/verify?token=${encodeURIComponent(token)}`;
    return {
        subject: "Verify your email address",
        html: shell(
            "Verify your email",
            `<p>Confirm this email address to finish setting up your Olvid Alerting account. The link expires in 24 hours.</p>${ctaButton(url, "Verify email")}`,
        ),
    };
}

// ── Password reset (mail) ───────────────────────────────────────────
export function resetPasswordEmail(origin: string, token: string) {
    const url = resetUrl(origin, token);
    return {
        subject: "Reset your Olvid Alerting password",
        html: shell(
            "Reset your password",
            `<p>Someone (hopefully you) asked to reset your Olvid Alerting password. Click below to pick a new one. The link expires in 1 hour.</p>${ctaButton(url, "Reset password")}<p style="color:#888;font-size:12px">If you didn't request this, you can ignore this email — your password stays the same.</p>`,
        ),
    };
}

// ── Password reset (Olvid DM) ───────────────────────────────────────
export function resetPasswordOlvidMessage(
    origin: string,
    token: string,
): string {
    const url = resetUrl(origin, token);
    return (
        `🔑 A password reset was requested for your Olvid Alerting account.` +
        `\n\nOpen this link to pick a new password (expires in 1 hour):\n${url}` +
        `\n\nIf you didn't request this, you can ignore this message.`
    );
}


// ── Login (Olvid DM) ───────────────────────────────────────────────
// Plain text (Olvid's daemon renders markdown-lite at best). Line
// breaks are respected in Olvid's chat surface.
export function authOlvidMessage(
    login: string
): string {
    return `\uD83D\uDEA8 **Olvid Alerting**\n\nA login request has been made for user **${login}**.\nReact to this message to complete authentication.`
}

export function authOlvidMessageOK(): string {
    return "\uD83D\uDEA8 **Olvid Alerting**\n\nLogin complete ✅"
}

