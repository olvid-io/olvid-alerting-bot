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
import { ref, computed, watch } from "vue";
import type { AlertModel } from "#shared/types/alert.ts";
import type {
  MonitorParams,
  StatusMatch,
  HttpRange,
} from "#shared/types/monitor.ts";
import { isStatusMatchValid } from "#shared/polling/matcher.ts";

/**
 Step 2 for Monitoring alerts — the analogue of ConditionEditor for
 Polling. Three mutually-exclusive match modes (kind); each gates its
 own extra input. The firing behavior (trigger mode + datapoints) is
 rendered separately by the wizard step via FiringBehaviorPanel, so
 this component is only concerned with the STATUS MATCH shape.

 codes  → chips + numeric input for HTTP codes (200, 404, 503, …).
 range  → dropdown 2xx | 3xx | 4xx | 5xx.
 not-ok → nothing (any non-2xx will fire).

 Emits a fully-formed MonitorParams patch back to the wizard's form.
 */

const form = defineModel<AlertModel>({ required: true });

// Params accessor — the wizard always seeds MonitorParams before we get
// here (via useSourceBinding), so this is safe.
const params = computed<MonitorParams>(
    () => form.value.alertParams as MonitorParams,
);

// ── Match kind ────────────────────────────────────────────────────────────

type MatchKind = StatusMatch["kind"];
const KINDS: Array<{ value: MatchKind; labelKey: string }> = [
  { value: "codes", labelKey: "monitorEditor.match.kind.codes" },
  { value: "range", labelKey: "monitorEditor.match.kind.range" },
  { value: "not-ok", labelKey: "monitorEditor.match.kind.notOk" },
  { value: "no-http-response", labelKey: "monitorEditor.match.kind.noHttpResponse" },
];

const currentKind = computed<MatchKind>(
    () => params.value.match?.kind ?? "not-ok",
);

// Switching kind: preserve fields where they still make sense; otherwise
// seed a sensible default so the match is always well-formed.
function pickKind(k: MatchKind) {
  if (k === currentKind.value) return;
  let match: StatusMatch;
  switch (k) {
    case "codes":
      match = { kind: "codes", codes: [] };
      break;
    case "range":
      match = { kind: "range", range: "5xx" };
      break;
    case "not-ok":
      match = { kind: "not-ok" };
      break;
    case "no-http-response":
      match = { kind: "no-http-response" };
      break;
  }
  patchParams({ match });
}

// ── Codes editor (chips + numeric input) ──────────────────────────────────

const codesInput = ref("");
const codesError = ref("");

const codes = computed<number[]>(() =>
    params.value.match?.kind === "codes" ? params.value.match.codes : [],
);

function addCode() {
  const n = Number(codesInput.value);
  if (!Number.isInteger(n) || n < 100 || n > 599) {
    codesError.value = "Must be an HTTP code between 100 and 599.";
    return;
  }
  if (codes.value.includes(n)) {
    codesError.value = "Already added.";
    return;
  }
  patchParams({ match: { kind: "codes", codes: [...codes.value, n] } });
  codesInput.value = "";
  codesError.value = "";
}

function removeCode(n: number) {
  patchParams({
    match: { kind: "codes", codes: codes.value.filter((c) => c !== n) },
  });
}

// Watch input to clear stale errors as the user types.
watch(codesInput, () => {
  if (codesError.value) codesError.value = "";
});

// ── Range editor ──────────────────────────────────────────────────────────

const RANGES: HttpRange[] = ["2xx", "3xx", "4xx", "5xx"];
const currentRange = computed<HttpRange>(() =>
    params.value.match?.kind === "range" ? params.value.match.range : "5xx",
);
const { t } = useI18n();
const rangeOptions = computed(() =>
    RANGES.map((r) => ({
      value: r,
      label: t(`monitorEditor.match.rangeOptions.${r}`),
    })),
);

function setRange(r: HttpRange) {
  patchParams({ match: { kind: "range", range: r } });
}

// Trigger mode + firing behavior now live one level up (StepTrigger),
// via the shared <FiringBehaviorPanel>. This editor is now just the
// STATUS MATCH shape — nothing about "when does the match notify".

// ── Emit helper ───────────────────────────────────────────────────────────

function patchParams(patch: Partial<MonitorParams>) {
  form.value = {
    ...form.value,
    alertParams: { ...params.value, ...patch },
  };
}

// ── Verdict preview (green/red strip) ─────────────────────────────────────

