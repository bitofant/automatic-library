<template>
  <div
    v-if="visible"
    class="tap-zone"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  previous: []
  next: []
  enterZoom: []
}>()

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
    // Middle 60% - enter zoom mode
    emit('enterZoom')
  }
}
</script>

<style scoped>
/* Invisible tap zone in bottom 10% for zoom mode trigger */
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
