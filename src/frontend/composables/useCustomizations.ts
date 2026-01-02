import { ref } from 'vue'
import type { CustomizationsData, FolderCustomization } from '../types'
import { setCustomization, removeCustomization } from '../services/api'

export function useCustomizations() {
  const customizations = ref<CustomizationsData>({})

  function loadCustomizations(data: CustomizationsData) {
    customizations.value = data
  }

  function getCustomization(folderPath: string): FolderCustomization | undefined {
    return customizations.value[folderPath]
  }

  function getDisplayName(folderPath: string, defaultName: string): string {
    return customizations.value[folderPath]?.displayName || defaultName
  }

  function getIcon(folderPath: string, defaultIcon: string): string {
    return customizations.value[folderPath]?.icon || defaultIcon
  }

  async function updateCustomization(
    folderPath: string,
    customization: FolderCustomization
  ) {
    await setCustomization(folderPath, customization)
    customizations.value[folderPath] = customization
  }

  async function deleteCustomization(folderPath: string) {
    await removeCustomization(folderPath)
    delete customizations.value[folderPath]
  }

  return {
    customizations,
    loadCustomizations,
    getCustomization,
    getDisplayName,
    getIcon,
    updateCustomization,
    deleteCustomization
  }
}