const isValid = computed(() => isStatusMatchValid(params.value.match));
const summaryLabel = computed(() => {
  const m = params.value.match;
  if (!m) return "";
  switch (m.kind) {
    case "codes":
      return m.codes.length === 0
          ? t("monitorEditor.match.summary.noCode")
          : t("monitorEditor.match.summary.codes", { codes: m.codes.join(", ") });
    case "range":
      return t("monitorEditor.match.summary.range", { range: m.range });
    case "not-ok":
      return t("monitorEditor.match.summary.notOk");
    case "no-http-response":
      return t("monitorEditor.match.summary.noHttpResponse");
    default:
      return "Default";
  }
});
</script>

<template>
  <div class="status-match-editor">
    <!-- ── Match panell ────────────────────────────────────────────────── -->
    <div class="wcard">
      <div class="wcard-head">
        {{ $t("monitorEditor.match.label") }}
      </div>
      <div class="wcard-body">
        <!-- Kind radios -->
        <div class="btn-pill-group">
          <button
              v-for="k in KINDS"
              :key="k.value"
              type="button"
              class="btn-pill"
              :class="{ active: currentKind === k.value }"
              @click="pickKind(k.value)"
          >
            <input
                type="radio"
                :value="k.value"
                :checked="currentKind === k.value"
            >
            <span>{{ $t(k.labelKey) }}</span>
          </button>
        </div>

        <!-- Codes editor -->
        <div v-if="currentKind === 'codes'" class="mode-body">
          <div class="chips">
            <span v-for="c in codes" :key="c" class="chip">
              <span class="chip-path">{{ c }}</span>
              <button
                  type="button"
                  class="chip-x"
                  :title="`Remove ${c}`"
                  @click="removeCode(c)"
              >
                <LucideX :stroke-width="2"/>
              </button>
            </span>
            <span v-if="codes.length === 0" class="chips-empty">
              {{ $t("monitorEditor.match.codesEmpty") }}
            </span>
          </div>
          <div class="add-row">
            <input
                v-model="codesInput"
                type="number"
                min="100"
                max="599"
                step="1"
                :placeholder="$t('monitorEditor.match.codesPlaceholder')"
                class="field-input"
                :class="{ 'is-invalid': codesError }"
                @keydown.enter.prevent="addCode"
            >
            <button
                type="button"
                class="btn btn-primary btn-sm"
                @click="addCode"
            >
              {{ $t("monitorEditor.match.addCode") }}
            </button>
          </div>
          <div v-if="codesError" class="input-error">{{ codesError }}</div>
        </div>

        <!-- Range editor -->
        <div v-else-if="currentKind === 'range'" class="mode-body">
          <Select
              :model-value="currentRange"
              :options="rangeOptions"
              size="md"
              class="range-select"
              @update:model-value="setRange($event as HttpRange)"
          />
        </div>

        <!-- not-ok — no extra widget, just a hint -->
        <div v-else-if="currentKind === 'not-ok'" class="mode-body">
          <p class="hint">{{ $t("monitorEditor.match.notOkHint") }}</p>
        </div>

        <!-- not-ok — no extra widget, just a hint -->
        <div v-else class="mode-body">
          <p class="hint">{{ $t("monitorEditor.match.noHttpHint") }}</p>
        </div>

        <!-- Verdict preview — shared with ConditionEditor via the ui/
             VerdictStrip primitive. -->
        <VerdictStrip :ok="isValid" :label="summaryLabel"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-match-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* ── Body sections per kind ────────────────────────────────────────── */
.mode-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-height: 32px;
  align-items: center;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  color: var(--color-accent-text);
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: var(--text-s);
}

.chip-x {
  appearance: none;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font-size: var(--text-xs);
  opacity: 0.7;
}

.chip-x:hover {
  opacity: 1;
}

.chips-empty {
  color: var(--color-text-faint);
  font-size: var(--text-s);
  font-style: italic;
}

.add-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.add-row .field-input {
  width: 140px;
}

.range-select {
  max-width: 260px;
}

.hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-s);
  line-height: 1.4;
}

.input-error {
  color: var(--color-danger-text, #b91c1c);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

/* Error state now provided by `.field-input.is-invalid` in
 * components/input.css — nothing to redeclare here. */

/* Verdict strip now delegated to ui/VerdictStrip (shared with the
 * polling ConditionEditor). Trigger mode field delegated to
 * ui/TriggerModePicker. Local styles removed to avoid divergence. */
</style>
