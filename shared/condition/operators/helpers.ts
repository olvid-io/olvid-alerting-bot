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

// Small pure helpers shared by the operator strategies. Module-private
// to this folder — nothing outside operators/ should need them.

/** Structural equality via JSON round-trip. Good enough for parsed
 *  payload subtrees (plain objects / arrays / primitives). */
export function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** Coerce both operands to numbers; null when either is empty/NaN.
 *  Numeric operators decline to fire (with a diagnostic detail) instead
 *  of silently comparing garbage. */
export function asNumbers(a: unknown, b: unknown): [number, number] | null {
    if (a === null || a === undefined || a === "") return null;
    if (b === null || b === undefined || b === "") return null;
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) return null;
    return [na, nb];
}
