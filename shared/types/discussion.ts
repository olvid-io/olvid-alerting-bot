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

// Olvid discussion as the frontend handles it.
export const DiscussionKind = {
    Contact: "contact",
    Group: "group",
} as const;
export type DiscussionKind = (typeof DiscussionKind)[keyof typeof DiscussionKind];

export type DiscussionModel = {
    id: string; // Stored as BigInt in the DB, but serialized to string for JSON safety.
    title: string;
    kind: DiscussionKind;
    /** `data:image/jpeg;base64,…` URL when the daemon shipped a photo for
     *  this discussion; `null` otherwise. Server-side cache embeds the
     *  bytes at boot; the client uses this directly — no per-photo fetch. */
    photoDataUrl: string | null;
};
