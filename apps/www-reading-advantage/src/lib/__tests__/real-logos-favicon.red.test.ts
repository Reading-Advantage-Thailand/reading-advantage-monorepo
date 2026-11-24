/**
 * Real Advantage logos — kept K case: favicon magic bytes (FR-3).
 *
 * Track: www_real_logos_20261008.
 *
 * Asserts `src/app/[locale]/favicon.ico` starts with the ICO magic
 * `00 00 01 00`. No SHA/hash (repo policy). The other favicon byte rows
 * are kept by real-logos-captures-adversarial.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BASE = process.cwd();
const SRC_FAVICON = join(BASE, "src/app/[locale]/favicon.ico");

const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);

describe("www favicon (FR-3)", () => {
  it("starts with the ICO magic 00 00 01 00 in src/app/[locale]/favicon.ico", () => {
    const a = readFileSync(SRC_FAVICON);
    expect(a.subarray(0, 4).equals(ICO_MAGIC)).toBe(true);
  });
});
