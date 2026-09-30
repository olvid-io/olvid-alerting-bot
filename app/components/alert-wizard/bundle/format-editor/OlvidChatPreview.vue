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
import { computed } from "vue";

/**
 * Chat-style bubble showing the rendered Handlebars output.
 * Sibling of `MailPreview`.
 */

const props = defineProps<{
  data: { text: string; error: string | null };
}>();


// If we don't do this the on-line preview will allow html formatting but real messages will show the tags
function escapeHtml(s: string): string {
  return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
}

// Small markdown helper that renders text as it would on an Olvid discussion
function applyOlvidMarkup(s: string): string {
  return s
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<i>$1</i>")
      .replace(/\n-/g, "\n•");
}

const renderedText = computed(() =>
// First escape, then add the correct html to the markup
        applyOlvidMarkup(escapeHtml(props.data.text)),
);
</script>

<template>
  <div class="chat-background">
    <div v-if="data.error" class="error-bubble">⚠️ {{ data.error }}</div>
    <div v-else class="chat-bubble">
      <div class="bubble-sender">{{ $t("formatEditor.preview.sender") }}</div>
      <div class="bubble-text" v-html="renderedText"/>
      <!-- TODO Verify no XSS attack is possible -->
      <div class="bubble-time">{{ $t("formatEditor.preview.time") }}</div>
    </div>
  </div>
</template>

<style scoped>
.chat-background {
  padding: var(--space-7);
  flex-grow: 1;
  overflow-y: auto;
}

.chat-bubble {
  background: var(--color-bg-panel);
  max-width: 85%;
  width: fit-content;
  padding: var(--space-4) var(--space-6);
  /* Asymmetric corner leaves the bottom-left flat — anchors the
   * "sent by the app" chat bubble to the left rail of the pane. */
  border-radius: var(--radius-3xl) var(--radius-3xl) var(--radius-3xl) 0;
  box-shadow: var(--shadow-card);
  margin-bottom: var(--space-6);
  border: 1px solid var(--color-border-subtle);
  overflow-wrap: break-word;
  word-break: break-word;
}

.bubble-sender {
  color: var(--color-accent);
  font-weight: var(--font-weight-bold);
  font-size: var(--text-base);
  margin-bottom: var(--space-2);
}

.bubble-text {
  margin: 0;
  font-family: inherit;
  font-size: var(--text-lg);
  color: var(--color-text-primary);
  white-space: pre-wrap;
  line-height: 1.4;
}

.bubble-time {
  text-align: right;
  color: var(--color-text-dim);
  font-size: var(--text-s);
  margin-top: var(--space-2);
}

.error-bubble {
  background: var(--color-danger-soft);
  color: var(--color-danger-bright);
  max-width: 85%;
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-3xl);
  border: 1px solid var(--color-danger-border);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  white-space: pre-wrap;
}
</style>
