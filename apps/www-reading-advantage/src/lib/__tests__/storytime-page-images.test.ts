// @vitest-environment node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { STORYTIME_IMAGES } from "@/__tests__/fixtures/storytime-page-expected";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const MANIFEST = "/home/daniebo/Desktop/handoff/a45-storytime-www-images/MANIFEST.txt";
const OUTPUT_DIR = join(APP_ROOT, "public/images/storytime-advantage");

interface ManifestRow {
  readonly name: string;
  readonly sha256: string;
  readonly source: string;
}

function manifestRows(): ManifestRow[] {
  return readFileSync(MANIFEST, "utf8").split("\n").flatMap((line) => {
    const match = /^([^\s]+)\s+([a-f0-9]{64})\s+OK\s+.+<-\s*(.+)$/.exec(line);
    return match ? [{ name: match[1], sha256: match[2], source: match[3] }] : [];
  });
}

function chunkNames(bytes: Buffer): string[] {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return [];
  const names: string[] = [];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    names.push(bytes.toString("ascii", offset, offset + 4));
    const size = bytes.readUInt32LE(offset + 4);
    offset += 8 + size + (size % 2);
  }
  return names;
}

describe("Storytime Advantage page image assets", () => {
  it("has 10 manifest entries and each source SHA-256 matches", () => {
    const rows = manifestRows();
    expect(rows).toHaveLength(STORYTIME_IMAGES.length);
    const problems: string[] = [];
    for (const row of rows) {
      if (!existsSync(row.source)) {
        problems.push(`${row.name}: source missing`);
        continue;
      }
      const actual = createHash("sha256").update(readFileSync(row.source)).digest("hex");
      if (actual !== row.sha256) problems.push(`${row.name}: SHA-256 mismatch`);
    }
    expect(problems).toEqual([]);
  });

  it("writes only the 10 lossless WebP files at their selected sizes", async () => {
    expect(readdirSync(OUTPUT_DIR).sort()).toEqual(
      STORYTIME_IMAGES.map(({ name }) => `${name}.webp`).sort(),
    );
    const problems: string[] = [];
    for (const image of STORYTIME_IMAGES) {
      const path = join(OUTPUT_DIR, `${image.name}.webp`);
      const bytes = readFileSync(path);
      const chunks = chunkNames(bytes);
      const metadata = await sharp(path).metadata();
      if (!chunks.includes("VP8L") || chunks.includes("VP8 ")) problems.push(`${image.name}: not lossless`);
      if (metadata.width !== image.width || metadata.height !== image.height) {
        problems.push(`${image.name}: dimensions ${metadata.width}x${metadata.height}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("contains exactly the full-frame crop resized with Lanczos3", async () => {
    const rows = manifestRows();
    const byName = new Map(rows.map((row) => [row.name.replace(/\.png$/, ""), row]));
    const problems: string[] = [];
    for (const image of STORYTIME_IMAGES) {
      const source = byName.get(image.name);
      if (!source) {
        problems.push(`${image.name}: manifest row missing`);
        continue;
      }
      const expected = await sharp(source.source)
        .extract({ left: 0, top: 0, width: 4000, height: 3000 })
        .resize(image.width, image.height, { kernel: "lanczos3" })
        .ensureAlpha()
        .raw()
        .toBuffer();
      const actual = await sharp(join(OUTPUT_DIR, `${image.name}.webp`))
        .ensureAlpha()
        .raw()
        .toBuffer();
      if (!expected.equals(actual)) problems.push(`${image.name}: crop pixels differ`);
    }
    expect(problems).toEqual([]);
  });
});
