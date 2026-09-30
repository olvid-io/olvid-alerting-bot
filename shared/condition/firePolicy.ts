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

// Single source of truth for "should this poll cause the alert to fire?"

import {
    ConditionKind,
    ConditionOperator,
    type PollingCondition,
} from "../types/condition";
import { TriggerMode } from "../types/triggerMode";

/**
 * Outcome of a fire decision for one poll cycle.
 *
 *   { fire: false }                  — stay quiet
 *   { fire: true, kind: 'alert' }    — fire normally
 *   { fire: true, kind: 'recovery' } — fire as recovery (the notifier
 *                                       prefixes the bundle message with
 *                                       "✓ RECOVERED:")
 */
export type FireDecision =
    | { fire: false }
    | { fire: true; kind: "alert" | "recovery" };

export const firePolicy = {
    /**
     * Decide whether a poll outcome should result in an outbound message.
     *
     * `triggerMode` is IGNORED in two cases — both because the underlying
     * semantics already make the "still true" state non-meaningful:
     *
     *   - kind=None         — alert fires every poll by definition.
     *   - operator=Changed  — every change is a discrete event; there's no
     *                         "still true" state to deduplicate.
     *
     * For every other case the mode matters:
     *
     *   - EveryTime         — fire on every poll while true.
     *   - OneShot           — fire only on rising edge (false → true).
     *   - WithRecovery      — same as OneShot, plus a recovery message on
     *                         falling edge (true → false).
     */
    decide(
        condition: PollingCondition,
        triggerMode: TriggerMode | undefined,
        isCurrentlyTrue: boolean,
        wasPreviouslyTrue: boolean | undefined,
    ): FireDecision {
        // No polling condition, always fires
        if (condition.kind === ConditionKind.None) {
            return { fire: true, kind: "alert" };
        }
        if (condition.operator === ConditionOperator.Changed) {
            return isCurrentlyTrue ? { fire: true, kind: "alert" } : { fire: false };
        }

        if (triggerMode === TriggerMode.EveryTime) {
            return isCurrentlyTrue ? { fire: true, kind: "alert" } : { fire: false };
        }

        // Rising edge (false → true) — alert fires for OneShot and WithRecovery.
        if (isCurrentlyTrue && !wasPreviouslyTrue) {
            return { fire: true, kind: "alert" };
        }

        // Falling edge (true → false) — only WithRecovery sends the recovery.
        if (
            !isCurrentlyTrue &&
            wasPreviouslyTrue === true &&
            triggerMode === TriggerMode.WithRecovery
        ) {
            return { fire: true, kind: "recovery" };
        }

        return { fire: false };
    },
};
