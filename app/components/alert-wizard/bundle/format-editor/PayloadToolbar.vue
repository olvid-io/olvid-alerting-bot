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
defineProps<{
  loadOpen: boolean;
}>();

defineEmits<{
  toggleLoad: [],
  togglePicker: [],
  prettify: [],
  clear: []
}>();

</script>

<template>
  <div class="payload-toolbar">
    <button
        type="button"
        class="code-toggle-btn code-toggle-btn-wide"
        :class="{ 'is-open': loadOpen }"
        :aria-expanded="loadOpen"
        :title="$t('formatEditor.toolbar.loadTemplateTitle')"
        @click="$emit('toggleLoad')"
    >
      <span>{{ $t('formatEditor.toolbar.loadTemplate') }}</span>
      <span class="caret" aria-hidden="true"/>
    </button>
    <span class="toolbar-divider" aria-hidden="true"/>
    <button
        class="code-toggle-btn"
        :title="$t('formatEditor.toolbar.pickerMode')"
        :aria-label="$t('formatEditor.toolbar.pickerMode')"
        @click="$emit('togglePicker')"
    >
      <LucidePipette :stroke-width="2" class="toolbar-icon"/>
    </button>
    <button
        class="code-toggle-btn"
        :title="$t('formatEditor.toolbar.prettify')"
        :aria-label="$t('formatEditor.toolbar.prettify')"
        @click="$emit('prettify')"
    >
      { }
    </button>
    <button
        class="code-toggle-btn"
        :title="$t('formatEditor.toolbar.clear')"
        @click="$emit('clear')"
    >
      {{ $t('formatEditor.toolbar.clear') }}
    </button>
  </div>
</template>

<style scoped>
.payload-toolbar {
  display: flex;
  gap: var(--space-3);
  margin-left: auto;
  align-items: center;
}

.toolbar-icon {
  width: 14px;
  height: 14px;
  display: block;
}
</style>
