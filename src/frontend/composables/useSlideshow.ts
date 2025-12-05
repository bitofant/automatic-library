import { ref, computed, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { LibraryData, Rating } from '../types'
import { rateImage, deleteImage } from '../services/api'

export function useSlideshow(libraryData: Ref<LibraryData | null>) {
  const router = useRouter()
  const currentIndex = ref(0)
  const direction = ref<'next' | 'prev'>('next')
  const isLoading = ref(false)

  const currentImage = computed(() => {
    if (!libraryData.value || currentIndex.value < 0) return null
    const img = libraryData.value.files[currentIndex.value]
    console.log('[useSlideshow] currentImage computed - index:', currentIndex.value, 'file:', img?.file, 'rating:', img?.rating)
    return img
  })

  const currentImagePath = computed(() => {
    if (!libraryData.value || !currentImage.value) return ''
    return `/libs/${currentImage.value.library}/${currentImage.value.file}`
  })

  const infoText = computed(() => {
    if (!libraryData.value || !currentImage.value) return ''
    const rating = currentImage.value.rating
    const ratingText = rating ? ` - ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}` : ''
    return `${libraryData.value.name} - ${currentIndex.value + 1} / ${libraryData.value.files.length} - ${currentImage.value.file}${ratingText}`
  })

  watch(libraryData, (newLib) => {
    if (newLib) {
      currentIndex.value = 0
      direction.value = 'next'
    }
  })

  function next() {
    if (!libraryData.value) return
    direction.value = 'next'
    currentIndex.value++
    if (currentIndex.value >= libraryData.value.files.length) {
      currentIndex.value = 0
    }
  }

  function previous() {
    if (!libraryData.value) return
    direction.value = 'prev'
    currentIndex.value--
    if (currentIndex.value < 0) {
      currentIndex.value = libraryData.value.files.length - 1
    }
  }

  async function rate(rating: Rating) {
    if (!libraryData.value || !currentImage.value) return
    try {
      await rateImage(currentImage.value.library, currentImage.value.file, rating)
      // Update rating optimistically in current image
      currentImage.value.rating = rating
    } catch (error) {
      console.error('Error rating image:', error)
    }
  }

  async function deleteCurrentImage() {
    if (!libraryData.value || !currentImage.value) return

    const imageToDelete = currentImage.value
    const indexToDelete = currentIndex.value

    try {
      // Call API to delete the image
      await deleteImage(imageToDelete.library, imageToDelete.file)

      // Remove from local array
      libraryData.value.files.splice(indexToDelete, 1)

      // Handle navigation after deletion
      if (libraryData.value.files.length === 0) {
        // No more images, go back to library list
        router.push('/')
      }
      // Note: currentIndex will be updated by the files.length watcher in SlideshowViewer
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  function setIndex(index: number) {
    currentIndex.value = index
    // Update URL with current index
    if (libraryData.value) {
      // Encode path for URL (replace / with ~)
      const urlPath = libraryData.value.name === '__root__' ? 'root' : libraryData.value.name.replace(/\//g, '~')
      router.replace({
        name: 'library',
        params: {
          path: urlPath,
          index: index.toString()
        }
      })
    }
  }

  return {
    currentIndex,
    currentImage,
    currentImagePath,
    infoText,
    direction,
    isLoading,
    next,
    previous,
    rate,
    deleteCurrentImage,
    setIndex
  }
}
