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
 * Wildcard-aware dot-path expansion against a parsed object.
 *
 * Patterns use `.` as the segment separator. A `..` (or any run of consecutive
 * dots) is a wildcard matching ZERO or more segments — same idea as JSONPath's
 * `..` recursive descent. Concrete segments must match exactly.
 *
 *   expandPath('a.b.c',     obj) → ['a.b.c'] if it resolves, else []
 *   expandPath('a..c',      obj) → every path matching a.{any segments}.c
 *   expandPath('..foo.bar', obj) → every path ending in foo.bar
 *   expandPath('foo..',     obj) → every path starting with foo
 *
 * Used by the ConditionEditor to let users add many related watched fields
 * with one pattern (typical case: every array entry in an XML feed). Result
 * is deduped and order-preserving (depth-first).
 */
// `obj` is the parsed payload tree (XML / JSON / HTML, all normalised to JS objects).
export function expandPath(pattern: string, obj: any): string[] {
    const parts = normalize(pattern);
    if (parts.length === 0) return [];

    const out: string[] = [];
    walk(obj, parts, 0, [], out);
    return [...new Set(out)].filter((p) => p.length > 0);
}

/** True if the pattern contains at least one wildcard segment. */
export function hasWildcard(pattern: string): boolean {
    return normalize(pattern).some((p) => p === "");
}

/**
 * Walk an object by a concrete dot-path. Returns `undefined` when any
 * segment is missing instead of throwing. Meant for paths already
 * resolved to leaves (either non-wildcard input from the user or one of
 * the expansions produced by `expandPath`) — passing a `..`-style
 * wildcard yields `undefined` because `filter(Boolean)` drops the empty
 * segments and the walker only looks up literal keys.
 */
export function resolvePath(obj: unknown, path: string): unknown {
    if (!path) return undefined;
    const parts = path.split(".").filter(Boolean);
    let cur: any = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

/**
 * Split on `.`, then collapse consecutive empty segments to a single `''`
 * marker so `..`, `...`, `....` all parse as ONE wildcard (otherwise the
 * walker would multiply work for nothing). Leading and trailing empties are
 * preserved as the wildcard marker at that position.
 */
function normalize(pattern: string): string[] {
    const out: string[] = [];
    for (const p of pattern.split(".")) {
        // Empty segment right after another empty → already a wildcard, skip.
        if (p === "" && out[out.length - 1] === "") continue;
        out.push(p);
    }
    return out;
}

function walk(
    node: any,
    parts: string[],
    i: number,
    current: string[],
    out: string[],
): void {
    if (i === parts.length) {
        out.push(current.join("."));
        return;
    }
    const part = parts[i];

    if (part === "") {
        // Wildcard: try zero-segment match (skip ahead), then one-or-more
        // (descend into each child but stay on this wildcard).
        walk(node, parts, i + 1, current, out);
        if (node !== null && typeof node === "object") {
            const entries: Array<[string, any]> = Array.isArray(node)
                ? node.map((v, idx) => [String(idx), v])
                : Object.entries(node);
            for (const [k, v] of entries) {
                walk(v, parts, i, [...current, k], out);
            }
        }
        return;
    }

    // Concrete segment: must match exactly.
    if (node === null || typeof node !== "object") return;
    if (!part) return;
    if (!(part in node)) return;
    walk(node[part], parts, i + 1, [...current, part], out);
}
