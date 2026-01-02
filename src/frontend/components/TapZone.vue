<template>
  <!-- Black overlay for hiding UI -->
  <Transition name="overlay-fade">
    <div
      v-if="overlayVisible"
      class="ui-overlay"
    />
  </Transition>

  <!-- Tap zone in bottom 10% -->
  <div
    v-if="visible"
    class="tap-zone"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  previous: []
  next: []
}>()

const OVERLAY_HIDE_KEY = 'tapzone-overlay-hidden-timestamp'
const HIDE_DURATION_MS = 5 * 60 * 1000  // 5 minutes

// Initialize overlay visibility based on localStorage timestamp
function initializeOverlayVisibility(): boolean {
  const hiddenTimestamp = localStorage.getItem(OVERLAY_HIDE_KEY)

  if (!hiddenTimestamp) {
    // No timestamp stored, show overlay
    return true
  }

  const timestamp = parseInt(hiddenTimestamp, 10)
  const now = Date.now()
  const timeSinceHidden = now - timestamp

  // Show overlay if more than 5 minutes have passed
  return timeSinceHidden > HIDE_DURATION_MS
}

const overlayVisible = ref(initializeOverlayVisibility())

// Persist timestamp when overlay is hidden
watch(overlayVisible, (newValue) => {
  if (!newValue) {
    // Overlay was hidden, save current timestamp
    localStorage.setItem(OVERLAY_HIDE_KEY, Date.now().toString())
  }
})

// Show overlay when user returns to tab/app
function handleVisibilityChange() {
  overlayVisible.value = true;
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function handleClick(event: MouseEvent) {
  const clickX = event.clientX
  const screenWidth = window.innerWidth
  const leftThreshold = screenWidth * 0.2  // Left 20%
  const rightThreshold = screenWidth * 0.8  // Right 80%

  if (clickX < leftThreshold) {
    // Left 20% - previous image
    emit('previous')
  } else if (clickX > rightThreshold) {
    // Right 20% - next image
    emit('next')
  } else {
    // Middle 60% - toggle UI overlay
    overlayVisible.value = !overlayVisible.value
  }
}
</script>

<style scoped>
/* Black overlay for hiding UI - covers entire screen */
.ui-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1007;  /* Above app bar (1006), below ZoomOverlay (2000) */
  background: #000;
  pointer-events: none;  /* Overlay is passive, only tap zone toggles it */
}

/* Fade transition (200ms to match ZoomOverlay) */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.7s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* Invisible tap zone in bottom 10% for navigation and overlay toggle */
.tap-zone {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 10vh;
  z-index: 60;  /* Above InfoBar (50) */
  background: transparent;
  pointer-events: auto;
  cursor: pointer;
}
</style>
