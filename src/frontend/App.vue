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
          :icon="getRatingIcon(star)"
          variant="text"
          :color="getRatingIcon(star) === 'mdi-star' ? 'yellow-accent-3' : 'white'"
          @click="handleRatingClick(getFilterValue(star))"
          :title="getRatingTitle(star)"
        />

        <v-btn
          icon="mdi-information-outline"
          variant="text"
          color="white"
          class="d-none d-md-inline-flex"
          @click="handleInfoClick"
          title="View image information (I)"
        />

        <v-btn
          icon="mdi-delete"
          variant="text"
          color="white"
          @click="handleDeleteClick"
          title="Delete current image (Del key)"
        />

        <v-btn
          :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
          variant="text"
          color="white"
          @click="toggleFullscreen"
          :title="isFullscreen ? 'Exit fullscreen (F11)' : 'Enter fullscreen (F11)'"
        />
      </template>
    </v-app-bar>

    <LibrarySidebar
      :librariesData="librariesData"
      :expanded="sidebarExpanded"
      :includeSubfolders="includeSubfolders"
      :isRefreshing="isRefreshing"
      :currentLibrary="currentLibrary"
      @toggle="sidebarExpanded = !sidebarExpanded"
      @select-library="handleSelectLibrary"
      @update:include-subfolders="handleUpdateIncludeSubfolders"
      @refresh="handleRefresh"
      @filter-change="handleSidebarFilterChange"
    />

    <v-main>
      <WelcomeScreen v-if="!currentLibrary" />
      <SlideshowViewer
        v-else
        ref="slideshowRef"
        :library="currentLibrary"
        :initial-index="initialIndex"
        @close="handleCloseLibrary"
        @enter-zoom="handleEnterZoom"
        @fullscreen="toggleFullscreen"
        @info="handleInfoClick"
      />
    </v-main>

    <InfoBar :info="infoText" />

    <TapZone
      :visible="!!currentLibrary"
      @previous="slideshowRef?.navigatePrevious()"
      @next="slideshowRef?.navigateNext()"
      @enter-zoom="handleEnterZoom"
    />

    <ZoomOverlay
      :visible="zoomOverlayVisible"
      :image="currentImage"
      @close="handleZoomOverlayClose"
    />

    <InfoModal
      :visible="infoModalVisible"
      :image="currentImage"
      @close="handleInfoModalClose"
    />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import LibrarySidebar from './components/LibrarySidebar.vue'
import SlideshowViewer from './components/SlideshowViewer.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import InfoBar from './components/InfoBar.vue'
import TapZone from './components/TapZone.vue'
import ZoomOverlay from './components/ZoomOverlay.vue'
import InfoModal from './components/InfoModal.vue'
import { useLibraries } from './composables/useLibraries'
import { useDevMode } from './composables/useDevMode'

const { librariesData, currentLibrary, activeFilter, isRefreshing, fetchLibraries, loadLibrary, closeLibrary, setFilter, refreshLibraries } = useLibraries()
const route = useRoute()
const { initDevMode } = useDevMode()
const sidebarExpanded = ref(false)
const slideshowRef = ref<InstanceType<typeof SlideshowViewer> | null>(null)
const initialIndex = ref(0)
const isFullscreen = ref(false)
const zoomOverlayVisible = ref(false)
const infoModalVisible = ref(false)

// Load includeSubfolders from localStorage, default to false
const includeSubfolders = ref(localStorage.getItem('includeSubfolders') === 'true')

const infoText = computed(() => {
  return slideshowRef.value?.infoText || ''
})

const currentImage = computed(() => {
  return slideshowRef.value?.currentImage || null
})

// Computed property for current image rating - reactive to image changes
// Accesses the currentImage from the slideshow to ensure proper reactivity
const currentImageRating = computed(() => {
  // currentImage is automatically unwrapped by Vue when accessed through ref
  const currentImg = slideshowRef.value?.currentImage
  const rating = currentImg?.rating ?? null
  return rating
})

// Converts star position (1-5) to rating value
function getFilterValue(star: number): 1|2|3|4|5 {
  return star as 1|2|3|4|5
}

// Determines if a star should be filled based on current image rating
function getRatingIcon(star: number): string {
  const rating = currentImageRating.value
  if (rating === null || rating === undefined) {
    return 'mdi-star-outline'
  }
  return star <= rating ? 'mdi-star' : 'mdi-star-outline'
}

// Gets tooltip text for rating button
function getRatingTitle(star: number): string {
  const symbols = {
    1: 'Rate ★☆☆☆☆ (1 star)',
    2: 'Rate ★★☆☆☆ (2 stars)',
    3: 'Rate ★★★☆☆ (3 stars)',
    4: 'Rate ★★★★☆ (4 stars)',
    5: 'Rate ★★★★★ (5 stars)'
  }
  return symbols[star as 1|2|3|4|5]
}

async function handleRatingClick(rating: 1|2|3|4|5) {
  if (slideshowRef.value?.rate) {
    await slideshowRef.value.rate(rating)
  }
}

async function handleDeleteClick() {
  if (slideshowRef.value?.deleteCurrentImage) {
    await slideshowRef.value.deleteCurrentImage()
  }
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error('Error toggling fullscreen:', error)
  }
}

function handleEnterZoom() {
  if (currentImage.value) {
    zoomOverlayVisible.value = true
  }
}

function handleZoomOverlayClose() {
  zoomOverlayVisible.value = false
}

function handleInfoClick() {
  if (currentImage.value) {
    infoModalVisible.value = true
  }
}

function handleInfoModalClose() {
  infoModalVisible.value = false
}

// Listen for fullscreen changes to update button state
function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

async function handleSidebarFilterChange(filterValue: 1|2|3|4|5|null) {
  // Reset to first image when applying filter
  initialIndex.value = 0

  if (!currentLibrary.value) return

  // If filterValue is null, we're clearing the filter
  if (filterValue === null) {
    await loadLibrary(currentLibrary.value.name, null, 0, includeSubfolders.value)
  } else {
    // Otherwise apply the filter
    await loadLibrary(currentLibrary.value.name, filterValue, 0, includeSubfolders.value)
  }
}

onMounted(async () => {
  await fetchLibraries()
  initDevMode()

  // Set up fullscreen change listener
  document.addEventListener('fullscreenchange', handleFullscreenChange)

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

onUnmounted(() => {
  // Clean up fullscreen listener
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
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

async function handleRefresh() {
  await refreshLibraries(includeSubfolders.value)
}

function handleCloseLibrary() {
  closeLibrary()
}
</script>

<style scoped>
/* Smooth transition for star rating changes */
:deep(.v-btn .v-icon) {
  transition: all 0.3s ease-in-out;
}

/* Slightly scale up stars when they become filled */
:deep(.v-btn .mdi-star) {
  transform: scale(1.05);
}

:deep(.v-btn .mdi-star-outline) {
  transform: scale(1);
}
</style>
