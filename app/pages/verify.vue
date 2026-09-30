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
const route = useRoute();
const status = ref<"pending" | "success" | "error">("pending");

const { t } = useI18n();

useHead({
  title: t("pageTitle.verify"),
})

const token = computed(() => {
  const t = route.query.token;
  return typeof t === "string" ? t : "";
});

onMounted(async () => {
  if (!token.value) {
    status.value = "error";
    return;
  }
  try {
    await authService.verifyEmail(token.value);
    status.value = "success";
  } catch {
    status.value = "error";
  }
});
</script>

<template>
  <AuthCard>
    <template v-if="status === 'pending'">
      <h4>{{ $t("auth.verify.pending") }}</h4>
    </template>
    <template v-else-if="status === 'success'">
      <h4>{{ $t("auth.verify.successTitle") }}</h4>
      <p class="hint">{{ $t("auth.verify.successBody") }}</p>
      <NuxtLink to="/login" class="btn btn-primary">
        {{ $t("auth.verify.successCta") }}
      </NuxtLink>
    </template>
    <template v-else>
      <h4>{{ $t("auth.verify.errorTitle") }}</h4>
      <p class="hint">{{ $t("auth.verify.errorBody") }}</p>
      <NuxtLink to="/login" class="btn btn-primary">
        {{ $t("auth.verify.errorCta") }}
      </NuxtLink>
    </template>
  </AuthCard>
</template>

<style scoped>
.hint {
  color: var(--color-text-muted);
  font-size: var(--text-s);
  margin-top: var(--space-3);
  margin-bottom: var(--space-4);
}
</style>
