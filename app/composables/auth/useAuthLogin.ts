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
 * Composable for login page. Implements login function (both modes) and request reset for communication
 * with authService.
 */
export const useAuthLogin = () => {
    const { t } = useI18n();

    /**
     * Submit credentials for user login. If successful, creates a session server side.
     * In case of failure, returns the corresponding I18nized error message.
     * @param credentials login / password to submit. In case of Olvid login, password is not taken
     * in consideration
     * @param mode Authentication mode
     * @return null if success, error message (string) if failure
     */
    const authLogin = async (credentials: CredentialsForm, mode: ("olvid" | "password")) => {
        try {
            if (mode === "password") {
                await authService.loginPassword(credentials);
            } else {
                await authService.loginOlvid(credentials);
            }

            return null;
        } catch (err: unknown) {
            const msg = (err as { statusMessage?: string }).statusMessage ?? "error";
            clientLogger.error(msg);
            return t(`auth.login.${msg}`);
        }
    }

    /**
     * Submit credentials (password is not taken in consideration) for requesting password reset.
     * @param credentials login / password to submit. In case of Olvid login, password is not taken
     * in consideration.
     * @return channel if OK, null if failure
     */
    const authRequestReset = async (credentials: CredentialsForm) => {
        try {
            const res = await authService.requestPasswordReset(credentials.login);
            return res.channel
        } catch {
            // Endpoint returns 200 for unknown logins on purpose — a caught
            // throw here is a network error.
            return null;
        }
    }


    return {
        authLogin,
        authRequestReset,
    }
}