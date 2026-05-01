import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';

type ImageEntry = {
  filename: string;
  formats: string[];
  sizes: Array<'sm' | 'md' | 'lg'>;
  alt: string;
  caption: string;
  captionThai: string;
  aspectRatio: number;
  source: string;
  license: string;
  attribution: string;
  dominantColor?: string;
  needsReplacement?: boolean;
};

type Manifest = {
  images: ImageEntry[];
};

const MANIFEST_PATH = path.join(process.cwd(), 'public/images/lessons/manifest.json');
const ASSET_DIR = path.join(process.cwd(), 'public/images/lessons');
const SIZE_SUFFIX: Record<'sm' | 'md' | 'lg', string> = {
  sm: '-sm',
  md: '-md',
  lg: '',
};

async function readManifest(): Promise<Manifest> {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw) as Manifest;
}

function buildFilename(base: string, size: 'sm' | 'md' | 'lg') {
  return size === 'lg' ? `${base}.webp` : `${base}${SIZE_SUFFIX[size]}.webp`;
}

describe('lesson assets manifest', () => {
  it('contains a reasonable set of lesson images', async () => {
    const manifest = await readManifest();
    expect(manifest.images.length).toBeGreaterThanOrEqual(20);

    for (const image of manifest.images) {
      expect(image.filename).toMatch(/^g4-[a-z0-9-]+-\d{2}$/);
      expect(image.alt.length).toBeGreaterThanOrEqual(10);
      expect(image.caption.length).toBeGreaterThan(0);
      expect(image.captionThai.length).toBeGreaterThan(0);
      expect(image.aspectRatio).toBeGreaterThan(0.1);
      expect(image.source.length).toBeGreaterThan(0);
      expect(image.license.length).toBeGreaterThan(0);
      expect(image.attribution.length).toBeGreaterThan(0);
      expect(image.formats).toContain('webp');
      expect(image.sizes).toEqual(expect.arrayContaining(['sm', 'md', 'lg']));
    }
  });

  it('has optimized assets on disk under the size budget', async () => {
    const manifest = await readManifest();
    const budgetBytes = 200 * 1024;

    for (const image of manifest.images) {
      for (const size of image.sizes) {
        const filename = buildFilename(image.filename, size);
        const assetPath = path.join(ASSET_DIR, filename);
        const stats = await fs.stat(assetPath);
        expect(stats.size).toBeLessThanOrEqual(budgetBytes);

        const metadata = await sharp(assetPath).metadata();
        expect(metadata.width).toBeDefined();
        expect(metadata.height).toBeDefined();
      }
    }
  });

  it('records aspect ratio values that match the optimized assets', async () => {
    const manifest = await readManifest();

    for (const image of manifest.images) {
      const largePath = path.join(ASSET_DIR, buildFilename(image.filename, 'lg'));
      const metadata = await sharp(largePath).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error(`Missing dimensions for ${largePath}`);
      }

      const derivedAspect = metadata.width / metadata.height;
      expect(Math.abs(derivedAspect - image.aspectRatio)).toBeLessThan(0.05);
    }
  });
});
