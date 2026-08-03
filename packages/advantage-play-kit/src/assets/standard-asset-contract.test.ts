import { describe, expect, it } from "vitest";

import {
  parseStandardAssetPath,
  resolveStandardAsset,
  validateStandardAssetCatalog,
} from "./standard-asset-contract.js";

describe("standard APK asset paths", () => {
  it("derives a semantic key from the filesystem taxonomy", () => {
    expect(parseStandardAssetPath("top-down/16x16/characters/hero/idle.png")).toEqual({
      path: "top-down/16x16/characters/hero/idle.png",
      key: "top-down/16x16/characters/hero/idle",
      view: "top-down",
      cellSize: { width: 16, height: 16 },
      category: "characters/hero",
      extension: "png",
    });
    expect(parseStandardAssetPath("ui/32x32/icons/inventory-slot.png").key).toBe(
      "ui/32x32/icons/inventory-slot",
    );
  });

  it("keeps cell size distinct from the outer image dimensions and permits native audio", () => {
    expect(parseStandardAssetPath("effects/8x8/combat/hit-spark.png").cellSize).toEqual({
      width: 8,
      height: 8,
    });
    expect(parseStandardAssetPath("audio/native/ui/confirm.ogg")).toMatchObject({
      view: "audio",
      cellSize: null,
      extension: "ogg",
    });
    expect(parseStandardAssetPath("ui/native/sheets/inventory.png").cellSize).toBeNull();
  });

  it("rejects unsafe, ambiguous, or unsupported paths", () => {
    for (const path of [
      "../ui/16x16/icons/coin.png",
      "ui/16x16/icons/Bad_Name.png",
      "unknown/16x16/icons/coin.png",
      "audio/16x16/ui/confirm.ogg",
      "ui/16x16/icons/coin.exe",
      "ui/16/icons/coin.png",
    ]) {
      expect(() => parseStandardAssetPath(path)).toThrow();
    }
  });

  it("rejects duplicate semantic keys", () => {
    expect(() => validateStandardAssetCatalog([
      "ui/16x16/icons/coin.png",
      "ui/16x16/icons/coin.png",
    ])).toThrow(/duplicate/i);
  });

  it("permits native cell sizes for every view used by the materialized standard library", () => {
    for (const view of ["audio", "font", "world", "top-down", "ui", "effects", "side-view"]) {
      const path = view === "audio"
        ? "audio/native/ui/confirm.ogg"
        : view === "font"
          ? "font/native/ui/body.woff2"
          : `${view}/native/art/sample.png`;
      expect(parseStandardAssetPath(path).cellSize).toBeNull();
    }
  });

  it("rejects explicit cell sizes for audio and font views", () => {
    expect(() => parseStandardAssetPath("font/16x16/ui/body.woff2")).toThrow(/native cell size/);
    expect(() => parseStandardAssetPath("audio/16x16/ui/confirm.ogg")).toThrow(/native cell size/);
  });

  it("resolves a browser URL without reading the filesystem at runtime", () => {
    expect(resolveStandardAsset("/assets/apk-standard", "ui/16x16/icons/coin.png")).toEqual({
      url: "/assets/apk-standard/ui/16x16/icons/coin.png",
      key: "ui/16x16/icons/coin",
    });
  });
});
