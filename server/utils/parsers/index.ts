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

// Format → parser registry. To support a new format, drop a new Parser in
// this folder and add it to the map.

import type { Parser } from "../types";
import { xmlParser } from "./xml";
import { htmlParser } from "./html";
import { jsonParser } from "./json";

const parsers: Record<string, Parser> = {
    [xmlParser.format]: xmlParser,
    [htmlParser.format]: htmlParser,
    [jsonParser.format]: jsonParser,
};

export function getParser(format: string): Parser | null {
    return parsers[format] ?? null;
}

export function listSupportedFormats(): string[] {
    return Object.keys(parsers);
}
