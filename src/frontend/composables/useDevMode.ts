import { ref } from 'vue'
import { getVersionTag } from '../services/api'

export function useDevMode() {
  const isDev = ref(false)
  const versionTag = ref<string | null>(null)

  async function initDevMode() {
    try {
      const tag = await getVersionTag()
      versionTag.value = tag

      if (tag === 'prod') {
        isDev.value = false
      } else {
        isDev.value = true
        longPollVersionTag()
      }
    } catch (error) {
      console.error('Failed to get version tag:', error)
    }
  }

  async function longPollVersionTag() {
    try {
      const newTag = await getVersionTag(true)
      if (newTag !== versionTag.value) {
        window.location.reload()
      } else {
        setTimeout(longPollVersionTag, 10)
      }
    } catch (error) {
      console.error('Long poll failed, reloading page.')
      window.location.reload()
    }
  }

  return {
    isDev,
    versionTag,
    initDevMode
  }
}
