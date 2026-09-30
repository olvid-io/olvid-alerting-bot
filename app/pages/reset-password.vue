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
import type { ResetPasswordForm } from "#shared/types/auth";
import { PASSWORD_MIN_LEN } from "#shared/types/auth";

/**
 Password-reset landing page. Reached from the URL delivered by
 request-password-reset (via mail or Olvid DM). Mirrors invite.vue:
 - peeks the token via useFetch (auto-cancelling on token change),
 - collects + confirms a new password,
 - submits via authService.resetPassword,
 - lands the user logged in on "/".

 Deliberately shares the AuthCard chrome with invite.vue so the two
 flows read as siblings. Error copy is mapped through useAuthErrors
 with a small local dictionary — same pattern used in invite.vue.
 */

const route = useRoute();
const { t } = useI18n();
const { fetch: refreshSession } = useUserSession();
const { mapAuthError } = useAuthErrors();

useHead({
  title: t("pageTitle.resetPassword"),
})

const resetErrorMap = {
  token_invalid: t("auth.resetPassword.errorTokenInvalid"),
  bad_request: t("auth.resetPassword.errorBadPassword"),
};

const token = computed(() => {
  const t = route.query.token;
  return typeof t === "string" ? t : "";
});

const form = reactive<ResetPasswordForm>({ token: "", password: "" });
const confirmPassword = ref("");
watchEffect(() => (form.token = token.value));

const error = ref<string | null>(null);
const resetInvalid = ref(false);

// Peek at the token to surface which account is being reset. A 400/404
// means the token is invalid / expired / used — surface that up front
// with a dedicated screen so the user doesn't waste time typing a new
// password. Other statuses leave the peek silent.
const { data: resetInfo } = await useFetch<{
  login: string;
  name: string | null;
}>(AUTH_ENDPOINTS.resetInfo, {
  query: { token },
  server: false,
  immediate: true,
  watch: [token],
  onResponseError({ response }) {
    if (response.status === 400 || response.status === 404) {
      resetInvalid.value = true;
    }
  },
});
const resetLogin = computed(() => resetInfo.value?.login ?? null);

async function submit() {
  error.value = null;
  if (!form.token) {
    error.value = t("auth.resetPassword.errorMissingToken");
    return;
  }
  if (form.password.length < PASSWORD_MIN_LEN) {
    error.value = t("auth.resetPassword.errorBadPassword");
    return;
  }
  if (form.password !== confirmPassword.value) {
    error.value = t("auth.resetPassword.errorPasswordsDoNotMatch");
    return;
  }

  try {
    await authService.resetPassword({
      token: form.token,
      password: form.password,
    });
    await refreshSession();
    await navigateTo("/");
  } catch (err) {
    error.value = mapAuthError(
        err,
        resetErrorMap,
        t("auth.resetPassword.errorNetwork"),
    );
  }
}
</script>

<template>
  <AuthCard>
    <template v-if="resetInvalid">
      <h4>{{ $t("auth.resetPassword.invalidTitle") }}</h4>
      <p class="msg msg--error">{{ $t("auth.resetPassword.invalidBody") }}</p>
    </template>
    <template v-else>
      <h4>{{ $t("auth.resetPassword.title") }}</h4>
      <p class="hint">
        <template v-if="resetLogin">
          <i18n-t
              keypath="auth.resetPassword.hintWithLogin"
              tag="span"
          >
            <template #login>
              <strong class="hint-login">{{ resetLogin }}</strong>
            </template>
          </i18n-t>
        </template>
        <template v-else>{{ $t("auth.resetPassword.hint") }}</template>
      </p>

      <form class="reset-form" @submit.prevent="submit">
        <input
            v-model="form.password"
            class="field-input"
            type="password"
            :placeholder="$t('auth.resetPassword.passwordPlaceholder')"
            autocomplete="new-password"
            :minlength="PASSWORD_MIN_LEN"
            required
        >
        <input
            v-model="confirmPassword"
            class="field-input"
            type="password"
            :placeholder="$t('auth.resetPassword.confirmPasswordPlaceholder')"
            autocomplete="new-password"
            :minlength="PASSWORD_MIN_LEN"
            required
        >
        <button type="submit" class="btn btn-primary">
          {{ $t("auth.resetPassword.submit") }}
        </button>
      </form>

      <p v-if="error" class="msg msg--error">{{ error }}</p>
    </template>
  </AuthCard>
</template>

<style scoped>
.reset-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.hint {
  color: var(--color-text-muted);
  font-size: var(--text-s);
  margin-top: var(--space-3);
}

.hint-login {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.msg {
  margin-top: var(--space-3);
  font-size: var(--text-s);
  color: var(--color-text-muted);
}

.msg--error {
  color: var(--color-danger);
}
</style>
