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
/**
 * General toggle component which emits status via v-model.
 */
defineProps<{
  canActivate: boolean;
}>();

const status = defineModel<boolean>();

</script>
<template>
  <div class="toggle-wrap">
    <button
        type="button"
        class="toggle"
        :class="{ on: status && canActivate}"
        :disabled="!canActivate"
        @click="status = !status"
    >
      <span class="knob"/>
    </button>
  </div>
</template>
<style scoped>

</style>
