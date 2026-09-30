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
import { LucideSquareMousePointer } from '@lucide/vue';

/**
 Watched-fields section of the polling ConditionEditor:

 - Header    → label + hint + Type-path / Pick-from-source buttons.
 - Chips row → one chip per configured path (with a × remove) plus
 the inline "typing a new path" chip when active.
 - Empty     → italic placeholder when there are no chips yet.

 Owns: local `useWatchedPathInput` state for the inline typing UX.
 Delegates to parent for the actual chip list mutations.
 */

const props = defineProps<{
  paths: string[];
  effectiveCount: number;
  /** Parsed source snapshot — used to validate typed paths. Optional. */
  parsed: unknown;
}>();

const emit = defineEmits<{
  addPath: [path: string],
  removePath: [path: string],
  openPicker: []
}>();

const {
  isAdding,
  newPath,
  addError,
  inputRef,
  startAdding,
  commitAdd,
  cancelAdd,
} = useWatchedPathInput(
    () => props.paths,
    () => props.parsed,
    (v) => emit("addPath", v),
);

const { t } = useI18n();
const watchedFieldsHint = t("conditionEditor.watchedFields.hint");
</script>

<template>
  <div class="rule-row">
    <!-- Header row — label + hint on the left, action buttons on the
         right. Buttons stay in a fixed slot regardless of chip count. -->
    <div class="watched-head">
      <div class="watched-meta">
        <span class="rule-label">
          {{ $t("conditionEditor.watchedFields.label") }}
          <span class="rule-count">({{ effectiveCount }})</span>
          <HelpTooltip :message="watchedFieldsHint"/>
        </span>
        <!-- Hint has two code-styled snippets — kept as one translatable
             string via i18n-t children. -->
        <p class="rule-hint"/>
      </div>

      <div class="watched-actions">
        <button type="button" class="btn btn-ghost btn-sm" @click="startAdding">
          <LucidePencil class="icon"/>
          {{ $t("conditionEditor.watchedFields.typePath") }}
        </button>
        <button
            type="button"
            class="btn btn-ghost btn-sm"
            @click="emit('openPicker')"
        >
          <LucideSquareMousePointer class="icon"/>
          {{ $t("conditionEditor.watchedFields.pickFromSource") }}
        </button>
      </div>
    </div>

    <p v-if="addError" class="add-error">⚠ {{ addError }}</p>

    <!-- Chips row hosts the watched paths AND the inline typing input
         when active — the input behaves like a "chip in progress". -->
    <div v-if="paths.length > 0 || isAdding" class="chips">
      <span v-for="p in paths" :key="p" class="chip">
        
        <span class="chip-path">{{ p }}</span>
        <button type="button" class="chip-x" @click="emit('removePath', p)">
          ×
        </button>
      </span>

      <span
          v-if="isAdding"
          class="chip-input-wrap"
          :class="{ 'has-error': addError }"
      >
        <input
            ref="inputRef"
            v-model="newPath"
            type="text"
            class="chip-input"
            :placeholder="$t('conditionEditor.watchedFields.inputPlaceholder')"
            @keydown.enter.prevent="commitAdd"
            @keydown.escape="cancelAdd"
        >
        <button
            type="button"
            class="chip-input-done"
            :title="$t('conditionEditor.watchedFields.inputDone')"
            @click="commitAdd"
        >
          ✓
        </button>
        <button
            type="button"
            class="chip-input-cancel"
            :title="$t('conditionEditor.watchedFields.inputCancel')"
            @click="cancelAdd"
        >
          <LucideX :stroke-width="2"/>
        </button>
      </span>
    </div>
    <p v-else class="chips-empty">
      {{ $t("conditionEditor.watchedFields.emptyChips") }}
    </p>
  </div>
</template>

<style scoped>
.rule-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Header row ──────────────────────────────────────────────────── */
.watched-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.watched-meta {
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.watched-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  flex-shrink: 0;
}

.icon {
  font-size: var(--text-s);
}

.rule-label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--color-text-dim);
}

.rule-count {
  color: var(--color-text-faint);
  font-weight: 500;
  margin-left: var(--space-1);
}

.rule-hint {
  margin: 0;
  color: var(--color-text-dim);
  font-size: var(--text-s);
  line-height: 1.5;
}

.rule-hint code {
  color: var(--color-text-secondary);
  background: var(--color-border-subtle);
  padding: 0 4px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.add-error {
  margin: 0;
  color: var(--color-danger-text);
  font-size: var(--text-s);
}

/* ── Chips + inline input ────────────────────────────────────────── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-1) 0;
}

/* Compact monospace chips — reads like a code token, not a fluffy tag.
 * `×` hides until hover to reduce visual noise (git-style). */

.chip:hover {
  border-color: var(--color-border-strong);
}

.chip:hover .chip-x {
  opacity: 1;
}

.chip-x {
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-size: var(--text-m);
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s,
  color 0.15s;
}

.chip-x:hover {
  color: var(--color-danger);
  opacity: 1;
}

.chips-empty {
  margin: 0;
  color: var(--color-text-faint);
  font-size: var(--text-s);
  font-style: italic;
}

.chip-input-wrap {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg-input);
}

.chip-input-wrap.has-error {
  border-color: var(--color-danger-border);
  background: var(--color-danger-soft);
}

.chip-input {

  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-s);
  padding: 4px var(--space-3);
  outline: none;
  min-width: 180px;
}

.chip-input-done,
.chip-input-cancel {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 0 var(--space-2);
  font-size: var(--text-m);
  transition: background-color 0.12s,
  color 0.12s;
}

.chip-input-done:hover {
  background: var(--color-accent-soft);
  color: var(--color-text-primary);
}

.chip-input-cancel:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger-text);
}
</style>
