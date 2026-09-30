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
 * Mail client (via nodemailer).
 *
 * Use environment variables :
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASSWORD
 * - SMTP_FROM for email adress
 */
import nodemailer from "nodemailer";
import { AppLogManager } from "#shared/logManager.ts";

const PASSWORD = process.env.SMTP_PASSWORD;
const FROM = process.env.SMTP_FROM;


const appLog = new AppLogManager("Mail Client");

const client = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});


async function testClient() {
    try {
        await client.verify();
        return true;
    } catch (err) {
        appLog.error("Mail client error :", err);
        return false;
    }
}


export const mailClient = {
    /** Check if the SMTP env vars set.
     * Used to keep unavailable mail option out of the ui */
    isAvailable(): boolean {
        return Boolean(PASSWORD && FROM);
    },

    /**
     * Sends a message via mail to one or more addresses.
     * Creates a promise per address to send and return false if at least one of them
     * fails.
     * @param addresses Array of all email adresses to send to
     * @param subject Mail subject
     * @param htmlbody Mail plain HTML body
     */
    async send(
        addresses: string[],
        subject: string,
        htmlbody: string,
    ): Promise<boolean> {

        if (addresses.length === 0) return true;
        if (!(await testClient())) return false;

        let allOk = true;
        try {
            await Promise.allSettled(
                addresses.map((address) =>
                    client.sendMail({
                        from: FROM!,
                        to: address,
                        subject: subject,
                        //text: "text",
                        html: htmlbody
                    }).then(() => {
                        appLog.log(`Message sent to ${address}`);
                    }).catch((error: any) => {
                            allOk = false;
                            appLog.error(
                                `Failed to send to ${address}:`,
                                error?.message ?? error,);
                        }
                    )
                )
            )
        } catch (error) {
            appLog.error("Error sending mail : ", error);
            allOk = false;
        }


        return allOk;
    },
};
