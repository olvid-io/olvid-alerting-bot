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
/**
 Per-path verdict breakdown. Style follows `kubectl get` / `git log --oneline`: monospace,
 status glyph left, colour reserved for the status only.

 Previously lived inline in ConditionEditor.vue's #detail slot on the
 shared VerdictStrip; extracted so:
 · VerdictStrip stays a compact "one-liner + status" primitive.
 · This list can be reused from AlertTestRunner's result modal
 without dragging along the strip.

 Structural row type — reads only `path / fired / detail`, so
 polling's `Verdict` and the shared `ConditionFieldBreakdown` from
 the test-result envelope both fit without a cast.
 */

type VerdictRow = { path: string; fired: boolean; detail: string };

defineProps<{
  verdicts: VerdictRow[];
  /** Header shown on the collapsed <summary> line. */
  title: string;
}>();
</script>

<template>
  <details v-if="verdicts.length > 0" class="verdict-breakdown">
    <summary class="verdict-breakdown-summary">
      <LucideChevronRight
          class="chev"
          aria-hidden="true"
      />
      <span class="summary-label">{{ title }}</span>
      <span class="summary-count">{{ verdicts.length }}</span>
    </summary>

    <ul class="verdict-breakdown-list">
      <li
          v-for="v in verdicts"
          :key="v.path"
          class="verdict-row"
          :class="v.fired ? 'ok' : 'no'"
      >
        <span class="verdict-dot" aria-hidden="true">●</span>
        <code class="verdict-path">{{ v.path }}</code>
        <span class="verdict-detail">{{ v.detail }}</span>
      </li>
    </ul>
  </details>
</template>

<style scoped>
.verdict-breakdown {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-card-soft, var(--color-bg-card));
  overflow: hidden;
}

/* Eyebrow header — small caps + subtle chevron that rotates on open,
 * count pill on the right so the user knows how many rows to expect. */
.verdict-breakdown-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  user-select: none;
  color: var(--color-text-dim);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  transition: background-color 0.15s;
}

.verdict-breakdown-summary::-webkit-details-marker,
.verdict-breakdown-summary::marker {
  display: none;
  content: "";
}

.verdict-breakdown-summary:hover {
  background: var(--color-border-subtle);
  color: var(--color-text-secondary);
}

.chev {
  font-size: 10px;
  transition: transform 0.15s;
}

[open] > .verdict-breakdown-summary .chev {
  transform: rotate(90deg);
}

.summary-label {
  flex: 1;
}

.summary-count {
  padding: 1px var(--space-2);
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill, 999px);
  font-size: 11px;
  color: var(--color-text-muted);
  letter-spacing: 0;
}

/* Rows: 3-column grid so the paths align even if the detail text
 * varies in length. Faint separator between rows for scanability. */
.verdict-breakdown-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid var(--color-border-subtle);
}

.verdict-row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  transition: background-color 0.15s;
}

.verdict-row:last-child {
  border-bottom: none;
}

.verdict-row:hover {
  background: var(--color-border-subtle);
}

.verdict-dot {
  font-size: 8px;
  line-height: 1;
  text-align: center;
}

.verdict-row.ok .verdict-dot {
  color: var(--color-success, #22c55e);
}

.verdict-row.no .verdict-dot {
  color: var(--color-text-faint);
}

.verdict-path {
  color: var(--color-text-secondary);
  background: transparent;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Comparison result — colour tells you fired/not without having to
 * parse the operator. */
.verdict-detail {
  color: var(--color-text-dim);
  white-space: nowrap;
}

.verdict-row.ok .verdict-detail {
  color: var(--color-success, #22c55e);
}
</style>
