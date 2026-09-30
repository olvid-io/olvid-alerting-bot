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
import { computed } from "vue";

/*
  Renders parsed XML as it would look in the original document:

    <sens_termica>  => tag name
      Sensacion térimica  => text node
      <maxima>41</maxima>  => child element with primitive value
      <dato hora="06">23</dato> => child element with attr + primitive value
      <dato hora="12">39</dato>
    </sens_termica>

  Rules:
    - Arrays never occupy a visual slot. In XML they come from repeated
      tags, so each element re-uses THIS node's own `nodeName` as its
      tag. The numeric index stays in `path` for Handlebars.
    - Object values are classified into attrs (`@_xxx`), text (`#text`)
      and children (everything else) so the raw fast-xml-parser shape
      renders as native-looking XML.
    - Click semantics preserve per-leaf granularity — the paths emitted
      match what the shared conditionEvaluator resolves against the
      payload:
        · primitive element                       → emits `path`
        · text-only element (parsed as `{#text}`)  → emits `path.#text`
        · attribute click                         → emits `path.@_name`
        · text-in-mixed-content click             → emits `path.#text`
    - Attrs, text and single-line elements get their own `.selected`
      highlight so the user sees which fields are already watched.
*/

defineOptions({ name: "XmlTreeNode" });

const props = withDefaults(
    defineProps<{
      nodeName: string;
      nodeValue: any;
      path: string;
      selected?: string[]; // paths already watched (highlight targets)
      depth?: number;
    }>(),
    {
      selected: () => [],
      depth: 0,
    },
);

const emit = defineEmits<{ (e: "select", path: string): void }>();

const { isBranch, isArray, isObject } = useTreeNode(props);

/** Split an object value into XML-native buckets. */
const parts = computed(() => {
  const attrs: Array<[string, unknown]> = [];
  let text: unknown = undefined;
  const children: Array<[string, unknown]> = [];
  if (isObject.value) {
    for (const [k, v] of Object.entries(
        props.nodeValue as Record<string, unknown>,
    )) {
      if (k.startsWith("@_")) attrs.push([k.slice(2), v]);
      else if (k === "#text") text = v;
      else children.push([k, v]);
    }
  }
  return { attrs, text, children };
});

const hasChildren = computed(() => parts.value.children.length > 0);
const hasText = computed(() => parts.value.text !== undefined);
const hasAttrs = computed(() => parts.value.attrs.length > 0);

const indent = (d: number) => ({ paddingLeft: `${d * 12}px` });

const attrPath = (name: string) => `${props.path}.@_${name}`;
const textPath = computed(() => `${props.path}.#text`);
const isSelected = (p: string) => props.selected.includes(p);

/** Path emitted by the whole-line click. For a text-only element the
 *  meaningful leaf is the text node, so we emit the `.#text` path — that
 *  resolves to the number/string against the payload, not to the
 *  `{#text: ...}` wrapper object. Primitives keep their own path. */
const linePath = computed<string | null>(() => {
  if (!isBranch.value) return props.path; // primitive value
  if (!hasChildren.value && !hasAttrs.value && hasText.value)
    return textPath.value; // text-only object
  return null; // attrs / self-closing / mixed → per-piece clicks only
});

const isLineSelected = computed(() =>
    linePath.value ? isSelected(linePath.value) : false,
);

function onLineClick() {
  if (linePath.value !== null) emit("select", linePath.value);
}
</script>

