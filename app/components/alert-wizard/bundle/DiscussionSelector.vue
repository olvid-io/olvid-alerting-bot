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
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { DiscussionModel } from "#shared/types/discussion.ts";

/*

*/
/**
 * Discussion selector with dropdown and search query
 *
 * Layout, top to bottom:
 *   1. Selected strip — one avatar per selected discussion, name/ in small
 *      font under the photo, small x button to remove.
 *   2. Search input.
 *   3. Dropdown — every available discussion with its photo and a ✓ mark
 *      on the right when already selected. Clicking a row TOGGLES the
 *      discussion in/out of the list.
 *
 * Membership is strictly boolean: a discussion is either in the list or not.
 *
 * Photos ride on the DiscussionModel itself as a base64 data URL
 * (populated once at boot by olvidDiscussionRepository). When a
 * discussion has no photo the field is `null` and we fall back to an
 * initials circle. No per-photo API call.
 *
 * @param modelValue Array of DiscussionModel containing currently selected discussions. Can picked up with v-model.
 * @param available Array of DiscussionModel containing available discussions.
 * @param isLoading True while discussions are getting fetch
 * @param readonly
 * @param mode "single" | "multi"
 */

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
      modelValue: DiscussionModel[];
      available?: DiscussionModel[];
      isLoading?: boolean;
      readonly?: boolean;
      mode?: "single" | "multi";
    }>(),
    {
      available: () => [],
      isLoading: false,
      readonly: false,
      mode: "multi",
    },
);

const emit = defineEmits(["update:modelValue"]);

const searchQuery = ref("");
const isDropdownOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const selectedIds = computed(() => new Set(props.modelValue.map((d) => d.id)));

// ── Single-mode locking ────────────────────────────────────────────────
// Responds to a "one contact at a time" contract. 
// When mode="single" and a pick is already in place, the search box +
// dropdown collapse — the user has committed."Remove" clears
// the model so the picker reappears.
const isSinglePicked = computed(
    () => props.mode === "single" && props.modelValue.length > 0,
);


const isSelected = (d: DiscussionModel) => selectedIds.value.has(d.id);

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return props.available.filter((d) => !q || d.title.toLowerCase().includes(q));
});

/** Add/change or remove disccussion */
const toggle = (d: DiscussionModel) => {
  if (isSelected(d)) {
    emit(
        "update:modelValue",
        props.modelValue.filter((x) => x.id !== d.id),
    );
    return;
  }
  if (props.mode === "single") {
    emit("update:modelValue", [d]);
    isDropdownOpen.value = false;
    return;
  }
  emit("update:modelValue", [...props.modelValue, d]);
  // Dropdown stays open in multi mode
};

const remove = (id: string) => {
  emit(
      "update:modelValue",
      props.modelValue.filter((d) => d.id !== id),
  );
};

// ── Avatar fallback ───────────────────────────────────────────────────────
/** Up-to-2-char initials for the fallback circle. */
const initials = (title: string): string => {
  const words = (title ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
};

const onClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node))
    isDropdownOpen.value = false;
};

onMounted(() => document.addEventListener("click", onClickOutside));
onBeforeUnmount(() => document.removeEventListener("click", onClickOutside));

</script>

