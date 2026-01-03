<template>
  <Transition name="modal-fade">
    <div
      v-if="visible"
      class="edit-folder-overlay"
      @click="handleCancel"
    >
      <v-card class="edit-folder-content" @click.stop>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Customize Folder</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="handleCancel"
          />
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-text-field
            v-model="localDisplayName"
            label="Display Name"
            :placeholder="defaultName"
            clearable
            hint="Leave empty to use folder name"
            persistent-hint
            class="mb-4"
          />

          <v-text-field
            v-model="localIcon"
            label="MDI Icon"
            :placeholder="defaultIcon"
            clearable
            hint="Enter MDI icon name (e.g., mdi-folder-star)"
            persistent-hint
          >
            <template #prepend-inner>
              <v-icon :icon="localIcon || defaultIcon" />
            </template>
          </v-text-field>

          <div class="mt-6">
            <div class="text-caption mb-2">
              <span v-if="isLoadingIcons">Loading icons...</span>
              <span v-else-if="hasMoreIcons">
                Showing {{ displayedIcons.length }} of {{ filteredIcons.length }} icon{{ filteredIcons.length === 1 ? '' : 's' }}
                {{ localIcon ? '(type to filter)' : '(type to search)' }}
              </span>
              <span v-else>
                {{ filteredIcons.length }} icon{{ filteredIcons.length === 1 ? '' : 's' }}
                {{ localIcon ? '(filtered)' : '' }}
              </span>
            </div>
            <div class="icon-presets-scrollable">
              <v-btn
                v-for="icon in displayedIcons"
                :key="icon"
                icon
                size="small"
                variant="outlined"
                @click="localIcon = icon"
                :title="icon"
                :color="localIcon === icon ? 'primary' : undefined"
              >
                <v-icon :icon="icon" />
              </v-btn>
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-btn
            v-if="hasCustomization"
            color="error"
            variant="text"
            @click="handleReset"
          >
            Reset to Default
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
          <v-btn color="primary" @click="handleSave">Save</v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { FolderCustomization } from '../types'

const props = defineProps<{
  visible: boolean
  folderPath: string
  defaultName: string
  defaultIcon: string
  currentCustomization: FolderCustomization | undefined
}>()

const emit = defineEmits<{
  close: []
  save: [customization: FolderCustomization]
  reset: []
}>()

const localDisplayName = ref('')
const localIcon = ref('')
const allIcons = ref<string[]>([])
const isLoadingIcons = ref(false)

const hasCustomization = computed(() => !!props.currentCustomization)

// Load all MDI icons from the loaded CSS
async function loadAllIcons() {
  if (allIcons.value.length > 0) return // Already loaded

  isLoadingIcons.value = true

  try {
    // Get all CSS rules from loaded stylesheets
    const icons = new Set<string>()

    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules
        if (!rules) continue

        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i] as CSSStyleRule
          if (rule.selectorText?.startsWith('.mdi-') && rule.selectorText.includes('::before')) {
            // Extract icon name from selector like ".mdi-account::before"
            const match = rule.selectorText.match(/\.mdi-([^:]+)/)
            if (match && match[1]) {
              icons.add(`mdi-${match[1]}`)
            }
          }
        }
      } catch (e) {
        // Skip stylesheets we can't access (CORS)
        continue
      }
    }

    allIcons.value = Array.from(icons).sort()
  } catch (error) {
    console.error('Failed to load MDI icons:', error)
    // Fallback to a basic list if loading fails
    allIcons.value = [
      'mdi-folder', 'mdi-folder-star', 'mdi-folder-heart', 'mdi-star', 'mdi-heart',
      'mdi-fire', 'mdi-alert', 'mdi-check', 'mdi-close', 'mdi-home'
    ]
  } finally {
    isLoadingIcons.value = false
  }
}

// Filter icons based on the text input
const filteredIcons = computed(() => {
  if (!localIcon.value) {
    return allIcons.value
  }

  const searchTerm = localIcon.value.toLowerCase()
  return allIcons.value.filter(icon => icon.toLowerCase().includes(searchTerm))
})

// Limit displayed icons to 20
const MAX_DISPLAYED_ICONS = 20
const displayedIcons = computed(() => filteredIcons.value.slice(0, MAX_DISPLAYED_ICONS))
const hasMoreIcons = computed(() => filteredIcons.value.length > MAX_DISPLAYED_ICONS)

// Load current customization when dialog opens
watch(() => props.visible, async (visible) => {
  if (visible) {
    localDisplayName.value = props.currentCustomization?.displayName || ''
    localIcon.value = props.currentCustomization?.icon || ''

    // Load icons if not already loaded
    if (allIcons.value.length === 0) {
      await loadAllIcons()
    }
  }
})

function handleCancel() {
  emit('close')
}

function handleSave() {
  emit('save', {
    displayName: localDisplayName.value || undefined,
    icon: localIcon.value || undefined
  })
}

function handleReset() {
  emit('reset')
}
</script>

<style scoped>
.edit-folder-overlay {
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

.edit-folder-content {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.icon-presets-scrollable {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
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
