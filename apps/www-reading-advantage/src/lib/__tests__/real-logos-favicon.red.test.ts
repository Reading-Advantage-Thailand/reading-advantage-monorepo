/**
 * Real Advantage logos — Phase 1 Red: favicon (FR-3).
 *
 * Track: www_real_logos_20261008.
 *
 * Asserts `src/app/[locale]/favicon.ico` and `public/favicon.ico` are byte-identical,
 * have the source `reading-advantage.ico` byte length (6507), and start with the ICO
 * magic `00 00 01 00`. No SHA/hash (repo policy). Intentionally RED at baseline;
 * becomes GREEN once both files carry the new ICO.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BASE = process.cwd();
const SRC_FAVICON = join(BASE, "src/app/[locale]/favicon.ico");
const PUBLIC_FAVICON = join(BASE, "public/favicon.ico");

const EXPECTED_BYTE_LENGTH = 6507;
const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);

describe("www favicon (FR-3)", () => {
  it("has src/app/[locale]/favicon.ico and public/favicon.ico byte-identical", () => {
    const a = readFileSync(SRC_FAVICON);
    const b = readFileSync(PUBLIC_FAVICON);
    expect(a.equals(b)).toBe(true);
  });

  it("has byte length 6507 for src/app/[locale]/favicon.ico", () => {
    const a = readFileSync(SRC_FAVICON);
    expect(a.length).toBe(EXPECTED_BYTE_LENGTH);
  });

  it("has byte length 6507 for public/favicon.ico", () => {
    const b = readFileSync(PUBLIC_FAVICON);
    expect(b.length).toBe(EXPECTED_BYTE_LENGTH);
  });

  it("starts with the ICO magic 00 00 01 00 in src/app/[locale]/favicon.ico", () => {
    const a = readFileSync(SRC_FAVICON);
    expect(a.subarray(0, 4).equals(ICO_MAGIC)).toBe(true);
  });

  it("starts with the ICO magic 00 00 01 00 in public/favicon.ico", () => {
    const b = readFileSync(PUBLIC_FAVICON);
    expect(b.subarray(0, 4).equals(ICO_MAGIC)).toBe(true);
  });
});