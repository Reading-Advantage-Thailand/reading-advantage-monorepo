import { describe, expect, it } from "vitest";

import {
  OWNER_APPROVED_CANONICAL_BINDINGS,
  createSemanticAssetResolver,
  validateSemanticProductBindings,
} from "./semantic-product-bindings.js";
import type { StandardAssetCatalogEntry, StandardAssetResolver } from "./standard-pack-release.js";

function createBaseResolver(): StandardAssetResolver {
  const entries = new Map(OWNER_APPROVED_CANONICAL_BINDINGS.bindings.map((binding) => [binding.semanticKey, {
    path: `${binding.semanticKey}.png`,
    key: binding.semanticKey,
    view: binding.semanticKey.split("/")[0] as StandardAssetCatalogEntry["view"],
    cellSize: null,
    category: "fixture",
    extension: binding.semanticKey.startsWith("audio/") ? "ogg" : "png",
    sourceReceiptLocator: `fixture:${binding.semanticKey}`,
    physical: {
      kind: binding.semanticKey.startsWith("audio/") ? "audio" as const : "image" as const,
      byteSize: 1,
      sha256: "a".repeat(64),
      dimensions: binding.semanticKey.startsWith("audio/") ? null : { width: 32, height: 32 },
      frameGrid: null,
    },
  }]));
  return {
    resolve(key) {
      const entry = entries.get(key);
      if (!entry) throw new Error(`Unknown standard asset semantic key ${key}`);
      return { ...entry, requiredCredit: "Pixel art assets by ElvGames" };
    },
  };
}

describe("owner-approved semantic product bindings", () => {
  it("labels forward mappings as normative owner product decisions, not historical evidence", () => {
    expect(OWNER_APPROVED_CANONICAL_BINDINGS.classification).toBe("owner-approved-product-binding");
    expect(OWNER_APPROVED_CANONICAL_BINDINGS.legacyEvidenceClaim).toBe(false);
  });

  it("resolves role/state requirements and returns only the deduplicated selected union", () => {
    const resolver = createSemanticAssetResolver(createBaseResolver(), OWNER_APPROVED_CANONICAL_BINDINGS);
    const selected = resolver.select([
      { role: "player", state: "idle" },
      { role: "feedback", state: "correct" },
      { role: "player", state: "idle" },
    ]);

    expect(selected.semanticKeys).toEqual([
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
    ]);
    expect(selected.registrations).toHaveLength(2);
    expect(selected.requiredCredit).toBe("Pixel art assets by ElvGames");
  });

  it("fails closed for an unmapped role/state", () => {
    const resolver = createSemanticAssetResolver(createBaseResolver(), OWNER_APPROVED_CANONICAL_BINDINGS);
    expect(() => resolver.resolve({ role: "player", state: "flying" })).toThrow(/unmapped/i);
  });

  it("rejects resolver entries whose key, descriptor, or source binding is tampered", () => {
    const base = createBaseResolver();
    const createTamperedResolver = (
      tamper: (entry: ReturnType<StandardAssetResolver["resolve"]>) => ReturnType<StandardAssetResolver["resolve"]>,
    ): StandardAssetResolver => ({
      resolve(key) {
        return tamper(base.resolve(key));
      },
    });
    const resolvePlayer = (resolver: StandardAssetResolver) => createSemanticAssetResolver(
      resolver,
      OWNER_APPROVED_CANONICAL_BINDINGS,
    ).resolve({ role: "player", state: "idle" });

    expect(() => resolvePlayer(createTamperedResolver((entry) => ({
      ...entry,
      key: "imagined/forged-key",
    })))).toThrow(/resolved key.*semantic binding/i);
    expect(() => resolvePlayer(createTamperedResolver((entry) => ({
      ...entry,
      path: `private-pack/${entry.path}`,
    })))).toThrow(/descriptor.*semantic key/i);
    expect(() => resolvePlayer(createTamperedResolver((entry) => ({
      ...entry,
      sourceReceiptLocator: "",
    })))).toThrow(/source receipt/i);
  });

  it("rejects duplicate physical-source registrations during selected-union materialization", () => {
    const base = createBaseResolver();
    const duplicatePhysicalSource: StandardAssetResolver = {
      resolve(key) {
        const entry = base.resolve(key);
        return key === "effects/32x32/combat/hit-01"
          ? {
              ...entry,
              sourceReceiptLocator: "fixture:top-down/32x32/characters/hero-01",
            }
          : entry;
      },
    };
    const resolver = createSemanticAssetResolver(
      duplicatePhysicalSource,
      OWNER_APPROVED_CANONICAL_BINDINGS,
    );

    expect(() => resolver.select([
      { role: "player", state: "idle" },
      { role: "feedback", state: "correct" },
    ])).toThrow(/duplicate physical source.*materialization/i);
  });

  it("registers explicit frames and rejects incomplete animation, tileset, or nine-slice descriptors", () => {
    const frameManifest = validateSemanticProductBindings({
      ...OWNER_APPROVED_CANONICAL_BINDINGS,
      bindings: [{
        ...OWNER_APPROVED_CANONICAL_BINDINGS.bindings[0],
        usage: "frame",
        frame: 2,
      }],
    });
    const resolver = createSemanticAssetResolver(createBaseResolver(), frameManifest);
    expect(resolver.select([{ role: "player", state: "idle" }]).registrations[0]).toMatchObject({ kind: "frame", frame: 2 });

    expect(() => validateSemanticProductBindings({
      ...OWNER_APPROVED_CANONICAL_BINDINGS,
      bindings: [{ ...OWNER_APPROVED_CANONICAL_BINDINGS.bindings[0], usage: "animation", animation: undefined }],
    })).toThrow(/animation name/i);
  });
});
