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
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";

/**
 Pill-style segmented control for the Basic / Advanced schedule mode.
 Pure UI — no state, no policy. Dynamic width calculations support translation variations.
 */

const props = defineProps<{
  modelValue: "basic" | "advanced";
}>();

defineEmits<{
  (e: "update:modelValue", v: "basic" | "advanced"): void;
}>();

// Template refs and reactive style state for the moving pill
const containerRef = ref<HTMLElement | null>(null);
const sliderStyle = ref({
  width: "0px",
  transform: "translateX(0px)",
});

// Measures the active button and updates the background pill's size/position
const updateSlider = async () => {
  await nextTick(); // Wait for DOM/class changes to apply
  if (!containerRef.value) return;

  const activeBtn = containerRef.value.querySelector(
      ".mode-btn.is-active",
  ) as HTMLElement;
  if (activeBtn) {
    sliderStyle.value = {
      width: `${activeBtn.offsetWidth}px`,
      transform: `translateX(${activeBtn.offsetLeft}px)`,
    };
  }
};

// Watch for manual value toggles
watch(() => props.modelValue, updateSlider);

// Use ResizeObserver to recalculate if fonts load late, text translates, or screen resizes
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateSlider();
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateSlider);
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div ref="containerRef" class="mode-toggle" role="tablist">
    <div class="slider-bg" :style="sliderStyle" aria-hidden="true"/>

    <button
        type="button"
        role="tab"
        class="mode-btn"
        :class="{ 'is-active': modelValue === 'basic' }"
        :aria-selected="modelValue === 'basic'"
        @click="$emit('update:modelValue', 'basic')"
    >
      {{ $t("editor.schedule.mode.basic") }}
    </button>
    <button
        type="button"
        role="tab"
        class="mode-btn"
        :class="{ 'is-active': modelValue === 'advanced' }"
        :aria-selected="modelValue === 'advanced'"
        @click="$emit('update:modelValue', 'advanced')"
    >
      {{ $t("editor.schedule.mode.advanced") }}
    </button>
  </div>
</template>

<style scoped>
.mode-toggle {
  position: relative;
  display: inline-flex;
  padding: 2px;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-subtle);
  border-radius: 9999px;
  gap: 4px; /* Restored gap since buttons are content-driven now */
}

/* The sliding pill background */
.slider-bg {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0; /* Base position starts at 0; offset is handled via translateX */
  background: var(--color-accent);
  border-radius: 9999px;
  /* Animates both position and width simultaneously for a fluid "stretching" effect */
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
  width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.mode-btn {
  position: relative;
  z-index: 1; /* Ensures text renders cleanly on top of the slider background */
  appearance: none;
  border: none;
  background: transparent;
  color: var(--color-text-dim);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 3px var(--space-3);
  border-radius: 9999px;
  cursor: pointer;
  white-space: nowrap; /* Prevents awkward translation text-wrapping */
  transition: color 0.15s ease;
}

.mode-btn:hover:not(.is-active) {
  color: var(--color-text-secondary);
}

.mode-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-accent-soft);
}

.mode-btn.is-active {
  color: var(--color-text-on-accent);
}
</style>
