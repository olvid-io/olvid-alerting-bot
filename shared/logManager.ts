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

export type AppLogType = "ERROR" | "WARN" | "SUCCESS" | "LOG";

/**
 * Class for app log management. Each instance gets a prefix for prefixing all logs.
 * Instantiated with new AppLogManager() to get an object which implement the same interface as console
 * for log, warn, error, info, debug and groups.
 */
export class AppLogManager {
    private prefix: string;
    private timestamp: boolean = true;
    private clientSide: boolean = false;

    /**
     * Class for app log management. Each instance gets a prefix for prefixing all logs.
     * Instantiated with new AppLogManager() to get an object which implement the same interface as console
     * for log, warn, error, info, debug and groups.
     * @param prefix Log prefix for this instance
     * @param timestamp Displays or not timestamp in log
     * @param clientSide Remove colors for browser console support if true
     */
    constructor(prefix?: string, timestamp: boolean = true, clientSide: boolean = false) {
        this.prefix = prefix ?? "Olvid Alerting";
        this.timestamp = timestamp;
        this.clientSide = clientSide;
    }

    setPrefix(prefix: string) {
        this.prefix = prefix;
    }

    setTimestamp(timestamp: boolean) {
        this.timestamp = timestamp;
    }

    addColor(body: string, timestamp: string, colorDigit: number): string {
        if (this.clientSide) return `${timestamp}${body}`;
        return `\x1b[30m${timestamp}\x1b[0m\x1b[3${colorDigit}m${body}\x1b[0m`
    }

    buildLog(body: string, colorDigit: number): string {
        const date = new Date;
        const timestamp = this.timestamp ? `${date.toLocaleString()} ` : "";
        return `[${this.prefix}] ${this.addColor(body, timestamp, colorDigit)}`;
    }

    log(...args: (string | unknown)[]) {
        const body = args.join(" ");
        console.log(this.buildLog(body, 7));
    }

    info(...args: (string | unknown)[]) {
        const body = args.join(" ");
        console.info(this.buildLog(body, 6));
    }

    warn(...args: (string | unknown)[]) {
        const body = args.join(" ");
        console.warn(this.buildLog(body, 3));
    }

    error(...args: (string | unknown)[]) {
        const body = args.join(" ");
        console.error(this.buildLog(body, 1));
    }

    debug(...args: (string | unknown)[]) {
        const body = args.join(" ");
        console.debug(this.buildLog(body, 2));
    }

    group(label?: string) {
        console.group(`[${this.prefix}] ${label}`);
    }

    groupEnd() {
        console.groupEnd();
    }
}