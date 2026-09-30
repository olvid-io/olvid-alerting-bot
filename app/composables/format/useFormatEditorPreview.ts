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

import { computed, type Ref } from "vue";
import { formatMessage } from "#shared/handlebars.ts";

/**
 * Live preview of the Handlebars script run against the current payload.
 *
 * Only the webhook path can throw a JSON parse error; the other two
 * receive shapes that are already parsed on the server. Handlebars
 * render errors can surface from any source.
 *
 * Returned shape `{ text, error }` — `text` is the RAW Handlebars output.
 * Channel-specific rendering (Olvid markup transforms, HTML escaping)
 * lives in the preview components so each channel shows what its real
 * transport actually renders:
 *   - Mail  → HTML tags rendered, plain-text markup shown literally.
 *   - Olvid → markup rendered, HTML tags escaped as literal text.
 */
export const useFormatEditorPreview = (opts: {
    scriptContent: Ref<string>;
    isPolling: Ref<boolean>;
    isMonitoring: Ref<boolean>;
    parsedTree: Ref<unknown>;
    monitorProbe: Ref<unknown>;
    jsonPayload: Ref<string>;
}) => {
    const { t } = useI18n();

    const previewData = computed<{ text: string; error: string | null }>(() => {
        const script = opts.scriptContent.value;
        if (!script || script.trim() === "") {
            return { text: t("formatEditor.preview.placeholder"), error: null };
        }

        let context: unknown;
        if (opts.isPolling.value) {
            context = opts.parsedTree.value ?? {};
        } else if (opts.isMonitoring.value) {
            context = opts.monitorProbe.value ?? {};
        } else {
            try {
                context = JSON.parse(opts.jsonPayload.value);
            } catch (err) {
                return {
                    text: "",
                    error: t("formatEditor.errors.jsonError", {
                        message: (err as Error).message,
                    }),
                };
            }
        }

        try {
            const msg = formatMessage(script, context);
            return { text: msg, error: null };
        } catch (err) {
            return {
                text: "",
                error: t("formatEditor.errors.handlebarsError", {
                    message: (err as Error).message,
                }),
            };
        }
    });

    return { previewData };
};
