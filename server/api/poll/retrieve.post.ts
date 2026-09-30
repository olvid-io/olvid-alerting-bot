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
 * Fetch + parse a URL — used by the wizard's ConditionEditor "Retrieve" button.
 * Side-effect-free: does not touch any alert or DB row.
 */

import { pollingEngine } from "../../utils/engine";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("POST /api/poll/retrieve");

export default defineEventHandler(async (event) => {
    await requireUserSession(event);

    try {
        const body = await readBody<{ url?: string; format?: string }>(event);
        const url = (body?.url ?? "").trim();
        const format = (body?.format ?? "").trim();
        return await pollingEngine.retrieve(url, format);
    } catch (e: any) {
        appLog.error("Unexpected:", e);
        return {
            ok: false,
            url: "",
            format: "",
            error: e?.message ?? "Unexpected server error in /api/poll/retrieve",
        };
    }
});
