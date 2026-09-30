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

import { LogStatus } from "#shared/types/statusLog.ts";

/**
 * Contains utility functions used for log display formatting in AlertLogRowDisplay and AlertLogs.
 */
export const useAlertLogsFormat = () => {
    const { t } = useI18n();

    function formatTimestamp(iso: string): string {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, "0");
        return (
            `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ` +
            `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
        );
    }

    function stateLabel(status: string): string {
        switch (status) {
            case LogStatus.Success:
                return t("alertLog.status.sent");
            case LogStatus.Warning:
                return t("alertLog.status.partial");
            case LogStatus.Error:
                return t("alertLog.status.failed");
            default:
                return status;
        }
    }

    return {
        formatTimestamp,
        stateLabel
    }

}