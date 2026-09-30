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
import type {
  InviteChannel,
  SetupForm,
  SetupResponse,
} from "#shared/types/auth";
import { DiscussionKind, type DiscussionModel } from "#shared/types/discussion";

/**
 * First-run setup — two visual steps in one AuthCard.
 *
 *     Step 1: admin-key input only. Submit → server confirms the key
 *             matches ADMIN_KEY and no admin exists yet. On success we
 *             unlock step 2 client-side; on failure we surface the error
 *             without leaving the page.
 *
 *     Step 2: invite-style form. The operator invites THEMSELVES —
 *             picks a delivery channel (mail / olvid / link), fills the
 *             corresponding target, and optionally a display name.
 *             The `login` is the email in mail mode (mirrors the invite
 *             modal), otherwise a plain username field appears.
 *             Password is NOT collected here; the operator will set it
 *             by opening the invite URL, exactly like every invitee.
 *
 *   Step 2 issues the token and delivers via the picked channel.
 *   Mail / Olvid deliveries → inline "check your …" line.
 *   Link mode (or a failed delivery) → the URL is revealed in a copy box
 *   so the operator can open it directly.
 *
 *   The Olvid discussion list is NOT reachable via GET /api/discussions
 *   here — that endpoint requires a session and the first admin doesn't
 *   have one yet. We fetch through POST /api/auth/setup/discussions,
 *   authenticated by the admin key from step 1.
 * */

const { t } = useI18n();
const { data: authConfig } = await useAuthConfig();
const { mapAuthError } = useAuthErrors();

useHead({
  title: t("pageTitle.setup"),
})

// ── Common state ──────────────────────────────────────────────────────

const step = ref<"key" | "invite" | "done">("key");
const busy = ref(false);
const error = ref<string | null>(null);

const errorMap = {
  admin_key_not_configured: t("auth.setup.errorAdminKeyNotConfigured"),
  invalid_admin_key: t("auth.setup.errorInvalidAdminKey"),
  setup_already_complete: t("auth.setup.errorAlreadyComplete"),
  email_required: t("auth.setup.errorEmailRequired"),
  mail_not_configured: t("auth.setup.errorMailNotConfigured"),
  olvid_discussion_required: t("auth.setup.errorOlvidRequired"),
};

// ── Step 1: admin key ─────────────────────────────────────────────────

const adminKey = ref("");

async function submitKey() {
  if (!adminKey.value || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    await authService.verifySetupKey(adminKey.value);
    channel.value = initialChannel();
    step.value = "invite";
  } catch (err) {
    error.value = mapAuthError(err, errorMap, t("auth.setup.errorFallback"));
  } finally {
    busy.value = false;
  }
}

// ── Step 2: invite ────────────────────────────────────────────────────

const mailEnabled = computed(() => authConfig.value?.mailEnabled ?? false);

const channel = ref<InviteChannel>("mail");
const identifier = ref(""); // email in mail mode, plain username otherwise
const name = ref("");
const olvidPick = ref<DiscussionModel[]>([]);
const olvidAvailable = ref<DiscussionModel[]>([]);
const olvidLoading = ref(false);

// Default channel — same policy as the invite modal.
function initialChannel(): InviteChannel {
  return "olvid";
}

const channelOptions = computed(() => {
  const opts: Array<{
    value: InviteChannel;
    label: string;
    disabled?: boolean;
    hint?: string;
  }> = [];
  opts.push({ value: "olvid", label: t("auth.inviteModal.channelPillOlvid") });
  opts.push({
    value: "mail",
    label: t("auth.inviteModal.channelPillMail"),
    disabled: !mailEnabled.value,
    hint: !mailEnabled.value
        ? t("auth.inviteModal.channelPillMailDisabled")
        : undefined,
  });
  opts.push({ value: "link", label: t("auth.inviteModal.channelPillLink") });
  return opts;
});

function pickChannel(next: InviteChannel) {
  const opt = channelOptions.value.find((o) => o.value === next);
  if (opt?.disabled) return;
  channel.value = next;
}

// Identifier field — same pattern as UserInviteModal. In mail mode the
// email IS the login, so we only render one input.
const idField = computed(() => {
  if (channel.value === "mail") {
    return {
      label: t("auth.setup.fieldEmail"),
      placeholder: t("auth.setup.emailPlaceholder"),
      type: "email",
      autocomplete: "email",
    };
  }
  return {
    label: t("auth.setup.fieldLogin"),
    placeholder: t("auth.setup.loginPlaceholder"),
    type: "text",
    autocomplete: "username",
  };
});

// Lazy-load Olvid contacts. Route is gated by the admin key we just
// verified in step 1, so the first admin can list contacts without a
// session cookie.
watch(channel, async (v) => {
  if (v !== "olvid" || olvidAvailable.value.length > 0) return;
  olvidLoading.value = true;
  try {
    const all = await authService.setupDiscussions(adminKey.value);
    olvidAvailable.value = all.filter(
        (d) => d.kind === DiscussionKind.Contact,
    );
  } catch {
    olvidAvailable.value = [];
  } finally {
    olvidLoading.value = false;
  }
});

const canSubmitInvite = computed(() => {
  if (busy.value) return false;
  if (!identifier.value.trim()) return false;
  if (channel.value === "olvid" && olvidPick.value.length === 0) return false;
  return true;
});

function buildBody(): SetupForm {
  const trimmedId = identifier.value.trim();
  const base: SetupForm = {
    adminKey: adminKey.value,
    login: trimmedId,
    name: name.value.trim() || undefined,
    channel: channel.value,
  };
  if (channel.value === "mail") base.email = trimmedId;
  if (channel.value === "olvid") {
    base.olvidDiscussionId = String(olvidPick.value[0]!.id);
  }
  return base;
}

