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
 * Row component for alert list table. Displays status, title, input and the last created log.
 * Allows to toggle alert status.
 * @param linkedAlert AlertModel to retrieve info of
 */

import { Source } from "#shared/types/source.ts";
import { computed, toRef } from "vue";

/* Localization */
const { t } = useI18n();

/* Properties definition */
const props = defineProps<{ linkedAlert: AlertModel }>();

const { form, isPolling, isMonitoring, isWebhook } = {
  form: toRef(props, "linkedAlert"),
  isPolling: computed(() => props.linkedAlert.input === Source.Polling),
  isMonitoring: computed(() => props.linkedAlert.input === Source.Monitoring),
  isWebhook: computed(() => props.linkedAlert.input === Source.Webhook),
}

const { webhookUrl } = useAlertViewDisplay(
    form,
    isPolling,
    isMonitoring,
    isWebhook,
);


const canActivate = computed(() => form.value.bundles.length > 0);

const {
  toggleStatus,
} = useAlertActions(form);

/* Log data */
const hasLogs = computed(() => form.value.logs !== null && form.value.logs !== undefined && form.value.logs.length > 0);
const topLog = computed(() => hasLogs.value ? form.value.logs?.[0] : null);

/* Copy icon visibility */
const clicked = ref(false);
const urlToCopy = computed(() => {
  return form.value.input === Source.Webhook ? webhookUrl.value : form.value.alertParams?.url
});
const copyUrl = () => {
  if (urlToCopy.value !== undefined && urlToCopy.value !== "") {
    navigator.clipboard.writeText(urlToCopy.value);
    clicked.value = true;
    setTimeout(() => {
      clicked.value = false
    }, 2000);
  }

}

// Status toggle wrapper
const onToggleStatus = async () => {
  try {
    await toggleStatus();
  } catch (error) {
    clientLogger.debug("Alert status toggle failed :", error);
  }
};


// URL length checker
const URL_MAX_LENGTH = 40;
const urlChopper = (url: string): string => {
  if (url.length > URL_MAX_LENGTH) {
    return url.substring(0, URL_MAX_LENGTH - 1) + "...";
  }
  return url;
};

// Label for alert input
const inputLabel = (input: Source | undefined) => {
  return t(`alertList.inputs.${input}`);
}

defineEmits<{
  (e: "edit"): void; // Signal emitted when clicking on "see" button to display alert info
}>();

watch(hasLogs, (nv, ov) => {
  clientLogger.log(nv, ov, "logs changed");
  clientLogger.log(form);
})

</script>

<template>
  <tr>
    <td><span class="status-dot" :class="statusClass(form.status)" :title="statusLabel(form.status)"/></td>
    <td>{{ form.title }}</td>
    <td v-if="form.input !== undefined && form.input !== null">
      <div class="input-container">
        {{ inputLabel(form.input) }}
        <span
            v-if="form.alertParams !== undefined && form.alertParams.url !== undefined && form.alertParams.url !== ''">
          (<span class="url-span">{{ urlChopper(form.alertParams.url) }}</span>)
        </span>
        <span v-if="urlToCopy !== undefined && urlToCopy !== ''" class="copy-button" :title="$t('alertList.copyUrl')">
          <LucideCopy v-show="!clicked" class="copy-icon" @click="copyUrl"/>
          <LucideCheck v-show="clicked" class="copy-icon"/>
        </span>
      </div>
    </td>
    <td v-else class="undefined-input">{{ $t("alertList.inputs.other") }}</td>
    <td>
      <AlertLogRowDisplay
          v-if="topLog !== undefined && topLog !== null"
          :log="topLog"
      />
      <span v-else>{{ $t("alertList.noLog") }}</span>
    </td>
    <td>
      <div class="row-commands">
        <button
            type="button"
            class="btn btn-primary btn-sm inline-elem"
            @click="$emit('edit')"
        >
          {{ $t("alertList.see") }}
        </button>
        <StatusToggle
            class="inline-elem"
            :status="form.status"
            :can-activate="canActivate"
            :display-label="false"
            @update:state="onToggleStatus"
        />
      </div>

    </td>

  </tr>
</template>

<style scoped>

.input-container {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.undefined-input {
  color: var(--color-text-dim);
  font-size: var(--text-m);
  font-style: italic;
  margin: var(--space-3) 0;
}

.inline-elem {
  display: inline-flex;
  align-items: center;
  margin-left: var(--space-4);
}

/* Buttons div */
.row-commands {
  display: flex;
  align-items: center;
  justify-content: right;
}

/* URL Display */
.url-span {
  background: var(--color-bg-code);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-1);
  font-family: monospace;
  color: var(--color-text-url);
  font-size: var(--text-xs);
}

/* Copy button */
.copy-button {
  margin-left: var(--space-1);
  display: inline-flex;
  align-items: center;
}

.copy-icon {
  width: 15px;
  height: 15px;
}

</style>