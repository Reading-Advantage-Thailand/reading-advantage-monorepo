import {
  BABEL_ARCHITECT_ASSET_MANIFEST,
  BABEL_ARCHITECT_PALETTE,
  BABEL_ARCHITECT_ASSET_DIR,
  PREFERRED_ASSET_PACK,
  type BabelArchitectAssetKey,
} from "./assetManifest";

const REQUIRED_KEYS: BabelArchitectAssetKey[] = [
  "block-stone",
  "block-stable",
  "block-unstable",
  "background",
  "tower-base",
  "particle",
  "ui-accent",
];

describe("babelArchitect assetManifest", () => {
  it("defines a stable entry for every required asset category", () => {
    for (const key of REQUIRED_KEYS) {
      expect(BABEL_ARCHITECT_ASSET_MANIFEST[key]).toBeDefined();
      expect(BABEL_ARCHITECT_ASSET_MANIFEST[key].key).toBe(key);
    }
  });

  it("uses code-generated placeholders backed by palette colors", () => {
    for (const key of REQUIRED_KEYS) {
      const entry = BABEL_ARCHITECT_ASSET_MANIFEST[key];
      expect(entry.source.kind).toBe("code-generated");
      if (entry.source.kind === "code-generated") {
        expect(BABEL_ARCHITECT_PALETTE).toHaveProperty(entry.source.paletteKey);
      }
    }
  });

  it("documents a stable replacement path under the public asset directory", () => {
    for (const key of REQUIRED_KEYS) {
      const entry = BABEL_ARCHITECT_ASSET_MANIFEST[key];
      expect(entry.replacementPath).toMatch(/\.png$/);
      expect(entry.replacementPath.startsWith(BABEL_ARCHITECT_ASSET_DIR)).toBe(true);
    }
  });

  it("documents the preferred future asset pack without requiring it", () => {
    expect(PREFERRED_ASSET_PACK.name).toContain("Pixel Crawler");
    expect(PREFERRED_ASSET_PACK.license).toMatch(/ingestion/i);
  });
});
