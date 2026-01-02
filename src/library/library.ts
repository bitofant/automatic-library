import fs from 'fs';
import path from 'path';
import { LibraryFolder } from './folder.js';
import { RatingsManager } from './ratings.js';
import { CustomizationsManager } from './customizations.js';
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
  private customizationsManager: CustomizationsManager;
  private folderTree: FolderNode[] = [];
  private rootHasImages: boolean = false;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.ratingsManager = new RatingsManager(process.cwd() + '/ratings');
    this.customizationsManager = new CustomizationsManager(process.cwd() + '/ratings');
    this.router = Router();
    this.initializeFolders();
  }

  private initializeFolders() {
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

    // List endpoint returns tree structure
    this.router.get('/', (req, res) => {
      res.json({
        root: this.rootHasImages ? {
          path: '__root__',
          name: path.basename(this.basePath),
          children: [],
          hasImages: true
        } : null,
        folders: this.folderTree,
        customizations: this.customizationsManager.loadCustomizations()
      });
    });

    // Reload endpoint to re-scan filesystem
    this.router.post('/reload', (req, res) => {
      try {
        this.reload();
        res.json({
          root: this.rootHasImages ? {
            path: '__root__',
            name: path.basename(this.basePath),
            children: [],
            hasImages: true
          } : null,
          folders: this.folderTree,
          customizations: this.customizationsManager.loadCustomizations()
        });
      } catch (error) {
        console.error('Failed to reload libraries:', error);
        res.status(500).json({ error: 'Failed to reload libraries' });
      }
    });

    // Global delete endpoint
    this.router.delete('/delete', (req, res) => {
      if (!req.body || !req.body.library || !req.body.file) {
        return res.status(400).json({ error: 'Invalid payload: library and file required' });
      }

      const libraryId: string = req.body.library;
      const filename: string = req.body.file;

      // Get the folder instance
      const folder = this.folders.get(libraryId);
      if (!folder) {
        return res.status(404).json({ error: 'Library not found' });
      }

      // Construct full file path
      const folderPath = libraryId === '__root__'
        ? this.basePath
        : path.join(this.basePath, libraryId);
      const filePath = path.join(folderPath, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      try {
        // Delete the file
        fs.unlinkSync(filePath);

        // Remove from ratings centrally
        this.ratingsManager.removeRating(libraryId, filename);

        // Invalidate cache for all folders to pick up changes
        this.folders.forEach(folder => folder.invalidateCache());

        console.log(`Deleted: ${libraryId}/${filename}`);
        res.sendStatus(200);
      } catch (error) {
        console.error('Failed to delete file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
      }
    });

    // Customizations endpoints
    this.router.get('/customizations', (req, res) => {
      const customizations = this.customizationsManager.loadCustomizations();
      res.json(customizations);
    });

    this.router.post('/customizations', (req, res) => {
      if (!req.body || !req.body.folderPath) {
        return res.status(400).json({ error: 'Invalid payload: folderPath required' });
      }

      const { folderPath, displayName, icon } = req.body;
      this.customizationsManager.setCustomization(folderPath, { displayName, icon });
      res.sendStatus(200);
    });

    this.router.delete('/customizations/:folderPath', (req, res) => {
      const folderPath = decodeURIComponent(req.params.folderPath);
      this.customizationsManager.removeCustomization(folderPath);
      res.sendStatus(200);
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

  public reload() {
    // Clear router stack to remove all existing routes
    this.router.stack.length = 0;

    // Clear folders map
    this.folders.clear();

    // Reset state
    this.folderTree = [];
    this.rootHasImages = false;

    // Re-scan and re-register all routes
    this.initializeFolders();
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
