import fs from 'fs';
import path from 'path';

interface RatingsData {
  "1": string[]
  "2": string[]
  "3": string[]
  "4": string[]
  "5": string[]
}

export class RatingsManager {
  private ratingsFile: string;
  private cachedRatings: RatingsData | null = null;
  private ratingsWriteTimeout: NodeJS.Timeout | null = null;
  private migrationDone: boolean = false;

  constructor(ratingsDir: string) {
    this.ratingsFile = path.join(ratingsDir, 'ratings.json');
  }

  loadRatings(): RatingsData {
    if (this.cachedRatings !== null) {
      return this.cachedRatings;
    }

    if (fs.existsSync(this.ratingsFile)) {
      this.cachedRatings = JSON.parse(fs.readFileSync(this.ratingsFile, 'utf-8'));
      return this.cachedRatings!;
    }

    this.cachedRatings = { "1": [], "2": [], "3": [], "4": [], "5": [] };

    if (!this.migrationDone) {
      this.migrateOldRatings();
      this.migrationDone = true;
    }

    return this.cachedRatings;
  }

  private migrateOldRatings() {
    const ratingsDir = path.dirname(this.ratingsFile);

    if (!fs.existsSync(ratingsDir)) {
      fs.mkdirSync(ratingsDir, { recursive: true });
      return;
    }

    const oldFiles = fs.readdirSync(ratingsDir)
      .filter(f => f.endsWith('.json') && f !== 'ratings.json');

    if (oldFiles.length === 0) {
      return;
    }

    console.log(`Migrating ${oldFiles.length} old rating files...`);

    for (const oldFile of oldFiles) {
      const folderName = path.basename(oldFile, '.json');
      const oldPath = path.join(ratingsDir, oldFile);

      try {
        const oldRatings: Record<string, number> = JSON.parse(
          fs.readFileSync(oldPath, 'utf-8')
        );

        for (const [filename, rating] of Object.entries(oldRatings)) {
          const fullRef = `${folderName}/${filename}`;
          const ratingKey = String(rating) as "1"|"2"|"3"|"4"|"5";

          if (!this.cachedRatings![ratingKey].includes(fullRef)) {
            this.cachedRatings![ratingKey].push(fullRef);
          }
        }

        console.log(`  Migrated ${folderName}: ${Object.keys(oldRatings).length} ratings`);
      } catch (error) {
        console.error(`  Failed to migrate ${oldFile}:`, error);
      }
    }

    this.saveRatings();
    console.log('Migration complete.');
  }

  setRating(library: string, file: string, rating: 1|2|3|4|5) {
    const ratings = this.loadRatings();
    const fullRef = `${library}/${file}`;

    for (const key of ["1", "2", "3", "4", "5"] as const) {
      const index = ratings[key].indexOf(fullRef);
      if (index !== -1) {
        ratings[key].splice(index, 1);
      }
    }

    const ratingKey = String(rating) as "1"|"2"|"3"|"4"|"5";
    if (!ratings[ratingKey].includes(fullRef)) {
      ratings[ratingKey].push(fullRef);
    }

    if (this.ratingsWriteTimeout) {
      clearTimeout(this.ratingsWriteTimeout);
    }
    this.ratingsWriteTimeout = setTimeout(() => {
      this.saveRatings();
      this.ratingsWriteTimeout = null;
    }, 5000);
  }

  getRating(library: string, file: string): number | undefined {
    const ratings = this.loadRatings();
    const fullRef = `${library}/${file}`;

    for (const key of ["1", "2", "3", "4", "5"] as const) {
      if (ratings[key].includes(fullRef)) {
        return parseInt(key);
      }
    }
    return undefined;
  }

  removeRating(library: string, file: string) {
    const ratings = this.loadRatings();
    const fullRef = `${library}/${file}`;

    // Remove from all rating arrays
    for (const key of ["1", "2", "3", "4", "5"] as const) {
      const index = ratings[key].indexOf(fullRef);
      if (index !== -1) {
        ratings[key].splice(index, 1);
      }
    }

    // Save immediately for deletions
    this.saveRatings();
  }

  getFilesForLibrary(library: string, ratingFilter: Array<1|2|3|4|5> | null): string[] {
    const ratings = this.loadRatings();

    if (ratingFilter === null) {
      const allFiles: string[] = [];
      for (const key of ["1", "2", "3", "4", "5"] as const) {
        allFiles.push(...ratings[key].filter(ref => ref.startsWith(`${library}/`)));
      }
      return allFiles.map(ref => ref.substring(library.length + 1));
    }

    const matchingFiles: string[] = [];
    for (const rating of ratingFilter) {
      const key = String(rating) as "1"|"2"|"3"|"4"|"5";
      matchingFiles.push(...ratings[key].filter(ref => ref.startsWith(`${library}/`)));
    }

    return matchingFiles.map(ref => ref.substring(library.length + 1));
  }

  private saveRatings() {
    const dir = path.dirname(this.ratingsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.ratingsFile, JSON.stringify(this.cachedRatings, null, 2), 'utf-8');
  }
}
