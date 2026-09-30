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
import type { TriggerMode } from "#shared/types/triggerMode.ts";

/**
 Segmented pill radio for the three TriggerMode options. Visually
 matches ConditionKindPicker (polling) and the kind-row of
 StatusMatchEditor (monitoring) so the entire trigger step reads as
 one consistent widget family.

 Consumers:
 · FiringBehaviorPanel (both polling + monitoring)

 Two hint variants because polling/monitoring phrase the same three
 modes slightly differently — the composable owns that mapping.
 */

const model = defineModel<TriggerMode>({ required: true });

const props = withDefaults(
    defineProps<{
      /** Which hint set to use — "polling" (default) or "monitoring". */
      variant?: "polling" | "monitoring";
      /** Hide the hint row (e.g. when the caller wants a compact picker). */
      showHint?: boolean;
    }>(),
    { variant: "polling", showHint: true },
);

const { triggerModeOptions, triggerModeHint } = useAlertLabels();
const options = triggerModeOptions(props.variant);

const activeHint = computed(() =>
    triggerModeHint(model.value, props.variant),
);
</script>

<template>
  <div class="trigger-mode">
    <div class="btn-pill-group">
      <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="btn-pill"
          :class="{ active: model === opt.value }"
          @click="model = opt.value"
      >
        <input type="radio" :checked="model === opt.value">
        <span>{{ opt.label }}</span>
      </button>
    </div>
    <p v-if="showHint" class="trigger-mode-hint">{{ activeHint }}</p>
  </div>
</template>

<style scoped>
.trigger-mode {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.trigger-mode-pills {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

/* Same shape as .kind in ConditionKindPicker so the two picker rows
 * line up visually when stacked. Local class name (.pill) to avoid
 * global collisions. */
.pill {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 7px var(--space-4);
  background: var(--color-border-subtle);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  font-size: var(--text-m);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 0.15s,
  border-color 0.15s,
  color 0.15s;
}

.trigger-mode-hint {
  margin: 0;
  color: var(--color-text-dim);
  font-size: var(--text-m);
  line-height: 1.5;
}
</style>
