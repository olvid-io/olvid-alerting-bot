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
import type { BundleMessageResult } from "#shared/types/testResult.ts";

/*
  "Messages per bundle" list shown in the test-run result modal — one
  card per bundle with head (name + discussion count + format) and
  body (rendered message or per-bundle error).

  Kept alongside AlertTestRunner so any surface that produces a
  BundleMessageResult[] can render it identically without duplicating
  the pre/error markup.
*/

/**
 * Displays bundle messages in alert test popup window.
 * @param messages Messages to display
 * @param title Section title
 */

defineProps<{
  messages: BundleMessageResult[];
  title: string;
}>();

const { formatLabel } = useAlertLabels();

const { t } = useI18n();
const discussionCountLabel = (n: number) =>
    n === 1
        ? t("editor.testModal.discussionsCount", { n })
        : t("editor.testModal.discussionsCountPlural", { n });
</script>

<template>
  <section v-if="messages.length" class="result-section">
    <h5 class="result-section-title">
      {{ title }}
      <span class="result-count">({{ messages.length }})</span>
    </h5>
    <div class="bundle-messages">
      <div v-for="bm in messages" :key="bm.index" class="bundle-message">
        <div class="bundle-message-head">
          <span class="bundle-tag">{{
            $t("editor.view.bundleTag", { n: bm.index + 1 })
          }}</span>
          <span class="bundle-message-meta">
            {{ discussionCountLabel(bm.discussionCount) }}
            · {{ formatLabel(bm.formating) }}
          </span>
        </div>
        <pre v-if="!bm.error" class="bundle-message-body">{{ bm.message }}</pre>
        <pre v-else class="bundle-message-error">⚠ {{ bm.error }}</pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.result-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.result-section-title {
  margin: 0;
  padding-bottom: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-dim);
  border-bottom: 1px solid var(--color-border-subtle);
}

.result-count {
  color: var(--color-text-faint);
  font-weight: 600;
  margin-left: var(--space-1);
}

.bundle-messages {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.bundle-message {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-card);
}

.bundle-message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-card-soft);
  border-bottom: 1px solid var(--color-border-subtle);
}

.bundle-message-meta {
  font-size: var(--text-s);
  color: var(--color-text-muted);
}

.bundle-tag {
  font-weight: 600;
  font-size: var(--text-s);
}

.bundle-message-body {
  margin: 0;
  padding: var(--space-4) var(--space-5);
  background: var(--color-bg-code);
  color: var(--color-text-code);
  font-family: var(--font-mono);
  font-size: var(--text-s);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 280px;
  overflow-y: auto;
}

.bundle-message-error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-soft);
  color: var(--color-danger-bright);
  font-family: var(--font-mono);
  font-size: var(--text-s);
  white-space: pre-wrap;
}
</style>
