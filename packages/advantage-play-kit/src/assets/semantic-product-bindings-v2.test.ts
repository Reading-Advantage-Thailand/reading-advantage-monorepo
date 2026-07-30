import { readStandardPackCatalogFixture } from "./standard-pack-test-paths.test-support.js";

import { describe, expect, it } from "vitest";

import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  createAcceptedStandardAssetResolver,
} from "./accepted-standard-pack-release.js";
import {
  OWNER_APPROVED_CANONICAL_BINDINGS,
  createDescriptorAwareSemanticAssetResolver,
} from "./semantic-product-bindings.js";
import type { StandardAssetCatalog, StandardAssetResolver } from "./standard-pack-release.js";

const REQUIRED_CREDIT = "Pixel art assets by ElvGames" as const;

const acceptedCatalog = readStandardPackCatalogFixture();
let acceptedBaseResolverPromise: Promise<StandardAssetResolver> | undefined;

/**
 * Loads the exact root-accepted standard-pack resolver for descriptor provenance tests.
 * @returns The resolver produced after catalog and release-binding verification.
 */
function createAcceptedBaseResolver(): Promise<StandardAssetResolver> {
  acceptedBaseResolverPromise ??= createAcceptedStandardAssetResolver(acceptedCatalog, {
    version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
    catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
    sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
  });
  return acceptedBaseResolverPromise;
}

/**
 * Creates a structural resolver that has not passed accepted-release verification.
 * @returns A forged resolver for provenance-boundary regression coverage.
 */
function createForgedResolver(): StandardAssetResolver {
  return {
    resolve() {
      throw new Error("Forged resolver must not be queried");
    },
  };
}

function createDescriptor(
  binding: (typeof OWNER_APPROVED_CANONICAL_BINDINGS.bindings)[number],
  baseResolver: StandardAssetResolver,
): unknown {
  const dimensions = baseResolver.resolve(binding.semanticKey).physical.dimensions;
  const common = {
    contractVersion: 2,
    descriptorId: `${binding.role}-${binding.state}`,
    catalogEntryKey: binding.semanticKey,
    release: {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 0, y: 0, width: 1, height: 1 },
    readabilityEnvelope: { minimumRenderPixels: 16, minimumContrastRatio: 3 },
  };
  return binding.usage === "audio"
    ? { ...common, mediaKind: "audio", audio: { durationMs: 300, channels: 2, loop: false } }
    : {
        ...common,
        mediaKind: "image",
        geometry: {
          width: dimensions?.width ?? 1,
          height: dimensions?.height ?? 1,
          frameWidth: dimensions?.width ?? 1,
          frameHeight: dimensions?.height ?? 1,
          columns: 1,
          rows: 1,
        },
      };
}

function createDescriptors(baseResolver: StandardAssetResolver): readonly unknown[] {
  return OWNER_APPROVED_CANONICAL_BINDINGS.bindings.map((binding) => createDescriptor(binding, baseResolver));
}

describe("descriptor-aware semantic selected union", () => {
  it("rejects a forged structural resolver before it can issue v2 registrations", () => {
    expect(() => createDescriptorAwareSemanticAssetResolver(
      createForgedResolver(),
      OWNER_APPROVED_CANONICAL_BINDINGS,
      [],
    )).toThrow(/actual accepted standard-pack catalog/i);
  });

  it("returns deterministic descriptor-parity registrations with release, source, and attribution integrity", async () => {
    const baseResolver = await createAcceptedBaseResolver();
    const resolver = createDescriptorAwareSemanticAssetResolver(
      baseResolver,
      OWNER_APPROVED_CANONICAL_BINDINGS,
      createDescriptors(baseResolver),
    );
    const requirements = [
      { role: "player", state: "idle" },
      { role: "feedback", state: "correct" },
      { role: "player", state: "idle" },
    ] as const;

    const selected = resolver.select(requirements);
    const reversed = resolver.select([...requirements].reverse());

    expect(reversed).toEqual(selected);
    expect(selected).toMatchObject({
      contractVersion: 2,
      materialization: "accepted-cartridge-selected-union-only",
      release: {
        version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
        catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
        sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
      },
      requiredCredit: REQUIRED_CREDIT,
      semanticKeys: [
        "effects/32x32/combat/hit-01",
        "top-down/32x32/characters/hero-01",
      ],
    });
    expect(selected.registrations).toHaveLength(2);
    for (const registration of selected.registrations) {
      expect(registration.descriptor.catalogEntryKey).toBe(registration.semanticKey);
      expect(registration.sourceReceiptLocator.trim()).not.toBe("");
      expect(registration).not.toHaveProperty("path");
    }
  });

  it("fails closed on descriptor parity and stale release", async () => {
    const baseResolver = await createAcceptedBaseResolver();
    const descriptors = createDescriptors(baseResolver);
    const playerIndex = OWNER_APPROVED_CANONICAL_BINDINGS.bindings.findIndex(
      (binding) => binding.role === "player" && binding.state === "idle",
    );
    const playerDescriptor = descriptors[playerIndex] as Record<string, unknown>;

    expect(() => createDescriptorAwareSemanticAssetResolver(
      baseResolver,
      OWNER_APPROVED_CANONICAL_BINDINGS,
      descriptors.map((descriptor, index) => index === playerIndex
        ? { ...playerDescriptor, release: { ...(playerDescriptor.release as object), catalogDigest: "0".repeat(64) } }
        : descriptor),
    )).toThrow(/accepted release/i);

    const mismatchedDescriptorDimensions = descriptors.map((descriptor, index) => index === playerIndex
      ? {
          ...playerDescriptor,
          geometry: { ...(playerDescriptor.geometry as object), width: 384, frameWidth: 384 },
        }
      : descriptor);
    expect(() => createDescriptorAwareSemanticAssetResolver(
      baseResolver,
      OWNER_APPROVED_CANONICAL_BINDINGS,
      mismatchedDescriptorDimensions,
    ).select([{ role: "player", state: "idle" }])).toThrow(/descriptor.*dimensions/i);
  });

  it("rejects direct paths and never expands repeated requirements into full-pack output", async () => {
    const baseResolver = await createAcceptedBaseResolver();
    const descriptors = createDescriptors(baseResolver);
    const playerIndex = OWNER_APPROVED_CANONICAL_BINDINGS.bindings.findIndex(
      (binding) => binding.role === "player" && binding.state === "idle",
    );
    const playerDescriptor = descriptors[playerIndex] as Record<string, unknown>;
    expect(() => createDescriptorAwareSemanticAssetResolver(
      baseResolver,
      OWNER_APPROVED_CANONICAL_BINDINGS,
      descriptors.map((descriptor, index) => index === playerIndex
        ? { ...playerDescriptor, catalogEntryKey: "/private/player.png" }
        : descriptor),
    )).toThrow(/physical paths|unsafe/i);


    const resolver = createDescriptorAwareSemanticAssetResolver(
      baseResolver,
      OWNER_APPROVED_CANONICAL_BINDINGS,
      descriptors,
    );
    const repeated = Array.from(
      { length: ACCEPTED_STANDARD_ASSET_RELEASE.acceptanceEvidence.assetCount },
      () => ({ role: "player", state: "idle" } as const),
    );
    const selected = resolver.select(repeated);
    expect(selected.registrations).toHaveLength(1);
    expect(selected.semanticKeys).toHaveLength(1);
    expect(JSON.stringify(selected)).not.toContain(".png");
    expect(selected.registrations.length).toBeLessThan(ACCEPTED_STANDARD_ASSET_RELEASE.acceptanceEvidence.assetCount);
  });
});
