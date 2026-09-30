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
import type { AlertStatus } from "#shared/types/alert.ts";

/**
 * Context-sensitive wizard footer. Three button shapes depending on which
 * step the user is on:
 * - On the BUNDLE step (always last): primary Save (uses effectiveFinalStatus
 * to label as "Save Alert" or "Save as draft" automatically).
 * - On a CONFIG step (general / trigger):
 * - If `wouldBeComplete`: primary Save Alert (fast-finish path).
 * - Otherwise: secondary "Save as draft" + primary "Continue" / "Add bundles".
 *
 * All step-machine state arrives as props; the footer emits semantic intents
 * and never touches alertService itself.
 */

defineProps<{
  showBack: boolean;
  saving: boolean;
  isOnBundleStep: boolean;
  isOnLastConfigStep: boolean;
  canAdvance: boolean;
  canSaveDraft: boolean;
  wouldBeComplete: boolean;
  effectiveFinalStatus: AlertStatus;
}>();

defineEmits<{
  back: [],
  next: [],
  save: [],
  saveDraft: []
}>();

</script>

<template>
  <div class="wizard-footbar">
    <!-- Back button disabled
    <button
      v-if="showBack"
      type="button"
      class="btn btn-ghost"
      @click="$emit('back')"
    >
      🡐 {{ $t("button.back") }}
    </button>

    <div class="foot-spacer" />
    -->

    <button
        v-if="!wouldBeComplete"
        type="button"
        class="btn btn-secondary"
        :disabled="!canSaveDraft || saving"
        :title="
          canSaveDraft
            ? $t('wizard.footer.saveAsDraftTitle')
            : $t('wizard.footer.saveAsDraftNoTitle')
        "
        @click="$emit('saveDraft')"
    >
      {{ saving ? $t("common.saving") : $t("wizard.footer.saveAsDraft") }}
    </button>

    <button
        v-if="isOnBundleStep"
        type="button"
        class="btn btn-primary"
        :disabled="saving || !wouldBeComplete"
        @click="$emit('save')"
    >
      {{
      saving
      ? $t("common.saving")
      : $t("wizard.footer.saveAlert")
      }}
    </button>
    <button
        v-else
        type="button"
        class="btn btn-primary"
        :disabled="!canAdvance || saving"
        @click="$emit('next')"
    >
      {{ isOnLastConfigStep ? $t("wizard.footer.addBundles") : $t("wizard.footer.configureTrigger") }}
      <LucideArrowRight/>
    </button>

    <!--
    <button
      v-if="wouldBeComplete"
      type="button"
      class="btn btn-primary"
      :disabled="saving"
      :title="$t('wizard.footer.saveAlertTitle')"
      @click="$emit('save')"
    >
      {{ saving ? $t("common.saving") : $t("wizard.footer.saveAlert") }}
    </button>
    -->


  </div>
</template>

<style scoped>
/* Lightweight action row — no grey `.panell-foot` chrome. Sits over the
 * app background with a subtle top-border to anchor the actions above
 * the scrolling content. */
.wizard-footbar {
  display: flex;
  align-items: center;
  justify-content: right;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-8) 0 var(--space-8);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-app);
  flex-shrink: 0;
}

.foot-spacer {
  flex: 1;
}
</style>
