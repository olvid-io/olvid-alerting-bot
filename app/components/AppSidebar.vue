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
import type { AlertModel } from "#shared/types/alert.ts";
import { statusClass, statusLabel } from "~/utils/statusUi.ts";

/**
 * Sidebar component. Requires alert list to display alerts info.
 * Can be collapsed to reduce size and display minimal information.
 * Clicking on empty
 */

const { collapsed, toggle } = useSidebarCollapseState();

const { user } = useUserSession();

const props = withDefaults(
    defineProps<{
      alerts?: AlertModel[];
      selectedId?: number | null;
      // When true (no session), the row list and "+ New Alert" button
      // become read-only affordances; no fetches, no navigation.
      disabled?: boolean;
    }>(),
    {
      alerts: () => [],
      selectedId: null,
      disabled: false,
    },
);

const emit = defineEmits(["select", "new", "deselect"]);

function onSelect(a: AlertModel) {
  if (props.disabled) return;
  emit("select", a);
}

function onNew() {
  if (props.disabled) return;
  emit("new");
}

function onDeselect() {
  if (props.disabled) return;
  emit("deselect");
}


// First 3 characters of the alert's title, uppercased — shown next to the
// status dot when the sidebar is collapsed.
const initials = (title: string): string => {
  const t = (title ?? "").trim().slice(0, 3).toUpperCase();
  return t.length > 0 ? t : "·";
};
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-head">
      <span v-if="!collapsed" class="alert-title" @click="onDeselect">
          {{ $t("sidebar.title") }}
      </span>
      <button
          type="button"
          class="btn-icon"
          :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-expanded="!collapsed"
          @click="toggle"
      >
        <LucideChevronLeft class="chev-icon" aria-hidden="true"/>

      </button>
    </div>

    <div class="sidebar-body" @click="onDeselect">

      <div class="alert-list">

        <button
            type="button"
            class="btn btn-new"
            :title="collapsed ? $t('button.newAlert') : undefined"
            :disabled="disabled"
            @click="onNew"
        >
          <LucidePlus class="plus" aria-hidden="true"/>
          <span v-if="!collapsed">  {{ $t("button.newAlert") }}</span>

        </button>

        <button
            v-for="alert in alerts"
            :key="alert.id ?? alert.title"
            type="button"
            class="alert-row"
            :class="{ selected: alert.id === selectedId }"
            :title="collapsed ? alert.title : undefined"
            :disabled="disabled"
            @click="onSelect(alert)"
        >
        <span
            class="status-dot"
            :class="statusClass(alert.status)"
            :title="statusLabel(alert.status)"
        />

          <span v-if="collapsed" class="row-initials">{{
              initials(alert.title)
            }}</span>


          <span v-else class="row-title">{{ alert.title }}</span>
        </button>

        <div
            v-if="alerts.length === 0 && !collapsed"
            class="sidebar-empty"
        >
          {{ disabled ? $t("sidebar.loginPrompt") : $t("sidebar.empty") }}
        </div>

      </div>

      <div class="bottom-list">
        <button
            v-if="user && user.role === 'admin'"
            class="btn btn-bottom"
            @click="navigateTo(`/users`)"
        >
          <LucideUserCog class="user-cog-icon" aria-hidden="true"/>
          <span v-if="!collapsed">  {{ $t("button.manageUsers") }}</span>
        </button>
      </div>

    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-app);
  border-right: 1px solid var(--color-border-subtle);
  overflow: hidden;
  height: 100%;
  min-height: 0;
  align-items: stretch;

  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

/* ── Head ───────────────────────────────────────────────────────────
 * Expanded: title on the left, collapse-toggle on the right.
 * Collapsed: title hidden, toggle centered (only thing in the head). */
.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2);
  background: var(--color-bg-sidebar-head);
  border-bottom: 1px solid var(--color-border-subtle);
}

.sidebar.collapsed .sidebar-head {
  justify-content: center;
  padding: var(--space-3) 0;
}

