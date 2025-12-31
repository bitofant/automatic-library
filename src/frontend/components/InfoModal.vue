<template>
  <Transition name="modal-fade">
    <div
      v-if="visible"
      class="info-modal-overlay"
      @click="handleOverlayClick"
    >
      <v-card class="info-modal-content" @click.stop>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Image Information</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="emit('close')"
          />
        </v-card-title>

        <v-divider />

        <v-card-text class="info-modal-body">
          <div v-if="loading" class="loading-state">
            <v-progress-circular indeterminate color="primary" />
            <p class="mt-4">Loading metadata...</p>
          </div>

          <div v-else-if="error" class="error-state">
            <v-icon icon="mdi-alert-circle" color="error" size="large" class="mb-2" />
            <p>{{ error }}</p>
          </div>

          <div v-else-if="metadata" class="metadata-content">
            <!-- Basic Information -->
            <div class="info-section">
              <h3 class="section-title">Basic Information</h3>
              <div class="info-item">
                <strong>Filename:</strong>
                <span>{{ metadata.filename }}</span>
              </div>
              <div class="info-item">
                <strong>Resolution:</strong>
                <span>{{ metadata.width }} × {{ metadata.height }}</span>
              </div>
              <div class="info-item">
                <strong>File Size:</strong>
                <span>{{ formatFileSize(metadata.fileSize) }}</span>
              </div>
              <div class="info-item">
                <strong>Created:</strong>
                <span>{{ formatDate(metadata.createdAt) }}</span>
              </div>
              <div class="info-item">
                <strong>Full Path:</strong>
                <span class="path-text">{{ metadata.fullPath }}</span>
              </div>
              <div v-if="image?.rating" class="info-item">
                <strong>Rating:</strong>
                <span>{{ formatRating(image.rating) }}</span>
              </div>
            </div>

            <!-- PNG Metadata Section -->
            <div v-if="metadata.isPng && metadata.pngMetadata" class="info-section">
              <h3 class="section-title">Generation Parameters</h3>
              <div v-if="metadata.pngMetadata.prompt" class="info-item prompt-item">
                <div class="prompt-header">
                  <strong>Prompt:</strong>
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="x-small"
                    @click="copyToClipboard(metadata.pngMetadata.prompt)"
                    :title="copiedPrompt ? 'Copied!' : 'Copy to clipboard'"
                    :color="copiedPrompt ? 'success' : undefined"
                  />
                </div>
                <p class="prompt-text">{{ metadata.pngMetadata.prompt }}</p>
              </div>

              <div v-if="metadata.pngMetadata.negativePrompt" class="info-item prompt-item">
                <div class="prompt-header">
                  <strong>Negative Prompt:</strong>
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="x-small"
                    @click="copyToClipboard(metadata.pngMetadata.negativePrompt)"
                    :title="copiedNegative ? 'Copied!' : 'Copy to clipboard'"
                    :color="copiedNegative ? 'success' : undefined"
                  />
                </div>
                <p class="prompt-text">{{ metadata.pngMetadata.negativePrompt }}</p>
              </div>

              <div class="params-grid">
                <div v-if="metadata.pngMetadata.steps" class="info-item">
                  <strong>Steps:</strong>
                  <span>{{ metadata.pngMetadata.steps }}</span>
                </div>
                <div v-if="metadata.pngMetadata.seed !== undefined" class="info-item">
                  <strong>Seed:</strong>
                  <span>{{ metadata.pngMetadata.seed }}</span>
                </div>
                <div v-if="metadata.pngMetadata.sampler" class="info-item">
                  <strong>Sampler:</strong>
                  <span>{{ metadata.pngMetadata.sampler }}</span>
                </div>
                <div v-if="metadata.pngMetadata.cfgScale" class="info-item">
                  <strong>CFG Scale:</strong>
                  <span>{{ metadata.pngMetadata.cfgScale }}</span>
                </div>
                <div v-if="metadata.pngMetadata.model" class="info-item">
                  <strong>Model:</strong>
                  <span>{{ metadata.pngMetadata.model }}</span>
                </div>
                <div v-if="metadata.pngMetadata.size" class="info-item">
                  <strong>Size:</strong>
                  <span>{{ metadata.pngMetadata.size }}</span>
                </div>
              </div>
            </div>

            <!-- No metadata message -->
            <div v-else-if="metadata.isPng && !metadata.pngMetadata" class="info-message">
              <v-icon icon="mdi-information-outline" class="mr-2" />
              No generation parameters found in this PNG
            </div>
            <div v-else-if="!metadata.isPng" class="info-message">
              <v-icon icon="mdi-information-outline" class="mr-2" />
              PNG metadata not available for this file type
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn @click="emit('close')">Close</v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FileReference, ImageMetadata } from '../types'
import { getImageMetadata } from '../services/api'

const props = defineProps<{
  visible: boolean
  image: FileReference | null
}>()

const emit = defineEmits<{
  close: []
}>()

const metadata = ref<ImageMetadata | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const copiedPrompt = ref(false)
const copiedNegative = ref(false)

// Fetch metadata when modal becomes visible
watch(() => props.visible, async (visible) => {
  if (visible && props.image) {
    metadata.value = null
    error.value = null
    loading.value = true

    try {
      metadata.value = await getImageMetadata(props.image.library, props.image.file)
    } catch (err) {
      console.error('Failed to load metadata:', err)
      error.value = 'Failed to load metadata. Please try again.'
    } finally {
      loading.value = false
    }
  }
})

function handleOverlayClick() {
  emit('close')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString()
}

function formatRating(rating: number): string {
  const filled = '★'.repeat(rating)
  const empty = '☆'.repeat(5 - rating)
  return filled + empty
}

async function copyToClipboard(text: string | undefined) {
  if (!text) return

  // Determine which copy button was clicked
  const isPrompt = text === metadata.value?.pngMetadata?.prompt
  const isCopied = isPrompt ? copiedPrompt : copiedNegative

  try {
    await navigator.clipboard.writeText(text)
    if (isPrompt) {
      copiedPrompt.value = true
      setTimeout(() => { copiedPrompt.value = false }, 2000)
    } else {
      copiedNegative.value = true
      setTimeout(() => { copiedNegative.value = false }, 2000)
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}
</script>

<style scoped>
.info-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: 20px;
}

.info-modal-content {
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.info-modal-body {
  overflow-y: auto;
  flex: 1;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.metadata-content {
  padding: 8px 0;
}

.info-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.1rem;
  margin-bottom: 12px;
  color: rgb(var(--v-theme-primary));
}

.info-item {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.info-item strong {
  min-width: 120px;
  flex-shrink: 0;
}

.info-item span {
  flex: 1;
  word-break: break-word;
}

.path-text {
  font-family: monospace;
  font-size: 0.9em;
}

.prompt-item {
  flex-direction: column;
  gap: 4px;
}

.prompt-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-text {
  margin: 4px 0;
  padding: 8px 12px;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.95rem;
  line-height: 1.5;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.info-message {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: rgba(var(--v-theme-info), 0.1);
  border-radius: 4px;
  color: rgb(var(--v-theme-info));
}

/* Fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
