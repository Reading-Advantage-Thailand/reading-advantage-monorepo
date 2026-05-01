import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

type SizeKey = 'sm' | 'md' | 'lg';

const ORIGINALS_DIR = path.join(process.cwd(), 'public/images/lessons/originals');
const OUTPUT_DIR = path.join(process.cwd(), 'public/images/lessons');
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.svg']);

const TARGET_WIDTHS: Record<SizeKey, number> = {
  sm: 400,
  md: 800,
  lg: 1200,
};

type OptimizedAsset = {
  baseName: string;
  aspectRatio: number;
  outputs: Array<{ filename: string; width?: number; height?: number; size: SizeKey }>;
};

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function listOriginals(): Promise<string[]> {
  const entries = await fs.readdir(ORIGINALS_DIR);
  return entries
    .filter((entry) => ALLOWED_EXTENSIONS.has(path.extname(entry).toLowerCase()))
    .map((entry) => path.join(ORIGINALS_DIR, entry));
}

async function optimizeImage(filePath: string): Promise<OptimizedAsset> {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const image = sharp(filePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Missing dimensions for ${filePath}`);
  }

  const aspectRatio = metadata.width / metadata.height;
  const outputs: OptimizedAsset['outputs'] = [];

  for (const sizeKey of Object.keys(TARGET_WIDTHS) as SizeKey[]) {
    const width = TARGET_WIDTHS[sizeKey];
    const outputName =
      sizeKey === 'lg' ? `${baseName}.webp` : `${baseName}-${sizeKey}.webp`;
    const outputPath = path.join(OUTPUT_DIR, outputName);

    await image
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outputPath);

    const outMeta = await sharp(outputPath).metadata();

    outputs.push({
      filename: outputName,
      width: outMeta.width,
      height: outMeta.height,
      size: sizeKey,
    });
  }

  return { baseName, aspectRatio, outputs };
}

async function main() {
  await ensureOutputDir();
  const originals = await listOriginals();

  if (!originals.length) {
    console.warn('No originals found. Add assets to public/images/lessons/originals/.');
    return;
  }

  const results: OptimizedAsset[] = [];

  for (const file of originals) {
    try {
      const optimized = await optimizeImage(file);
      results.push(optimized);
      console.log(
        `Processed ${optimized.baseName} -> ${optimized.outputs
          .map((o) => o.filename)
          .join(', ')} (aspect ratio ${optimized.aspectRatio.toFixed(3)})`,
      );
    } catch (error) {
      console.error(`Failed to process ${file}:`, error);
      process.exitCode = 1;
    }
  }

  console.log(`\nCompleted optimization for ${results.length} asset(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
