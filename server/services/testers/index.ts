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

// Dispatch by Source. The endpoint holds one reference — this object
// — and never learns about polling vs monitoring; adding a new source
// means dropping a `<source>Tester.ts` next to these two and wiring it
// in below.

import type { AlertModel } from "#shared/types/alert";
import type { AlertTestResult } from "#shared/types/testResult";
import { Source } from "#shared/types/source";
import { pollingTester } from "./pollingTester";
import { monitoringTester } from "./monitoringTester";

export const alertTester = {
    /** True if this alert has a server-side "run once" path. Webhook
     *  alerts fire in response to inbound requests, so there is nothing
     *  to trigger from our side — the UI hides the action for them. */
    supports(alert: Pick<AlertModel, "input">): boolean {
        return alert.input === Source.Polling || alert.input === Source.Monitoring;
    },

    async test(alert: AlertModel): Promise<AlertTestResult> {
        switch (alert.input) {
            case Source.Polling:
                return pollingTester.test(alert);
            case Source.Monitoring:
                return monitoringTester.test(alert);
            default:
                return {
                    error: `Alerts of type "${alert.input}" cannot be tested`,
                    bundleMessages: [],
                };
        }
    },
};
