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
 * Handlebars wrapper used to render bundle scripts both in preview
 * (FormatEditor) and at runtime (notifierService).
 */

import Handlebars from "handlebars"; // doc at https://handlebarsjs.com/
/*
    Handlebars defines reserved names starting with @.
    To avoid errors when data variables contain @ we bracked-escape them when
    they are classified as a fieldname so Handlebars treats it
    as a literal identifier instead of an unknown data-var.

    Reserved names, acc. to the Handlebars docs:
      @index, @key, @first, @last, @root, @level, @partial-block
  */
const RESERVED = /^(?:index|key|first|last|root|level|partial-block)$/;

export const formatMessage = (script: string, payload: unknown): string => {
    script = script.replace(/{{([\s\S]*?)}}/g, (_full, inner: string) => {
        const rewritten = inner.replace(
            /(?<![\w[])@([\w-]+)/g,
            (match: string, name: string, offset: number) => {
                const before = inner[offset - 1] ?? "";
                const after = inner[offset + match.length] ?? "";
                const bare = before !== "." && after !== ".";
                return RESERVED.test(name) && bare ? match : `[${match}]`;
            },
        );
        return "{{" + rewritten + "}}";
    });

    return Handlebars.compile(script)(payload);
};
