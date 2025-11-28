import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { LibraryData, LibrariesResponse } from '../types'
import { getLibraries, getLibrary } from '../services/api'

export function useLibraries() {
  const router = useRouter()
  const librariesData = ref<LibrariesResponse>({ root: null, folders: [] })
  const currentLibrary = ref<LibraryData | null>(null)
  const activeFilter = ref<1|2|3|4|5|null>(null)

  async function fetchLibraries() {
    try {
      librariesData.value = await getLibraries()
    } catch (error) {
      console.error('Failed to fetch libraries:', error)
    }
  }

  async function loadLibrary(path: string, filter: 1|2|3|4|5|null = null, index?: number, includeSubfolders = false) {
    try {
      // Map filter to ratings array
      let ratingsFilter: Array<1|2|3|4|5> | null = null;
      if (filter === 5) {
        ratingsFilter = [5];
      } else if (filter === 4) {
        ratingsFilter = [4, 5];
      } else if (filter === 3) {
        ratingsFilter = [3, 4, 5];
      } else if (filter === 2) {
        ratingsFilter = [2, 3, 4, 5];
      } else if (filter === 1) {
        ratingsFilter = [1, 2, 3, 4, 5];
      }

      currentLibrary.value = await getLibrary(path, ratingsFilter, includeSubfolders)
      activeFilter.value = filter
      document.title = `${path} - Automatic Library`

      // Encode path for URL (replace / with ~)
      const urlPath = path === '__root__' ? 'root' : path.replace(/\//g, '~');

      // Always include index, defaulting to 0 if not specified
      const finalIndex = index !== undefined ? index : 0
      const targetPath = `/library/${urlPath}/${finalIndex}`

      await router.push(targetPath)
    } catch (error) {
      console.error('Failed to load library:', error)
    }
  }

  async function setFilter(filter: 1|2|3|4|5|null) {
    if (!currentLibrary.value) return

    // Toggle: if clicking same filter, turn it off
    if (activeFilter.value === filter) {
      filter = null
    }

    // Reload library with new filter
    await loadLibrary(currentLibrary.value.name, filter)
  }

  function closeLibrary() {
    currentLibrary.value = null
    activeFilter.value = null
    document.title = 'Automatic Library'
    router.push('/')
  }

  return {
    librariesData,
    currentLibrary,
    activeFilter,
    fetchLibraries,
    loadLibrary,
    closeLibrary,
    setFilter
  }
}
