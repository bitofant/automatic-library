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

export interface LibrariesResponse {
  root: LibraryNode | null
  folders: LibraryNode[]
}

export type Rating = 1 | 2 | 3 | 4 | 5
