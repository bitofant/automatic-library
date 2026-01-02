export interface FileReference {
  library: string  // Physical folder name
  file: string     // Filename
  rating?: Rating  // Optional rating (1-5 stars)
}

export interface LibraryData {
  name: string
  files: FileReference[]
}

export interface LibraryNode {
  path: string           // Library identifier (relative path)
  name: string           // Display name
  children: LibraryNode[] // Nested folders
  hasImages: boolean     // Contains images directly
}

export interface FolderCustomization {
  displayName?: string
  icon?: string
}

export interface CustomizationsData {
  [folderPath: string]: FolderCustomization
}

export interface LibrariesResponse {
  root: LibraryNode | null
  folders: LibraryNode[]
  customizations?: CustomizationsData
}

export type Rating = 1 | 2 | 3 | 4 | 5

export interface PngMetadata {
  prompt?: string
  negativePrompt?: string
  steps?: number
  seed?: number
  sampler?: string
  cfgScale?: number
  model?: string
  size?: string
}

export interface ImageMetadata {
  filename: string
  fullPath: string
  fileSize: number
  createdAt: string
  width: number
  height: number
  isPng: boolean
  pngMetadata?: PngMetadata
}
