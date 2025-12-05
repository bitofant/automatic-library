<template>
  <div class="slideshow-container">
    <div v-if="library.files.length === 0" class="empty-state">
      <div class="empty-state-content">
        <div class="empty-state-icon">📷</div>
        <div class="empty-state-text">No images to display</div>
        <div class="empty-state-hint">Try adjusting the filter or selecting a different library</div>
      </div>
    </div>
    <Flicking
      v-else
      ref="flickingRef"
      :options="flickingOptions"
      @will-change="handleFlickingWillChange"
      @changed="handleFlickingChange"
    >
      <div
        v-for="(fileRef, index) in library.files"
        :key="`${fileRef.library}/${fileRef.file}`"
        class="flicking-panel"
      >
        <img
          :src="`/libs/${fileRef.library}/${fileRef.file}`"
          class="slideshow-image"
        />
      </div>
    </Flicking>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import Flicking from '@egjs/vue3-flicking'
import type { FlickingOptions } from '@egjs/flicking'
import type { LibraryData } from '../types'
import { useSlideshow } from '../composables/useSlideshow'
import { useKeyboardNav } from '../composables/useKeyboardNav'

const props = defineProps<{
  library: LibraryData
  initialIndex?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const libraryRef = computed(() => props.library)
const slideshow = useSlideshow(libraryRef)
const flickingRef = ref<InstanceType<typeof Flicking> | null>(null)
const isDeletingImage = ref(false)

const flickingOptions = {
  circular: true,
  duration: 300,
  inputType: ['mouse', 'touch'],
  align: 'center',
  bounce: 0,
  renderOnlyVisible: true
} as FlickingOptions

async function handleDelete() {
  isDeletingImage.value = true
  await slideshow.deleteCurrentImage()
  // Keep flag set until after watchers have run
  await nextTick()
  await nextTick()
  isDeletingImage.value = false
}

useKeyboardNav({
  onNext: slideshow.next,
  onPrevious: slideshow.previous,
  onRate: slideshow.rate,
  onClose: () => emit('close'),
  onDelete: handleDelete,
  flickingRef: flickingRef
})

function handleFlickingWillChange(event: any) {
  // Update index immediately when animation starts (for UI updates like ratings)
  if (isDeletingImage.value) {
    return
  }
  console.log('[SlideshowViewer] willChange - current:', slideshow.currentIndex.value, 'target:', event.index, 'event:', event)
  slideshow.currentIndex.value = event.index
}

function handleFlickingChange(event: any) {
  // Ignore Flicking's automatic reset during deletion
  if (isDeletingImage.value) {
    return
  }
  console.log('[SlideshowViewer] changed - index:', event.index, 'event:', event)
  // Update URL after animation completes
  slideshow.setIndex(event.index)
}

watch(() => props.library, () => {
  const targetIndex = props.initialIndex ?? 0
  slideshow.currentIndex.value = targetIndex
  if (flickingRef.value) {
    flickingRef.value.moveTo(targetIndex, 0)
  }
})

watch(() => props.initialIndex, (newIndex) => {
  if (newIndex !== undefined && flickingRef.value && newIndex !== slideshow.currentIndex.value) {
    slideshow.currentIndex.value = newIndex
    flickingRef.value.moveTo(newIndex, 0)
  }
})

// Sync Flicking when currentIndex changes programmatically (e.g., after deletion)
watch(() => slideshow.currentIndex.value, (newIndex) => {
  if (flickingRef.value && flickingRef.value.index !== newIndex && !flickingRef.value.animating) {
    flickingRef.value.moveTo(newIndex, 0)
  }
})

// Watch for files array changes (e.g., deletion) and force Flicking to sync
watch(() => props.library.files.length, async () => {
  // Use nextTick to ensure Vue has updated the DOM with new panel count
  await nextTick()
  if (flickingRef.value && props.library.files.length > 0) {
    // Clamp index to valid range
    const targetIndex = Math.min(slideshow.currentIndex.value, props.library.files.length - 1)

    // Update index if it needs clamping (let currentIndex watcher handle Flicking move)
    if (slideshow.currentIndex.value !== targetIndex) {
      slideshow.setIndex(targetIndex)
    } else if (flickingRef.value.index !== targetIndex) {
      // Index is correct but Flicking is out of sync - force sync
      flickingRef.value.moveTo(targetIndex, 0)
    }
  }
}, { flush: 'post' })

defineExpose({
  infoText: slideshow.infoText,
  rate: slideshow.rate,
  currentIndex: slideshow.currentIndex,
  currentImage: slideshow.currentImage,
  deleteCurrentImage: handleDelete
})
</script>

<style scoped>
.slideshow-container {
  width: 100vw;
  height: calc(100vh - 48px); /* Subtract app bar height (compact density = 48px) */
  position: relative;
  overflow: hidden;
}

.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
}

.empty-state-content {
  text-align: center;
  color: #999;
}

.empty-state-icon {
  font-size: 4em;
  margin-bottom: 0.5em;
  opacity: 0.5;
}

.empty-state-text {
  font-size: 1.5em;
  font-weight: 500;
  margin-bottom: 0.5em;
  color: #ccc;
}

.empty-state-hint {
  font-size: 1em;
  opacity: 0.7;
}

:deep(.flicking-viewport) {
  width: 100%;
  height: 100%;
}

:deep(.flicking-camera) {
  height: 100%;
}

.flicking-panel {
  width: 100vw;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
}

.slideshow-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  touch-action: pinch-zoom;
}
</style>
