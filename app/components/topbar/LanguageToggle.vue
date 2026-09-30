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
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

// Mirrors the ThemeToggle pattern: a small bordered button next to it in
// the navbar. Instead of a one-tap toggle (only 2 themes), this opens a
// dropdown of available locales — the i18n module supplies the list and the
// current value, we just present it.
const { locale, locales, setLocale } = useI18n();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

// `locales` may arrive either as a plain array or as a Ref<array> depending
// on the i18n module version — normalize defensively.
const localeList = computed<any[]>(() => {
  const raw: any = (locales as any).value ?? locales;
  return Array.isArray(raw) ? raw : [];
});

const currentLocale = computed(() => {
  return (
      localeList.value.find((l) => l.code === locale.value) ??
      localeList.value[0] ?? { code: "", name: "" }
  );
});

function toggle() {
  isOpen.value = !isOpen.value;
}

async function pick(code: any) {
  if (code !== locale.value) await setLocale(code);
  isOpen.value = false;
}

// Close on click anywhere outside the container — same pattern used by
// the custom Select and DiscussionSelector dropdowns.
function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", onClickOutside));
onBeforeUnmount(() => document.removeEventListener("click", onClickOutside));
</script>

<template>
  <ClientOnly>
    <div ref="containerRef" class="lang-wrap">
      <button
          type="button"
          class="nav-toggle"
          :class="{ open: isOpen }"
          :title="$t('topNav.languageToggle') + ': ' + currentLocale.name"
          :aria-haspopup="true"
          :aria-expanded="isOpen"
          @click="toggle"
      >
        <span class="globe" aria-hidden="true"> 
        <LucideGlobe/></span>
        <span class="lang-name">{{ currentLocale.name }}</span>
        <span class="chevron" :class="{ open: isOpen }" aria-hidden="true"
        >▾</span
        >
      </button>

      <div v-if="isOpen" class="lang-dropdown" role="listbox">
        <button
            v-for="l in localeList"
            :key="l.code"
            type="button"
            class="lang-item"
            :class="{ selected: l.code === locale }"
            role="option"
            :aria-selected="l.code === locale"
            @click="pick(l.code)"
        >
          {{ l.name }}
        </button>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
/* Anchor for the absolutely-positioned dropdown. */
.lang-wrap {
  position: relative;
  display: inline-block;
}

/* Trigger button — matches ThemeToggle visually (same border, height,
 * hover, focus tokens). Width is auto so the language name fits; the
 * fixed-square ThemeToggle approach doesn't apply here. */

/* Dropdown panell — same elevation tokens as the modal Select dropdown
 * elsewhere in the app, so it reads as part of the same UI vocabulary. */
.lang-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 100%;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-1);
  display: flex;
  flex-direction: column;
  z-index: 200;
}

.lang-item {
  background: transparent;
  border: none;
  text-align: left;
  padding: 7px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-m);
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s,
  color 0.15s;
}

.lang-item:hover {
  background: var(--color-bg-card-soft);
  color: var(--color-text-primary);
}

.lang-item.selected {
  background: var(--color-accent-soft);
  color: var(--color-accent-text);
  font-weight: 600;
}

.lang-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.chevron {
  transition: transform 0.15s;

  .open & {
    transform: rotate(180deg);
  }
}
</style>
