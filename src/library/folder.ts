import fs from 'fs';
import path from 'path';
import express, { Router, static as static_ } from 'express';

const FILES_UPDATE_INTERVAL = 20000; // 20 seconds

export class LibraryFolder {
  private folderPath: string;
  private router: Router;
  private files: string[] = [];
  private nextFileUpdate: number = 0;
  private ratingFile: string;
  private cachedRatings: Record<string, number> | null = null;
  private ratingsWriteTimeout: NodeJS.Timeout | null = null;

  constructor(folderPath: string) {
    this.folderPath = folderPath;
    this.ratingFile = process.cwd() + '/ratings/' + path.basename(this.folderPath) + '.json';
    this.router = Router();
    this.router.use(express.json());
    this.updateFilesIfNeeded();
    this.router.get('/', (req, res) => {
      this.updateFilesIfNeeded();
      res.json({
        name: path.basename(this.folderPath),
        files: this.listFiles(req.body?.ratings || null)
      });
    });
    this.router.post('/rate', (req, res) => {
      console.log('body: ', req.body);
      if (!req.body || req.body.ra || ![1, 2, 3, 4, 5].includes(req.body.rating)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      let payload : {img: string, rating: 1|2|3|4|5} = req.body;
      this.rate(payload.img, payload.rating);
      res.sendStatus(200);
    });
    this.router.use(static_(this.folderPath));
  }

  private updateFilesIfNeeded() {
    if (Date.now() < this.nextFileUpdate) {
      return;
    }
    this.files = fs.readdirSync(this.folderPath).sort();
    this.nextFileUpdate = Date.now() + FILES_UPDATE_INTERVAL;
  }

  private rate(img: string, rating: 1|2|3|4|5) {
    if (this.cachedRatings === null) {
      if (fs.existsSync(this.ratingFile)) {
        this.cachedRatings = JSON.parse(fs.readFileSync(this.ratingFile, 'utf-8'));
      } else if (!fs.existsSync(path.dirname(this.ratingFile))) {
        fs.mkdirSync(path.dirname(this.ratingFile), { recursive: true });
        this.cachedRatings = {};
      }
    }
    if (this.cachedRatings === null) {
      this.cachedRatings = {};
    }
    this.cachedRatings[img] = rating;
    if (this.ratingsWriteTimeout) {
      clearTimeout(this.ratingsWriteTimeout);
    }
    this.ratingsWriteTimeout = setTimeout(() => {
      fs.writeFileSync(this.ratingFile, JSON.stringify(this.cachedRatings, null, 2), 'utf-8');
      this.ratingsWriteTimeout = null;
    }, 5000);
  }

  public listFiles(ratings: Array<1|2|3|4|5> | null): string[] {
    this.updateFilesIfNeeded();
    if (ratings === null) {
      return this.files;
    } else {
      return this.files.filter(f => ratings.includes(this.cachedRatings?.[f] || 0 as any));
    }
  }

  getRouter(): Router {
    return this.router;
  }
}
