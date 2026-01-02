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
          :icon="isRefreshing ? 'mdi-loading' : 'mdi-refresh'"
          size="x-small"
          variant="text"
          :class="{ 'rotating': isRefreshing }"
          :disabled="isRefreshing"
          @click.stop="$emit('refresh')"
          title="Reload libraries from disk"
        />
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

      <!-- Star rating filters -->
      <v-list-item v-if="currentLibrary">
        <div class="filter-section">
          <div class="filter-label">Filter by rating:</div>
          <div class="filter-buttons">
            <v-btn
              v-for="star in 5"
              :key="star"
              :icon="getStarIcon(star)"
              size="small"
              variant="text"
              :color="activeSidebarFilter === getFilterValue(star) ? 'yellow-accent-3' : 'white'"
              @click="handleSidebarFilterClick(getFilterValue(star))"
              :title="getStarTitle(star)"
            />
          </div>
        </div>
      </v-list-item>

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
import { ref } from 'vue'
import type { LibrariesResponse, LibraryData } from '../types'
import LibraryTreeNode from './LibraryTreeNode.vue'

defineProps<{
  librariesData: LibrariesResponse
  expanded: boolean
  includeSubfolders: boolean
  isRefreshing: boolean
  currentLibrary: LibraryData | null
}>()

const emit = defineEmits<{
  toggle: []
  'select-library': [path: string]
  'update:include-subfolders': [value: boolean]
  refresh: []
  'filter-change': [filter: 1|2|3|4|5|null]
}>()

// Independent sidebar filter state
const activeSidebarFilter = ref<1|2|3|4|5|null>(null)

// Converts star position (1-5) to filter value
function getFilterValue(star: number): 1|2|3|4|5 {
  return star as 1|2|3|4|5
}

// Determines if a star should be filled based on active filter
function getStarIcon(star: number): string {
  if (activeSidebarFilter.value === null) {
    return 'mdi-star-outline' // All empty when no filter
  }

  // If we have a filter, fill stars up to that level
  return star > activeSidebarFilter.value ? 'mdi-star-outline' : 'mdi-star'
}

// Gets tooltip text for star button
function getStarTitle(star: number): string {
  const symbols = {
    1: '★☆☆☆☆ (1+ stars - all rated)',
    2: '★★☆☆☆ (2+ stars)',
    3: '★★★☆☆ (3+ stars)',
    4: '★★★★☆ (4+ stars)',
    5: '★★★★★ (5 stars only)'
  }
  return symbols[star as 1|2|3|4|5]
}

function handleSidebarFilterClick(filterValue: 1|2|3|4|5) {
  // Toggle: if clicking same filter, turn it off
  if (activeSidebarFilter.value === filterValue) {
    activeSidebarFilter.value = null
    emit('filter-change', null)
  } else {
    activeSidebarFilter.value = filterValue
    emit('filter-change', filterValue)
  }
}
</script>

<style scoped>
.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 0.875rem;
  opacity: 0.7;
}

.filter-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}

/* Reduce spacing between icon and text */
:deep(.v-list-item) {
  --v-list-prepend-gap: 8px;
}
</style>
