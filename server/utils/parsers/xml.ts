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

// Library with parser for XML-JSON conversion
import { XMLParser } from "fast-xml-parser";
import { PollingFormat } from "#shared/types/polling";
import type { Parser, ParserContext, ParseResult } from "../types";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("XML Parser");

// Single shared instance — fast-xml-parser is stateless once configured.
const xmlReader = new XMLParser({
    ignoreAttributes: false,
    // To recognize attributes in the JS object separately. You can prepend some string with each attribute name.
    attributeNamePrefix: "@_",
    // Allows boolean attributes (we won't use it fro now)
    //allowBooleanAttributes: true,
    parseAttributeValue: false,
    trimValues: true,
    // Always emit arrays for repeated tags. Picks up <item> in RSS, <entry> in
    // Atom, etc. — without this, a single-item feed would parse to an object
    // instead of an array, breaking path resolution between poll cycles.
    isArray: (name, _path, _isLeaf, isAttribute) => {
        if (isAttribute) return false;
        return ["item", "entry"].includes(name);
    },
    numberParseOptions: {
        hex: true, // able to read numerical values in hexadecimal format
        leadingZeros: true, // trim extra zeros to the left of a number
    },
    processEntities: false, // recommended in docunmentation to prevent EntityExpansion attacks
    maxNestedTags: 500,
});

// Specific xml Parser implements generic "Parser" interface
export const xmlParser: Parser = {
    format: PollingFormat.XML,
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
        // isn't XML (HTML error page, JSON, plain text…). fast-xml-parser can
        // crash hard on some of those, so we bail with a clear message.
        const head = raw.trimStart();
        if (!head.startsWith("<")) {
            return {
                raw,
                parsed: null,
                error: `Response does not look like XML (starts with "${head.slice(0, 40).replace(/\n/g, " ")}…")`,
            };
        }
        try {
            const parsed = xmlReader.parse(raw);
            return { raw, parsed };
        } catch (e: any) {
            appLog.error("parse failed :", e);
            return { raw, parsed: null, error: e?.message ?? "XML parse error" };
        }
    },
};
