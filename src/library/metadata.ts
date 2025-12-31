import fs from 'fs';
import path from 'path';
// @ts-expect-error - no type definitions available
import extractChunks from 'png-chunks-extract';
// @ts-expect-error - no type definitions available
import textChunk from 'png-chunk-text';
import imageSize from 'image-size';

const sizeOf = imageSize.default;

export interface PngMetadata {
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  seed?: number;
  sampler?: string;
  cfgScale?: number;
  model?: string;
  size?: string;
}

export interface ImageMetadata {
  filename: string;
  fullPath: string;
  fileSize: number;
  createdAt: string;
  width: number;
  height: number;
  isPng: boolean;
  pngMetadata?: PngMetadata;
}

/**
 * Parse Automatic1111 parameters from the "parameters" text chunk
 * Format example:
 * positive prompt text here
 * Negative prompt: negative prompt text
 * Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 123456789, Size: 512x512, Model: model_name
 */
function parseA1111Parameters(parametersText: string): PngMetadata {
  const metadata: PngMetadata = {};

  // Split into lines
  const lines = parametersText.split('\n');

  // First line(s) until "Negative prompt:" is the positive prompt
  let promptLines: string[] = [];
  let currentLineIndex = 0;

  while (currentLineIndex < lines.length) {
    const line = lines[currentLineIndex];
    if (line && line.startsWith('Negative prompt:')) {
      break;
    }
    promptLines.push(line ?? '');
    currentLineIndex++;
  }

  metadata.prompt = promptLines.join('\n').trim();

  // Extract negative prompt
  if (currentLineIndex < lines.length) {
    const negativeLine = lines[currentLineIndex];
    if (negativeLine && negativeLine.startsWith('Negative prompt:')) {
      metadata.negativePrompt = negativeLine.replace('Negative prompt:', '').trim();
      currentLineIndex++;
    }
  }

  // Parse the parameters line (Steps, Sampler, CFG scale, Seed, Size, Model, etc.)
  if (currentLineIndex < lines.length) {
    const paramsLine = lines[currentLineIndex];
    if (paramsLine) {
      // Split by comma and parse key-value pairs
      const params = paramsLine.split(',').map(p => p.trim());

      for (const param of params) {
        const colonIndex = param.indexOf(':');
        if (colonIndex > 0) {
          const key = param.substring(0, colonIndex).trim();
          const value = param.substring(colonIndex + 1).trim();

          switch (key) {
            case 'Steps':
              metadata.steps = parseInt(value, 10);
              break;
            case 'Sampler':
              metadata.sampler = value;
              break;
            case 'CFG scale':
              metadata.cfgScale = parseFloat(value);
              break;
            case 'Seed':
              metadata.seed = parseInt(value, 10);
              break;
            case 'Size':
              metadata.size = value;
              break;
            case 'Model':
              metadata.model = value;
              break;
          }
        }
      }
    }
  }

  return metadata;
}

/**
 * Extract PNG text chunks and parse A1111 parameters
 */
function extractPngMetadata(filePath: string): PngMetadata | undefined {
  try {
    const buffer = fs.readFileSync(filePath);
    const chunks = extractChunks(buffer);

    // Look for text chunks
    const textChunks = chunks.filter((chunk: any) => chunk.name === 'tEXt');

    // Find the "parameters" chunk (used by Automatic1111)
    for (const chunk of textChunks) {
      const text = textChunk.decode(chunk.data);
      if (text.keyword === 'parameters') {
        return parseA1111Parameters(text.text);
      }
    }

    return undefined;
  } catch (error) {
    console.error('Error extracting PNG metadata:', error);
    return undefined;
  }
}

/**
 * Get comprehensive metadata for an image file
 */
export async function getImageMetadata(filePath: string): Promise<ImageMetadata> {
  const stats = fs.statSync(filePath);
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const isPng = ext === '.png';

  // Get image dimensions
  let width = 0;
  let height = 0;
  try {
    const buffer = fs.readFileSync(filePath);
    const dimensions = sizeOf(buffer);
    width = dimensions.width ?? 0;
    height = dimensions.height ?? 0;
  } catch (error) {
    console.error('Error getting image dimensions:', error);
  }

  // Extract PNG metadata if it's a PNG file
  const pngMetadata = isPng ? extractPngMetadata(filePath) : undefined;

  const metadata: ImageMetadata = {
    filename,
    fullPath: filePath,
    fileSize: stats.size,
    createdAt: stats.birthtime.toISOString(),
    width,
    height,
    isPng
  };

  if (pngMetadata !== undefined) {
    metadata.pngMetadata = pngMetadata;
  }

  return metadata;
}
