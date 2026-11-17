/**
 * Real Advantage logos — Phase 1 Red: mapping (FR-1, FR-4).
 *
 * Track: www_real_logos_20261008.
 *
 * Asserts `siteLogos` maps exactly the ten product ids and that every `color`,
 * `reversed`, and `thaiLockup` value points at the new vector source kinds and to
 * a file that exists under `public/`. Asserts no value still references a removed
 * placeholder kind. Intentionally RED at baseline; becomes GREEN once the manifest
 * is regenerated to the new source kinds.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteLogos } from "../site-assets";

const PUBLIC_DIR = join(process.cwd(), "public");

// A3 defense: enumerate the ten ids and each removed kind as literals.
const EXPECTED_IDS = [
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

const REMOVED_KINDS = ["/svg/", "/reversed/", "/lockups/"] as const;

const publicPath = (url: string) => join(PUBLIC_DIR, url);

describe("real logos mapping (FR-1, FR-4)", () => {
  it("maps exactly the ten product ids, no more and no fewer", () => {
    const actual = Object.keys(siteLogos).slice().sort();
    expect(actual).toEqual([...EXPECTED_IDS].sort());
  });

  for (const id of EXPECTED_IDS) {
    it(`maps "${id}" color to vector/horizontal and the file exists`, () => {
      const url = siteLogos[id].color;
      expect(url.startsWith("/media/brand/logos/vector/horizontal/")).toBe(true);
      expect(existsSync(publicPath(url))).toBe(true);
    });

    it(`maps "${id}" reversed to vector/horizontal-dark-inverse and the file exists`, () => {
      const url = siteLogos[id].reversed;
      expect(url.startsWith("/media/brand/logos/vector/horizontal-dark-inverse/")).toBe(true);
      expect(existsSync(publicPath(url))).toBe(true);
    });

    it(`maps "${id}" thaiLockup to vector/lockup-thai and the file exists`, () => {
      const url = siteLogos[id].thaiLockup;
      expect(url.startsWith("/media/brand/logos/vector/lockup-thai/")).toBe(true);
      expect(existsSync(publicPath(url))).toBe(true);
    });
  }

  for (const kind of REMOVED_KINDS) {
    it(`references no value containing the removed kind "${kind}"`, () => {
      const offenders: string[] = [];
      for (const [id, logo] of Object.entries(siteLogos)) {
        for (const [field, url] of Object.entries(logo)) {
          if (url.includes(kind)) offenders.push(`${id}.${field} -> ${url}`);
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});