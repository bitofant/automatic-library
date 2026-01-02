<template>
  <!-- Leaf node (no children) -->
  <template v-if="node.children.length === 0">
    <v-list-item
      :prepend-icon="node.hasImages ? 'mdi-folder-image' : 'mdi-folder'"
      :title="node.name"
      @click="handleSelect"
    />
  </template>

  <!-- Branch node (has children) -->
  <v-list-group v-else :value="node.path">
    <template #activator="{ props }">
      <v-list-item
        v-bind="props"
        :prepend-icon="node.hasImages ? 'mdi-folder-image' : 'mdi-folder-outline'"
        :title="node.name"
      >
        <!-- Add action button to open folder if it has images -->
        <template v-if="node.hasImages" #append>
          <v-btn
            icon="mdi-play"
            size="small"
            variant="text"
            @click.stop="handleSelect"
            title="Open library"
          />
        </template>
      </v-list-item>
    </template>

    <!-- Recursive children -->
    <LibraryTreeNode
      v-for="child in node.children"
      :key="child.path"
      :node="child"
      @select="$emit('select', $event)"
    />
  </v-list-group>
</template>

<script setup lang="ts">
import type { LibraryNode } from '../types'

const props = defineProps<{
  node: LibraryNode
}>()

const emit = defineEmits<{
  select: [path: string]
}>()

function handleSelect() {
  if (props.node.hasImages) {
    emit('select', props.node.path)
  }
}
</script>

<style scoped>
/* Reduce spacing between icon and text */
:deep(.v-list-item) {
  --v-list-prepend-gap: 8px;
}
</style>
