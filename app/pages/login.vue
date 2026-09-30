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
const { t } = useI18n();
const { data: authConfig } = await useAuthConfig();
const { authLogin, authRequestReset } = useAuthLogin();
const { fetch: refreshSession } = useUserSession();

useHead({
  title: t("pageTitle.login"),
})

/**
 * Login page. Has three different modes :
 * - login : For submitting credentials
 *    - password : For password-based authentication
 *    - olvid : For Olvid-based authentication (reaction / poll)
 * - forgot : Password reset request window
 * - reaction : Waiting screen for reaction after submitting login with Olvid
 *
 * From this page, the user can initiate a login process, either via password or Olvid message
 * associated with his username. Each of these options can be disabled for each user.
 * They can also request a password reset.
 */

const credentials = reactive<CredentialsForm>({ login: "", password: "" });
const error = ref<string | null>(null);
const needsVerification = ref(false);
const resent = ref(false);
const resendButton = computed(() => {
  return needsVerification.value && canResend.value && !resent.value
})
const olvidSent = ref(false);

const windowMode = ref<"login" | "forgot" | "reaction">("login");

const forgotBusy = ref(false);
const forgotChannel = ref<ResetChannel | null>(null);
const forgotError = ref<string | null>(null);

/*
 * Login function called on form submitting, supporting both methods (password / Olvid)
 */
async function login(mode: "password" | "olvid") {
  error.value = null;
  needsVerification.value = false;
  resent.value = false;

  if (mode === "olvid") {
    windowMode.value = "reaction";
  }

  const loginError = await authLogin(credentials, mode);

  if (!loginError) {
    // If login is successful, a session is initialized server side, thus refreshSession fetches it.
    await refreshSession();
    await navigateTo("/");
  } else {
    windowMode.value = "login";
    error.value = loginError;
    if (loginError === t("auth.login.errorNotActivated")) needsVerification.value = true;
  }

}

// Resend-verification affordance only makes sense when SMTP is on and
// the login looks like an email.
const canResend = computed(
    () => authConfig.value?.mailEnabled && credentials.login.includes("@"),
);

async function resend() {
  try {
    await authService.resendVerification(credentials.login);
    resent.value = true;
  } catch {
    /* silent — endpoint returns 200 on unknown addresses on purpose */
  }
}

// ── Forgot my password ────────────────────────────────────────────────
function openForgot() {
  windowMode.value = "forgot";
  forgotChannel.value = null;
  forgotError.value = null;
  credentials.password = "";
}

function backToLogin() {
  windowMode.value = "login";
  forgotChannel.value = null;
  forgotError.value = null;
  forgotBusy.value = false;
}

async function requestReset() {
  if (!credentials.login || forgotBusy.value) return;
  forgotBusy.value = true;
  forgotChannel.value = null;
  forgotError.value = null;
  const channel = await authRequestReset(credentials);
  if (channel) {
    forgotChannel.value = channel;
  } else {
    forgotError.value = t("auth.login.resetNetworkError");
  }
  forgotBusy.value = false;
}


</script>

<template>
  <AuthCard>
    <LoginFields
        v-if="windowMode === 'login'"
        v-model="credentials"
        :resend-button="resendButton"
        :resent="resent"
        :olvid-sent="olvidSent"
        :error="error"
        @login="login"
        @open-forgot="openForgot"
        @resend="resend"
    />

    <LoginForgotPassword
        v-if="windowMode === 'forgot'"
        v-model="credentials.login"
        :forgot-channel="forgotChannel"
        :forgot-busy="forgotBusy"
        :forgot-error="forgotError"
        @request-reset="requestReset"
        @back-to-login="backToLogin"
    />

    <LoginReaction
        v-if="windowMode === 'reaction'"
        :login="credentials.login"
    />


  </AuthCard>
</template>

<style scoped>


</style>
