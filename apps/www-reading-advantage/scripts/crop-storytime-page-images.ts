#!/usr/bin/env tsx
/**
 * Crops and scales the ten approved Storytime Advantage page images.
 * The script verifies every manifest hash before it writes any output.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(APP_ROOT, "public/images/storytime-advantage");
const CROPS = [
  { name: "week-01-hello-pip.png", crop: [0, 0, 4000, 3000], width: 1200, height: 900 },
  { name: "week-02-how-many-cakes.png", crop: [0, 0, 4000, 3000], width: 900, height: 675 },
  { name: "week-03-it-is-red.png", crop: [0, 0, 4000, 3000], width: 900, height: 675 },
  { name: "week-04-nan-and-pam-nap.png", crop: [0, 0, 4000, 3000], width: 900, height: 675 },
  { name: "week-05-two-ears.png", crop: [0, 0, 4000, 3000], width: 900, height: 675 },
  { name: "week-06-i-see-a-cat.png", crop: [0, 0, 4000, 3000], width: 900, height: 675 },
  { name: "week-07-top-on-a-pot.png", crop: [0, 0, 4000, 3000], width: 900, height: 675 },
  { name: "level-2-unit-1-cover-art.png", crop: [520, 840, 2880, 2160], width: 960, height: 720 },
  { name: "week-01-reader-hello-cover.png", crop: [0, 0, 4000, 3000], width: 480, height: 360 },
  { name: "week-01-reader-nan-can-nod-cover.png", crop: [0, 0, 4000, 3000], width: 480, height: 360 },
] as const;

interface ManifestRow {
  readonly name: string;
  readonly sha256: string;
  readonly source: string;
}

/** Reads one command-line option. */
function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** Parses image names, hashes, and source paths from the hand-off manifest. */
function parseManifest(path: string): ManifestRow[] {
  return readFileSync(path, "utf8").split("\n").flatMap((line) => {
    const match = /^([^\s]+)\s+([a-f0-9]{64})\s+OK\s+.+<-(.+)$/.exec(line);
    return match ? [{ name: match[1], sha256: match[2], source: match[3].trim() }] : [];
  });
}

/** Checks all source files before the script writes output. */
function verifySources(rows: readonly ManifestRow[]): string[] {
  const problems: string[] = [];
  for (const row of rows) {
    if (!existsSync(row.source)) {
      problems.push(`${row.name}: missing source ${row.source}`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(row.source)).digest("hex");
    if (actual !== row.sha256) problems.push(`${row.name}: hash differs`);
  }
  return problems;
}

/** Writes one lossless crop and resize. */
async function writeCrop(row: ManifestRow, crop: readonly number[], width: number, height: number): Promise<void> {
  const [left, top, cropWidth, cropHeight] = crop;
  await sharp(row.source)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(width, height, { kernel: "lanczos3" })
    .webp({ lossless: true, exact: true, effort: 6 })
    .toFile(join(OUTPUT_DIR, `${row.name.replace(/\.png$/, "")}.webp`));
}

/** Verifies the manifest and writes the ten output images unless requested otherwise. */
async function main(): Promise<number> {
  const manifest = option("--manifest");
  if (!manifest) {
    console.error("Usage: tsx scripts/crop-storytime-page-images.ts --manifest <path> [--verify-only]");
    return 2;
  }
  const rows = parseManifest(resolve(manifest));
  if (rows.length !== CROPS.length || new Set(rows.map((row) => row.name)).size !== CROPS.length) {
    console.error(`Manifest rows: ${rows.length}; expected ${CROPS.length} unique images.`);
    return 1;
  }
  const problems = verifySources(rows);
  if (problems.length > 0) {
    console.error(`Source check failed. No file written.\n${problems.join("\n")}`);
    return 1;
  }
  console.log(`Source check passed: ${rows.length} files match MANIFEST.txt.`);
  if (process.argv.includes("--verify-only")) return 0;

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const byName = new Map(rows.map((row) => [row.name, row]));
  for (const crop of CROPS) {
    const row = byName.get(crop.name);
    if (!row) throw new Error(`Missing manifest row: ${crop.name}`);
    await writeCrop(row, crop.crop, crop.width, crop.height);
    console.log(`${crop.name.replace(/\.png$/, ".webp")} ${crop.width}x${crop.height}`);
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
