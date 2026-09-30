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

// How often an alert is allowed to fire when its trigger condition
// stays satisfied. Shared by Polling and Monitoring sources — both
// evaluate on a cron cadence, both need edge-detection semantics.
// Webhook alerts are push-only and ignore this value.
//
//   EveryTime    fire on every evaluation while the condition is true.
//   OneShot      fire only when the condition transitions false → true.
//                Stays quiet on subsequent evaluations while still true.
//   WithRecovery same as OneShot plus a "recovery" message when the
//                condition transitions back true → false. The notifier
//                prefixes the message with "✓ RECOVERED:" so existing
//                bundle scripts don't need to know about this mode.
//
// Trigger mode is IGNORED when the condition is kind=None (every-poll
// alert by design) or operator=Changed (each change is itself an event).

export const TriggerMode = {
    EveryTime: "every-time",
    OneShot: "one-shot",
    WithRecovery: "with-recovery",
} as const;
export type TriggerMode = (typeof TriggerMode)[keyof typeof TriggerMode];
