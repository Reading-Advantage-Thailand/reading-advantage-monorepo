import { describe, expect, it } from "vitest";

import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";

import {
  TRAVERSAL_CANONICAL_DESCRIPTORS,
  TRAVERSAL_TITLE_IDS,
  TRAVERSAL_TITLE_SUITABILITY,
  createTraversalCanonicalResolver,
  getTraversalSelectedSemanticKeys,
  getTraversalTitleSuitability,
  resolveTraversalTitleCanonicalAssets,
} from "./traversal-suitability.js";

describe("legacy traversal canonical suitability", () => {
  it("freezes exactly the five crosswalk titles and their canonical reuse decisions", () => {
    expect(TRAVERSAL_TITLE_IDS).toEqual([
      "dragon-rider",
      "spellweavers-run",
      "shadow-gate-dungeon",
      "labyrinth-goblin-king",
      "griffin-riders-escape",
    ]);
    expect(TRAVERSAL_TITLE_SUITABILITY.map((title) => title.id)).toEqual(TRAVERSAL_TITLE_IDS);

    for (const title of TRAVERSAL_TITLE_SUITABILITY) {
      expect(title.decision).toBe("reuse-canonical");
      expect(title.legacyAssetDisposition).toBe("blocked-no-legacy-ingestion");
      expect(title.roles.length).toBeGreaterThan(0);
      expect(title.roles.every((role) => role.descriptor.clips === undefined && role.descriptor.directions === undefined)).toBe(true);
      expect(title.roles.every((role) => role.semanticKey.includes(".") === false)).toBe(true);
    }
  });

  it("resolves every title's selected canonical union through accepted T11 Asset Contract v2 APIs", async () => {
    const resolver = await createTraversalCanonicalResolver(
      acceptedStandardAssetCatalog as unknown as StandardAssetCatalog,
    );
    const descriptorIdByKey = new Map(
      TRAVERSAL_CANONICAL_DESCRIPTORS.map((descriptor) => [
        descriptor.catalogEntryKey,
        descriptor.descriptorId,
      ]),
    );

    for (const id of TRAVERSAL_TITLE_IDS) {
      const selection = await resolveTraversalTitleCanonicalAssets(resolver, id);

      expect(selection).toMatchObject({
        contractVersion: 2,
        materialization: "accepted-cartridge-selected-union-only",
        semanticKeys: getTraversalSelectedSemanticKeys(id),
      });
      expect(selection.registrations).toHaveLength(selection.semanticKeys.length);
      expect(selection.registrations.map((registration) => registration.descriptor.descriptorId)).toEqual(
        selection.semanticKeys.map((key) => descriptorIdByKey.get(key)),
      );
      expect(JSON.stringify(selection.registrations)).not.toMatch(/\bpath\b|apps\/|legacy\//iu);
    }
  }, 30_000);

  it("returns a minimal, sorted selected union rather than a source path or full pack", () => {
    for (const id of TRAVERSAL_TITLE_IDS) {
      const title = getTraversalTitleSuitability(id);
      const selected = getTraversalSelectedSemanticKeys(id);

      expect(title).toBeDefined();
      expect(selected).toEqual([...selected].sort((left, right) => left.localeCompare(right)));
      expect(new Set(selected).size).toBe(selected.length);
      expect(selected.length).toBeGreaterThan(0);
      expect(selected.length).toBeLessThan(7);
      expect(JSON.stringify(selected)).not.toMatch(/\.(?:png|ogg|mp3|wav)\b|apps\/|private|legacy\//iu);
    }
  });

  it("rejects a title outside the accepted traversal cohort", () => {
    expect(() => getTraversalSelectedSemanticKeys("castle-defense")).toThrow(/not in the traversal cohort/i);
  });
});
