# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automatic Library is a web-based image gallery viewer designed for browsing and rating images from folders (originally built for Stable Diffusion outputs). The application:
- Scans a configured directory for image folders
- Provides a carousel slideshow interface using Flicking with keyboard and touch/mouse navigation
- Supports rating images 1-5 stars
- Stores ratings persistently in JSON files
- Features auto-reload in dev mode when code changes

## Architecture

### Backend (TypeScript/Node.js/Express)
- **Entry point**: `src/index.ts` - Express server setup and routing
- **Library management**: `src/library/library.ts` - Scans filesystem for folders, creates routers, manages ratings
- **Folder management**: `src/library/folder.ts` - Handles individual folder operations, file listings
- **Ratings management**: `src/library/ratings.ts` - Centralized RatingsManager for all rating operations

Key design patterns:
- Each folder gets its own Express router
- File lists are cached and refreshed every 20 seconds
- Centralized ratings manager shared across all folders
- Ratings cached in memory and persisted to disk after 5 second debounce
- Single ratings file: `ratings/ratings.json` with inverted structure `{rating: [files]}`
- FileReference structure: All file operations use `{library: string, file: string, rating?: number}` objects

### Frontend (Vue 3 + TypeScript + Vite)
- **Entry point**: `src/frontend/main.ts` - Creates and mounts Vue app
- **Root component**: `src/frontend/App.vue` - Orchestrates layout and state
- **Components**: `src/frontend/components/` - Vue components (LibrarySidebar, SlideshowViewer, InfoBar, WelcomeScreen)
- **Composables**: `src/frontend/composables/` - Reactive logic (useLibraries, useSlideshow, useKeyboardNav, useDevMode)
- **Services**: `src/frontend/services/api.ts` - API layer using fetch
- **Types**: `src/frontend/types.ts` - TypeScript type definitions

Frontend architecture:
- Vue 3 Composition API with TypeScript
- Vite for fast HMR development and optimized production builds
- Component-based architecture with reactive state management
- Flicking carousel library (@egjs/vue3-flicking) for slideshow functionality
- Clean API layer replacing custom AJAX library
- Composables for reusable reactive logic

## Common Commands

### Development
```bash
npm run dev          # Run both backend (port 3000) and frontend (port 5173) concurrently
npm run dev:backend  # Run backend only in watch mode
npm run dev:frontend # Run Vite dev server only
```
Open http://localhost:5173 in your browser for development.

### Production
```bash
npm run build        # Build both backend and frontend
npm run build:backend   # Compile TypeScript backend to dist/
npm run build:frontend  # Build Vue frontend to dist/static/
npm start            # Run compiled code from dist/ (serves on port 3000)
```

### Configuration
The library path is hardcoded in `src/index.ts:13`. Update this line to point to your image directory:
```typescript
const libs = new Library('/home/joran/src/stable-diffusion-webui/outputs/txt2img-images');
```

## Key Implementation Details

### Dev Mode Detection
Dev mode is detected by checking if the process was started with `.js` file (compiled) or `.ts` file:
```typescript
const DEV_MODE = !process.argv.pop()?.endsWith('.js');
```

In development:
- Backend runs with `tsx watch` for auto-restart on code changes
- Frontend uses Vite's built-in HMR (Hot Module Replacement) for instant updates
- The Vue app still checks `/version-tag` endpoint to maintain compatibility with the backend's dev mode detection

### Rating System

**Storage Architecture:**
- Single ratings file: `ratings/ratings.json`
- Inverted structure for efficient queries: `{"1": [files], "2": [files], ...}`
- Full file references: `"folder/filename.png"` format enables virtual libraries
- Centralized RatingsManager class handles all rating operations
- Auto-migration from old per-folder format on first load
- Old rating files preserved as backup

**File Format:**
```json
{
  "1": ["2025-11-24/00010.png"],
  "2": ["2025-11-24/00000.png", "2025-11-24/00006.png"],
  "3": ["2025-11-17/00003.png", "2025-11-24/00001.png"],
  "4": ["2025-10-31/00000.png"],
  "5": []
}
```

**API Structure:**
- FileReference objects: `{library: string, file: string, rating?: number}`
- API returns ratings with each file in library listings
- POST to `/libs/<folder>/rate` with `{img: string, rating: 1|2|3|4|5}`
- Keyboard shortcuts 1-5 during slideshow to rate current image
- Rating changes buffered for 5 seconds before writing to disk
- Ratings displayed in info bar with star symbols (★★★☆☆)

**Benefits:**
- O(1) rating lookups instead of O(n) per-folder scans
- Supports future virtual libraries (e.g., "5stars" across all folders)
- Atomic writes - single file prevents partial state issues

