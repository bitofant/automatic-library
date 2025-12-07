<template>
  <Transition name="zoom-fade">
    <div
      v-if="visible && image"
      class="zoom-overlay"
      @click="handleClick"
    >
      <img
        :src="`/libs/${image.library}/${image.file}`"
        :alt="image.file"
        class="zoom-image"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { FileReference } from '../types'

defineProps<{
  visible: boolean
  image: FileReference | null
}>()

const emit = defineEmits<{
  close: []
}>()

function handleClick() {
  emit('close')
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
  touch-action: pinch-zoom;
  overflow: auto;
  cursor: pointer;
}

.zoom-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pinch-zoom;
  cursor: default;
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
