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
 * Authentication mode selector for login page.
 * model value is either "olvid" or "password", depending on choice made by user.
 */

const value = defineModel<"olvid" | "password">();

</script>

<template>
  <div class="mode-selector-container">
    <button
        class="mode-selector-button"
        :class="value === 'olvid' ? 'active' : null"
        @click="value = 'olvid'"
    >
      <span class="mode-selector-icon"><OlvidLogo/></span>
      {{ $t('auth.login.olvid') }}
    </button>
    <button
        class="mode-selector-button"
        :class="value === 'password' ? 'active' : null"
        @click="value = 'password'"
    >
      <LucideKeyRound/>
      {{ $t('auth.login.password') }}
    </button>


  </div>
</template>

<style scoped>
.mode-selector-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: var(--space-2);
}

.mode-selector-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  background: transparent;
  transition: background-color 0.15s,
  border-color 0.15s,
  color 0.15s;
}

.mode-selector-button.active {
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-color: var(--color-accent);
  color: var(--color-text-primary);
}

.mode-selector-icon {
  width: 12px;
  height: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}


</style>