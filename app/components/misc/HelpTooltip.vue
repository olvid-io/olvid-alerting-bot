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
 * Help bubble that reveals an explanatory message on hover of the "?" icon.
 */

defineProps<{ message: string }>();

const show = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const bubbleRef = ref<HTMLElement | null>(null);
const style = ref<Record<string, string>>({});
const placement = ref<"right" | "left">("right");
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const MARGIN = 8; // px min distance from viewport edge

function computePlacement() {
  const trig = triggerRef.value?.getBoundingClientRect();
  const bub = bubbleRef.value?.getBoundingClientRect();
  if (!trig || !bub) return;

  const vw = window.innerWidth;

  // The notch corner sits at (approximately) the icon's opposite-side
  // vertical middle, so it points down toward the "?" icon.
  const notchY = trig.top + trig.height / 2;

  // Horizontal side: prefer right of the trigger; flip left if the bubble
  // wouldn't fit on the right.
  const rightFits = trig.right + bub.width <= vw - MARGIN;
  const side: "right" | "left" = rightFits ? "right" : "left";
  const rawLeft =
      side === "right" ? trig.right - 2 : trig.left - bub.width + 2;

  // Vertical: bubble bottom sits at the notch line, so the corner is
  // exactly where the point should meet the icon. Clamped to viewport.
  const rawTop = notchY - bub.height;

  placement.value = side;
  style.value = {
    left: `${Math.max(MARGIN, Math.min(rawLeft, vw - bub.width - MARGIN))}px`,
    top: `${Math.max(MARGIN, rawTop)}px`,
  };
}

function open() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  show.value = true;
  // Bubble needs to be in the DOM to be measured — wait one tick.
  nextTick(computePlacement);
}

function scheduleClose() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    show.value = false;
    hideTimer = null;
  }, 120);
}

// Keep placement fresh while the bubble is open. `scroll` uses capture so
// any scrolling ancestor triggers a recompute, not just window.
function onWindowChange() {
  if (show.value) computePlacement();
}

onMounted(() => {
  window.addEventListener("resize", onWindowChange);
  window.addEventListener("scroll", onWindowChange, true);
});
onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer);
  window.removeEventListener("resize", onWindowChange);
  window.removeEventListener("scroll", onWindowChange, true);
});
</script>

<template>
  <span
      ref="triggerRef"
      class="tooltip-container"
      tabindex="0"
      role="button"
      :aria-label="message"
      @mouseenter="open"
      @mouseleave="scheduleClose"
      @focusin="open"
      @focusout="scheduleClose"
  >
    <span class="help-tooltip-icon" aria-hidden="true">?</span>

    <Teleport to="body">
      <span
          ref="bubbleRef"
          class="tooltip-bubble"
          :class="[{ 'is-visible': show }, `is-${placement}`]"
          :style="style"
          role="tooltip"
          @mouseenter="open"
          @mouseleave="scheduleClose"
      >
        {{ message }}
      </span>
    </Teleport>
  </span>
</template>

<style scoped>
.tooltip-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;

  margin-left: var(--space-2);
  cursor: help;
  font-size: 11px;
  outline: none;
}

.tooltip-container:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 50%;
}

.help-tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 1px;
  padding-left: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;

  background-color: var(--color-accent-soft);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);

  font-family: var(--font-sans);
  font-size: 8px;
  font-weight: 500;
  line-height: 1;

  text-align: center;
}
</style>

<!-- The bubble is teleported to <body>; scoped styles wouldn't reach it,
     so its styling lives in an unscoped block below. -->
<style>
.tooltip-bubble {
  position: fixed;
  z-index: 1000;

  background-color: color-mix(in srgb, var(--color-accent-soft) 60%, transparent);
  color: var(--color-accent-text);

  border: 1px solid var(--color-accent-border);
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: normal;
  text-transform: none;

  /* Wrap long copy instead of stretching off-screen. */
  max-width: min(420px, calc(100vw - 24px));
  white-space: normal;
  word-wrap: break-word;

  box-shadow: 3px 4px 6px -1px rgb(0 0 0 / 0.1),
  1px 2px 4px -2px rgb(0 0 0 / 0.3);

  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(4px);

  transition: opacity 0.15s ease,
  transform 0.2s ease,
  visibility 0s linear 0.15s;
}

/* Notch corner always at the BOTTOM edge on the icon-facing side, so the
 * point drops down toward the "?" icon. CSS shorthand order is top-left,
 * top-right, bottom-right, bottom-left. */
.tooltip-bubble.is-right {
  border-radius: 16px 16px 16px 0;
}

.tooltip-bubble.is-left {
  border-radius: 16px 16px 0 16px;
}

.tooltip-bubble.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
  transition: opacity 0.15s ease,
  transform 0.2s ease,
  visibility 0s linear 0s;
}
</style>
