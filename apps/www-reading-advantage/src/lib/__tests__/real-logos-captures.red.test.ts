/**
 * Real Advantage logos — Phase 2 Red: browser captures.
 *
 * Track: www_real_logos_20261008.
 *
 * Asserts each named capture file exists under
 * measure/archive/www_real_logos_20261008/captures/. Each file must be non-empty
 * and must start with the PNG magic 89 50 4E 47. No hash (repo policy).
 *
 * Intentionally RED while the files are absent. Green saves the PNGs.
 * Run this file from apps/www-reading-advantage. The path walks up from this file.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TEST_DIR, "../../../../..");
const CAPTURES_DIR = join(
  REPO_ROOT,
  "measure/archive/www_real_logos_20261008/captures",
);

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Named captures for viewport 1280x800. Not a full-page capture.
 * Dark files record prefers-color-scheme: dark. The site has no theme switch.
 */
const CAPTURE_FILES = [
  "en-home-light.png",
  "en-home-footer-light.png",
  "en-products-light.png",
  "en-math-light.png",
  "en-primary-light.png",
  "en-reading-light.png",
  "en-science-light.png",
  "en-stem-light.png",
  "en-storytime-light.png",
  "en-zhongwen-light.png",
  "en-tutor-light.png",
  "th-home-light.png",
  "th-primary-light.png",
  "en-home-dark.png",
  "en-tutor-dark.png",
] as const;

describe("Phase 2 logo captures", () => {
  it("resolves the repo root that holds measure/tracks.md", () => {
    const tracks = join(REPO_ROOT, "measure/tracks.md");
    expect(existsSync(tracks), `repo root not found: ${REPO_ROOT}`).toBe(true);
  });

  it.each(CAPTURE_FILES)("has non-empty PNG %s", (name) => {
    const path = join(CAPTURES_DIR, name);
    expect(existsSync(path), `missing capture file: ${name}`).toBe(true);
    const bytes = readFileSync(path);
    expect(bytes.length, `empty capture file: ${name}`).toBeGreaterThan(0);
    expect(
      bytes.subarray(0, 4).equals(PNG_MAGIC),
      `capture file ${name} does not start with PNG magic 89 50 4E 47`,
    ).toBe(true);
  });
});
