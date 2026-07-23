import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validateStandardAssetCatalog } from "./standard-asset-contract.js";

const STANDARD_ROOT = join(process.cwd(), "assets/standard");

function assetPaths(directory = STANDARD_ROOT, prefix = ""): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.endsWith(".md") || entry.name.endsWith(".txt")) return [];
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? assetPaths(join(directory, entry.name), path) : [path];
  });
}

describe("APK standard asset library", () => {
  it("contains a valid first curated batch spanning the initial asset families", () => {
    const paths = assetPaths();
    expect(paths).toEqual(expect.arrayContaining([
      "top-down/32x32/characters/hero-01.png",
      "side-view/32x32/characters/enemy-001-idle.png",
      "ui/16x16/controls/gamepad-buttons.png",
      "ui/20x20/inventory/slot.png",
      "ui/32x32/items/armor-icons.png",
      "effects/32x32/combat/hit-01.png",
      "audio/native/combat/hit-01.ogg",
    ]));
    expect(validateStandardAssetCatalog(paths)).toHaveLength(7);
    expect(paths.every((path) => statSync(join(STANDARD_ROOT, path)).size > 0)).toBe(true);
  });

  it("retains source records, attribution copy, and the included license", () => {
    const sources = readFileSync(join(STANDARD_ROOT, "SOURCES.md"), "utf8");
    expect(sources).toContain("Rogue Adventure World.zip");
    expect(sources).toContain("Sound Effects.zip");
    expect(readFileSync(join(STANDARD_ROOT, "README.md"), "utf8")).toContain("Pixel art assets by ElvGames");
    expect(readFileSync(join(STANDARD_ROOT, "LICENSE-ELVGAMES.txt"), "utf8")).toContain("Credits to ElvGames");
  });
});
