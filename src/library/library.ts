import fs from 'fs';
import path from 'path';
import { LibraryFolder } from './folder.js';
import { RatingsManager } from './ratings.js';
import { Router } from 'express';

interface FolderNode {
  path: string           // Relative path from base (e.g., "honmen/1")
  fullPath: string       // Absolute filesystem path
  name: string           // Display name (basename)
  children: FolderNode[] // Nested folders
  hasImages: boolean     // True if contains images directly
}

export class Library {
  private basePath: string;
  private folders: Map<string, LibraryFolder> = new Map();
  private router: Router;
  private ratingsManager: RatingsManager;
  private folderTree: FolderNode[] = [];
  private rootHasImages: boolean = false;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.ratingsManager = new RatingsManager(process.cwd() + '/ratings');

    // Scan tree recursively
    this.folderTree = this.scanFolderTree(this.basePath);

    // Check if root contains images
    this.rootHasImages = fs.readdirSync(this.basePath)
      .some(f => /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(f));

    // Flatten tree for router registration
    const flatFolders = this.flattenTree(this.folderTree);

    // Register root folder if it has images
    if (this.rootHasImages) {
      this.folders.set('__root__', new LibraryFolder(
        this.basePath,
        this.ratingsManager,
        '__root__'
      ));
    }

    // Setup router
    this.router = Router();

    // List endpoint returns tree structure
    this.router.get('/', (req, res) => {
      res.json({
        root: this.rootHasImages ? {
          path: '__root__',
          name: path.basename(this.basePath),
          children: [],
          hasImages: true
        } : null,
        folders: this.folderTree
      });
    });

    // Register all nested folders with their full relative paths
    flatFolders.forEach(({ path: relPath, fullPath }) => {
      const folder = new LibraryFolder(
        fullPath,
        this.ratingsManager,
        relPath
      );
      this.folders.set(relPath, folder);

      // Register folder router at its relative path
      this.router.use(`/${relPath}`, folder.getRouter());
    });
  }

  private scanFolderTree(basePath: string, relativePath: string = ''): FolderNode[] {
    const fullPath = path.join(basePath, relativePath);
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    const nodes: FolderNode[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryRelPath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;
      const entryFullPath = path.join(fullPath, entry.name);

      // Check if contains images directly
      const hasImages = fs.readdirSync(entryFullPath)
        .some(f => /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(f));

      // Recurse into children
      const children = this.scanFolderTree(basePath, entryRelPath);

      nodes.push({
        path: entryRelPath,
        fullPath: entryFullPath,
        name: entry.name,
        children,
        hasImages
      });
    }

    return nodes;
  }

  private flattenTree(nodes: FolderNode[]): Array<{path: string, fullPath: string}> {
    const flat: Array<{path: string, fullPath: string}> = [];

    for (const node of nodes) {
      if (node.hasImages) {
        flat.push({ path: node.path, fullPath: node.fullPath });
      }
      flat.push(...this.flattenTree(node.children));
    }

    return flat;
  }

  getRouter(): Router {
    return this.router;
  }
}
