import { onMounted, onUnmounted, type Ref } from 'vue'
import type { Rating } from '../types'

export interface KeyboardNavHandlers {
  onNext: () => void
  onPrevious: () => void
  onRate: (rating: Rating) => void
  onClose: () => void
  onDelete: () => void
  onFullscreen: () => void
  onDownload: () => void
  onInfo: () => void
  flickingRef?: Ref<any>
}

export function useKeyboardNav(handlers: KeyboardNavHandlers) {
  function handleKeydown(e: KeyboardEvent) {
    // Ignore keyboard shortcuts when typing in input fields
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    switch (e.key) {
      case 'ArrowRight':
      case 'x':
        e.preventDefault()
        if (handlers.flickingRef?.value) {
          if (e.metaKey) {
            // Command+Arrow: Jump 10 images forward
            const flicking = handlers.flickingRef.value
            const currentIndex = flicking.index
            const targetIndex = Math.min(currentIndex + 10, flicking.panelCount - 1)
            flicking.moveTo(targetIndex)
          } else {
            // Let Flicking handle navigation and fire willChange/changed events
            handlers.flickingRef.value.next()
          }
        } else {
          // Fallback if no Flicking instance
          handlers.onNext()
        }
        break
      case 'ArrowLeft':
      case 'z':
        e.preventDefault()
        if (handlers.flickingRef?.value) {
          if (e.metaKey) {
            // Command+Arrow: Jump 10 images backward
            const flicking = handlers.flickingRef.value
            const currentIndex = flicking.index
            const targetIndex = Math.max(currentIndex - 10, 0)
            flicking.moveTo(targetIndex)
          } else {
            // Let Flicking handle navigation and fire willChange/changed events
            handlers.flickingRef.value.prev()
          }
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
      case 'q':
      case 'Q':
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
      case 'd':
      case 'D':
        e.preventDefault()
        handlers.onDownload()
        break
      case 'i':
      case 'I':
        e.preventDefault()
        handlers.onInfo()
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
