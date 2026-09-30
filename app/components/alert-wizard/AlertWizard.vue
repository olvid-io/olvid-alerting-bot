<!--
  - Olvid Alerting
  - Copyright © 2026 Olvid SAS
  -
  - Olvid Alerting is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License, version 3,
  - as published by the Free Software Foundation.
  -
  - Olvid Alerting is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with Olvid Alerting. If not, see <https://www.gnu.org/licenses/>.
  -->

<script setup lang="ts">
import { toRef } from "vue";
import type { AlertModel } from "#shared/types/alert.ts";
import { useDiscussions } from "~/composables/useDiscussions.ts";

/**
 * Orchestration container for the alert create / edit flow. Layout +
 * wiring only; every imperative concern is a composable:
 *
 *       ┌─ Topbar (back-link + Stepper) ─────────────── inline here
 *       ├─ Step content — one of:
 *       │     general  → wizard/steps/StepGeneral
 *       │     trigger  → wizard/steps/StepTrigger
 *       │     bundle   → wizard/steps/StepBundles
 *       └─ Footbar (Back / Save-as-draft / Continue / Save)
 *
 * Composables:
 * - useAlertForm      → form + bundle helpers + isExisting/isPolling/…
 * - useAlertActions   → primitives (saveAlert / saving)
 * - useDirtyGuard     → snapshot + isDirty + route guards + beforeunload
 * - useWizardSteps    → stepDefs + canAdvance + step navigation
 * - useWizardSave     → canSaveDraft / wouldBeComplete /
 *                         effectiveFinalStatus / save()
 * - useWizardLeave    → back-to-list + discard-prompt handlers
 */

const props = withDefaults(
    defineProps<{
      initialAlert?: AlertModel | null;
    }>(),
    {
      initialAlert: null,
    },
);

const { fetchAlerts } = useAlertFetching();
const { availableDiscussions, discussionsLoading } = useDiscussions();

const { form, isExisting, isPolling, hasEmptyBundle } = useAlertBundleForm(
    toRef(props, "initialAlert"),
);

const { saving, saveAlert } = useAlertActions();

const {
  isDirty,
  showDiscardPrompt,
  pendingLeave,
  takeSnapshot,
  allowNextLeave,
  dismissPrompt,
} = useDirtyGuard(form);

const {
  currentStep,
  stepDefs,
  currentStepKey,
  canAdvance,
  isOnBundleStep,
  isOnLastConfigStep,
  isPollingConfigComplete,
  isConditionComplete,
  next,
  back,
} = useWizardSteps(form);

const { canSaveDraft, wouldBeComplete, effectiveFinalStatus, save } =
    useWizardSave({
      form,
      isPolling,
      isExisting,
      hasEmptyBundle,
      isPollingConfigComplete,
      isConditionComplete,
      saveAlert,
      takeSnapshot,
      allowNextLeave,
      fetchAlerts,
    });

const { onBackToList, onDiscard, onSaveDraftAndLeave, onSaveAlertAndLeave } =
    useWizardLeave({
      form,
      save,
      isDirty,
      showDiscardPrompt,
      pendingLeave,
      allowNextLeave,
    });
</script>

<template>
  <div class="wizard-root">
    <DiscardChangesDialog
        :open="showDiscardPrompt"
        :can-save-draft="canSaveDraft"
        :would-be-complete="wouldBeComplete"
        :saving="saving"
        @save-draft="onSaveDraftAndLeave"
        @save-alert="onSaveAlertAndLeave"
        @continue-editing="dismissPrompt"
        @discard="onDiscard"
    />

    <!-- Topbar — one thin row: back-link on the left, stepper on the right. -->
    <div class="wizard-topbar">
      <button
          type="button"
          class="btn btn-ghost btn-sm topbar-back"
          @click="onBackToList"
      >
        <LucideArrowLeft/>
        {{ $t("button.backToList") }}
      </button>
      <div class="topbar-stepper">
        <Stepper v-model="currentStep" :steps="stepDefs"/>
      </div>
    </div>

    <!-- Step content — no `.panell` wrapper. -->
    <div class="wizard-content">
      <StepGeneral v-if="currentStepKey === 'general'" v-model="form"/>
      <StepTrigger v-else-if="currentStepKey === 'trigger'" v-model="form"/>
      <StepBundles
          v-else-if="currentStepKey === 'bundle'"
          v-model="form"
          :available-discussions="availableDiscussions"
          :discussions-loading="discussionsLoading"
      />
    </div>

    <AlertWizardFooter
        :show-back="currentStep > 1"
        :saving="saving"
        :is-on-bundle-step="isOnBundleStep"
        :is-on-last-config-step="isOnLastConfigStep"
        :can-advance="canAdvance"
        :can-save-draft="canSaveDraft"
        :would-be-complete="wouldBeComplete"
        :effective-final-status="effectiveFinalStatus"
        @back="back"
        @next="next"
        @save="save(false, true)"
        @save-draft="save(true, true)"
    />
  </div>
</template>

<style scoped>
/* Flow-first layout: topbar (thin) + content (scrolls) + footbar (thin).
 * Deliberately no card/panell wrapping — the app's grey nav on the left
 * already provides all the chrome the eye needs, and the previous
 * `.panell` shell was eating ~130px of vertical space + ambient noise. */
.wizard-root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--color-bg-app);
}

.wizard-topbar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: 0 var(--space-8) var(--space-2) var(--space-8);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.topbar-back {
  flex-shrink: 0;
}

.topbar-stepper {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.wizard-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4) var(--space-8);
}

.wizard-content > * {
  /* Keep line lengths readable on wide screens without capping too
   * hard on narrow ones. */
  max-width: 800px;
  margin: 0 auto;
}
</style>