<template>
  <div class="selector">
    <!-- ── Selected strip — avatars with name + <LucideX :stroke-width="2" /> badge ────────────────── -->
    <div v-if="modelValue.length > 0" class="selected-strip">
      <div v-for="d in modelValue" :key="d.id" class="strip-item">
        <div class="strip-avatar-wrap">
          <img
              v-if="d.photoDataUrl"
              :src="d.photoDataUrl"
              :alt="d.title"
              class="strip-avatar"
          >
          <div v-else class="strip-avatar strip-avatar-fallback">
            {{ initials(d.title) }}
          </div>
          <button
              v-if="!readonly"
              type="button"
              class="strip-remove"
              :title="`Remove ${d.title}`"
              @click="remove(d.id)"
          >
            <LucideX :stroke-width="2"/>
          </button>
        </div>
        <span class="strip-name" :title="d.title">{{ d.title }}</span>
      </div>
    </div>

    <!-- Empty hint in readonly mode -->
    <p v-if="readonly && modelValue.length === 0" class="empty-readonly">
      {{ $t("discussionSelector.empty") }}
    </p>

    <!-- Single-mode "locked" state: the pick lives in the strip above,
         search collapses to a Change button that clears + reopens. -->
    <!--div v-if="!readonly && isSinglePicked" class="single-locked">
      <button
        type="button"
        class="btn btn-ghost btn-sm change-btn"
        @click="change"
      >
        {{ $t("discussionSelector.change") }}
      </button>
    </div-->

    <!-- ── Search + dropdown — hidden when readonly OR single-locked ── -->
    <div
        v-if="!readonly && !isSinglePicked"
        ref="containerRef"
        class="search-wrap"
    >
      <input
          v-model="searchQuery"
          type="text"
          :placeholder="
          isLoading
            ? t('discussionSelector.search.loading')
            : available.length === 0
              ? t('discussionSelector.search.noneAvailable')
              : t('discussionSelector.search.addPlaceholder')
        "
          :disabled="isLoading"
          class="field-input field-focus"
          @focus="isDropdownOpen = true"
      >
      <div v-if="isDropdownOpen" class="dropdown">
        <div
            v-for="d in filtered"
            :key="d.id"
            class="dropdown-item"
            :class="{ selected: isSelected(d) }"
            @mousedown.prevent="toggle(d)"
        >
          <img
              v-if="d.photoDataUrl"
              :src="d.photoDataUrl"
              :alt="d.title"
              class="item-avatar"
          >
          <div v-else class="item-avatar item-avatar-fallback">
            {{ initials(d.title) }}
          </div>
          <span class="item-title">{{ d.title }}</span>
          <span v-if="isSelected(d)" class="item-check item-selected" aria-hidden="true">
            <LucideCircleCheck size="16" color="white" fill="var(--color-accent)"/>
          </span>
          <span v-else class="item-check" aria-hidden="true">
            <LucideCircle/>
          </span>
        </div>
        <div v-if="filtered.length === 0" class="dropdown-empty">
          {{
          available.length === 0
          ? $t("discussionSelector.dropdown.noFound")
          : $t("discussionSelector.dropdown.allAdded")
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

/* ── Selected strip ───────────────────────────────────────────────────
 * Horizontal row of avatar+name columns, wraps when the audience grows.
 * Mirrors the WhatsApp "new group" member strip. */
.selected-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 56px;
}

.strip-avatar-wrap {
  position: relative;
  font-size: var(--text-base);
}

.strip-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  border: 1px solid var(--color-border-subtle);
}

.strip-avatar-fallback {
  /* Typography kept in sync with EmailRecipientSelector's fallback so
   * the two strips look like siblings. Background is the accent-soft
   * token — a single shared color is fine here because most discussions
   * do have real photos; the fallback is the exception. */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-soft);
  color: var(--color-accent-text);
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

/* ── Search input ─────────────────────────────────────────────────── */
.search-wrap {
  position: relative;
  width: 100%;
}

/* ── Dropdown ─────────────────────────────────────────────────────── */
.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-subtle);
  transition: background-color 0.12s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: var(--color-border-subtle);
}

.dropdown-item.selected {
  background: var(--color-accent-soft);
}

.item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--color-border-subtle);
}

.item-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-soft);
  color: var(--color-accent-text);
  font-size: var(--text-xs);
  font-weight: 700;
}

.item-title {
  flex: 1;
  min-width: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-check {
  color: var(--color-accent);
  font-size: var(--text-m);
}

.item-selected {
  font-size: var(--text-lg);
}

.dropdown-empty {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-faint);
  font-size: var(--text-base);
  font-style: italic;
}

.empty-readonly {
  margin: 0;
  color: var(--color-text-faint);
  font-size: var(--text-m);
  font-style: italic;
}

</style>
