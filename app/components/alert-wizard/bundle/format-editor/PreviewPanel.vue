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
import { BundleOutputType } from "#shared/types/bundle.ts";


const { t } = useI18n();

const props = withDefaults(
    defineProps<{
      data: { text: string; error: string | null };
      /** Channel to render the preview for. Defaults to Olvid so callers
       *  that don't yet pass a mode keep working. */
      mode?: BundleOutputType;
      /** Mail-only helpers surfaced through the panell. Ignored for olvid. */
      mailFrom?: string;
      mailTo?: string;
      mailSubject?: string;
    }>(),
    {
      mode: BundleOutputType.Olvid,
    },
);

const headerTitle = computed(() =>
    props.mode === BundleOutputType.Mail
        ? t("formatEditor.preview.mailTitle")
        : t("formatEditor.preview.title"),
);

// Compact, mode-aware hint. Mail = HTML-native transport, Olvid renders
// markup only. The tooltip lives on the header so users learn the rule
// without cluttering the preview with an inline note.
const headerHint = computed(() =>
    props.mode === BundleOutputType.Mail
        ? t("formatEditor.preview.mailHint")
        : t("formatEditor.preview.olvidHint"),
);
</script>

<template>
  <div class="preview-column">

    <div class="chat-header">
      <OlvidLogo v-if="mode === BundleOutputType.Olvid"/>
      <LucideMail v-else/>

      {{ headerTitle }}
      <HelpTooltip :message="headerHint"/>
    </div>
    <OlvidChatPreview v-if="mode === BundleOutputType.Olvid" :data="data"/>
    <MailPreview
        v-else-if="mode === BundleOutputType.Mail"
        :data="data"
        :from="mailFrom"
        :to="mailTo"
        :subject="mailSubject"
    />
  </div>
</template>

<style scoped>
.preview-column {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-card-soft);
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.chat-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-4) 0;
  gap: var(--space-4);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--color-text-dim);
  background: var(--color-bg-panel);
  border-bottom: 1px solid var(--color-border-subtle);
}

.chat-header:deep(svg) {
  width: 18px;
  height: 18px;
  color: var(--color-text-faint);
}
</style>
