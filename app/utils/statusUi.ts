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

/* Utility functions to update status dot according to alert status */

export const statusClass = (status: string) => (
    {
        "st-active": status === AlertStatus.Active,
        "st-inactive": status === AlertStatus.Inactive,
        "st-draft": status === AlertStatus.Draft
    }
);

export const statusLabel = (status: string) => {
    const { t } = useI18n();
    return t(`alertStatus.${status}`);
};



