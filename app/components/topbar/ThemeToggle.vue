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
import { ref, onMounted, computed } from "vue";

// Reads / writes the `data-theme` attribute on <html>. The theme.client.ts
// plugin already applied the persisted theme on boot, so this component only
// needs to flip it and persist the new choice.

const current = ref<"dark" | "light">("dark");

onMounted(() => {
  const attr = document.documentElement.getAttribute("data-theme");
  current.value = attr === "light" ? "light" : "dark";
});

function toggle() {
  const next = current.value === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    clientLogger.warn("Theme could not be changed.");
  }
  current.value = next;
}

const isDark = computed(() => {
  return current.value === "dark"
})
</script>

<template>
  <ClientOnly>
    <button
        type="button"
        class="nav-toggle"
        :title="$t('topNav.themeToggle')"
        @click="toggle"
    >
      <LucideMoon v-if="isDark" size="14px"/>
      <LucideSun v-else/>

    </button>
  </ClientOnly>
</template>

<style scoped>

</style>
