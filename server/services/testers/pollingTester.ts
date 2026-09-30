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

// Polling flavour of "test this alert once". Delegates the fetch +
// parse + condition eval to pollingEngine.test — which is the same
// path the runtime scheduler uses, minus baseline persistence and
// bundle firing — then homogenizes the return into AlertTestResult.

import type { AlertModel } from "#shared/types/alert";
import type { AlertTestResult } from "#shared/types/testResult";
import { pollingEngine } from "../../utils/engine";
import { formatBundleMessages } from "./formatBundles";

export const pollingTester = {
    async test(alert: AlertModel): Promise<AlertTestResult> {
        const engineResult = await pollingEngine.test(alert as any);

        // engineResult.ok=false ⇒ fetch or parse failed before condition eval.
        // Return early with the error preserved; bundle messages can't be
        // meaningful without a parsed payload.
        if (!engineResult.ok) {
            return {
                error: engineResult.error ?? "Test failed",
                parsed: engineResult.parsed,
                condition: engineResult.condition,
                bundleMessages: [],
            };
        }

        return {
            error: null,
            parsed: engineResult.parsed,
            condition: engineResult.condition,
            bundleMessages: formatBundleMessages(alert, engineResult.parsed),
        };
    },
};
