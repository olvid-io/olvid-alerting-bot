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
 * Owns the AlertModel form shared by AlertView (read) and AlertWizard (write).
 */

import { ref, computed, watch, type Ref } from "vue";
import { Source } from "#shared/types/source.ts";
import {
    AlertStatus,
    type AlertModel,
    type AlertParams,

} from "#shared/types/alert.ts";
import {
    Formatting,
    BundleOutputType,
    type BundleModel,
    type BundleOutput,
} from "#shared/types/bundle.ts";

export const useAlertBundleForm = (source: Ref<AlertModel | null | undefined>) => {
    const blankForm = (): AlertModel => ({
        id: null,
        title: "",
        description: "",
        input: undefined,
        status: AlertStatus.Draft,
        token: "",
        // alertParams omitted — undefined for a fresh form. Populated by the
        // source-binding setter once the user picks Polling.
        bundles: [],
        logs: []
    });

    const form = ref<AlertModel>(blankForm());

    const fillFrom = (a: AlertModel | null | undefined) => {
        if (a && a.id) {
            const incomingParams = a.alertParams;
            const alertParams: AlertParams =
                (a.input === Source.Polling || a.input === Source.Monitoring) &&
                incomingParams
                    ? (incomingParams as AlertParams)
                    : undefined;

            form.value = {
                id: a.id,
                title: a.title || "",
                description: a.description || "",
                input: a.input,
                status: a.status || AlertStatus.Draft,
                token: a.token || "",
                alertParams,
                bundles: (a.bundles ?? []).map((b) => ({
                    id: b.id,
                    name: b.name,
                    formating: (b.formating as Formatting) || Formatting.WebhookRaw,
                    custom_script: b.custom_script || "",
                    mailSubject: b.mailSubject ?? undefined,
                    outputs: (b.outputs ?? []) as BundleOutput[],
                })),
                logs: (a.logs ?? []).map((log) => ({
                    id: log.id,
                    alertId: log.alertId,
                    status: log.status,
                    error: log.error,
                    details: log.details,
                    createdAt: log.createdAt
                }))
            };
        } else {
            form.value = blankForm();
        }
    };

    watch(source, fillFrom, { immediate: true });

    // ── Bundle helpers ────────────────────────────────────────────────────────
    const blankBundle = (): BundleModel => ({
        outputs: [],
        formating: Formatting.WebhookRaw,
        custom_script: "",
    });

    const addBundle = () => {
        form.value.bundles.push(blankBundle());
    };
    const updateBundle = (index: number, b: BundleModel) => {
        form.value.bundles[index] = b;
    };
    const removeBundle = (index: number) => {
        form.value.bundles.splice(index, 1);
    };

    const hasEmptyBundle = computed(() =>
        form.value.bundles.some((b) => b.outputs.length === 0),
    );

    // ── Derived shape flags ───────────────────────────────────────────────────
    const isExisting = computed(() => form.value.id !== null);
    const isPolling = computed(() => form.value.input === Source.Polling);
    const isMonitoring = computed(() => form.value.input === Source.Monitoring);
    const isWebhook = computed(() => form.value.input === Source.Webhook);

    return {
        form,
        fillFrom,
        blankForm,
        blankBundle,
        addBundle,
        updateBundle,
        removeBundle,
        hasEmptyBundle,
        isExisting,
        isPolling,
        isMonitoring,
        isWebhook,
    };
};

// ── Output <-> per-channel helpers ───────────────────────────────────────────
// Bridge between the wire shape (typed outputs) and the flat lists each
// selector component speaks natively (Olvid discussion ids for
// DiscussionSelector, email strings for EmailRecipientSelector).
// The discriminated `BundleOutput` narrows `params` inside each
// filter so no cast is needed at the call site.

export function olvidIdsOf(outputs: BundleOutput[]): string[] {
    return outputs
        .filter((o) => o.type === BundleOutputType.Olvid)
        .map((o) => o.params.discussionId);
}

export function outputsFromOlvidIds(ids: string[]): BundleOutput[] {
    return ids.map((discussionId) => ({
        type: BundleOutputType.Olvid,
        params: { discussionId },
    }));
}

export function mailAddressesOf(outputs: BundleOutput[]): string[] {
    return outputs
        .filter((o) => o.type === BundleOutputType.Mail)
        .map((o) => o.params.address);
}

export function outputsFromMailAddresses(
    addresses: string[],
): BundleOutput[] {
    return addresses.map((address) => ({
        type: BundleOutputType.Mail,
        params: { address },
    }));
}

/** Single place that enforces the "olvid rows first, then mail rows"
 *  ordering on `bundle.outputs`. Any editor that updates one subset
 *  goes through here so the other subset is preserved verbatim.
 *  */
export function mergeOutputs(
    olvidIds: string[],
    mailAddresses: string[],
): BundleOutput[] {
    return [
        ...outputsFromOlvidIds(olvidIds),
        ...outputsFromMailAddresses(mailAddresses),
    ];
}

export function bundleKind(
    outputs: BundleOutput[],
): BundleOutputType | null {
    return outputs[0]?.type ?? null;
}
