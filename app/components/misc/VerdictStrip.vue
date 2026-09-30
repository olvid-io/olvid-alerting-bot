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
/*
  Compact "would fire?" one-liner — status icon + label, coloured by
  the fired/not-fired state. Deliberately closed API (no slots): if
  richer content is needed, render a sibling component (see
  condition/VerdictBreakdown for the polling per-path breakdown).

  Consumers today:
    - ConditionEditor    → paired with a sibling <VerdictBreakdown>
                            when a per-path breakdown is available.
    - StatusMatchEditor  → just the label.

  Icon choice follows GitHub Actions / Datadog convention:
    ok  →  ✓  (circle-check) : condition currently satisfied
    ko  →  ⊘  (circle-info) : condition NOT satisfied / needs attention
*/

defineProps<{
  ok: boolean;
  label: string;
}>();
</script>

<template>
  <div class="verdict-strip" :class="ok ? 'ok' : 'ko'" role="status">
    <LucideCircleCheck
        v-if="ok"
        class="verdict-icon"
        aria-hidden="true"
    />
    <LucideInfo
        v-else
        class="verdict-icon"
        aria-hidden="true"
    />

    <span class="verdict-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.verdict-strip {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-size: var(--text-s);
  line-height: 1.4;
}

.verdict-strip.ok {
  background: color-mix(in srgb, var(--color-success, #22c55e) 8%, transparent);
  border-color: color-mix(
      in srgb,
      var(--color-success, #22c55e) 30%,
      transparent
  );
  color: var(--color-text-primary);
}

.verdict-strip.ko {
  background: var(--color-border-subtle);
  border-color: var(--color-border-default);
  color: var(--color-text-muted);
}

.verdict-icon {
  font-size: var(--text-m);
  flex-shrink: 0;
}

.verdict-strip.ok .verdict-icon {
  color: var(--color-success, #22c55e);
}

.verdict-strip.ko .verdict-icon {
  color: var(--color-text-dim);
}

.verdict-label {
  flex: 1;
  min-width: 0;
}
</style>