<template>
  <!-- Array — no visual slot. Each element reuses THIS node's tag name;
       only the path index changes so Handlebars still resolves
       `parent.0`, `parent.1`, … -->
  <template v-if="isArray">
    <XmlTreeNode
        v-for="(item, i) in nodeValue as unknown[]"
        :key="i"
        :node-name="nodeName"
        :node-value="item"
        :path="`${path}.${i}`"
        :selected="selected"
        :depth="depth"
        @select="emit('select', $event)"
    />
  </template>

  <!-- Primitive value inline: `<name>value</name>`.
       Parsed shape is `{name: value}` — the VALUE lives at `path`, not
       at `path.#text`. Clicking the text line emits `path` so
       `{{root.…name}}` resolves to the primitive directly. -->
  <template v-else-if="!isBranch">
    <div class="element opening" :style="indent(depth)">
      <span class="punct">&lt;</span><span class="tag">{{ nodeName }}</span
    ><span class="punct">&gt;</span>
    </div>

    <div
        class="text-line"
        :class="{ selected: isSelected(path) }"
        :style="indent(depth + 1)"
        :title="path"
        @click="emit('select', path)"
    >
      <span class="text">{{ nodeValue }}</span>
    </div>

    <div class="element closing" :style="indent(depth)">
      <span class="punct">&lt;/</span><span class="tag">{{ nodeName }}</span
    ><span class="punct">&gt;</span>
    </div>
  </template>

  <!-- Object — dispatch by classification. -->
  <template v-else>
    <!-- Text only, no attrs, no children — line acts as the text leaf. -->
    <template v-if="!hasChildren && !hasAttrs && hasText">
      <div class="element opening" :style="indent(depth)">
        <span class="punct">&lt;</span>
        <span class="tag">{{ nodeName }}</span>
        <span class="punct">&gt;</span>
      </div>

      <div
          class="text-line"
          :class="{ selected: isLineSelected }"
          :style="indent(depth + 1)"
          :title="textPath"
          @click="onLineClick"
      >
        <span class="text">{{ parts.text }}</span>
      </div>

      <div class="element closing" :style="indent(depth)">
        <span class="punct">&lt;/</span>
        <span class="tag">{{ nodeName }}</span>
        <span class="punct">&gt;</span>
      </div>
    </template>

    <!-- Attrs + text, no children — attrs and text clickable individually. -->
    <div
        v-else-if="!hasChildren && hasText"
        class="element inline"
        :style="indent(depth)"
    >
      <span class="punct">&lt;</span><span class="tag">{{ nodeName }}</span
    ><span
        v-for="[k, v] in parts.attrs"
        :key="k"
        class="attr"
        :class="{ selected: isSelected(attrPath(k)) }"
        :title="attrPath(k)"
        @click.stop="emit('select', attrPath(k))"
    >&nbsp;<span class="attr-name">{{ k }}</span
    ><span class="punct">="</span><span class="attr-value">{{ v }}</span
    ><span class="punct">"</span></span
    ><span class="punct">&gt;</span
    ><span
        class="text clickable"
        :class="{ selected: isSelected(textPath) }"
        :title="textPath"
        :depth="depth + 1"
        @click.stop="emit('select', textPath)"
    >{{ parts.text }}</span
    ><span class="punct">&lt;/</span><span class="tag">{{ nodeName }}</span
    ><span class="punct">&gt;</span>
    </div>

    <!-- Attrs only, no text, no children — self-closing tag. -->
    <div v-else-if="!hasChildren" class="element inline" :style="indent(depth)">
      <span class="punct">&lt;</span><span class="tag">{{ nodeName }}</span
    ><span
        v-for="[k, v] in parts.attrs"
        :key="k"
        class="attr"
        :class="{ selected: isSelected(attrPath(k)) }"
        :title="attrPath(k)"
        @click.stop="emit('select', attrPath(k))"
    >&nbsp;<span class="attr-name">{{ k }}</span
    ><span class="punct">="</span><span class="attr-value">{{ v }}</span
    ><span class="punct">"</span></span
    ><span class="punct">/&gt;</span>
    </div>

    <!-- Has children — multi-line block. Opening tag first (with
         clickable attrs), then mixed text if any, then recursive
         children, then closing tag. -->
    <template v-else>
      <div class="element opening" :style="indent(depth)">
        <span class="punct">&lt;</span><span class="tag">{{ nodeName }}</span
      ><span
          v-for="[k, v] in parts.attrs"
          :key="k"
          class="attr"
          :class="{ selected: isSelected(attrPath(k)) }"
          :title="attrPath(k)"
          @click.stop="emit('select', attrPath(k))"
      >&nbsp;<span class="attr-name">{{ k }}</span
      ><span class="punct">="</span><span class="attr-value">{{ v }}</span
      ><span class="punct">"</span></span
      ><span class="punct">&gt;</span>
      </div>

      <div
          v-if="hasText"
          class="text-line"
          :class="{ selected: isSelected(textPath) }"
          :style="indent(depth + 1)"
          :depth="depth + 1"
          :title="textPath"
          @click="emit('select', textPath)"
      >
        <span class="text">{{ parts.text }}</span>
      </div>

      <XmlTreeNode
          v-for="[k, v] in parts.children"
          :key="k"
          :node-name="k"
          :node-value="v"
          :path="`${path}.${k}`"
          :selected="selected"
          :depth="depth + 1"
          @select="emit('select', $event)"
      />

      <div class="element closing" :style="indent(depth)">
        <span class="punct">&lt;/</span><span class="tag">{{ nodeName }}</span
      ><span class="punct">&gt;</span>
      </div>
    </template>
  </template>
