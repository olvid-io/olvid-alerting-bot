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
import type { CredentialsForm } from "#shared/types/auth";

/**
 * Login component used in login page. Manages form field for password and Olvid login.
 */

defineProps<{
  resendButton: boolean;
  resent: boolean;
  error: string | null;
  olvidSent: boolean;
}>();

defineEmits<{
  login: [mode: "olvid" | "password"],
  resend: [],
  openForgot: []
}>();

const loginMode = ref<"password" | "olvid">("olvid");
const credentials = defineModel<CredentialsForm>({ required: true });

</script>

<template>
  <div class="login-form-container">
    <span class="login-title">{{ $t("auth.login.title") }}</span>
    <LoginModeSelector v-model="loginMode"/>

    <div v-if='error' class="login-olvid-info error login-box-top">
      {{ error }}
    </div>

    <div v-if='olvidSent' class="login-olvid-info sent login-box-top">
      {{ $t("") }}
    </div>

    <!-- Login Form -->
    <form class="login-form" @submit.prevent="$emit('login',loginMode)">
      <div>
        <label class="field-label" for="login">{{ $t("auth.login.identifierUsername") }}</label>
        <input
            id="login"
            v-model="credentials.login"

            class="field-input"
            :placeholder="$t('auth.login.identifierUsername')"
            required
        >
      </div>

      <!-- Password method only -->
      <div v-if="loginMode === 'password'" class="login-form sub-login-form">
        <div>
          <label class="field-label" for="password">{{ $t("auth.login.password") }}</label>
          <input
              id="password"
              v-model="credentials.password"
              type="password"
              class="field-input"
              :placeholder="$t('auth.login.password')"
              required
          >
        </div>
        <button type="submit" class="btn btn-primary login-form-submit">{{ $t("auth.login.submit") }}</button>

        <p v-if="resendButton" class="msg">
          <button type="button" class="link-btn" @click="$emit('resend')">
            {{ $t("auth.login.resendVerification") }}
          </button>
        </p>
        <p v-if="resent" class="msg">{{ $t("auth.login.verificationSent") }}</p>


        <button type="button" class="link-btn" @click="$emit('openForgot')">
          {{ $t("auth.login.forgot") }}
        </button>
      </div>

      <!-- Olvid Only-->
      <div v-else class="login-form sub-login-form">
        <div class="login-olvid-info">
          {{ $t("auth.login.olvidParagraph") }}
        </div>
        <button type="submit" class="btn btn-primary login-form-submit">{{ $t("auth.login.submit") }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>

</style>