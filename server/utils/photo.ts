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
 * Photo format converter from bytes (stored in DB) to base64 (used front-side).
 * @param bytes
 */
export function photoToDataUrl(bytes: Uint8Array | undefined): string | null {
    if (!bytes || bytes.byteLength === 0) return null;
    return `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
}