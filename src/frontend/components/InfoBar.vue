<template>
  <div
    v-if="info"
    id="info-bar"
    :class="{ 'scaled': isHovered }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    {{ info }}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  info: string
}>()

const isHovered = ref(false)
</script>

<style scoped>
#info-bar {
  z-index: 50;
  position: fixed;
  bottom: 0;
  left: 0;
  display: inline-block;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 0.2em 0.5em 0.2em 0.5em;
  font-size: .7em;
  text-align: left;
  border-top-right-radius: .6em;
  opacity: .6;
  transform-origin: bottom left;
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}

#info-bar.scaled {
  transform: scale(1.5);
  opacity: 0.9;
}
</style>
