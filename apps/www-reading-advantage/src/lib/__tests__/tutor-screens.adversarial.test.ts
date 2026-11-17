/**
 * A-63 Phase 2 adversarial controls: manifest and asset integrity.
 * Every case passes on the delivered screens and fails on a wrong or hostile one.
 * The webp size is read from header bytes inside the repository. No hashing and
 * no file outside this repository is read.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { tutorScreens } from "../product-pictures";

const PUBLIC = join(process.cwd(), "public");
const SCREENS_DIR = join(PUBLIC, "images", "products", "tutor-advantage");
const PREFIX = "/images/products/tutor-advantage/";
const SLOTS = [
  "guidedWriting",
  "shortAnswer",
  "feedback",
  "selfReflection",
  "classRecord",
] as const;
const BYTES_MAX = 1_000_000;

/**
 * Reads pixel dimensions from a webp header without decoding the image.
 * @param buf The leading bytes of a webp file.
 * @returns The width and height declared in the webp header.
 */
function webpSize(buf: Buffer): { width: number; height: number } {
  const chunkName = (at: number) => buf.subarray(at, at + 4).toString("latin1");
  if (buf.length < 30 || chunkName(0) !== "RIFF" || chunkName(8) !== "WEBP") {
    throw new Error("not a RIFF/WEBP file");
  }
  const chunk = chunkName(12);
  if (chunk === "VP8 ") {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) {
      throw new Error("bad VP8 start code");
    }
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: buf.readUIntLE(24, 3) + 1,
      height: buf.readUIntLE(27, 3) + 1,
    };
  }
  throw new Error(`unsupported webp chunk ${chunk}`);
}

/**
 * Lists every regular file below a directory, recursively.
 * @param dir The directory to walk.
 * @returns Absolute paths of the files found.
 */
function allFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

describe("tutorScreens adversarial controls", () => {
  it("ADV-M1 declared pixel size equals the real webp header size", () => {
    const declared: Record<string, { width: number; height: number }> = {};
    const actual: Record<string, { width: number; height: number }> = {};
    for (const slot of SLOTS) {
      const entry = tutorScreens[slot];
      expect(existsSync(join(PUBLIC, entry.src)), `${slot} ${entry.src}`).toBe(true);
      const real = webpSize(readFileSync(join(PUBLIC, entry.src)));
      declared[slot] = { width: entry.width, height: entry.height };
      actual[slot] = real;
    }
    expect(actual).toEqual(declared);
  });

  it("ADV-M2 no two slots share one src", () => {
    const srcs = SLOTS.map((slot) => tutorScreens[slot].src);
    expect(srcs.length).toBe(5);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it("ADV-M3 every src stays under the prefix without traversal and is at most 1 MB", () => {
    const base = resolve(SCREENS_DIR) + sep;
    for (const slot of SLOTS) {
      const src = tutorScreens[slot].src;
      expect(src.startsWith(PREFIX)).toBe(true);
      expect(src).not.toContain("tutor-desktop");
      const file = resolve(join(PUBLIC, src));
      expect(file.startsWith(base)).toBe(true);
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(BYTES_MAX);
    }
  });

  it("ADV-M4 slot order is fixed and every portrait flag is false", () => {
    expect(Object.keys(tutorScreens)).toEqual([...SLOTS]);
    for (const slot of SLOTS) {
      expect(tutorScreens[slot].portrait).toBe(false);
    }
  });

  it("ADV-A1 every repository image file is webp, non-zero, and no source PNG is present", () => {
    const files = allFiles(SCREENS_DIR);
    expect(files.length).toBe(5);
    for (const file of files) {
      expect(file.endsWith(".webp")).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(0);
      const buf = readFileSync(file);
      expect(buf.subarray(0, 4).toString("latin1")).toBe("RIFF");
      expect(buf.subarray(8, 12).toString("latin1")).toBe("WEBP");
    }
    expect(files.some((file) => file.toLowerCase().endsWith(".png"))).toBe(false);
  });
});
