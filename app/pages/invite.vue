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
import type { InviteAcceptIdentity } from "#shared/types/auth";

// Invite acceptance page. Login, name, and role were set by the
// admin at invite time — the only thing the user picks here is a
// password. On success we activate the account, sign the user in,
// and drop them on /.

/**
 * Invite acceptance page.
 * Login, name and role are chosen by the admin at invite creation time.
 * The user has only to pick their authentication methods : password, Olvid or both.
 * On success, account is activated and authentication data stored in database. User is signed in.
 */

const route = useRoute();
const { t } = useI18n();
const { fetch: refreshSession } = useUserSession();
const { mapAuthError } = useAuthErrors();
const acceptErrorMap = {
  token_invalid: t("auth.invite.errorTokenInvalid"),
  bad_request: t("auth.invite.errorBadPassword"),
};

useHead({
  title: t("pageTitle.invite"),
})

const token = computed(() => {
  const t = route.query.token;
  return typeof t === "string" ? t : "";
});

const form = reactive<{ token: string, password: string }>({ token: "", password: "" });

const confirmPassword = ref("");
watchEffect(() => (form.token = token.value));


// Peek at the invite (no side effect) to surface which account the user
// is activating. useFetch handles cancellation when `token` changes, so
// a stale response can't overwrite a newer one. A 400/404 from the
// server means the token is invalid / expired / already used — surface
// that up front instead of only telling the user on submit. Any other
// status (network drop, 5xx) leaves the peek silent so a transient
// failure doesn't imply the invite is dead.
const { data: inviteInfo } = await useFetch<InviteAcceptIdentity>
(AUTH_ENDPOINTS.inviteInfo, {
  query: { token },
  server: false,
  immediate: true,
  watch: [token],
  onResponseError({ response }) {
    if (response.status === 400 || response.status === 404) {
      inviteInvalid.value = true;
    }
  }
});
const invitedLogin = computed(() => inviteInfo.value?.login ?? null);
const hasOlvid = computed(() => inviteInfo.value?.hasOlvid ?? false);
const invitedName = computed(() => inviteInfo.value?.name ?? null);
const invitedPhoto = computed(() => inviteInfo.value?.photo ?? undefined);

const error = ref<string | null>(null);
const inviteInvalid = ref(false);

const useOlvid = ref<boolean>(true);
const usePassword = ref(true);

const validOlvid = computed(() => hasOlvid.value && useOlvid.value);


async function submit() {
  error.value = null;
  if (!form.token) {
    error.value = t("auth.invite.errorMissingToken");
    return;
  }
  if (usePassword.value && form.password !== confirmPassword.value) {
    error.value = t("auth.invite.errorPasswordsDoNotMatch");
    return;
  }
  if (!validOlvid.value && !usePassword.value) {
    error.value = t("auth.invite.errorNoMethod");
  }

  try {
    await authService.acceptInvite({
      token: form.token,
      password: form.password,
      useOlvid: validOlvid.value,
      usePassword: usePassword.value,
    });
    await refreshSession();
    await navigateTo("/");
  } catch (err) {
    // Anything the server explicitly returns (token_invalid /
    // bad_request) has a shaped statusMessage; anything else (fetch
    // failed, 500, offline) collapses into the fallback so the user is
    // told to retry rather than that their invite is dead.
    error.value = mapAuthError(
        err,
        acceptErrorMap,
        t("auth.invite.errorNetwork"),
    );
  }
}
</script>

<template>
  <AuthCard>
    <!-- Invalide invite error container -->
    <template v-if="inviteInvalid">
      <h4>{{ $t("auth.invite.invalidTitle") }}</h4>
      <p class="msg msg--error">{{ $t("auth.invite.invalidBody") }}</p>
    </template>

    <!-- Authentication methods form -->
    <template v-else>
      <h4>{{ $t("auth.invite.title") }}</h4>
      <p class="hint">
        <template v-if="invitedLogin">
          <i18n-t keypath="auth.invite.hintPasswordWithLogin">
            <template #login>
              <strong class="hint-login">{{ invitedLogin }}</strong>
            </template>
          </i18n-t>
        </template>
        <template v-else>{{ $t("auth.invite.hintPassword") }}</template>
      </p>

      <form class="invite-form" @submit.prevent="submit">
        <!-- Olvid method -->
        <div class="invite-form-category">
          <h5>{{ $t("auth.invite.olvidMethod") }}</h5>
          <GeneralToggle
              v-model="useOlvid"
              :can-activate="hasOlvid"
          />
        </div>
        <div v-if="validOlvid" class="invite-form-subform">
          <span class="invite-form-hint">{{ $t("auth.invite.hintOlvidMethod") }}</span>
          <div v-if="invitedName" class="invite-form-identity">
            <img :src="invitedPhoto" class="invite-form-photo" alt="Discussion photo">
            <span class="invite-form-name">{{ invitedName }}</span>
          </div>
          <div v-else class="login-olvid-info error">
            {{ $t("auth.invite.errorIdentityFetch") }}
          </div>
        </div>

        <!-- Password method -->
        <div class="invite-form-category">
          <h5>{{ $t("auth.invite.passwordMethod") }}</h5>
          <GeneralToggle
              v-model="usePassword"
              :can-activate="true"
          />
        </div>
        <div v-if="usePassword" class="invite-form-subform">
          <span class="invite-form-hint">{{ $t("auth.invite.hintPasswordMethod") }}</span>
          <input
              v-model="form.password"
              class="field-input"
              type="password"
              :placeholder="$t('auth.invite.passwordPlaceholder')"
              autocomplete="new-password"
              minlength="8"
              required
          />
          <input
              v-model="confirmPassword"
              class="field-input"
              type="password"
              :placeholder="$t('auth.invite.confirmPasswordPlaceholder')"
              autocomplete="new-password"
              minlength="8"
              required
          />
        </div>

        <button type="submit" class="btn btn-primary" :disabled="!validOlvid && !usePassword">
          {{ $t("auth.invite.submit") }}
        </button>
      </form>
      <p v-if="error" class="msg msg--error">{{ error }}</p>
    </template>
  </AuthCard>
</template>

<style scoped>
.invite-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.invite-form-category {
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  border-bottom: 1px solid var(--color-border-strong);
  padding-bottom: var(--space-3);
  padding-top: var(--space-3);
}

.invite-form-subform {
  display: flex;
  flex-direction: column;

  gap: var(--space-2);
}

.invite-form-identity {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);

  padding-top: var(--space-4);
}

.invite-form-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

h5 {
  margin: 0;
}

.invite-form-hint {
  font-size: var(--text-m);
  color: var(--color-text-muted);
}

.hint {
  color: var(--color-text-muted);
  font-size: var(--text-s);
  font-style: italic;
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
  color: var(--color-danger-strong, var(--color-danger, #b91c1c));
}

.login-olvid-info {
  font-size: var(--text-m);
}
</style>
