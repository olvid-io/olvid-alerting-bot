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

// Deterministic pastel-palette assignment for mail-recipient avatars.

export type MailAvatarPalette = {
    bg: string;
    fg: string;
};

/** Small, curated set of low-saturation pastels.
 *  Values are inline (not CSS vars) because CSS vars would require a
 *  DOM context; these are consumed inline in scoped styles too. */

// TODO : alt for dark mode
const PASTEL_PALETTE: readonly MailAvatarPalette[] = [
    { bg: "#dde7dd", fg: "#3f5a45" }, // sage
    { bg: "#dae7e0", fg: "#3f5648" }, // moss
    { bg: "#dfeaea", fg: "#3d5757" }, // seafoam
    { bg: "#dbe4f0", fg: "#3b4a63" }, // slate blue
    { bg: "#dbdbf0", fg: "#3b3f63" }, // violet
    { bg: "#e5dcee", fg: "#503f66" }, // lavender
    { bg: "#e8dee6", fg: "#5c3f56" }, // mauve
    { bg: "#eedced", fg: "#6b3c67" }, // clay
    { bg: "#eee0dc", fg: "#6b493c" }, // clay
    { bg: "#ede1cd", fg: "#6a5527" }, // sand
];

function hash(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

export function paletteFor(address: string): MailAvatarPalette {
    const idx = hash(address) % PASTEL_PALETTE.length;
    return PASTEL_PALETTE[idx]!;
}
