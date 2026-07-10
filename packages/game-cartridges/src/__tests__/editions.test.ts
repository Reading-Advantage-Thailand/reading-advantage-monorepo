import { describe, expect, it } from "vitest";

import {
  editionCatalog,
  GAMEPLAY_ASSET_SLOTS,
  primaryChibiEdition,
  resolveCartridgeEdition,
  secondaryEpicEdition,
} from "../editions";

describe("cartridge editions", () => {
  it("provides Primary Chibi and Secondary Epic without forking game source", () => {
    expect(editionCatalog.map((edition) => edition.id)).toEqual([
      "primary-chibi",
      "secondary-epic",
    ]);
  });

  it("fills every semantic gameplay slot in both editions", () => {
    for (const edition of editionCatalog) {
      expect(Object.keys(edition.assets).sort()).toEqual(
        [...GAMEPLAY_ASSET_SLOTS].sort(),
      );
      for (const asset of Object.values(edition.assets)) {
        expect(asset.key.length).toBeGreaterThan(0);
        expect(asset.type).toMatch(/^(procedural|image|spritesheet|audio)$/);
        expect(asset.provenance.license).toBe(
          "LicenseRef-Reading-Advantage-Original",
        );
      }
    }
  });

  it("uses audience tuning while keeping values inside declared safe bounds", () => {
    expect(primaryChibiEdition.tuning.targetScale).toBeGreaterThan(
      secondaryEpicEdition.tuning.targetScale,
    );
    expect(primaryChibiEdition.tuning.collisionScale).toBeGreaterThan(
      secondaryEpicEdition.tuning.collisionScale,
    );
    expect(primaryChibiEdition.tuning.speed).toBeLessThan(
      secondaryEpicEdition.tuning.speed,
    );

    for (const edition of editionCatalog) {
      expect(edition.tuning.targetScale).toBeGreaterThanOrEqual(0.75);
      expect(edition.tuning.targetScale).toBeLessThanOrEqual(1.5);
      expect(edition.tuning.collisionScale).toBeGreaterThanOrEqual(0.8);
      expect(edition.tuning.collisionScale).toBeLessThanOrEqual(1.5);
      expect(edition.tuning.speed).toBeGreaterThanOrEqual(0.65);
      expect(edition.tuning.speed).toBeLessThanOrEqual(1.35);
    }
  });

  it("resolves known editions and rejects unknown IDs", () => {
    expect(resolveCartridgeEdition("primary-chibi")).toBe(primaryChibiEdition);
    expect(resolveCartridgeEdition("secondary-epic")).toBe(
      secondaryEpicEdition,
    );
    expect(() => resolveCartridgeEdition("unknown")).toThrow(/unknown edition/i);
  });
});
