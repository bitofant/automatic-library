import fs from 'fs';
import path from 'path';
import { LibraryFolder } from './folder.js';
import { Router } from 'express';

export class Library {
  private basePath: string;
  private folders: Map<string, LibraryFolder> = new Map();
  private router: Router;

  constructor(basePath: string) {
    this.basePath = basePath;
    fs.readdirSync(this.basePath)
      .filter(source => fs.lstatSync(path.join(this.basePath, source)).isDirectory())
      .forEach(folderName => {
        this.folders.set(folderName, new LibraryFolder(path.join(this.basePath, folderName)));
      });
    this.router = Router();
    this.folders.forEach((folder, name) => {
      this.router.use(`/${name}`, folder.getRouter());
    });
    this.router.get('/', (req, res) => {
      res.json(Array.from(this.folders.keys()));
    });
    this.router.get('/5stars', (req, res) => {
      res.json(Array.from(this.folders.keys()));
    });
  }

  getRouter(): Router {
    return this.router;
  }

}
