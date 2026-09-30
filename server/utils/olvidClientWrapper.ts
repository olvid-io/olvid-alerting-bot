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
 * Wrapper for OlvidClient instance.
 * The goal is to only have one OlvidClient instance running
 * (except for Olvid authentication which use another) for both updater and writer.
 */

import { OlvidClient } from "@olvid/bot-node";
import { AppLogManager } from "#shared/logManager.ts";

const appLog = new AppLogManager("Olvid Client");

export const OlvidClientWrapper = {
    client: new OlvidClient(),
    newInstance() {
        this.client = new OlvidClient();
    },
    async testConnection(logError: boolean = false): Promise<boolean> {
        try {
            await this.client.ping();
            return true;
        } catch (error: any) {
            if (logError) appLog.error("Error while attempting to reach daemon : ", error);
            return false;
        }
    },
    async runForever() {
        if (this.client) {
            await this.client.runForever();
        }
    }
}