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
import type { ConditionOutcome } from "#shared/types/testResult.ts";

/**
 * Condition result display in AlertTestRunner
 * @param outcome
 * @param headline Sentence to the right of the badge
 */

defineProps<{
  outcome: ConditionOutcome;
  headline: string;
}>();
</script>

<template>
  <div class="verdict-card" :class="outcome.fired ? 'fired' : 'not-fired'">
    <div class="verdict-row">
      <span class="verdict-badge">
        <span class="verdict-dot" aria-hidden="true"/>
        <span v-if="outcome.fired">{{ $t("testVerdict.fired") }}</span>
        <span v-else>{{ $t("testVerdict.notFired") }}</span>
      </span>
      <span class="verdict-headline">{{ headline }}</span>
    </div>
    <p v-if="outcome.reason" class="verdict-reason">{{ outcome.reason }}</p>
  </div>
</template>

<style scoped>
.verdict-card {
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-bg-card-soft);
  border: 1px solid var(--color-border-subtle);
  border-left-width: 4px;
}

.verdict-card.fired {
  border-left-color: var(--color-success);
  background: var(--color-success-soft);
}

.verdict-card.not-fired {
  border-left-color: var(--color-text-dim);
}

.verdict-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.verdict-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 1.5px;
  padding: 4px var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid currentColor;
  flex-shrink: 0;
}

.verdict-card.fired .verdict-badge {
  color: var(--color-success);
}

.verdict-card.not-fired .verdict-badge {
  color: var(--color-text-dim);
}

.verdict-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.verdict-headline {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
  min-width: 0;
}

.verdict-reason {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-s);
  line-height: 1.5;
}
</style>
