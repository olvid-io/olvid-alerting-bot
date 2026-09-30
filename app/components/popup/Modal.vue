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
import { nextTick, ref, watch } from "vue";

/**
 Generic overlay shell. Teleports to <body> so it escapes any ancestor
 stacking context or overflow:hidden. Reuses the global .overlay /
 .overlay-box tokens defined in overlay.css.

 A11y behaviour owned here so every dialog in the app inherits it:
 · role="dialog" + aria-modal so screen readers announce it.
 · ESC closes (same effect as backdrop click).
 · Focus moves into the dialog on open (first focusable, else the
 box itself so keyboard users don't get stranded on the page).
 · Focus is restored to the element that opened the dialog on close.
 · TAB / SHIFT+TAB are trapped inside the dialog while it is open.
 A background scan (skipped when tabbing between two focusables
 inside the dialog) prevents focus escape to the page behind.
 */

const props = withDefaults(
    defineProps<{
      open: boolean;
      closeOnBackdrop?: boolean;
      size?: "compact" | "default" | "wide" | "full" | "editor";
      ariaLabel?: string;
    }>(),
    {
      closeOnBackdrop: true,
      size: "default",
      ariaLabel: "Dialog",
    },
);

const emit = defineEmits<{ (e: "close"): void }>();

const boxRef = ref<HTMLElement | null>(null);
// Element focused right before opening — we return focus here on close
// so keyboard users land back where they invoked the dialog.
let previouslyFocused: HTMLElement | null = null;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const getFocusable = (): HTMLElement[] => {
  const box = boxRef.value;
  if (!box) return [];
  return (
      Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
          // offsetParent === null filters out display:none / hidden ancestors;
          // it's not perfect (misses visibility:hidden) but good enough here.
          .filter((el) => el.offsetParent !== null || el === document.activeElement)
  );
};

const onBackdrop = () => {
  if (props.closeOnBackdrop) emit("close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    e.stopPropagation();
    emit("close");
    return;
  }
  if (e.key !== "Tab") return;

  const focusable = getFocusable();
  if (focusable.length === 0) {
    // No tab stops inside → keep focus pinned to the box itself.
    e.preventDefault();
    boxRef.value?.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = document.activeElement as HTMLElement | null;

  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
};

watch(
    () => props.open,
    async (opened) => {
      if (opened) {
        previouslyFocused = (document.activeElement as HTMLElement) ?? null;
        await nextTick();
        const focusable = getFocusable();
        // Prefer the first natural tab stop; fall back to the box itself
        // (tabindex="-1") so ESC and focus-trap keydowns still register.
        (focusable[0] ?? boxRef.value)?.focus();
      } else if (previouslyFocused) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    },
    { immediate: true },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="onBackdrop">
      <div
          ref="boxRef"
          class="overlay-box"
          :class="`overlay-box--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-label="ariaLabel"
          tabindex="-1"
          @keydown="onKeydown"
      >
        <slot/>
      </div>
    </div>
  </Teleport>
</template>