</template>

<style scoped>
/* Baseline element line — used by the inline / opening / closing rows.
 * Only inline lines have a click affordance; opening/closing serve as
 * container chrome. */
.element {
  font-family: var(--font-mono);
  font-size: var(--text-m);
  line-height: 1.55;
  white-space: nowrap;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  padding: 2px var(--space-2);
  transition: background-color 0.12s,
  border-color 0.12s;
}

.element.inline {
  cursor: pointer;
}

.element.inline:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
}

.element.inline.selected {
  background: color-mix(in srgb, var(--color-success) 16%, transparent);
  border-color: color-mix(in srgb, var(--color-success) 50%, transparent);
}

.text-line {
  font-family: var(--font-mono);
  font-size: var(--text-m);
  line-height: 1.55;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.12s,
  border-color 0.12s;
}

.text-line:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
}

.text-line.selected {
  background: color-mix(in srgb, var(--color-success) 16%, transparent);
  border-color: color-mix(in srgb, var(--color-success) 50%, transparent);
}

/* Syntax colors — same VS Code XML feel as the JSON tree. All syntax
 * colors are tokenised in tokens.css so the JSON + XML trees share one
 * palette; local hex is a regression, add new colors to the token
 * layer. */
.tag {
  color: var(--color-syntax-tag);
  font-weight: var(--font-weight-medium);
}

.punct {
  color: var(--color-syntax-punct);
}

.text {
  color: var(--color-syntax-text);
}

/* Attribute chip — its own click zone within the tag, with hover +
 * selected states so the user sees which attrs are already watched. */
.attr {
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 0 var(--space-1);
  transition: background-color 0.1s,
  border-color 0.1s;
  border: 1px solid transparent;
}

.attr:hover {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.attr.selected {
  background: color-mix(in srgb, var(--color-success) 22%, transparent);
  border-color: color-mix(in srgb, var(--color-success) 55%, transparent);
}

.attr-name {
  color: var(--color-syntax-attr-name);
  font-weight: var(--font-weight-medium);
}

.attr-value {
  color: var(--color-syntax-attr-value);
}

/* Text used as an in-line click zone (mixed content case). Same hover /
 * selected feel as attrs. */
.text.clickable {
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 0 var(--space-1);
  border: 1px solid transparent;
  transition: background-color 0.1s,
  border-color 0.1s;
}

.text.clickable:hover {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.text.clickable.selected {
  background: color-mix(in srgb, var(--color-success) 22%, transparent);
  border-color: color-mix(in srgb, var(--color-success) 55%, transparent);
}
</style>