const doneResult = ref<SetupResponse | null>(null);

async function submitInvite() {
  if (!canSubmitInvite.value) return;
  busy.value = true;
  error.value = null;
  try {
    doneResult.value = await authService.setup(buildBody());
    step.value = "done";
  } catch (err) {
    error.value = mapAuthError(err, errorMap, t("auth.setup.errorFallback"));
  } finally {
    busy.value = false;
  }
}

function backToKey() {
  step.value = "key";
  error.value = null;
}

// ── Done state — reveal URL or inline confirmation ────────────────────

const doneCopy = computed(() => {
  const r = doneResult.value;
  if (!r) return "";
  if (r.channel === "mail" && r.delivered) return t("auth.setup.doneMail");
  if (r.channel === "olvid" && r.delivered) return t("auth.setup.doneOlvid");
  return t("auth.setup.doneLink");
});
</script>

<template>
  <AuthCard>
    <!-- ── Step 1: admin key ─────────────────────────────────────── -->
    <template v-if="step === 'key'">
      <h4>{{ $t("auth.setup.title") }}</h4>
      <p class="hint">{{ $t("auth.setup.hint") }}</p>
      <form class="setup-form" @submit.prevent="submitKey">
        <input
            v-model="adminKey"
            class="field-input"
            type="password"
            :placeholder="$t('auth.setup.adminKey')"
            autocomplete="off"
            required
        >
        <button
            type="submit"
            class="btn btn-primary"
            :disabled="!adminKey || busy"
        >
          {{ busy ? $t("auth.setup.keyBusy") : $t("auth.setup.keyNext") }}
        </button>
      </form>
      <p v-if="error" class="msg msg--error">{{ error }}</p>
    </template>

    <!-- ── Step 2: invite (self-invitation) ──────────────────────── -->
    <template v-else-if="step === 'invite'">
      <h4>{{ $t("auth.setup.inviteTitle") }}</h4>
      <p class="hint">{{ $t("auth.setup.inviteHint") }}</p>

      <form class="setup-form" @submit.prevent="submitInvite">
        <!-- Channel pills -->
        <div class="field">
          <span class="field-label">
            {{ $t("auth.inviteModal.channelLabel") }}
          </span>
          <div class="btn-pill-group">
            <button
                v-for="opt in channelOptions"
                :key="opt.value"
                type="button"
                class="btn-pill"
                :class="{
                active: channel === opt.value,
                'is-disabled': opt.disabled,
              }"
                :aria-disabled="opt.disabled ? 'true' : undefined"
                :title="opt.hint"
                @click="pickChannel(opt.value)"
            >
              <input
                  type="radio"
                  :checked="channel === opt.value"
                  :disabled="opt.disabled"
                  tabindex="-1"
              >
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Identifier — email in mail mode, username otherwise -->
        <label class="field">
          <span class="field-label">{{ idField.label }}</span>
          <input
              v-model="identifier"
              class="field-input"
              :type="idField.type"
              :placeholder="idField.placeholder"
              :autocomplete="idField.autocomplete"
              required
          >
        </label>

        <!-- Name -->
        <label class="field">
          <span class="field-label">{{ $t("auth.setup.fieldName") }}</span>
          <input
              v-model="name"
              class="field-input"
              type="text"
              :placeholder="$t('auth.setup.namePlaceholder')"
              autocomplete="name"
          >
        </label>

        <!-- Olvid discussion picker -->
        <div v-if="channel === 'olvid'" class="field">
          <span class="field-label">
            {{ $t("auth.inviteModal.fieldOlvidDiscussion") }}
          </span>
          <DiscussionSelector
              v-model="olvidPick"
              mode="single"
              :available="olvidAvailable"
              :is-loading="olvidLoading"
          />
        </div>

        <div class="setup-actions">
          <button type="button" class="btn btn-ghost" @click="backToKey">
            {{ $t("auth.setup.back") }}
          </button>
          <button
              type="submit"
              class="btn btn-primary"
              :disabled="!canSubmitInvite"
          >
            {{
            busy
            ? $t("auth.setup.inviteBusy")
            : $t("auth.setup.inviteSubmit")
            }}
          </button>
        </div>
      </form>

      <p v-if="error" class="msg msg--error">{{ error }}</p>
    </template>

    <!-- ── Done: check your channel / reveal link ────────────────── -->
    <template v-else>
      <h4>{{ $t("auth.setup.doneTitle") }}</h4>
      <p class="hint">{{ doneCopy }}</p>

      <URLCopyBox
          v-if="
          doneResult &&
          (doneResult.channel === 'link' || !doneResult.delivered)
        "
          :url="doneResult.inviteUrl"
      />

      <NuxtLink to="/login" class="btn btn-ghost btn-sm done-cta">
        {{ $t("auth.setup.doneCta") }}
      </NuxtLink>
    </template>
  </AuthCard>
</template>

<style scoped>
.setup-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.setup-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-2);
}

.hint {
  color: var(--color-text-muted);
  font-size: var(--text-s);
  margin-top: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-size: var(--text-s);
  color: var(--color-text-muted);
}

.msg {
  margin-top: var(--space-3);
  font-size: var(--text-s);
  color: var(--color-text-muted);
}

.msg--error {
  color: var(--color-danger, #b91c1c);
}

.btn-pill.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.done-cta {
  margin-top: var(--space-4);
  align-self: center;
}
</style>
