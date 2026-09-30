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

// HTML parser — thin wrapper over fast-xml-parser tuned for real-world
// HTML. Same output shape as the XML parser (JSON-like tree) so downstream
// code (condition evaluator, tree renderer) doesn't need to care about
// the source format.
//
// fast-xml-parser is NOT a real HTML parser. Two safeguards make it
// survive typical HTML in the wild:
//
//   1. Pre-strip <script> and <style> blocks. `stopNodes` alone isn't
//      enough — fast-xml-parser still walks the script body looking for
//      "</script>", and JS with `<` / `>` comparators or nested strings
//      containing "</script>" throws "Unexpected end of script". Removing
//      the blocks up-front sidesteps that entirely. Polling alerts don't
//      extract data from embedded JS / CSS anyway.
//
//   2. Declare every HTML5 void element as unpaired. Otherwise a plain
//      `<img>` (no `</img>` in HTML) makes the parser hunt for a closing
//      tag until end-of-document and eventually crash.

import { XMLParser } from "fast-xml-parser";
import { PollingFormat } from "#shared/types/polling";
import type { Parser, ParserContext, ParseResult } from "../types";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("HTML Parser");

const htmlReader = new XMLParser({
    ignoreAttributes: false,
    // Full HTML5 void-element list. Anything here is treated as unpaired,
    // so the parser doesn't hang waiting for a closing tag that will never
    // arrive.
    unpairedTags: [
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "source",
        "track",
        "wbr",
    ],
    processEntities: true,
    htmlEntities: true,
    maxNestedTags: 500,
});

/** Remove `<script>…</script>` and `<style>…</style>` blocks entirely
 *  before fast-xml-parser sees the document. Case-insensitive,
 *  non-greedy, cross-line. Cheap enough to run on every parse. */
function stripUnparseable(raw: string): string {
    return raw
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

const removeEmptyElements = (obj: any): any => {
    if (obj === null || obj === undefined) return null;

    // If it's a primitive string, check if it's completely blank
    if (typeof obj === "string") {
        return obj.trim() === "" ? null : obj;
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
        const cleanedArray = obj
            .map((item) => removeEmptyElements(item))
            .filter(
                (item) =>
                    item !== null &&
                    item !== undefined &&
                    (typeof item !== "object" || Object.keys(item).length > 0),
            );

        return cleanedArray.length > 0 ? cleanedArray : null;
    }

    // Handle Objects
    if (typeof obj === "object") {
        const cleanedObj: any = {};

        for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = removeEmptyElements(value);

            // Keep property only if it contains actual text or non-empty nested children
            if (cleanedValue !== null && cleanedValue !== undefined) {
                // If it boiled down to an empty object, skip it
                if (
                    typeof cleanedValue === "object" &&
                    Object.keys(cleanedValue).length === 0
                ) {
                    continue;
                }
                cleanedObj[key] = cleanedValue;
            }
        }

        return Object.keys(cleanedObj).length > 0 ? cleanedObj : null;
    }

    return obj as ParseResult;
};

export const htmlParser: Parser = {
    format: PollingFormat.HTML,
    parse(ctx: ParserContext): ParseResult {
        const raw = ctx.raw ?? "";
        if (!raw.trim()) {
            return {
                raw,
                parsed: null,
                error: "Empty response body — nothing to parse.",
            };
        }
        // Cheap pre-check: a body that doesn't start with "<" almost certainly
        // isn't HTML (JSON, plain text, error page…). Bail with a clear
        // message before fast-xml-parser gets a chance to crash.
        const head = raw.trimStart();
        if (!head.startsWith("<")) {
            return {
                raw,
                parsed: null,
                error: `Response does not look like HTML (starts with "${head.slice(0, 40).replace(/\n/g, " ")}…")`,
            };
        }
        try {
            const cleaned = stripUnparseable(raw);
            const parsed = htmlReader.parse(cleaned);
            // Deeply scrub out any keys that point to empty elements or empty strings
            const cleanParsed = removeEmptyElements(parsed) as ParseResult;
            if (cleanParsed == null)
                return { raw, parsed: null, error: "HTML parse error" };
            return { raw, parsed: cleanParsed };
        } catch (e: any) {
            appLog.error("Parse failed :", e);
            return { raw, parsed: null, error: e?.message ?? "HTML parse error" };
        }
    },
};
