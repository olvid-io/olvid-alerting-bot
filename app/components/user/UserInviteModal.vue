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
import type { UserRole } from "#shared/types/user";
import type {
  InviteChannel,
  InviteResponse,
  InviteUserForm,
} from "#shared/types/auth";
import type { DiscussionModel } from "#shared/types/discussion";
import { DiscussionKind } from "#shared/types/discussion";
/*
  Single-page invite form. Two pill groups drive the shape:
    - Delivery channel: mail | olvid | link. Picking one only changes
      the identifier field's label + which auxiliary input is shown
      (Olvid picker). No route change, no separate view.
    - Role: user | admin. Same pattern used across the app (see
      TriggerModePicker.vue, ConditionKindPicker.vue) — button host
      with a native <input type="radio"> for a11y + a label span.

  Name and role are shared across channels; identifier + olvid picker
  are per-channel. Switching channels mid-edit keeps the shared parts
  intact so the admin can pivot without retyping.
*/

const props = defineProps<{ open: boolean; mailEnabled: boolean }>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "invited", res: InviteResponse): void;
}>();

const { t } = useI18n();

const channel = ref<InviteChannel>("mail");
const name = ref("");
const login = ref("");
const email = ref("");
const role = ref<UserRole>("user");
const olvidPick = ref<DiscussionModel[]>([]);
const olvidAvailable = ref<DiscussionModel[]>([]);
const olvidLoading = ref(false);
const busy = ref(false);
const feedback = ref<string | null>(null);

// Pill option builders. Kept as computeds so locale switches update
// labels in-place without a component remount.
const channelOptions = computed(() => {
  const opts: Array<{ value: InviteChannel; label: string; disabled?: boolean; hint?: string }> = [];
  opts.push({
    value: "olvid",
    label: t("auth.inviteModal.channelPillOlvid"),
  });
  if (props.mailEnabled) {
    opts.push({
      value: "mail",
      label: t("auth.inviteModal.channelPillMail"),
      disabled: !props.mailEnabled,
      hint: !props.mailEnabled
          ? t("auth.inviteModal.channelPillMailDisabled")
          : undefined,
    });
  }
  opts.push({
    value: "link",
    label: t("auth.inviteModal.channelPillLink"),
  });
  return opts;
});

const roleOptions = computed(() => [
  { value: "user" as const, label: t("user.userRow.role.user") },
  { value: "admin" as const, label: t("user.userRow.role.admin") },
]);

// Channel-driven identifier field. When we start typing in one channel
// then switch to another, the label + input type update — the value
// stays (an email address is still a valid arbitrary string).
const idField = computed(() => {
  return {
    label: t("auth.inviteModal.fieldUsername"),
    placeholder: t("auth.inviteModal.usernamePlaceholder"),
    type: "text",
    autocomplete: "off",
  };
});

const emailField = computed(() => {
  return {
    label: t("auth.inviteModal.fieldEmail"),
    placeholder: t("auth.inviteModal.emailPlaceholder"),
    type: "email",
    autocomplete: "off",
  };
})

function pickChannel(next: InviteChannel) {
  const opt = channelOptions.value.find((o) => o.value === next);
  if (opt?.disabled) return;
  channel.value = next;
}

function initialChannel(): InviteChannel {
  return "olvid";
}

function reset() {
  channel.value = initialChannel();
  name.value = "";
  login.value = "";
  email.value = "";
  role.value = "user";
  olvidPick.value = [];
  busy.value = false;
  feedback.value = null;
}

watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) reset();
    },
);

// Lazy-load Olvid discussions the first time the user picks the Olvid
// channel — no need to talk to the daemon if they never go there.
// Filter to contacts only: invites target a person, not a room.
watch(channel, async (v) => {
  if (v !== "olvid" || olvidAvailable.value.length > 0) return;
  olvidLoading.value = true;
  try {
    const all =
        (await alertService.getDiscussionList()) as DiscussionModel[];
    olvidAvailable.value = all.filter((d) => d.kind === DiscussionKind.Contact);
  } catch {
    olvidAvailable.value = [];
  } finally {
    olvidLoading.value = false;
  }
});

const { mapAuthError } = useAuthErrors();
const inviteErrorMap = {
  user_already_active: t("auth.inviteModal.errorUserAlreadyActive"),
  login_in_use: t("auth.inviteModal.errorLoginInUse"),
  email_in_use: t("auth.inviteModal.errorEmailInUse"),
  olvid_in_use: t("auth.inviteModal.errorOlvidInUse"),
  email_required: t("auth.inviteModal.errorEmailRequired"),
  mail_not_configured: t("auth.inviteModal.errorMailNotConfigured"),
  olvid_discussion_required: t("auth.inviteModal.errorOlvidRequired"),
};

function describeError(err: unknown): string {
  return mapAuthError(err, inviteErrorMap, t("auth.inviteModal.errorFallback"));
}

