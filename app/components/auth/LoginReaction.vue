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
 * Login component used in login page. Displays a message when waiting for reaction in Olvid login.
 */

defineProps<{
  //photo: string | null;
  login: string | null;
}>();

</script>

<template>
  <div class="login-form-container">
    <span class="login-title">{{ $t("auth.login.olvidTitle") }}</span>

    <!--
    <div class="login-identity">
      <img :src="photo ?? undefined" alt="User Identity" class="login-identity-photo">
      <span class="login-identity-name">{{ login }}</span>
    </div>
    -->

    <div class="login-olvid-info sent">
      {{ $t("auth.login.olvidSent", { user: login }) }}
    </div>
  </div>
</template>

<style scoped>
.login-identity {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
}

.login-identity-photo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.login-identity-name {
  color: var(--color-text-muted)
}
</style>