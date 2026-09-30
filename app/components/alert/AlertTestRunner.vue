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
import { ref, computed } from "vue";
import { testService } from "~/utils/testService.ts";
import type { AlertTestResult } from "#shared/types/testResult.ts";

/**
 * Runs a sample test of an alert without actually sending anything.
 * Check if associated condition would be fulfilled at the moment of the test.
 * Displays condition fulfillment and bundle messages that would be sent if this was a real polling.
 *
 * @param alertId Id of the alert to run the test on
 */

const t = useI18n().t;

const props = defineProps<{
  alertId: number | null;
}>();

const testing = ref(false);
const testResult = ref<AlertTestResult | null>(null);

const runTest = async () => {
  if (!props.alertId || testing.value) return;
  testing.value = true;
  try {
    testResult.value = await testService.testAlert(props.alertId);
  } catch (error: any) {
    testResult.value = {
      error:
          error?.data?.statusMessage ??
          error?.message ??
          t("editor.errors.testFailed"),
      bundleMessages: [],
    };
  } finally {
    testing.value = false;
  }
};

defineExpose({ run: runTest });

const verdictHeadline = computed(() => {
  const fired = testResult.value?.condition?.fired;
  return fired
      ? t("editor.testModal.conditionMet")
      : t("editor.testModal.conditionNotMet");
});
</script>

<template>
  <div v-if="testResult" class="overlay" @click.self="testResult = null">
    <div class="overlay-box test-modal">
      <ModalHead
          variant="filled"
          :title="$t('editor.testModal.title')"
          :close-label="$t('editor.bundleModal.closeTitle')"
          @close="testResult = null"
      />

      <div class="modal-body">
        <div v-if="testResult.error" class="test-error">
          ⚠ {{ testResult.error }}
        </div>

        <template v-else>
          <TestVerdictCard
              v-if="testResult.condition"
              :outcome="testResult.condition"
              :headline="verdictHeadline"
          />

          <VerdictBreakdown
              v-if="testResult.condition?.verdicts?.length"
              :verdicts="testResult.condition.verdicts"
              :title="$t('editor.testModal.perFieldBreakdown')"
          />

          <TestBundleMessages
              :messages="testResult.bundleMessages"
              :title="$t('editor.view.dividers.messagesPerBundle')"
          />

          <details class="test-raw">
            <summary>{{ $t("editor.testModal.parsedSourceRaw") }}</summary>
            <pre>{{ JSON.stringify(testResult.parsed, null, 2) }}</pre>
          </details>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sizing (wide + capped) is the runner's concern — content here is
 * dense (verdict + breakdown + several bundle messages + raw payload).
 * Sub-components own their own visual language; this file only owns
 * the modal shell + the residual "error" + "raw JSON" affordances
 * that don't warrant their own primitive. */
.test-modal {
  width: 92vw;
  max-width: 1080px;
  max-height: 90vh;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.test-error {
  color: var(--color-danger-bright);
  font-size: var(--text-m);
  font-family: var(--font-mono);
}

.test-raw {
  color: var(--color-text-dim);
  font-size: var(--text-m);
  margin-top: var(--space-4);
}

.test-raw summary {
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
  font-weight: 600;
}

.test-raw summary:hover {
  color: var(--color-accent-text);
}

.test-raw pre {
  margin: var(--space-2) 0 0;
  padding: var(--space-4);
  background: var(--color-bg-code);
  border-radius: var(--radius-sm);
  color: var(--color-text-code);
  font-family: var(--font-mono);
  font-size: var(--text-s);
  max-height: 240px;
  overflow: auto;
}
</style>
