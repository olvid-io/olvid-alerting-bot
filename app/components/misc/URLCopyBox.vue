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
import { ref } from "vue";

const props = defineProps<{ url: string }>();

/* Brief visual animation on copy
 Clears any in-flight timeout so rapid-fire clicks always restart
 the cycle from "just copied" rather than blinking back mid-pulse.*/
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

function copyUrl() {
  if (!props.url) return;
  navigator.clipboard?.writeText(props.url);
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
  }, 1400);
}
</script>

<template>
  <div class="url-copy-box">
    <!-- readonly input rather than a <code> element so the user can
         click into it, select the whole URL with Ctrl+A, and copy
         with the keyboard even if the button ever fails  :) -->
    <input
        class="url-input"
        type="text"
        readonly
        :value="props.url"
        @focus="($event.target as HTMLInputElement).select()"
    >
    <button
        type="button"
        class="btn-copy"
        :class="{ copied }"
        :title="copied ? $t('urlCopyBox.copiedTitle') : $t('urlCopyBox.copyTitle')"
        @click="copyUrl"
    >
      <span v-if="copied">✓</span>
      <LucideCopy v-else class="clipboard-icon"/>
    </button>
  </div>
</template>

<style scoped>

.url-copy-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 35px;
  width: 100%;
  min-width: 0;
  background: var(--color-bg-code);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}

.url-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;

  background: transparent;
  border: none;
  outline: none;
  padding: 0;

  color: var(--color-text-url);
  font-family: var(--font-mono);
  font-size: var(--text-m);

  text-overflow: clip;
}

.url-input:focus {
  outline: none;
}

.clipboard-icon {
  color: #bebebe;
}

.btn-copy {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  line-height: 1;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color 0.15s,
  background-color 0.15s,
  transform 0.1s;
}

.btn-copy:hover .clipboard-icon {
  color: var(--color-text-url);
}

.btn-copy:active {
  transform: scale(0.88);
}

.btn-copy.copied {
  color: var(--color-success);
  animation: copy-pulse 0.45s ease-out;
}

.btn-copy.copied:hover {
  background: transparent;
}

@keyframes copy-pulse {
  0% {
    transform: scale(0.85);
  }
  50% {
    transform: scale(1.18);
  }
  100% {
    transform: scale(1);
  }
}
</style>
