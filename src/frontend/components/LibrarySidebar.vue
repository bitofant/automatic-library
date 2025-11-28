<template>
  <v-navigation-drawer
    :model-value="expanded"
    @update:model-value="$emit('toggle')"
    temporary
  >
    <v-list>
      <!-- Home button -->
      <v-list-item
        prepend-icon="mdi-home"
        title="Home"
        @click="$emit('select-library', 'home')"
      />

      <v-divider />

      <!-- Root library (if exists) -->
      <template v-if="librariesData.root">
        <v-list-subheader>Root</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-folder"
          :title="librariesData.root.name"
          @click="$emit('select-library', librariesData.root.path)"
        />
        <v-divider />
      </template>

      <!-- Folder tree -->
      <v-list-subheader class="d-flex align-center">
        <span class="flex-grow-1">Libraries</span>
        <v-btn
          icon="mdi-play"
          size="x-small"
          variant="text"
          @click.stop="$emit('select-library', '__root__')"
          title="Open root folder"
        />
      </v-list-subheader>
      <LibraryTreeNode
        v-for="node in librariesData.folders"
        :key="node.path"
        :node="node"
        @select="$emit('select-library', $event)"
      />
    </v-list>

    <!-- Settings at bottom -->
    <template #append>
      <v-divider />
      <v-list density="compact">
        <v-list-item>
          <v-checkbox
            :model-value="includeSubfolders"
            @update:model-value="$emit('update:include-subfolders', $event)"
            label="Show images from subfolders"
            hide-details
            density="compact"
          />
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import type { LibrariesResponse } from '../types'
import LibraryTreeNode from './LibraryTreeNode.vue'

defineProps<{
  librariesData: LibrariesResponse
  expanded: boolean
  includeSubfolders: boolean
}>()

defineEmits<{
  toggle: []
  'select-library': [path: string]
  'update:include-subfolders': [value: boolean]
}>()
</script>
