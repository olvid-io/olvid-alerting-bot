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
 Top-nav account button. Trigger shows the user's short name (name if
 set, else login); clicking opens a dropdown with:
 · Session identity (name + login + email if present)
 · Logout button

 Mirrors LanguageToggle: same trigger style class (nav-toggle), same
 positioned dropdown, same click-outside + Escape handling. Rendered
 only when the parent has a session — the logged-out variant of the
 nav shows a plain "Login" button instead.
 */

const emit = defineEmits<{ (e: "logout"): void }>();

const { t } = useI18n();
const { user } = useUserSession();
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

// Prefer name → login → "Account". Kept short so the trigger doesn't
// stretch the nav bar for users with long email addresses.
const displayName = computed(
    () => user.value?.name || user.value?.login || t("accountMenu.account"),
);

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function onLogout() {
  close();
  emit("logout");
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    close();
  }
}

function onEscape(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("click", onClickOutside);
  document.addEventListener("keydown", onEscape);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onClickOutside);
  document.removeEventListener("keydown", onEscape);
});
</script>

<template>
  <ClientOnly>
    <div v-if="user" ref="containerRef" class="account-wrap">
      <button
          type="button"
          class="nav-toggle"
          :class="{ open: isOpen }"
          :aria-haspopup="true"
          :aria-expanded="isOpen"
          :title="$t('accountMenu.account')"
          @click="toggle"
      >
        <LucideUser :stroke-width="2"/>
        <span class="account-name">{{ displayName }}</span>
        <span class="chevron" :class="{ open: isOpen }" aria-hidden="true">▾</span>
      </button>

      <div v-if="isOpen" class="account-dropdown" role="menu">
        <div class="account-info" role="presentation">
          <div v-if="user.name" class="info-name">{{ user.name }}</div>
          <div class="info-line">
            <span class="info-label">{{ $t("accountMenu.login") }}</span>
            <span class="info-value">{{ user.login }}</span>
          </div>
          <!--div v-if="user.email" class="info-line">
            <span class="info-label">{{ $t("accountMenu.email") }}</span>
            <span class="info-value">{{ user.email }}</span>
          </div-->
          <div class="info-line">
            <span class="info-label">{{ $t("accountMenu.role") }}</span>
            <span class="info-value">{{ user.role }}</span>
          </div>
        </div>

        <div class="account-actions">
          <button
              type="button"
              class="account-item account-item--danger"
              role="menuitem"
              @click="onLogout"
          >
            {{ $t("accountMenu.logout") }}
          </button>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.account-wrap {
  position: relative;
  display: inline-block;
}

.account-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.account-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 240px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: 200;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
}

.info-name {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: var(--text-m);
  margin-bottom: var(--space-1);
}

.info-line {
  display: flex;
  gap: var(--space-2);
  font-size: var(--text-s);
}

.info-label {
  color: var(--color-text-muted);
  width: 44px;
  flex-shrink: 0;
}

.info-value {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-actions {
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-2);
  display: flex;
  flex-direction: column;
}

.account-item {
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

.account-item:hover {
  background: var(--color-bg-card-soft);
  color: var(--color-text-primary);
}

.account-item--danger {
  color: var(--color-danger, #b91c1c);
}

.account-item--danger:hover {
  background: var(--color-danger-soft, rgba(185, 28, 28, 0.08));
  color: var(--color-danger, #b91c1c);
}
</style>
