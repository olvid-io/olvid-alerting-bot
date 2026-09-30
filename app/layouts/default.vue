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

<script setup>
import { onMounted, computed, watch } from "vue";

const route = useRoute();
const {alerts, fetchAlerts} = useAlertFetching();
const {fetchDiscussions} = useDiscussions();
const {collapsed: sidebarCollapsed} = useSidebarCollapseState();

const {user, clear: clearSession} = useUserSession();

const {displayName, photoDataUrl, identityConnected, fetchBotIdentity} = useBotIdentity();

async function logout() {
  await authService.logout();
  await clearSession();
  await navigateTo("/login");
}

async function goLogin() {
  await navigateTo("/login");
}

async function alertList() {
  await navigateTo("/alerts/list");
}

/*
Only fetch data when we actually have a session — otherwise every
nav triggers a 401 that useAlertFetching silently swallows into empty
arrays.
*/
onMounted(() => {
  fetchBotIdentity(); // Bot identity is fetched even when no session for indicate status during login
  if (user.value) {
    fetchAlerts();
    fetchDiscussions();
  }
});

// After login the layout is already mounted, so onMounted won't refire.
// Watching `user` covers that: sign in → lists populate, sign out → they clear.
watch(user, (u) => {
  if (u) {
    fetchAlerts();
    fetchDiscussions();
  } else {
    alerts.value = [];
  }
});

// Select alert id if AlertView is open
const selectedId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : null;
});
</script>

<template>
  <div class="layout">
    <TopNavBar
        :photo-data-url="photoDataUrl"
        :display-name="displayName"
        :identity-connected="identityConnected"
        :user="user"
        @logout="logout"
        @go-login="goLogin"
        @list="alertList()"
    />

    <main class="main-content">
      <div class="split" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <div class="split-left">
          <AppSidebar
              :alerts="alerts"
              :selected-id="selectedId"
              :disabled="!user"
              @select="(a) => navigateTo('/alerts/' + a.id)"
              @new="navigateTo('/alerts/new')"
              @deselect="navigateTo('/alerts/list')"
          />
        </div>

        <div class="split-right">
          <slot :key="route.path"/>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Main content absorbs the remaining viewport height; min-height: 0 is
 * critical for flex children that themselves need to scroll internally. */
.main-content {
  width: 100%;
  padding: 0;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.split {
  display: grid;
  grid-template-columns: var(--sidebar-w, 200px) 1fr;
  gap: 0;
  height: 100%;
  --sidebar-w: 200px;
  transition: grid-template-columns 0.18s ease;
}

.split.sidebar-collapsed {
  --sidebar-w: 64px;
}

.split-left {
  min-height: 0;
  height: 100%;
  overflow-y: auto;

  padding: 14px 0 14px 0;
}

/* Right column is a flex container: the routed component (panel or
 * wizard) flexes to fill it exactly. NO scroll here — each routed
 * component owns its own internal scroll (AlertLogs, wizard-content). */
.split-right {
  padding: 14px;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.split-right > * {
  flex: 1;
  min-height: 0;
}
</style>
