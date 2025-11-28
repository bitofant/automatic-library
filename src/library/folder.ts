import fs from 'fs';
import path from 'path';
import express, { Router, static as static_ } from 'express';
import { RatingsManager } from './ratings.js';

const FILES_UPDATE_INTERVAL = 20000; // 20 seconds

export class LibraryFolder {
  private folderPath: string;
  private libraryId: string;
  private router: Router;
  private files: string[] = [];
  private nextFileUpdate: number = 0;
  private ratingsManager: RatingsManager;

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
    this.router.use(static_(this.folderPath));
  }

  private updateFilesIfNeeded() {
    if (Date.now() < this.nextFileUpdate) {
      return;
    }
    this.files = fs.readdirSync(this.folderPath).sort().filter(f => f.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i));
    this.nextFileUpdate = Date.now() + FILES_UPDATE_INTERVAL;
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

  getRouter(): Router {
    return this.router;
  }
}
