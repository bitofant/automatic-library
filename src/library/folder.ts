import fs from 'fs';
import path from 'path';
import express, { Router, static as static_ } from 'express';
import { RatingsManager } from './ratings.js';
import { getImageMetadata } from './metadata.js';

const FILES_UPDATE_INTERVAL = 20000; // 20 seconds

export class LibraryFolder {
  private folderPath: string;
  private libraryId: string;
  private router: Router;
  private files: string[] = [];
  private lastChangeDate: number = 0;
  private nextFileUpdate: number = 0;
  private ratingsManager: RatingsManager;
  private watcher: fs.FSWatcher | null = null;
  private updateCallbacks: Array<(changed: boolean) => void> = [];

  constructor(folderPath: string, ratingsManager: RatingsManager, libraryId: string) {
    this.folderPath = folderPath;
    this.libraryId = libraryId;
    this.ratingsManager = ratingsManager;
    this.router = Router();
    this.router.use(express.json());
    this.updateFilesIfNeeded();
    this.router.get('/', (req, res) => {
      this.updateFilesIfNeeded();

      // Parse query parameter: ?ratings=3,4,5
      let ratingsFilter: Array<1|2|3|4|5> | null = null;
      if (req.query.ratings) {
        const ratingsStr = req.query.ratings as string;
        const parsed = ratingsStr.split(',').map(r => parseInt(r, 10));
        if (parsed.every(r => [1,2,3,4,5].includes(r))) {
          ratingsFilter = parsed as Array<1|2|3|4|5>;
        }
      }

      // Parse recursive parameter: ?recursive=true
      const recursive = req.query.recursive === 'true';

      const etag = `${this.lastChangeDate}-${ratingsFilter ? ratingsFilter.join('') : 'all'}-${recursive ? 'r' : 'nr'}`;
      res.setHeader('ETag', etag);
      if (req.headers['if-none-match'] === etag) {
        return res.sendStatus(304);
      }

      res.json({
        name: this.libraryId === '__root__'
          ? path.basename(this.folderPath)
          : this.libraryId,
        files: this.listFiles(ratingsFilter, recursive)
      });
    });
    this.router.post('/rate', (req, res) => {
      console.log('body: ', req.body);
      if (!req.body || ![1, 2, 3, 4, 5].includes(req.body.rating)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      let payload : {img: string, rating: 1|2|3|4|5} = req.body;

      this.ratingsManager.setRating(this.libraryId, payload.img, payload.rating);

      res.sendStatus(200);
    });
    this.router.get('/wait-for-update', (req, res) => {
      const timeout = setTimeout(() => {
        // Remove callback from queue
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
          this.updateCallbacks.splice(index, 1);
        }
        res.json({ timeout: true, changed: false });
      }, 30000); // 30 second timeout

      const callback = (changed: boolean) => {
        clearTimeout(timeout);
        res.json({ timeout: false, changed });
      };

      this.updateCallbacks.push(callback);
    });

    // Metadata endpoint - must be before static middleware to intercept requests
    // Match any path ending with /metadata
    this.router.get(/^\/(.*)\/metadata$/, async (req, res) => {
      try {
        const filename = req.params[0];
        if (!filename) {
          res.status(400).json({ error: 'Filename is required' });
          return;
        }

        const filePath = path.join(this.folderPath, filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          res.status(404).json({ error: 'File not found' });
          return;
        }

        // Extract metadata
        const metadata = await getImageMetadata(filePath);
        res.json(metadata);
      } catch (error) {
        console.error('Error fetching metadata:', error);
        res.status(500).json({ error: 'Failed to extract metadata' });
      }
    });

    this.router.use(static_(this.folderPath));

    if (this.isTodaysFolder()) {
      this.watcher = fs.watch(this.folderPath, (_eventType, filename) => {
        if (filename && filename.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
          this.invalidateCache();
          this.updateFilesIfNeeded();
        }
      });
    }
  }

  private isTodaysFolder(): boolean {
    // Get today's date in local timezone (not UTC)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`; // YYYY-MM-DD in local time

    const folderName = path.basename(this.folderPath);
    return folderName === today;
  }

  private updateFilesIfNeeded() {
    const shouldCheck = Date.now() >= this.nextFileUpdate;

    if (!shouldCheck) {
      return;
    }

    let updatedFiles = fs.readdirSync(this.folderPath)
      .filter(f => f.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i))
      .sort();

    let changed = false;
    if (updatedFiles.length !== this.files.length || JSON.stringify(updatedFiles) !== JSON.stringify(this.files)) {
      this.lastChangeDate = Date.now();
      this.files = updatedFiles;
      changed = true;
    }
    this.nextFileUpdate = Date.now() + FILES_UPDATE_INTERVAL;

    // Notify all waiting long-poll requests
    const callbacks = this.updateCallbacks;
    this.updateCallbacks = [];
    callbacks.forEach(cb => cb(changed));
  }

  private scanFilesRecursively(dirPath: string, relativePath: string = ''): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const relativeEntryPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        files.push(...this.scanFilesRecursively(entryPath, relativeEntryPath));
      } else if (entry.isFile() && entry.name.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
        files.push(relativeEntryPath);
      }
    }

    return files.sort();
  }

  public listFiles(ratings: Array<1|2|3|4|5> | null, recursive = false): Array<{library: string, file: string, rating?: number}> {
    this.updateFilesIfNeeded();

    // Get file list (recursive or non-recursive)
    const allFiles = recursive ? this.scanFilesRecursively(this.folderPath) : this.files;

    let filesToReturn: string[];

    if (ratings === null) {
      filesToReturn = allFiles;
    } else {
      // Use ratings manager to get rated files
      const ratedFiles = this.ratingsManager.getFilesForLibrary(this.libraryId, ratings);

      // Filter to only files that still exist in the folder
      filesToReturn = allFiles.filter(f => ratedFiles.includes(f));
    }

    // Transform string[] to FileReference[] with ratings
    return filesToReturn.map(file => {
      const rating = this.ratingsManager.getRating(this.libraryId, file);
      return {
        library: this.libraryId,
        file: file,
        ...(rating !== undefined && { rating })
      };
    });
  }

  invalidateCache() {
    this.nextFileUpdate = 0;
  }

  getRouter(): Router {
    return this.router;
  }

  dispose() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
