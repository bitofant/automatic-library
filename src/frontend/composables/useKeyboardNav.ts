import { onMounted, onUnmounted, type Ref } from 'vue'
import type { Rating } from '../types'

export interface KeyboardNavHandlers {
  onNext: () => void
  onPrevious: () => void
  onRate: (rating: Rating) => void
  onClose: () => void
  onDelete: () => void
  onFullscreen: () => void
  flickingRef?: Ref<any>
}

export function useKeyboardNav(handlers: KeyboardNavHandlers) {
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight':
      case 'x':
        e.preventDefault()
        if (handlers.flickingRef?.value) {
          // Let Flicking handle navigation and fire willChange/changed events
          handlers.flickingRef.value.next()
        } else {
          // Fallback if no Flicking instance
          handlers.onNext()
        }
        break
      case 'ArrowLeft':
      case 'z':
        e.preventDefault()
        if (handlers.flickingRef?.value) {
          // Let Flicking handle navigation and fire willChange/changed events
          handlers.flickingRef.value.prev()
        } else {
          // Fallback if no Flicking instance
          handlers.onPrevious()
        }
        break
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault()
        handlers.onRate(parseInt(e.key) as Rating)
        break
      case 'Backspace':
        e.preventDefault()
        handlers.onDelete()
        break
      case 'Escape':
        e.preventDefault()
        handlers.onClose()
        break
      case 'f':
      case 'F':
        e.preventDefault()
        handlers.onFullscreen()
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