.alert-title {
  text-align: center;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;

  padding: var(--space-2);
  padding-left: var(--space-3);

  cursor: pointer;
}

.alert-title:hover {
  text-decoration: underline;
}

/* Collapse toggle — scoped override of the global .btn-icon (which is a
 * saturated accent circle). Here we want a quieter button that reacts
 * subtly on hover instead of doing a full color inversion. */
.sidebar-head .btn-icon {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-muted);
  transition: background-color 0.15s,
  border-color 0.15s,
  color 0.15s;
}

.sidebar-head .btn-icon:hover {
  background: var(--color-accent-soft);
  border-color: var(--color-accent-border);
  color: var(--color-accent);
}

/* Chevron itself. Overrides the global `svg.lucide { width:1em }` from
 * reset.css and gives the icon room inside the 28-px button. Stroke ~2.25
 * reads bold without looking like a wrench. */
.chev-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.6;
  line-height: 1;
  transition: transform 0.2s ease;
}

.sidebar.collapsed .chev-icon {
  transform: rotate(180deg);
}

/* ── Body / rows ────────────────────────────────────────────────── */
.sidebar-body {
  /* Transparent so the body inherits the sidebar container's `bg-app` —
   * one continuous chrome tone from the top of the head through the row
   * list. Rows pop on hover/selected via their own backgrounds. */
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1);
  padding-top: var(--space-3);
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  background: var(--color-bg-panel);
  min-height: 0;

  padding-bottom: var(--space-3);

  .sidebar-collapsed & {
    padding: var(--space-1) 0;
  }

}

.alert-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.alert-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);

  width: 100%;
  height: 30px;
  box-sizing: border-box;

  text-align: left;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);

  padding-left: 9px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-base);
  transition: background-color 0.15s;

  .sidebar-collapsed & {
    position: relative;
    justify-items: center;
    border-radius: 0;
    padding: 0;
  }
}

.alert-row:hover {
  background: var(--color-bg-card-soft);
}

.alert-row.selected {
  background: var(--color-bg-card-selected);
  color: var(--color-text-primary);
}

.row-title {
  font-family: var(--font-sans);
  font-size: var(--text-s);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The 3-char prefix shown when collapsed.*/
.row-initials {
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: inherit;
  white-space: nowrap;
  padding-right: 12px;
}

.sidebar-empty {
  color: var(--color-text-faint);
  font-size: var(--text-m);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  font-style: italic;
}

/* ── New-alert button  ───────────────────────────────
 * Expanded: full pill with "+ New alert" label.
 * Collapsed: square with just "+". */
.btn-new {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-left: 9px;
  color: var(--color-text-secondary);
  font-size: var(--text-s);
  border: 1px solid var(--color-bg-panel);
  background-color: var(--color-bg-panel);

  .sidebar-collapsed & {
    margin: 3px;
  }
}

.btn-new:hover {
  color: var(--color-accent);
  border-color: var(--color-accent-border);
  background-color: var(--color-bg-panel);

}

.btn-new:disabled,
.alert-row:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-new:disabled:hover {
  background: var(--color-border-subtle);
  color: var(--color-text-secondary);
  border-color: var(--color-border-default);
}

.plus {
  width: 24px;
  height: 14px;
  stroke-width: 3;
  flex-shrink: 0;
}

/* Sidebar bottom buttons */
.bottom-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px;

}

.btn-bottom {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 9px;
  background: var(--color-border-subtle);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-default);

}

.btn-bottom:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  border-color: var(--color-accent-border);
}

.btn-bottom:disabled,
.alert-row:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-bottom:disabled:hover {
  background: var(--color-border-subtle);
  color: var(--color-text-secondary);
  border-color: var(--color-border-default);
}

.user-cog-icon {
  width: 24px;
  height: 14px;
  stroke-width: 3;
  flex-shrink: 0;
}


</style>