### Slideshow Navigation (Flicking Carousel)

The slideshow uses the Flicking carousel library for robust image navigation with the following features:

**Navigation methods:**
- **Keyboard**: Arrow keys (←/→) or z/x keys to navigate
- **Mouse/Touch**: Drag or swipe images left/right
- **Circular looping**: Last image wraps to first, first to last
- **Smooth animations**: 300ms transitions

**Keyboard controls:**
- Arrow keys / z/x: Navigate images
- 1-5: Rate current image
- Escape: Exit slideshow

**Architecture:**
- Flicking is the source of truth for navigation state
- Keyboard handlers call Flicking's API methods (`next()`, `prev()`)
- Flicking emits `@changed` events to sync Vue reactive state
- Lazy loading: Only current + adjacent images are loaded for performance
- Per-image dimension tracking using a Map for responsive sizing

**Implementation details:**
- `SlideshowViewer.vue`: Main carousel component with Flicking integration
- `useSlideshow.ts`: State management composable with `setIndex()` for Flicking sync
- `useKeyboardNav.ts`: Keyboard event handler with optional `flickingRef` parameter
- Flicking configuration: circular, 300ms duration, touch/mouse input enabled

### API Endpoints
- `GET /libs` - List all library folders
- `GET /libs/<folder>` - Get folder metadata and file list with ratings
  - Returns: `{name: string, files: FileReference[]}` where FileReference = `{library: string, file: string, rating?: number}`
  - Query param: `?ratings=3,4,5` to filter by specific ratings
- `POST /libs/<folder>/rate` - Submit image rating
  - Body: `{img: string, rating: 1|2|3|4|5}`
- `GET /libs/<folder>/<filename>` - Serve image file (static)
- `GET /version-tag` - Get version for dev mode reload detection

## TypeScript Configuration
- Uses ES modules (`"type": "module"` in package.json)
- Target: ESNext with NodeNext module resolution
- Strict mode enabled
- Additional strictness: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Backend and frontend use separate TypeScript configurations
- Frontend excluded from backend `tsconfig.json` to avoid conflicts

## UI Features

### Info Bar
- Fixed position in bottom-left corner with rounded top-right corner
- Displays: `Library - index / total - filename.png - ★★★☆☆`
- Shows current rating with filled/empty star symbols
- Hover effect: Scales up 50% (1.5x) with smooth transition for better readability
- Opacity increases from 0.6 to 0.9 on hover
- Z-index 50 to stay above slideshow content

### Image Scaling
- Images scale to fill available screen space while maintaining aspect ratio
- Uses `object-fit: contain` to prevent cropping
- No max-resolution cap - scales up on large displays
- Responsive to window resizing

### Star Rating Filter
- Top bar shows 5 star buttons (first 2 are decorative)
- Click star 3/4/5 to filter images by rating
- Active filter highlights in yellow
- Shows: ★★★☆☆ (3+), ★★★★☆ (4+), ★★★★★ (5 only)
- Click active filter again to disable

## Migration Notes

### Vue 3 Migration (November 2025)
The frontend was migrated from vanilla JavaScript to Vue 3 in November 2025. See `MIGRATION.md` for details about the migration, architecture changes, and testing checklist. The old vanilla JS files remain in `src/static/` for reference but are no longer used.

### Flicking Carousel Migration (November 2025)
The slideshow was migrated from Vue Transition animations to the Flicking carousel library (@egjs/vue3-flicking). Key changes:
- Replaced single-image Vue Transition with multi-panel Flicking carousel
- Added touch/mouse drag support for navigation
- Implemented lazy loading for better performance with large image libraries
- Changed navigation state flow: Flicking is now the source of truth, with Vue state syncing via events
- Per-image dimension tracking replaces single-image dimension state
- All existing functionality preserved (keyboard nav, ratings, responsive sizing)

### Ratings System Restructuring (November 2025)
The ratings system was restructured from per-folder files to a single inverted file:
- Changed from `ratings/<folder>.json` with `{filename: rating}` to `ratings/ratings.json` with `{rating: [files]}`
- Implemented centralized RatingsManager class shared across all folders
- Added FileReference structure: `{library: string, file: string, rating?: number}`
- Auto-migration preserves all existing ratings on first load
- Enables future virtual library support (aggregate files across folders)
- Improved query performance: O(1) rating lookups vs O(n) scans

### CSS Organization (November 2025)
- Moved component-specific styles into component `<style scoped>` blocks
- InfoBar styles moved from global style.css to InfoBar.vue
- Removed unused transition classes from old vanilla JS implementation
- Global style.css now only contains true global resets (11 lines)
