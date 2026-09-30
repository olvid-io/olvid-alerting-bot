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
 * In-process cache of the Olvid daemon's discussion state.
 *
 * Populated once at server boot and kept in sync by updaterClient.
 * Restart = cold cache; the updater's init() rebuilds it. No
 * persistence needed — the daemon is authoritative.
 *
 * Photos are cached as raw JPEG bytes. `listModels()` inlines them as
 * `data:image/jpeg;base64,…` URLs on the outgoing DiscussionModel so
 * the frontend renders them directly — no per-photo API round-trip.
 */

import type { DiscussionModel } from "~~/shared/types/discussion";
import { photoToDataUrl } from "#server/utils/photo.ts";

const discussionsById = new Map<string, DiscussionModel>();
const photosById = new Map<string, Uint8Array>();

export const olvidDiscussionRepository = {
    add(d: DiscussionModel, photo: Uint8Array | null): void {
        discussionsById.set(d.id, { ...d, photoDataUrl: null });
        if (photo) photosById.set(d.id, photo);
    },

    // ── Event-driven mutations (called from updater listeners) ──────────────

    updateTitle(id: string, newTitle: string): void {
        const current = discussionsById.get(id);
        if (!current) return;
        discussionsById.set(id, { ...current, title: newTitle });
    },

    updatePhoto(id: string, newPhoto: Uint8Array): void {
        photosById.set(id, newPhoto);
    },

    remove(id: string): void {
        discussionsById.delete(id);
        photosById.delete(id);
    },

    // ── Reads ──────────────────────────────────────────────────────────────

    listModels(): DiscussionModel[] {
        const out: DiscussionModel[] = [];
        for (const d of discussionsById.values()) {
            out.push({ ...d, photoDataUrl: photoToDataUrl(photosById.get(d.id)) });
        }
        return out;
    },

    size(): { discussions: number; photos: number } {
        return { discussions: discussionsById.size, photos: photosById.size };
    },

    get(id: string): DiscussionModel | null {
        const d = discussionsById.get(id);
        if (!d) return null;
        return { ...d, photoDataUrl: photoToDataUrl(photosById.get(d.id)) }
    },

};
