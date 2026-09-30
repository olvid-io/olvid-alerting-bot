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
import type { ResetChannel } from "#shared/types/auth";

/**
 * Login component used in login page. Manages password reset form and actions.
 * forgotChannel will indicate on which channel the reset link will be sent (Olvid / Mail)
 */

const props = defineProps<{
  forgotChannel: ResetChannel | null;
  forgotBusy: boolean;
  forgotError: string | null;
}>();

defineEmits<{
  backToLogin: [],
  requestReset: []
}>();

const login = defineModel<string>({ required: true });


/* The server always resolves to `channel: "none"` to avoid leaking whether
the login exists or which channel it's bound to. The UI therefore shows
a single generic "if we know you, we've sent something" message once the
request completes — no branching by channel. */
const forgotMessage = computed(() =>
    props.forgotChannel ? $t("auth.login.resetSubmitted") : "",
);

const forgotOutcomeKind = computed<"success" | "warning" | null>(() =>
    props.forgotChannel ? "success" : null,
);
</script>

<template>
  <div class="login-form-container">
    <span class="login-title">{{ $t("auth.login.forgotTitle") }}</span>
    <form class="login-form" @submit.prevent="$emit('requestReset')">
      <label class="field-label" for="login">{{ $t("auth.login.identifierUsername") }}</label>
      <input
          id="login"
          v-model="login"

          class="field-input"
          :placeholder="$t('auth.login.identifierUsername')"
          :disabled="forgotBusy"
          required
      >

      <button
          v-if="!forgotChannel"
          type="submit"
          class="btn btn-primary login-form-submit"
          :disabled="!login || forgotBusy"
      >
        {{ $t("auth.login.forgotSubmit") }}
      </button>

    </form>

    <div
        v-if="forgotOutcomeKind"
        class="login-olvid-info"
        :class="{
          'sent': forgotOutcomeKind === 'success',
          'warning': forgotOutcomeKind === 'warning',
        }"
    >
      {{ forgotMessage }}
    </div>
    <button type="button" class="link-btn" @click="$emit('backToLogin')">
      {{ $t("auth.login.forgotBackToLogin") }}
    </button>


  </div>
</template>

<style scoped>
.login-olvid-info {
  margin-top: var(--space-3);
}

.link-btn {
  margin-top: var(--space-2);
}

.warning {
  color: var(--color-warning-text);
  background-color: var(--color-warning-soft);
}
</style>