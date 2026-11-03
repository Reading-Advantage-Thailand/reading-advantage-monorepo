#!/usr/bin/env tsx
/**
 * Crops the 16 images of the Primary Advantage page from the PR session screenshots
 * (track www_primary_page_revamp_20261030).
 *
 * The script reads the image list at run time. It checks the SHA-256 of each source file
 * against the list before the first crop. One mismatch stops the run with no file written.
 * Each output is a lossless WebP file: a crop only, or a crop and a lanczos3 resize.
 *
 * Usage:
 *   tsx scripts/crop-primary-page-images.ts --source-root <dir> --list <path> [--verify-only]
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(APP_ROOT, "public/images/primary-advantage");

interface ListRow {
  readonly name: string;
  readonly source: string;
  readonly sha256: string;
  readonly crop: readonly [number, number, number, number] | null;
  readonly outWidth: number;
  readonly outHeight: number;
}

/**
 * Reads the value of a command-line option.
 * @param name The option name, with the leading dashes.
 * @returns The value after the option, or undefined when the option is absent.
 */
function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

/**
 * Parses the image table of the image list.
 * @param listPath The path of the image list.
 * @returns One row for each image of the list.
 * @throws When a row has a bad output size.
 */
function parseImageList(listPath: string): ListRow[] {
  const rows: ListRow[] = [];
  for (const line of readFileSync(listPath, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    if (cells.length !== 9 || !/^\d+$/.test(cells[0])) continue;
    const crop = /^\((\d+), (\d+), (\d+), (\d+)\)/.exec(cells[5]);
    const out = /^(\d+)×(\d+)$/.exec(cells[6]);
    if (!out) throw new Error(`Bad output size in row ${cells[0]}: ${cells[6]}`);
    rows.push({
      name: cells[4].replace(/`/g, ""),
      source: cells[2].replace(/`/g, ""),
      sha256: cells[3].replace(/`/g, ""),
      crop: crop ? [Number(crop[1]), Number(crop[2]), Number(crop[3]), Number(crop[4])] : null,
      outWidth: Number(out[1]),
      outHeight: Number(out[2]),
    });
  }
  return rows;
}

/**
 * Checks the SHA-256 of each distinct source file against the list.
 * @param rows The rows of the image list.
 * @param sourceRoot The root directory of the source paths.
 * @returns The problems found, empty when all sources match.
 */
function verifySources(rows: readonly ListRow[], sourceRoot: string): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.source)) continue;
    seen.add(row.source);
    const path = join(sourceRoot, row.source);
    if (!existsSync(path)) {
      problems.push(`${row.source}: missing`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
    if (actual !== row.sha256) problems.push(`${row.source}: hash differs`);
  }
  if (seen.size !== 15) problems.push(`sources: ${seen.size}, expected 15`);
  return problems;
}

/**
 * Writes one lossless WebP crop of a list row.
 * @param row The list row.
 * @param sourceRoot The root directory of the source paths.
 * @returns The width and height of the written file.
 */
async function writeCrop(
  row: ListRow,
  sourceRoot: string,
): Promise<{ width: number; height: number }> {
  let pipeline = sharp(join(sourceRoot, row.source));
  if (row.crop) {
    const [left, top, width, height] = row.crop;
    pipeline = pipeline.extract({ left, top, width, height });
  }
  const cropWidth = row.crop ? row.crop[2] : row.outWidth;
  const cropHeight = row.crop ? row.crop[3] : row.outHeight;
  if (cropWidth !== row.outWidth || cropHeight !== row.outHeight) {
    pipeline = pipeline.resize(row.outWidth, row.outHeight, { kernel: "lanczos3" });
  }
  const info = await pipeline
    .webp({ lossless: true, exact: true, effort: 6 })
    .toFile(join(OUTPUT_DIR, `${row.name}.webp`));
  return { width: info.width, height: info.height };
}

/**
 * Runs the source check and, unless --verify-only is set, writes the 16 crops.
 * @returns The process exit code.
 */
async function main(): Promise<number> {
  const sourceRoot = option("--source-root");
  const list = option("--list");
  if (!sourceRoot || !list) {
    console.error("Usage: crop-primary-page-images.ts --source-root <dir> --list <path> [--verify-only]");
    return 2;
  }
  const rows = parseImageList(resolve(sourceRoot, list));
  if (rows.length !== 16) {
    console.error(`images: ${rows.length}, expected 16`);
    return 1;
  }
  const problems = verifySources(rows, sourceRoot);
  if (problems.length > 0) {
    console.error(`Source check failed. No file written.\n${problems.join("\n")}`);
    return 1;
  }
  console.log("Source check passed: 15 sources match the image list.");
  if (process.argv.includes("--verify-only")) return 0;

  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const row of rows) {
    const { width, height } = await writeCrop(row, sourceRoot);
    if (width !== row.outWidth || height !== row.outHeight) {
      console.error(`${row.name}: wrote ${width}x${height}, list says ${row.outWidth}x${row.outHeight}`);
      return 1;
    }
    console.log(`${row.name}.webp ${width}x${height}`);
  }
  console.log("images: 16 written");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
