# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automatic Library is a web-based image gallery viewer designed for browsing and rating images from folders (originally built for Stable Diffusion outputs). The application:
- Scans a configured directory for image folders
- Provides a slideshow interface with keyboard navigation
- Supports rating images 1-5 stars
- Stores ratings persistently in JSON files
- Features auto-reload in dev mode when code changes

## Architecture

### Backend (TypeScript/Node.js/Express)
- **Entry point**: `src/index.ts` - Express server setup and routing
- **Library management**: `src/library/library.ts` - Scans filesystem for folders, creates routers
- **Folder management**: `src/library/folder.ts` - Handles individual folder operations, file listings, and ratings

Key design patterns:
- Each folder gets its own Express router
- File lists are cached and refreshed every 20 seconds
- Ratings are cached in memory and persisted to disk after 5 second debounce
- Rating files stored in `ratings/` directory as `<foldername>.json`

### Frontend (Vanilla JavaScript)
- **Entry point**: `src/static/main.js` - Initializes library list and UI
- **Slideshow**: `src/static/slideshow.js` - Image display, keyboard navigation, and rating submission
- **Utilities**: `src/static/bit.js` - AJAX wrapper and DOM helpers

Frontend architecture:
- No build step - vanilla JS served directly
- Uses custom AJAX library for HTTP requests
- DOM helpers in `bit.js` provide jQuery-like utilities
- Long-polling for dev mode auto-reload

## Common Commands

### Development
```bash
npm run dev          # Run in watch mode with tsx (auto-reloads on code changes)
```

### Production
```bash
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled code from dist/
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

In dev mode, the frontend uses long-polling on `/version-tag?longpoll=true` to detect server restarts and auto-reload.

### Rating System
- Ratings stored as `Record<string, number>` mapping filename to rating (1-5)
- POST to `/libs/<folder>/rate` with `{img: string, rating: 1|2|3|4|5}`
- Keyboard shortcuts 1-5 during slideshow to rate current image
- Rating changes buffered for 5 seconds before writing to disk

### Slideshow Navigation
Keyboard controls:
- Arrow keys / z/x: Navigate images
- 1-5: Rate current image
- Escape: Exit slideshow

### API Endpoints
- `GET /libs` - List all library folders
- `GET /libs/<folder>` - Get folder metadata and file list
- `POST /libs/<folder>/rate` - Submit image rating
- `GET /libs/<folder>/<filename>` - Serve image file (static)
- `GET /version-tag` - Get version for dev mode reload detection

## TypeScript Configuration
- Uses ES modules (`"type": "module"` in package.json)
- Target: ESNext with NodeNext module resolution
- Strict mode enabled
- Additional strictness: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
