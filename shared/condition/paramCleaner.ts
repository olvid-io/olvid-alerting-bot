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

import {
    ConditionAggregation,
    ConditionKind,
    ConditionOperator,
    OPERATORS_NEEDING_VALUE,
    type PollingCondition,
} from "../types/condition";
import type { PollingParams } from "../types/polling";
import { TriggerMode } from "../types/triggerMode";

// Firing-behavior defaults. Extend as new fields land.
const DEFAULT_TRIGGER_MODE: TriggerMode = TriggerMode.EveryTime;
const DEFAULT_DATAPOINTS_N = 1;
const DEFAULT_DATAPOINTS_M = 1;

const blank = (): PollingCondition => ({
    kind: ConditionKind.None,
    paths: [],
    operator: ConditionOperator.Changed,
    aggregation: ConditionAggregation.All,
});

/** Accept any incoming shape and return
 *  a fully-populated PollingCondition. Unknown shapes fall back to None. */
function migrate(c: any): PollingCondition {
    const out = blank();
    if (!c || typeof c !== "object") return out;

    out.kind =
        c.kind === ConditionKind.Rule || c.kind === ConditionKind.None
            ? c.kind
            : ConditionKind.None;
    if (Array.isArray(c.paths)) out.paths = c.paths.filter(Boolean);
    if (c.operator) out.operator = c.operator as ConditionOperator;
    if (typeof c.value === "string") out.value = c.value;
    if (
        c.aggregation &&
        (Object.values(ConditionAggregation) as string[]).includes(c.aggregation)
    ) {
        out.aggregation = c.aggregation as ConditionAggregation;
    }
    return out;
}

/** Drop fields that are meaningless given the kind. In-memory shape
 *  preserves everything so the UI can flip Rule ⇄ None without losing
 *  context; this bakes the final state for storage. */
function compact(c: PollingCondition): any {
    const mc = migrate(c);
    if (mc.kind === ConditionKind.None) return { kind: ConditionKind.None };
    const out: any = {
        kind: ConditionKind.Rule,
        paths: mc.paths,
        operator: mc.operator,
        aggregation: mc.aggregation,
    };
    if (OPERATORS_NEEDING_VALUE.has(mc.operator) && mc.value) out.value = c.value;
    return out;
}

/** A condition is "edge-native" when its firing follows an intrinsic
 *  edge (once-and-only-once). Trigger modes + datapoints don't add
 *  anything on top:
 *    - kind=None        → alert fires every poll by definition.
 *    - operator=Changed → each change IS itself a discrete event. */
function isEdgeNative(c: PollingCondition | null | undefined): boolean {
    if (!c) return true;
    if (c.kind === ConditionKind.None) return true;
    if (c.operator === ConditionOperator.Changed) return true;
    return false;
}

/** Reset firing-behavior fields to defaults when the condition can no
 *  longer meaningfully use them. Only polling params carry a
 *  `condition`; monitoring drops through unchanged. */
function cleanFiringBehaviour(params: PollingParams): PollingParams {
    if (!params || !params.condition) return params;
    if (!isEdgeNative(params.condition)) return params;
    return {
        ...params,
        triggerMode: DEFAULT_TRIGGER_MODE,
        datapointsN: DEFAULT_DATAPOINTS_N,
        datapointsM: DEFAULT_DATAPOINTS_M,
    };
}

/**
 * Single entry-point for condition + firing-behavior normalisation.
 *
 *   paramCleaner.migrateCondition(raw)  : fully-populated PollingCondition for evaluator / summary / form.
 *   paramCleaner.compactCondition(raw)   : storage-ready shape
 *   paramCleaner.cleanFiringBehaviour(p) : resets triggerMode + datapoints when the condition is edge-native.
 *   paramCleaner.isEdgeNative(c)         :  shared predicate used by firePolicy and the UI gates.
 *   paramCleaner.blankCondition()        :new, valid-but-empty condition.
 */
export const paramCleaner = {
    migrateCondition: migrate,
    compactCondition: (raw: unknown) => compact(migrate(raw)),
    cleanFiringBehaviour,
    isEdgeNative,
    blankCondition: blank,
};
