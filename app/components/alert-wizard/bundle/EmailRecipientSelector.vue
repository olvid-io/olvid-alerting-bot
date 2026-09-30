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
import { ref, computed } from "vue";
import { paletteFor } from "~/utils/mailAvatarPalette.ts";
import { EMAIL_REGEX } from "#shared/email.ts";

/**
 Free-form chip input for email recipients. Shares the visual grammar of
 DiscussionSelector.vue's selected-strip (avatar circles + <LucideX :stroke-width="2" /> badge), but
 there's no directory to search against — recipients are typed in.

 Interaction:
 - Enter, comma, or blur commits the current input as a chip
 - Duplicate addresses are silently deduped
 - Malformed addresses render a red inline error and are NOT added
 to the list until fixed

 Addresses are lowercased + trimmed here so the wire shape matches what
 the repo will persist (which also lowercases). Keeping them normalised
 in the v-model saves the display layer from having to re-normalise
 before comparing.
 */

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
      modelValue: string[];
      readonly?: boolean;
    }>(),
    { readonly: false },
);

const emit = defineEmits<{
  (e: "update:modelValue", val: string[]): void;
}>();

const input = ref("");
const error = ref<string | null>(null);

const selected = computed(() => props.modelValue);

const commit = () => {
  const raw = input.value.trim().toLowerCase();
  if (raw === "") {
    input.value = "";
    error.value = null;
    return;
  }
  if (!EMAIL_REGEX.test(raw)) {
    error.value = t("emailRecipientSelector.invalidAddress");
    return;
  }
  if (selected.value.includes(raw)) {
    // Already registered mail
    // Silent dedupe — clearing the input is enough of a signal.
    input.value = "";
    error.value = null;
    return;
  }
  emit("update:modelValue", [...selected.value, raw]);
  input.value = "";
  error.value = null;
};

const remove = (address: string) => {
  emit(
      "update:modelValue",
      selected.value.filter((a) => a !== address),
  );
};

// Comma or Enter commits; typing anything clears a lingering error so the
// red border doesn't outlive the fix.
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    commit();
  }
};
const onInput = () => {
  if (error.value) error.value = null;
};

/** Initial for the fallback circle. */
const initial = (address: string): string => {
  const local = address.split("@")[0] ?? "";
  return (local.slice(0, 1) || "@").toUpperCase();
};
</script>

<template>
  <div class="selector">
    <!-- ── Selected chips ─────────────────────────────────────────────── -->
    <div v-if="selected.length > 0" class="selected-strip">
      <div v-for="address in selected" :key="address" class="strip-item">
        <div class="strip-avatar-wrap">
          <div
              class="strip-avatar strip-avatar-fallback"
              :style="{
              background: paletteFor(address).bg,
              color: paletteFor(address).fg,
            }"
          >
            {{ initial(address) }}
          </div>
          <button
              v-if="!readonly"
              type="button"
              class="strip-remove"
              :title="`Remove ${address}`"
              @click="remove(address)"
          >
            <LucideX :stroke-width="2"/>
          </button>

        </div>
        <span class="strip-name" :title="address">{{ address }}</span>
      </div>
    </div>

    <!-- Empty hint in readonly mode -->
    <p v-if="readonly && selected.length === 0" class="empty-readonly">
      {{ t("emailRecipientSelector.empty") }}
    </p>

    <!-- ── Input ───────────────────────────────────────────────────────── -->
    <div v-if="!readonly" class="input-wrap">
      <input
          v-model="input"
          type="email"
          :placeholder="t('emailRecipientSelector.addPlaceholder')"
          class="field-input field-focus"
          :class="{ 'error': error }"
          @keydown="onKeydown"
          @input="onInput"
          @blur="commit"
      >
      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Layout mirrors DiscussionSelector.vue's `.selector` shape. Kept in-file
 * (not shared) so the two components can drift independently as their
 * interaction models diverge. */

/* TODO Add submit button */
.selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.selected-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.strip-item {
  /* Width kept parity with DiscussionSelector's 56px so both strips look
   * uniform inside the modal. The full address is on the chip's :title
   * for the truncated case. */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 56px;
}

.strip-avatar-wrap {
  position: relative;
}

/*TODO Homogenize with olvid discussion avatar */
.strip-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: block;
  border: 1px solid var(--color-border-subtle);
}

.strip-avatar-fallback {
  /* Background / color are set inline per-address via `paletteFor` so
   * different recipients get distinguishable pastels. Font matches the
   * DiscussionSelector fallback so the two strips read as siblings. */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Remove badge sits on the top-right of the avatar. The SVG inside is
 * a Lucide component that renders at its own intrinsic size unless
 * constrained — a scoped :deep(svg) rule pins it so raising the
 * button's own dimensions actually enlarges the icon too. */
.strip-remove {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background-color 0.15s,
  color 0.15s,
  transform 0.05s ease;
}

.strip-remove :deep(svg) {
  width: 8px;
  height: 8px;
  stroke-width: 2.5;
}

.strip-remove:hover {
  background: var(--color-danger);
  color: var(--white);
  border-color: var(--color-danger);
  transform: scale(1.05);
}

.strip-name {
  max-width: 56px;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-wrap {
  position: relative;
  width: 100%;
}

.error-msg {
  margin: var(--space-1) 0 0;
  color: var(--color-danger-text);
  font-size: var(--text-s);
}

.empty-readonly {
  margin: 0;
  color: var(--color-text-faint);
  font-size: var(--text-m);
  font-style: italic;
}
</style>