const canSubmit = computed(() => {
  if (busy.value) return false;
  if (!login.value) return false;
  if (channel.value === 'mail' && !email.value) return false;
  if (channel.value === "olvid" && olvidPick.value.length === 0) return false;
  return true;
});

function buildBody(): InviteUserForm | null {
  const commonName = name.value || undefined;
  if (channel.value === "mail") {
    return {
      login: login.value,
      email: email.value,
      name: commonName,
      role: role.value,
      channel: "mail",
    };
  }
  if (channel.value === "link") {
    return {
      login: login.value,
      name: commonName,
      role: role.value,
      channel: "link",
    };
  }
  const picked = olvidPick.value[0];
  if (!picked) return null;
  return {
    login: login.value,
    name: commonName,
    role: role.value,
    channel: "olvid",
    olvidDiscussionId: String(picked.id),
  };
}

async function submit() {
  if (!canSubmit.value) return;
  const body = buildBody();
  if (!body) return;
  feedback.value = null;
  busy.value = true;
  try {
    const res = await userService.invite(body);
    emit("invited", res);
  } catch (err) {
    feedback.value = describeError(err);
  } finally {
    busy.value = false;
  }
}

const submitLabel = computed(() => {
  if (busy.value) {
    if (channel.value === "mail") return t("auth.inviteModal.submitMailBusy");
    if (channel.value === "olvid") return t("auth.inviteModal.submitOlvidBusy");
    return t("auth.inviteModal.submitLinkBusy");
  }
  if (channel.value === "mail") return t("auth.inviteModal.submitMail");
  if (channel.value === "olvid") return t("auth.inviteModal.submitOlvid");
  return t("auth.inviteModal.submitLink");
});
</script>

<template>
  <Modal
      :open="open"
      size="default"
      :aria-label="$t('auth.inviteModal.ariaLabel')"
      @close="emit('close')"
  >
    <ModalHead
        :title="$t('auth.inviteModal.title')"
        @close="emit('close')"
    />

    <form class="invite-form" @submit.prevent="submit">
      <p v-if="feedback" class="modal-feedback">{{ feedback }}</p>

      <!-- ── Delivery channel — pill group ────────────────────────── -->
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
              :class="{ active: channel === opt.value, 'is-disabled': opt.disabled }"
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

      <!-- ── Name ─────────────────────────────────────────────────── -->
      <label class="field">
        <span class="field-label">
          {{ $t("auth.inviteModal.fieldName") }}
        </span>
        <input
            v-model="name"
            class="field-input"
            type="text"
            :placeholder="$t('auth.inviteModal.namePlaceholder')"
            autocomplete="off"
        >
      </label>

      <!-- ── Login ──────── -->
      <label class="field">
        <span class="field-label">{{ idField.label }}</span>
        <input
            v-model="login"
            class="field-input"
            :type="idField.type"
            :placeholder="idField.placeholder"
            :autocomplete="idField.autocomplete"
            required
        >
      </label>

      <!-- ── Email field ──────── -->
      <label v-if="channel === 'mail'" class="field">
        <span class="field-label">{{ emailField.label }}</span>
        <input
            v-model="email"
            class="field-input"
            :type="emailField.type"
            :placeholder="emailField.placeholder"
            :autocomplete="emailField.autocomplete"
            required
        >
      </label>

      <!-- ── Olvid discussion picker ──────────────────────────────── -->
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

      <!-- ── Role — pill group with radio ─────────────────────────── -->
      <div class="field">
        <span class="field-label">
          {{ $t("auth.inviteModal.fieldRole") }}
        </span>
        <div class="btn-pill-group">
          <button
              v-for="opt in roleOptions"
              :key="opt.value"
              type="button"
              class="btn-pill"
              :class="{ active: role === opt.value }"
              @click="role = opt.value"
          >
            <input
                type="radio"
                :checked="role === opt.value"
                tabindex="-1"
            >
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- ── Actions ──────────────────────────────────────────────── -->
      <div class="overlay-actions">
        <button type="button" class="btn btn-ghost" @click="emit('close')">
          {{ $t("auth.inviteModal.cancel") }}
        </button>
        <button
            type="submit"
            class="btn btn-primary"
            :disabled="!canSubmit"
        >
          {{ submitLabel }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.invite-form {
  padding: var(--space-3) var(--space-6) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-feedback {
  color: var(--color-danger-text);
  font-size: var(--text-s);
  margin: 0;
  padding: var(--space-2) var(--space-3);
  background: var(--color-danger-soft);
  border-radius: var(--radius-md);
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

/* Disabled channel pill — the pill itself stays visible but greyed
 * out. Tooltip explains why (e.g. "SMTP not configured"). */
.btn-pill.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: auto;
}

.btn-pill.is-disabled:hover {
  background: transparent;
}
</style>
