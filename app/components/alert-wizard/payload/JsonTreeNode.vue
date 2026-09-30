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
import { ref } from "vue";

defineOptions({ name: "JsonTreeNode" });

const props = withDefaults(
    defineProps<{
      nodeName: string;
      nodeValue: any;
      path: string;
      depth?: number;
      isLast?: boolean;
      isRoot?: boolean;
      /** True when the parent is an array. Suppresses the `"key":` prefix
       *  so the child renders as a bare element in natural JSON style —
       *  the numeric index still lives in `path` for Handlebars. */
      isArrayItem?: boolean;
    }>(),
    {
      depth: 0,
      isLast: true,
      isRoot: false,
      isArrayItem: false,
    },
);

const emit = defineEmits<{ (e: "select", path: string): void }>();

const { isBranch, isArray, entries, childPath } = useTreeNode(props);

const expanded = ref(true);

const openChar = () => (isArray.value ? "[" : "{");
const closeChar = () => (isArray.value ? "]" : "}");
const summary = () =>
    isArray.value ? `[${entries.value.length}]` : `{${entries.value.length}}`;

const primitiveClass = () => {
  const v = props.nodeValue;
  if (typeof v === "string") return "string";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  return "null";
};

const primitiveValue = () => {
  const v = props.nodeValue;
  if (v === null) return "null";
  if (typeof v === "string") return `"${v}"`;
  return String(v);
};

/** True when we should print a "key": prefix on the opening line. Skipped
 *  at the root (no name at all) and on array items (bare element). */
const showKey = () => !props.isRoot && !props.isArrayItem;
</script>

<template>
  <div class="node">
    <!-- OBJECT / ARRAY -->
    <template v-if="isBranch">
      <div class="line" :style="{ paddingLeft: `${depth * 18}px` }">
        <span
            class="chevron"
            :class="{ collapsed: !expanded }"
            @click="expanded = !expanded"
        >
          ▼
        </span>

        <template v-if="showKey()">
          <span class="key" @click="emit('select', path)"
          >"{{ nodeName }}"</span
          >
          <span class="punct">:</span>
        </template>

        <span class="punct">{{ openChar() }}</span>

        <span v-if="!expanded" class="summary">{{ summary() }}</span>
        <span v-if="!expanded" class="punct">{{ closeChar() }}</span>
        <span v-if="!expanded && !isLast" class="punct">,</span>
      </div>

      <template v-if="expanded">
        <JsonTreeNode
            v-for="([k, v], i) in entries"
            :key="k"
            :node-name="k"
            :node-value="v"
            :path="childPath(k)"
            :depth="depth + 1"
            :is-last="i === entries.length - 1"
            :is-array-item="isArray"
            @select="emit('select', $event)"
        />

        <div class="line" :style="{ paddingLeft: `${depth * 18}px` }">
          <span class="close">{{ closeChar() }}</span>
          <span v-if="!isLast" class="punct">,</span>
        </div>
      </template>
    </template>

    <!-- PRIMITIVE -->
    <div
        v-else
        class="line value-line"
        :style="{ paddingLeft: `${depth * 18}px` }"
        @click="emit('select', path)"
    >
      <template v-if="showKey()">
        <span class="key">"{{ nodeName }}"</span>
        <span class="punct">:</span>
      </template>

      <span :class="primitiveClass()">{{ primitiveValue() }}</span>

      <span v-if="!isLast" class="punct">,</span>
    </div>
  </div>
</template>

<style scoped>
/* All syntax colors route through the --color-syntax-* tokens so the
 * whole tree family (JSON + XML) shares one palette. Local hex is a
 * regression — put new colors in tokens.css. */
.node {
  font-family: var(--font-mono);
  font-size: var(--text-m);
  line-height: 1.6;
  color: var(--color-text-code);
}

.line {
  white-space: pre;
}

.value-line:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.chevron {
  display: inline-block;
  width: 18px;
  color: var(--color-syntax-summary);
  cursor: pointer;
}

.chevron.collapsed {
  transform: rotate(-90deg);
}

.key {
  color: var(--color-syntax-key);
}

.string {
  color: var(--color-syntax-string);
}

.number {
  color: var(--color-syntax-number);
}

.boolean {
  color: var(--color-syntax-boolean);
}

.null {
  color: var(--color-syntax-null);
}

.punct {
  color: var(--color-text-code);
}

.close {
  color: var(--color-text-code);
  margin-left: 18px;
}

.summary {
  color: var(--color-syntax-summary);
  margin: 0 var(--space-1);
}
</style>
