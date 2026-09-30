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

// One place for every alert-related enum → i18n label helper. Callers
// destructure just the labels they need — a stable function each, safe
// to invoke inline against changing values (`formatLabel(b.formating)`).
//
// Merged from four single-purpose composables (useFormatLabel,
// useScheduleLabel, useStatusMatchLabel, useTriggerModeOptions) that
// each amounted to a switch and one exported function. Keeping them
// together means adding a new label helper is a one-file change and
// components import from one path.

import { computed } from "vue";
import { Formatting } from "#shared/types/bundle.ts";
import { TriggerMode } from "#shared/types/triggerMode.ts";
import type { StatusMatch } from "#shared/types/monitor.ts";
import { scheduler } from "#shared/polling/scheduler.ts";

type TriggerVariant = "polling" | "monitoring";

export const useAlertLabels = () => {
    const { t } = useI18n();

    // ── Bundle format ──────────────────────────────────────────────────
    const formatLabel = (f: Formatting | string): string => {
        switch (f) {
            case Formatting.WebhookRaw:
                return t("bundleRow.format.unformatted");
            case Formatting.Simple:
                return t("bundleRow.format.simple");
            case Formatting.Custom:
                return t("bundleRow.format.custom");
            case Formatting.PollingDefault:
                return t("bundleRow.format.pollingDefault");
            case Formatting.PollingCustom:
                return t("bundleRow.format.pollingCustom");
            default:
                return String(f);
        }
    };

    // ── Polling schedule ───────────────────────────────────────────────
    const scheduleLabel = (schedule: string | undefined | null): string => {
        if (!schedule) return t("editor.schedule.interval.empty");
        const mode = scheduler.cronToMode(schedule);
        switch (mode.unit) {
            case "minutes":
                return mode.value === 1
                    ? t("editor.schedule.interval.everyMinute", { n: 1 })
                    : t("editor.schedule.interval.everyMinutes", { n: mode.value });
            case "hours":
                return mode.value === 1
                    ? t("editor.schedule.interval.everyHour", { n: 1 })
                    : t("editor.schedule.interval.everyHours", { n: mode.value });
            case "daily":
                return t("editor.schedule.interval.dailyAt", { time: mode.dailyAt });
            case "custom":
                return `#${mode.expression}`; // # is a synthetic marker to discriminate custom cron expressions in `AlertInputSummary`
        }
    };


    const lastPolledAtLabel = (_lastPolledAt: number | undefined | null): string => {
        if (!_lastPolledAt) return "—";
        const date = new Date(_lastPolledAt);
        return date.toLocaleString();
    };

    // ── Monitor status match ───────────────────────────────────────────
    const statusMatchLabel = (
        match: StatusMatch | undefined | null,
    ): string => {
        if (!match) return "—";
        switch (match.kind) {
            case "codes":
                return t("monitorEditor.view.codes", {
                    codes: match.codes.length > 0 ? match.codes.join(", ") : "—",
                });
            case "range":
                return t("monitorEditor.view.range", { range: match.range });
            case "not-ok":
                return t("monitorEditor.view.notOk");
            case "no-http-response":
                return t("monitorEditor.view.noHttpResponse");
        }
    };

    // ── Trigger mode ───────────────────────────────────────────────────
    // The picker + summary each need a labelled options list; the picker
    // also asks for per-mode hints, and hints differ between polling and
    // monitoring. Pass the variant when calling `triggerModeOptions()`.
    const triggerModeLabel = (mode: TriggerMode): string =>
        t(`wizard.triggerMode.labels.${mode}`);

    const triggerModeHint = (
        mode: TriggerMode,
        variant: TriggerVariant = "polling",
    ): string => t(`wizard.triggerMode.hints.${variant}.${mode}`);

    const triggerModeOptions = (variant: TriggerVariant = "polling") =>
        computed<Array<{ value: TriggerMode; label: string; hint: string }>>(
            () => [
                {
                    value: TriggerMode.EveryTime,
                    label: triggerModeLabel(TriggerMode.EveryTime),
                    hint: triggerModeHint(TriggerMode.EveryTime, variant),
                },
                {
                    value: TriggerMode.OneShot,
                    label: triggerModeLabel(TriggerMode.OneShot),
                    hint: triggerModeHint(TriggerMode.OneShot, variant),
                },
                {
                    value: TriggerMode.WithRecovery,
                    label: triggerModeLabel(TriggerMode.WithRecovery),
                    hint: triggerModeHint(TriggerMode.WithRecovery, variant),
                },
            ],
        );

    return {
        formatLabel,
        scheduleLabel,
        lastPolledAtLabel,
        statusMatchLabel,
        triggerModeLabel,
        triggerModeHint,
        triggerModeOptions,
    };
};
