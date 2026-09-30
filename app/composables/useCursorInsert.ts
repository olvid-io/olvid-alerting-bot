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

import { nextTick } from "vue";

/**
 * Textarea cursor helper. Inserts text at the caret (replacing
 * any selection), then restores focus and places the caret right after
 * the inserted text. Falls back to appending when no textarea is mounted.
 */
export const useCursorInsert = (
    getTextarea: () => HTMLTextAreaElement | null,
    getScript: () => string,
    setScript: (v: string) => void,
) => {
    // Convert a dot-path with array indices into Handlebars syntax. Two
    // segments need bracket-escaping so Handlebars parses them literally
    // instead of treating them as special tokens:
    //   - numeric indices (`0`, `1`, …) — the docs' recommended form.
    //   - segments starting with a character Handlebars would otherwise
    //     interpret (`#` opens a block, `@` is a data-variable prefix,
    //     `/` closes a block, `>` is a partial). fast-xml-parser emits
    //     `#text` for the text child of an element that also has attrs;
    //     without escaping, `{{foo.#text}}` fails to compile.
    const pathToHandlebars = (path: string): string =>
        path
            .split(".")
            .map((seg) =>
                /^\d+$/.test(seg) || /^[#@/>]/.test(seg) ? `[${seg}]` : seg,
            )
            .join(".");

    const insertAtCursor = (text: string) => {
        const ta = getTextarea();
        if (!ta) {
            setScript(getScript() + text);
            return;
        }
        const script = getScript();
        const start = ta.selectionStart ?? script.length;
        const end = ta.selectionEnd ?? script.length;
        setScript(script.slice(0, start) + text + script.slice(end));
        nextTick(() => {
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + text.length;
        });
    };

    const onPathSelect = (path: string) => {
        insertAtCursor(`{{${pathToHandlebars(path)}}}`);
    };

    return { insertAtCursor, onPathSelect, pathToHandlebars };
};
