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

defineProps<{
  photoDataUrl?: string;
  displayName?: string;
  identityConnected: boolean;
  user: User | null;
}>();

defineEmits<{
  logout: [],
  goLogin: [],
  list: []
}>()

</script>

<template>
  <header class="top-nav">
    <div class="nav-content">
      <div class="bot-identity">

        <img v-if="photoDataUrl" :src="photoDataUrl" class="bot-identity-photo" :alt="$t('topNav.photoAlt')">
        <div v-else class="bot-identity-photo-placeholder"/>

        <div>
          <span class="bot-identity-label">{{ displayName ?? $t('topNav.nameAlt') }}</span>

          <span v-if="identityConnected" class="daemon-status">
              <span class="log-dot dot-success"/><span class="bot-identity-title">{{ $t("topNav.daemonIsUp") }}</span>
            </span>
          <span v-else class="daemon-status">
              <span class="log-dot dot-error"/><span class="bot-identity-title">{{ $t("topNav.daemonIsDown") }}</span>
            </span>
        </div>
      </div>

      <div class="brand" @click="$emit('list')">
          <span class="logo-text">
              <img
                  src="../assets/olvid_name_logo.png"
                  alt="Olvid"
                  class="olvid-logo-img"
              >
              Alerting
          </span>
      </div>

      <div class="nav-actions">
        <ThemeToggle/>
        <LanguageToggle/>

        <!-- Signed in → account dropdown with session info + logout.
             Signed out → plain login shortcut. -->
        <AccountMenu v-if="user" @logout="$emit('logout')"/>
        <button v-else class="nav-toggle" @click="$emit('goLogin')">
          <LucideUser :stroke-width="2"/>
          {{ $t("topNav.login") }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  background-color: var(--color-bg-nav);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
  z-index: 100;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.nav-content {
  width: 100%;
  padding: 10px 24px 10px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 12px;
  color: var(--color-accent);
  font-weight: bold;
}

.logo-text img {
  height: 35px;
}

/* Identity container
 */
.bot-identity {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bot-identity div {
  display: flex;
  flex-direction: column;

}

.bot-identity-photo {
  border-radius: 50%;
  width: 40px;
  font-size: var(--text-xs);
}

.bot-identity-photo-placeholder {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  background-color: var(--color-accent-soft);
  border: 2px solid var(--color-accent);
}

.bot-identity-label {
  font-size: var(--text-lg);
}

.daemon-status {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.log-dot {
  width: 10px;
  height: 10px;
}

.bot-identity-title {
  color: var(--color-text-muted);
  font-size: var(--text-m);
}

/* Logo is a fixed-colour PNG — under the mildly-lit dark navbar it
 * blends in. Pin it against a small dark surface so it reads with
 * proper contrast. In light mode the nav is already dark enough
 * against the logo, so we clear the surface. */
.olvid-logo-img {
  width: 120px;
  height: auto;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.2);
  padding: 0;
  border-radius: var(--radius-sm);
  /* Soft dark halo — spreads the tint past the image rectangle so
   * the edge feathers into the nav instead of showing a hard border. */
  box-shadow: 0 0 10px 6px rgba(0, 0, 0, 0.2);
}

:root[data-theme="light"] .olvid-logo-img {
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>