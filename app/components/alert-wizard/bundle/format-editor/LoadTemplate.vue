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
import { webhookTemplateList } from "#shared/payloadTemplates";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "select-last", type: "success" | "failed"): void;
  (e: "select-template", id: string): void;
  (e: "close"): void;
}>();

const pick = (type: "success" | "failed") => {
  emit("select-last", type);
  emit("close");
};
const pickTemplate = (id: string) => {
  emit("select-template", id);
  emit("close");
};
</script>

<template>
  <Modal
      :open="open"
      size="compact"
      :aria-label="$t('formatEditor.toolbar.loadTemplate')"
      @close="$emit('close')"
  >

    <div class="template-body">

      <h5 class="template-section-label">
        {{ $t("formatEditor.templates.fromDatabase") }}
      </h5>
      <button type="button" class="template-item" @click="pick('success')">
        <span class="status-pip pip-ok" aria-hidden="true"/>
        <span class="template-item-label">
            {{ $t("formatEditor.templates.lastSuccess") }}
          </span>
      </button>
      <button type="button" class="template-item" @click="pick('failed')">
        <span class="status-pip pip-fail" aria-hidden="true"/>
        <span class="template-item-label">
            {{ $t("formatEditor.templates.lastFailed") }}
          </span>
      </button>


      <h5 class="template-section-label">
        {{ $t("formatEditor.templates.fromLibrary") }}
      </h5>
      <button
          v-for="tpl in webhookTemplateList"
          :key="tpl.id"
          type="button"
          class="template-item"
          @click="pickTemplate(tpl.id)"
      >
        <span class="template-item-label">{{ tpl.label }}</span>
      </button>
    </div>
  </Modal>
</template>

<style scoped>
.template-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: var(--space-3) 0;
  background: var(--color-bg-panel);
}

.template-section + .template-section {
  border-top: 1px solid var(--color-border-subtle);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
}

.template-section-label {
  margin: 0;
  padding: var(--space-1) var(--space-6) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.9px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.template-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  text-align: left;
  font-family: inherit;
  font-size: var(--text-base);
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 0.12s ease,
  color 0.12s ease,
  border-color 0.12s ease;
}

.template-item:hover,
.template-item:focus-visible {
  outline: none;
  background: var(--color-bg-card-soft);
  color: var(--color-text-primary);
}

.template-item-label {
  flex: 1;
  min-width: 0;
}

.status-pip {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--color-border-subtle);
}

.pip-ok {
  background: var(--color-success);
}

.pip-fail {
  background: var(--color-danger);
}
</style>
