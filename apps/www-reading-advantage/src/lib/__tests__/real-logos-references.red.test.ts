/**
 * Real Advantage logos — Phase 1 Red: removed-placeholder references (FR-5).
 *
 * Track: www_real_logos_20261008.
 *
 * Sweeps every `.ts` and `.tsx` under `src/` for zero hits of each removed literal,
 * asserts the placeholder dirs and replaced rasters under `public/` are gone, and
 * asserts `public/media/brand/logos/vector/square/` holds all ten square SVGs.
 * Each literal is asserted separately (no word-based exclusion filter). Intentionally
 * RED at baseline; becomes GREEN once the placeholders are removed and copied over.
 */
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BASE = process.cwd();
const SRC_DIR = join(BASE, "src");
const PUBLIC_DIR = join(BASE, "public");

// A3 defense: enumerate each removed literal and raster as a literal.
const REMOVED_LITERALS = [
  "/media/brand/logos/svg/",
  "/media/brand/logos/reversed/",
  "/media/brand/logos/lockups/",
  "/math-advantage.png",
  "/science-advantage.png",
  "/stem-advantage.png",
  "/storytime-advantage.png",
  "/tutor-advantage.png",
  "/zhongwen-advantage.png",
  "/primary-advantage logo.png",
  "/reading-advantage.jpg",
] as const;

const PLACEHOLDER_DIRS = [
  "media/brand/logos/svg",
  "media/brand/logos/reversed",
  "media/brand/logos/lockups",
] as const;

const REPLACED_RASTERS = [
  "math-advantage.png",
  "science-advantage.png",
  "stem-advantage.png",
  "storytime-advantage.png",
  "tutor-advantage.png",
  "zhongwen-advantage.png",
  "primary-advantage logo.png",
  "reading-advantage.jpg",
] as const;

const SQUARE_IDS = [
  "codecamp",
  "mastery",
  "math",
  "primary",
  "reading",
  "science",
  "stem",
  "storytime",
  "tutor",
  "zhongwen",
] as const;

interface SourceFile {
  path: string;
  text: string;
}

let _cached: SourceFile[] | null = null;

/**
 * Collects the text of every `.ts` and `.tsx` under `src/`, excluding test files
 * so the sweep does not self-reference its own literal array (A7/A9 path context).
 */
async function collectSourceTexts(): Promise<SourceFile[]> {
  if (_cached) return _cached;
  const entries = await readdir(SRC_DIR, { recursive: true, withFileTypes: true });
  const files: SourceFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.parentPath.includes("__tests__")) continue;
    const absPath = join(entry.parentPath, entry.name);
    const text = await readFile(absPath, "utf-8");
    files.push({ path: absPath, text });
  }
  _cached = files;
  return files;
}

describe("real logos references (FR-5)", () => {
  for (const literal of REMOVED_LITERALS) {
    it(`references zero occurrences of "${literal}" in src/*.ts(x)`, async () => {
      const files = await collectSourceTexts();
      const hits = files.filter((f) => f.text.includes(literal)).map((f) => f.path);
      expect(hits).toEqual([]);
    });
  }

  for (const dir of PLACEHOLDER_DIRS) {
    it(`removes the placeholder dir public/${dir}`, () => {
      expect(existsSync(join(PUBLIC_DIR, dir))).toBe(false);
    });
  }

  for (const raster of REPLACED_RASTERS) {
    it(`removes the replaced raster public/${raster}`, () => {
      expect(existsSync(join(PUBLIC_DIR, raster))).toBe(false);
    });
  }

  it("holds all ten square SVGs under public/media/brand/logos/vector/square/", () => {
    const squareDir = join(PUBLIC_DIR, "media/brand/logos/vector/square");
    expect(existsSync(squareDir)).toBe(true);
    for (const id of SQUARE_IDS) {
      expect(existsSync(join(squareDir, `${id}-advantage.svg`))).toBe(true);
    }
  });
});