<template>
  <Transition name="zoom-fade">
    <div
      v-if="visible && image"
      class="zoom-overlay"
      @click="handleOverlayClick"
    >
      <img
        ref="imageRef"
        :src="`/libs/${image.library}/${image.file}`"
        :alt="image.file"
        class="zoom-image"
        @mousedown="handlePointerDown"
        @touchstart="handlePointerDown"
        @mouseup="handlePointerUp"
        @touchend="handlePointerUp"
        @dblclick.prevent
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import panzoom from 'panzoom'
import type { FileReference } from '../types'

const props = defineProps<{
  visible: boolean
  image: FileReference | null
}>()

const emit = defineEmits<{
  close: []
}>()

const imageRef = ref<HTMLImageElement | null>(null)
let panzoomInstance: ReturnType<typeof panzoom> | null = null
let pointerDownPos: { x: number; y: number } | null = null

// Initialize panzoom when image becomes visible
watch([() => props.visible, imageRef], ([visible, imgEl]) => {
  // Clean up existing instance
  if (panzoomInstance) {
    panzoomInstance.dispose()
    panzoomInstance = null
  }

  // Reset pointer tracking
  pointerDownPos = null

  // Create new instance when visible and image element exists
  if (visible && imgEl) {
    panzoomInstance = panzoom(imgEl, {
      maxZoom: 5,
      minZoom: 0.5,
      bounds: true,
      boundsPadding: 0.1,
      smoothScroll: false
    })
  }
}, { flush: 'post' })

// Clean up on unmount
onUnmounted(() => {
  if (panzoomInstance) {
    panzoomInstance.dispose()
  }
})

function handlePointerDown(e: MouseEvent | TouchEvent) {
  // Record starting position
  if (e instanceof MouseEvent) {
    pointerDownPos = { x: e.clientX, y: e.clientY }
  } else if (e.touches.length > 0) {
    pointerDownPos = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
  }
}

function handlePointerUp(e: MouseEvent | TouchEvent) {
  if (!pointerDownPos) return

  // Get end position
  let endX: number, endY: number
  if (e instanceof MouseEvent) {
    endX = e.clientX
    endY = e.clientY
  } else if (e.changedTouches.length > 0) {
    endX = e.changedTouches[0]!.clientX
    endY = e.changedTouches[0]!.clientY
  } else {
    return
  }

  // Calculate movement distance
  const dx = endX - pointerDownPos.x
  const dy = endY - pointerDownPos.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // If movement was minimal (< 10px), treat as a tap and close
  if (distance < 10) {
    emit('close')
  }

  pointerDownPos = null
}

function handleOverlayClick(e: MouseEvent) {
  // Only close if clicking the overlay background, not the image
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<style scoped>
.zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

.zoom-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
}

.zoom-image:active {
  cursor: grabbing;
}

/* Fade transition for smooth appearance */
.zoom-fade-enter-active,
.zoom-fade-leave-active {
  transition: opacity 0.2s ease;
}

.zoom-fade-enter-from,
.zoom-fade-leave-to {
  opacity: 0;
}
</style>
