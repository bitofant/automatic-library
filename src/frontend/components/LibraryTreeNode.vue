<template>
  <!-- Leaf node (no children) -->
  <template v-if="node.children.length === 0">
    <v-list-item
      :prepend-icon="displayIcon"
      :title="displayName"
      @click="handleSelect"
      class="folder-node"
    >
      <template #append>
        <v-btn
          icon="mdi-pencil"
          size="small"
          variant="text"
          class="edit-button"
          @click.stop="$emit('edit', node.path)"
          title="Edit folder name/icon"
        />
      </template>
    </v-list-item>
  </template>

  <!-- Branch node (has children) -->
  <v-list-group v-else :value="node.path">
    <template #activator="{ props }">
      <v-list-item
        v-bind="props"
        :prepend-icon="displayIcon"
        :title="displayName"
        class="folder-node"
      >
        <template #append>
          <!-- Play button if has images -->
          <v-btn
            v-if="node.hasImages"
            icon="mdi-play"
            size="small"
            variant="text"
            @click.stop="handleSelect"
            title="Open library"
          />
          <!-- Edit button -->
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            class="edit-button"
            @click.stop="$emit('edit', node.path)"
            title="Edit folder name/icon"
          />
        </template>
      </v-list-item>
    </template>

    <!-- Recursive children -->
    <LibraryTreeNode
      v-for="child in node.children"
      :key="child.path"
      :node="child"
      :customizations="customizations"
      @select="$emit('select', $event)"
      @edit="$emit('edit', $event)"
    />
  </v-list-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LibraryNode, CustomizationsData } from '../types'

const props = defineProps<{
  node: LibraryNode
  customizations: CustomizationsData
}>()

const emit = defineEmits<{
  select: [path: string]
  edit: [path: string]
}>()

const displayName = computed(() => {
  return props.customizations[props.node.path]?.displayName || props.node.name
})

const displayIcon = computed(() => {
  const customIcon = props.customizations[props.node.path]?.icon
  if (customIcon) return customIcon

  // Default icons
  if (props.node.children.length === 0) {
    // Leaf node
    return props.node.hasImages ? 'mdi-folder-image' : 'mdi-folder'
  } else {
    // Branch node
    return props.node.hasImages ? 'mdi-folder-image' : 'mdi-folder-outline'
  }
})

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

.folder-node {
  position: relative;
}

/* Hide edit button by default, show on hover (desktop only) */
.edit-button {
  opacity: 0;
  transition: opacity 0.2s;
}

.folder-node:hover .edit-button {
  opacity: 1;
}

/* On touch devices, always show edit button */
@media (hover: none) {
  .edit-button {
    opacity: 1;
  }
}
</style>
