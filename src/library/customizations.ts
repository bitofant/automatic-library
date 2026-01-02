import fs from 'fs';
import path from 'path';

interface FolderCustomization {
  displayName?: string
  icon?: string
}

interface CustomizationsData {
  [folderPath: string]: FolderCustomization
}

export class CustomizationsManager {
  private customizationsFile: string;
  private cachedCustomizations: CustomizationsData | null = null;
  private writeTimeout: NodeJS.Timeout | null = null;

  constructor(ratingsDir: string) {
    this.customizationsFile = path.join(ratingsDir, 'customizations.json');
  }

  loadCustomizations(): CustomizationsData {
    if (this.cachedCustomizations !== null) {
      return this.cachedCustomizations;
    }

    if (fs.existsSync(this.customizationsFile)) {
      this.cachedCustomizations = JSON.parse(fs.readFileSync(this.customizationsFile, 'utf-8'));
      return this.cachedCustomizations!;
    }

    this.cachedCustomizations = {};
    return this.cachedCustomizations;
  }

  getCustomization(folderPath: string): FolderCustomization | undefined {
    const customizations = this.loadCustomizations();
    return customizations[folderPath];
  }

  setCustomization(folderPath: string, customization: FolderCustomization) {
    const customizations = this.loadCustomizations();

    // Remove empty customizations
    if (!customization.displayName && !customization.icon) {
      delete customizations[folderPath];
    } else {
      customizations[folderPath] = customization;
    }

    // Debounce writes
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    this.writeTimeout = setTimeout(() => {
      this.saveCustomizations();
      this.writeTimeout = null;
    }, 5000);
  }

  removeCustomization(folderPath: string) {
    const customizations = this.loadCustomizations();
    delete customizations[folderPath];

    // Save immediately for deletions
    this.saveCustomizations();
  }

  private saveCustomizations() {
    const dir = path.dirname(this.customizationsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.customizationsFile, JSON.stringify(this.cachedCustomizations, null, 2), 'utf-8');
  }
}
