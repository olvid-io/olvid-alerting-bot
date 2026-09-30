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
 * Client-side only logic for BundleEditDialog.
 * Creates a draft deep-copy of the bundle to keep original untouched until saved.
 */

import { ref, computed, watch, type Ref } from "vue";
import { Source } from "#shared/types/source.ts";
import type { AlertModel } from "#shared/types/alert.ts";
import {
    Formatting,
    DEFAULT_FORMAT_FOR_POLLING,
    DEFAULT_FORMAT_FOR_WEBHOOK,
    type BundleOutputType,
    type BundleModel,
    type BundleOutput,
} from "#shared/types/bundle.ts";
import type { DiscussionModel, DiscussionKind } from "#shared/types/discussion.ts";
import {
    olvidIdsOf,
    mailAddressesOf,
    outputsFromOlvidIds,
    outputsFromMailAddresses,
} from "~/composables/bundle/useAlertBundleForm.ts";

export interface BundleEditorInputs {
    open: Ref<boolean>;
    bundle: Ref<BundleModel | null>;
    alertContext: Ref<AlertModel>;
    inputSource: Ref<string | undefined>;
    availableDiscussions: Ref<DiscussionModel[]>;
}

export const useBundleEditor = (inputs: BundleEditorInputs) => {
    const isPolling = computed(
        () => inputs.inputSource.value === Source.Polling,
    );

    // Source-appropriate empty bundle for create mode.
    const blankBundle = (): BundleModel => ({
        outputs: [],
        formating: isPolling.value
            ? DEFAULT_FORMAT_FOR_POLLING
            : DEFAULT_FORMAT_FOR_WEBHOOK,
        custom_script: "",
    });

    // A stored format can be stale relative to the alert's current source
    // (e.g. Polling → Webhook after creating the bundle). Normalize once at
    // seed time — source can't change while the modal is open.
    const normalizeFormat = (b: BundleModel): BundleModel => {
        const isPollingFmt =
            b.formating === Formatting.PollingDefault ||
            b.formating === Formatting.PollingCustom;
        if (isPolling.value && !isPollingFmt) {
            return { ...b, formating: DEFAULT_FORMAT_FOR_POLLING };
        }
        if (!isPolling.value && isPollingFmt) {
            return { ...b, formating: DEFAULT_FORMAT_FOR_WEBHOOK };
        }
        return b;
    };

    // Legacy bundles may persist mixed-kind `outputs` (from before the
    // one-channel-per-bundle policy). Collapse to the first row's kind on
    // open so the editor's visible state matches a save.
    const normalizeToKind = (b: BundleModel): BundleModel => {
        const firstKind = b.outputs[0]?.type;
        if (!firstKind) return b;
        const filtered = b.outputs.filter((o) => o.type === firstKind);
        return filtered.length === b.outputs.length
            ? b
            : { ...b, outputs: filtered };
    };

    const draft = ref<BundleModel | null>(null);
    const snapshot = ref("");
    const confirmDiscard = ref(false);
    const activeKind = ref<BundleOutputType | null>(null);
    const outputsByKind = ref<
        Partial<Record<BundleOutputType, BundleOutput[]>>
    >({});
    const isEditorOpen = ref(false);

    // Reseed the draft every time the modal opens.
    watch(
        () => [inputs.open.value, inputs.bundle.value] as const,
        ([open, b]) => {
            if (!open) {
                draft.value = null;
                snapshot.value = "";
                confirmDiscard.value = false;
                outputsByKind.value = {};
                return;
            }
            const seed = b ? { ...b, outputs: [...b.outputs] } : blankBundle();
            draft.value = normalizeFormat(normalizeToKind(seed));
            activeKind.value = draft.value.outputs[0]?.type ?? null;
            outputsByKind.value = activeKind.value
                ? { [activeKind.value]: [...draft.value.outputs] }
                : {};
            snapshot.value = JSON.stringify(draft.value);
            confirmDiscard.value = false;
        },
        { immediate: true },
    );

    const isDirty = computed(
        () => !!draft.value && JSON.stringify(draft.value) !== snapshot.value,
    );

    const patch = (changes: Partial<BundleModel>) => {
        if (!draft.value) return;
        draft.value = { ...draft.value, ...changes };
    };

    const bundleName = computed<string>({
        get: () => draft.value?.name ?? "",
        set: (val) => patch({ name: val.trim() ? val : undefined }),
    });

    // Per-bundle mail subject.
    const mailSubject = computed<string>({
        get: () =>
            draft.value?.mailSubject ?? inputs.alertContext.value?.title ?? "",
        set: (val) => patch({ mailSubject: val.trim() ? val : undefined }),
    });

    const kind = computed<BundleOutputType | null>(() => activeKind.value);

    // Switching kind is non-destructive until save
    const onKindChange = (next: BundleOutputType) => {
        if (!draft.value || activeKind.value === next) return;
        if (activeKind.value) {
            outputsByKind.value[activeKind.value] = [...draft.value.outputs];
        }
        activeKind.value = next;
        patch({ outputs: outputsByKind.value[next] ?? [] });
    };

    const discussions = computed<DiscussionModel[]>({
        get: () => {
            if (!draft.value) return [];
            const ids = olvidIdsOf(draft.value.outputs);
            return ids.map((id) => {
                const found = inputs.availableDiscussions.value.find(
                    (d) => d.id === id,
                );
                return (
                    found ?? {
                        id,
                        title: `#${id}`,
                        kind: "contact" as DiscussionKind,
                        photoDataUrl: null,
                    }
                );
            });
        },
        set: (val) => {
            if (!draft.value) return;
            patch({ outputs: outputsFromOlvidIds(val.map((d) => d.id)) });
        },
    });

    // Mirror of `discussions` for the mail channel. Homogeneous — never
    // coexists with olvid rows in persisted `outputs`.
    const mailAddresses = computed<string[]>({
        get: () => (draft.value ? mailAddressesOf(draft.value.outputs) : []),
        set: (val) => {
            if (!draft.value) return;
            patch({ outputs: outputsFromMailAddresses(val) });
        },
    });

    const formating = computed<Formatting>({
        get: () => draft.value?.formating ?? Formatting.WebhookRaw,
        set: (val) => patch({ formating: val }),
    });

    const isCustomFormat = computed(
        () =>
            formating.value === Formatting.Custom ||
            formating.value === Formatting.PollingCustom,
    );

    // Format select auto-opens the script editor when the user commits to
    // one of the custom variants.
    const onFormatChange = () => {
        if (isCustomFormat.value) isEditorOpen.value = true;
    };

    const saveScript = (script: string) => {
        patch({ custom_script: script });
        isEditorOpen.value = false;
        clientLogger.log("Script saved");
    };

    return {
        // state
        draft,
        isDirty,
        confirmDiscard,
        activeKind,
        isEditorOpen,
        // computed
        isPolling,
        kind,
        isCustomFormat,
        // bindings
        bundleName,
        mailSubject,
        discussions,
        mailAddresses,
        formating,
        // handlers
        onKindChange,
        onFormatChange,
        saveScript,
        patch,
    };
};
