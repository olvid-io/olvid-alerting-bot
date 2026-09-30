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
import JsonTreeNode from "~/components/alert-wizard/payload/JsonTreeNode.vue";
import XmlTreeNode from "~/components/alert-wizard/payload/XmlTreeNode.vue";
import { PollingFormat } from "#shared/types/polling.ts";

/**
 "Pick from source" modal — shows the parsed source snapshot as a
 clickable tree so the user picks watched paths visually instead of
 typing them.

 Owns UI concerns only:
 - Header
 - Body (loading / error / empty / tree — matches the four states that useSourceRetrieve can be in).
 - Footer (selected count + Done button).

 Path selection is driven by the parent through `select` events. The
 modal itself is stateless.
 */

defineProps<{
  open: boolean;
  url?: string;
  format?: string;
  loading: boolean;
  error: string;
  retrieved: boolean;
  rootEntries: Array<[string, any]>;
  /** Concrete paths (wildcards extended) currently in the watched-fields list. Passed to the
   *  tree so already-watched leaves render highlighted. */
  effectivePaths: string[];
}>();

const emit = defineEmits<{
  close: [],
  refresh: [],
  select: [path: string]
}>();
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <div class="overlay-box picker-modal">
      <div class="picker-head">
        <h4>{{ $t("conditionEditor.picker.title") }}</h4>
        <button
            type="button"
            class="picker-close"
            :title="$t('conditionEditor.picker.closeTitle')"
            @click="emit('close')"
        >
          <LucideX :stroke-width="2"/>
        </button>
      </div>

      <div class="picker-body">
        <div class="code-block source-block">
          <div class="code-header">
            <span class="dot dot-red"/><span class="dot dot-yellow"/><span
              class="dot dot-green"
          />
            <span class="code-title"
            >source.{{ (format ?? "xml").toLowerCase() }}</span
            >
            <span class="code-url" :title="url">{{ url }}</span>
            <button
                type="button"
                class="btn-refresh"
                :disabled="loading"
                :title="$t('conditionEditor.picker.refreshTitle')"
                @click="emit('refresh')"
            >
              {{ loading ? "…" : "⟳" }}
            </button>
          </div>
          <div class="code-body tree-body">
            <div v-if="loading" class="muted">
              {{ $t("conditionEditor.picker.fetching", { url }) }}
            </div>

            <div v-else-if="error" class="source-error">
              <div class="error-head">
                {{ $t("conditionEditor.errors.couldNotRetrieveTitle") }}
              </div>
              <pre class="error-body">{{ error }}</pre>
              <p class="error-hint">
                {{ $t("conditionEditor.errors.couldNotRetrieveHint") }}
              </p>
            </div>

            <div v-else-if="!retrieved" class="muted">
              {{ $t("conditionEditor.picker.waiting") }}
            </div>
            <div v-else-if="rootEntries.length === 0" class="muted">
              {{ $t("conditionEditor.picker.empty") }}
            </div>

            <template v-else>
              <!-- Pick the tree renderer that matches the source format: -->
              <component
                  :is="(format ?? '') === PollingFormat.JSON ? JsonTreeNode : XmlTreeNode"
                  v-for="[k, v] in rootEntries"
                  :key="k"
                  :node-name="k"
                  :node-value="v"
                  :path="k"
                  :selected="effectivePaths"
                  @select="emit('select', $event)"
              />
            </template>
          </div>
        </div>
      </div>

      <div class="picker-foot">
        <span class="picker-count">
          {{
            effectivePaths.length === 1
                ? $t("conditionEditor.picker.fieldsSelected", {
                  n: effectivePaths.length,
                })
                : $t("conditionEditor.picker.fieldsSelectedPlural", {
                  n: effectivePaths.length,
                })
          }}
        </span>
        <button type="button" class="btn btn-primary" @click="emit('close')">
          {{ $t("conditionEditor.picker.doneButton") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal chrome — the Mac-style code-block frame comes from the global
 * stylesheet; per-modal tweaks live here. */

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.overlay-box {
  background: var(--color-bg-panel);
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.picker-modal {
  width: 90vw;
  max-width: 760px;
  max-height: 85vh;
  padding: 0;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border-subtle);
}

.picker-head h4 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-text-primary);
}

.picker-close {
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-size: var(--text-lg);
  cursor: pointer;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
}

.picker-close:hover {
  color: var(--color-text-primary);
  background: var(--color-border-subtle);
}

.picker-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
}

.picker-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border-subtle);
}

.picker-count {
  color: var(--color-text-muted);
  font-size: var(--text-s);
  font-variant-numeric: tabular-nums;
}

/* ── Source code-block header extras ────────────────────────────────── */
.code-url {
  margin-left: var(--space-3);
  flex: 1;
  min-width: 0;
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: var(--text-s);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-refresh {
  background: transparent;
  border: 1px solid #444;
  color: #a3a3a3;
  width: 26px;
  height: 22px;
  border-radius: var(--radius-sm);
  font-size: var(--text-lg);
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s,
  border-color 0.15s,
  color 0.15s;
  flex-shrink: 0;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--color-bg-code-header);
  color: var(--color-text-primary);
  border-color: #666;
}

.btn-refresh:disabled {
  opacity: 0.4;
  cursor: wait;
}

/* ── Source body callouts ──────────────────────────────────────────── */
.tree-body {
  background: var(--color-bg-code);
  padding: var(--space-3) var(--space-8);
  min-height: 220px;
  max-height: 55vh;
  overflow: auto;
}

.muted {
  color: var(--color-text-dim);
  font-size: var(--text-m);
  line-height: 1.5;
  font-family: var(--font-mono);
}

.source-error {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-lg);
  color: var(--color-danger-bright);
}

.error-head {
  font-weight: 700;
  font-size: var(--text-base);
  color: var(--color-danger-text);
}

.error-body {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  background: #0a0a0a;
  border-radius: var(--radius-sm);
  color: var(--color-danger-bright);
  font-family: var(--font-mono);
  font-size: var(--text-s);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-s);
}
</style>
