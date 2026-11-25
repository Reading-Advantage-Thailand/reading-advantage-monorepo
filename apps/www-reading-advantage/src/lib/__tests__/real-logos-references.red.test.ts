/**
 * Real Advantage logos — kept cases: removed placeholders and rasters (FR-5).
 *
 * Track: www_real_logos_20261008.
 *
 * Asserts the placeholder dirs and replaced rasters under `public/` are gone,
 * and that `public/media/brand/logos/vector/square/` holds all ten square SVGs.
 * The per-literal source sweep rows are kept by real-logos-adversarial.test.ts.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BASE = process.cwd();
const PUBLIC_DIR = join(BASE, "public");

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

describe("real logos references (FR-5)", () => {
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
