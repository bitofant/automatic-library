<template>
  <v-app>
    <v-app-bar color="dark" density="compact">
      <v-app-bar-nav-icon @click="sidebarExpanded = !sidebarExpanded" />
      <v-app-bar-title>Automatic Library</v-app-bar-title>

      <v-spacer />

      <!-- Only show when library is loaded -->
      <template v-if="currentLibrary">
        <v-btn
          v-for="star in 5"
          :key="star"
          :icon="getStarIcon(star)"
          variant="text"
          :color="activeFilter === getFilterValue(star) ? 'yellow-accent-3' : 'white'"
          @click="handleFilterClick(getFilterValue(star))"
          :title="getStarTitle(star)"
        />
      </template>
    </v-app-bar>

    <LibrarySidebar
      :librariesData="librariesData"
      :expanded="sidebarExpanded"
      :includeSubfolders="includeSubfolders"
      @toggle="sidebarExpanded = !sidebarExpanded"
      @select-library="handleSelectLibrary"
      @update:include-subfolders="handleUpdateIncludeSubfolders"
    />

    <v-main>
      <WelcomeScreen v-if="!currentLibrary" />
      <SlideshowViewer
        v-else
        ref="slideshowRef"
        :library="currentLibrary"
        :initial-index="initialIndex"
        @close="handleCloseLibrary"
      />
    </v-main>

    <InfoBar :info="infoText" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import LibrarySidebar from './components/LibrarySidebar.vue'
import SlideshowViewer from './components/SlideshowViewer.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import InfoBar from './components/InfoBar.vue'
import { useLibraries } from './composables/useLibraries'
import { useDevMode } from './composables/useDevMode'

const { librariesData, currentLibrary, activeFilter, fetchLibraries, loadLibrary, closeLibrary, setFilter } = useLibraries()
const route = useRoute()
const { initDevMode } = useDevMode()
const sidebarExpanded = ref(false)
const slideshowRef = ref<InstanceType<typeof SlideshowViewer> | null>(null)
const initialIndex = ref(0)

// Load includeSubfolders from localStorage, default to false
const includeSubfolders = ref(localStorage.getItem('includeSubfolders') === 'true')

const infoText = computed(() => {
  return slideshowRef.value?.infoText || ''
})

// Converts star position (1-5) to filter value
function getFilterValue(star: number): 1|2|3|4|5 {
  return star as 1|2|3|4|5
}

// Determines if a star should be filled based on active filter
function getStarIcon(star: number): string {
  if (activeFilter.value === null) {
    return 'mdi-star-outline' // All empty when no filter
  }

  // If we have a filter, fill stars up to that level
  return star > activeFilter.value ? 'mdi-star-outline' : 'mdi-star'
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

function handleFilterClick(filterValue: 1|2|3|4|5) {
  // Reset to first image when applying filter
  initialIndex.value = 0
  setFilter(filterValue)
}

onMounted(async () => {
  await fetchLibraries()
  initDevMode()

  // Load library from route if present
  if (route.params.path) {
    const index = route.params.index ? parseInt(route.params.index as string) : 0
    initialIndex.value = index

    // Decode path: replace ~ with / and handle root special case
    const urlPath = route.params.path as string
    const decodedPath = urlPath === 'root' ? '__root__' : urlPath.replace(/~/g, '/')

    await loadLibrary(decodedPath, null, index, includeSubfolders.value)
  }
})

// Watch route changes (browser back/forward)
watch(() => [route.params.path, route.params.index], async ([newPath, newIndex]) => {
  if (newPath) {
    // Update initial index
    const index = newIndex ? parseInt(newIndex as string) : 0
    initialIndex.value = index

    // Decode path: replace ~ with / and handle root special case
    const urlPath = newPath as string
    const decodedPath = urlPath === 'root' ? '__root__' : urlPath.replace(/~/g, '/')

    // Only load if it's different from current
    if (!currentLibrary.value || currentLibrary.value.name !== decodedPath) {
      await loadLibrary(decodedPath, null, index, includeSubfolders.value)
    }
  } else {
    // No path means home route
    if (currentLibrary.value) {
      currentLibrary.value = null
      document.title = 'Automatic Library'
    }
  }
})

async function handleSelectLibrary(path: string) {
  if (path === 'home') {
    closeLibrary()
  } else {
    await loadLibrary(path, null, undefined, includeSubfolders.value)
  }
  sidebarExpanded.value = false
}

async function handleUpdateIncludeSubfolders(value: boolean) {
  includeSubfolders.value = value
  // Persist to localStorage
  localStorage.setItem('includeSubfolders', value.toString())
  // Reload current library if one is loaded
  if (currentLibrary.value) {
    await loadLibrary(currentLibrary.value.name, activeFilter.value, undefined, value)
  }
}

function handleCloseLibrary() {
  closeLibrary()
}
</script>
