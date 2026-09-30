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

<script setup lang="ts">/**
 * Right-hand pane variant for mail bundles — reading-view style.
 *
 * Design principles borrowed from the OlvidChatPreview bubble:
 *   · One elevated card floating in a padded background.
 *   · Subject is the headline (largest, bold, primary); the mail metadata
 *     is a single muted meta-line beneath it, not a form-style table.
 *   · Body sits below with generous line-height and prose-friendly type
 *     so the content takes center stage.
 *
 *  @param data { text: string; error: string | null }
 *  @param from Sender indicator
 *  @param to Retained for backward-compat with `PreviewPanel`'s prop passthrough, no longer surfaced in the UI.
 */

const props = defineProps<{
      data: { text: string; error: string | null };
      /** Sender label. Falls back to a generic placeholder if the caller
       *  doesn't know it — the preview is illustrative, not authoritative. */
      from?: string;
      to?: string;
      subject?: string;
    }>();

function removeSpecialChars(text: string) {
  return text.replace("\n", "");
}

const renderedText = computed(() => {
  return removeSpecialChars(props.data.text);
})

const { t } = useI18n();
</script>

<template>
  <div class="mail-background">
    <div v-if="data.error" class="error-bubble">⚠️ {{ data.error }}</div>
    <article v-else class="mail-card">
      <header class="mail-head">
        <div class="mail-subject-block">
          <span class="mail-label">{{
              t("formatEditor.mailPreview.subject")
            }}</span>
          <p class="mail-subject">
            {{ subject || t("formatEditor.mailPreview.subjectPlaceholder") }}
          </p>
        </div>
        <p class="mail-meta">
          <span class="mail-from">{{
              from || t("formatEditor.mailPreview.fromPlaceholder")
            }}</span>
          <span class="mail-dot" aria-hidden="true">·</span>
          <span class="mail-time">{{ t("formatEditor.preview.time") }}</span>
        </p>
      </header>
      <div class="mail-body" v-html="renderedText"/>
      <!-- TODO Verify no XSS attack is possible (require mail configured) -->
    </article>
  </div>
</template>

<style scoped>
/* Container matches OlvidChatPreview's `.chat-background` so both
 * variants breathe identically inside PreviewPanel. */
.mail-background {
  padding: var(--space-7);
  flex-grow: 1;
  overflow-y: auto;
}

.mail-card {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-3xl);
  box-shadow: var(--shadow-card);
  padding: var(--space-6) var(--space-7);
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}

.mail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.mail-subject-block {
  min-width: 0;
  flex: 1;
}

.mail-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.mail-subject {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-lg--line-height);
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Sender · time — same weight/size as the app's dim helper text so it
 * feels native rather than form-derived. */
.mail-meta {
  margin: 0;
  color: var(--color-text-dim);
  font-size: var(--text-s);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  padding-top: var(--space-5); /* aligns with the subject baseline after the label */
}

.mail-from {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
}

.mail-dot {
  color: var(--color-text-faint);
}

/* Body is the star — larger reading font + generous line-height +
 * whitespace-preserving so the formatter's newlines survive. */
.mail-body {
  color: var(--color-text-primary);
  font-size: var(--text-lg);
  line-height: 1.4;
  white-space: pre-wrap;
}

/* Inline tags kept readable */
.mail-body :deep(strong) {
  font-weight: var(--font-weight-bold);
}

.mail-body :deep(em),
.mail-body :deep(i) {
  font-style: italic;
}

.mail-body :deep(s) {
  text-decoration: line-through;
}

.mail-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.95em;
  padding: 2px var(--space-2);
  background: var(--color-bg-input);
  border-radius: var(--radius-sm);
}

/* Same error surface as OlvidChatPreview so failure feedback is
 * consistent across channels. */
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
