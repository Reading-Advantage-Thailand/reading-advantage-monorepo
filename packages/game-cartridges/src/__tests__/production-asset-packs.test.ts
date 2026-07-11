import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { editionCatalog, GAMEPLAY_ASSET_SLOTS } from "../editions";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const PUBLIC_ROOT = resolve(REPO_ROOT, "apps/advantage-games/public");
const PACK_BY_EDITION = {
  "primary-chibi": "chibi-quest",
  "secondary-epic": "riven-lands",
} as const;

/** Reads dimensions from the WebP VP8X header emitted by the asset pipeline.
 * @param path Absolute path to a generated WebP file.
 * @returns Pixel width and height encoded in the extended WebP header.
 * @throws When the file does not use a supported RIFF/WEBP VP8X header.
 */
function readWebpDimensions(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error(`${path} is not a WebP file`);
  }
  if (bytes.toString("ascii", 12, 16) !== "VP8X") {
    throw new Error(`${path} does not use a VP8X header`);
  }
  return {
    width: 1 + bytes.readUIntLE(24, 3),
    height: 1 + bytes.readUIntLE(27, 3),
  };
}

describe("APK production asset packs", () => {
  it("maps every semantic slot to a local non-procedural image in both editions", () => {
    for (const edition of editionCatalog) {
      const pack = PACK_BY_EDITION[edition.id as keyof typeof PACK_BY_EDITION];
      expect(pack).toBeDefined();
      expect(Object.keys(edition.assets).sort()).toEqual([...GAMEPLAY_ASSET_SLOTS].sort());
      for (const slot of GAMEPLAY_ASSET_SLOTS) {
        const asset = edition.assets[slot];
        expect(asset).toMatchObject({
          key: slot,
          type: "image",
          url: `/assets/apk/${pack}/v1/${slot.replaceAll(".", "/")}.webp`,
          provenance: {
            source: `APK ${pack} v1 MMX generation pipeline`,
            creator: "Reading Advantage",
            license: "LicenseRef-Reading-Advantage-Original",
          },
          metadata: {
            version: "1.0.0",
            format: "webp",
            optimized: true,
          },
        });
      }
    }
  });

  it("ships paired files with matching dimensions and bounded transfer sizes", () => {
    let chibiBytes = 0;
    let rivenBytes = 0;
    for (const slot of GAMEPLAY_ASSET_SLOTS) {
      const relative = `${slot.replaceAll(".", "/")}.webp`;
      const chibiPath = resolve(PUBLIC_ROOT, "assets/apk/chibi-quest/v1", relative);
      const rivenPath = resolve(PUBLIC_ROOT, "assets/apk/riven-lands/v1", relative);
      expect(existsSync(chibiPath), chibiPath).toBe(true);
      expect(existsSync(rivenPath), rivenPath).toBe(true);
      const chibiStat = statSync(chibiPath);
      const rivenStat = statSync(rivenPath);
      expect(chibiStat.size).toBeLessThanOrEqual(512 * 1024);
      expect(rivenStat.size).toBeLessThanOrEqual(512 * 1024);
      chibiBytes += chibiStat.size;
      rivenBytes += rivenStat.size;
      expect(readWebpDimensions(chibiPath)).toEqual(readWebpDimensions(rivenPath));
    }
    expect(chibiBytes).toBeLessThanOrEqual(12 * 1024 * 1024);
    expect(rivenBytes).toBeLessThanOrEqual(12 * 1024 * 1024);
  });

  it("records real file dimensions and byte sizes in each edition manifest", () => {
    for (const edition of editionCatalog) {
      for (const asset of Object.values(edition.assets)) {
        expect(asset.metadata.width).toBeGreaterThan(0);
        expect(asset.metadata.height).toBeGreaterThan(0);
        expect(asset.metadata.byteSize).toBeGreaterThan(0);
      }
    }
  });
});
