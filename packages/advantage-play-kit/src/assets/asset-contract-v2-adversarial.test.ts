import { readStandardPackCatalogFixture } from "./standard-pack-test-paths.test-support.js";

import { describe, expect, it } from "vitest";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import {
  AssetContractV2ValidationError,
  assetContractV2AdapterDeclarationSchema,
  createDescriptorDrivenPresentationAdapter,
  validateAssetContractV2Descriptor,
} from "./asset-contract-v2.js";

import { createResolverIssuedV2Registrations } from "./asset-contract-v2-test-fixtures.js";
import type { AssetContractV2SemanticRegistration } from "./semantic-product-bindings.js";

const acceptedCatalog = readStandardPackCatalogFixture();

function createWalkDescriptor(
  frameCount = 6,
  descriptorId = `player-walk-${frameCount}`,
  catalogEntryKey = "side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747",
): Record<string, unknown> {
  return {
    contractVersion: 2,
    descriptorId,
    catalogEntryKey,
    release: {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    },
    mediaKind: "animation",
    geometry: {
      width: 192,
      height: 32,
      frameWidth: 32,
      frameHeight: 32,
      columns: 6,
      rows: 1,
    },
    clips: [{
      id: "walk",
      frames: Array.from({ length: frameCount }, (_, column) => ({ column, row: 0 })),
      timing: { fps: 12, loop: true },
    }],
    directions: [{ direction: "down", clipId: "walk" }],
    anchor: { x: 0.5, y: 1 },
    renderScale: 2,
    collisionEnvelope: { x: 0.2, y: 0.4, width: 0.6, height: 0.6 },
    readabilityEnvelope: { minimumRenderPixels: 24, minimumContrastRatio: 3 },
  };
}

function expectValidationCode(candidate: unknown, code: string): void {
  try {
    validateAssetContractV2Descriptor(candidate);
    throw new Error("Expected descriptor validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(AssetContractV2ValidationError);
    expect(error).toMatchObject({ code });
  }
}

describe("Asset Contract v2 adversarial fixtures", () => {
  it("rejects nonexistent and dimension-mismatched accepted catalog keys without rewriting them", async () => {
    const requirement = { role: "player", state: "walk" } as const;
    await expect(createResolverIssuedV2Registrations([
      {
        semantic: requirement,
        descriptor: createWalkDescriptor(6, "unknown-key", "side-view/32x32/characters/not-accepted"),
      },
    ], acceptedCatalog)).rejects.toThrow(/unknown accepted catalog key/i);
    await expect(createResolverIssuedV2Registrations([
      {
        semantic: requirement,
        descriptor: createWalkDescriptor(
          6,
          "mismatched-key",
          "top-down/native/farming-game-world/assets/crops/fg-crops-cranberries-source-279b0392950b",
        ),
      },
    ], acceptedCatalog)).rejects.toThrow(/dimensions or media kind do not match/i);
  });

  it("rejects an otherwise valid descriptor pinned to a stale accepted-release identity", () => {
    const descriptor = createWalkDescriptor();
    expectValidationCode({
      ...descriptor,
      release: { ...(descriptor.release as object), version: "2026.07.22" },
    }, "stale-release-identity");
  });

  it("rejects missing clips both at descriptor validation and declaration resolution", () => {
    const descriptor = createWalkDescriptor();
    expectValidationCode({ ...descriptor, clips: undefined }, "incompatible-descriptor");
    expect(() => createDescriptorDrivenPresentationAdapter(
      [{ semantic: { role: "player", state: "walk" }, descriptorId: "missing-walk", behavior: "descriptor-driven" }],
      [],
    )).toThrow(expect.objectContaining({ code: "missing-descriptor" }));
  });

  it("rejects collision and readability envelopes that escape safe normalized bounds", () => {
    const descriptor = createWalkDescriptor();
    expectValidationCode({
      ...descriptor,
      collisionEnvelope: { x: 0.8, y: 0.4, width: 0.4, height: 0.7 },
    }, "incompatible-descriptor");
    expectValidationCode({
      ...descriptor,
      readabilityEnvelope: { minimumRenderPixels: 0, minimumContrastRatio: 22 },
    }, "incompatible-descriptor");
  });

  it("rejects two descriptor identities that alias the same physical catalog source", async () => {
    const first = createWalkDescriptor(6, "player-walk-six");
    const duplicateSource = createWalkDescriptor(6, "enemy-walk-six");
    const firstRegistration = await createResolverIssuedV2Registrations([
      { semantic: { role: "player", state: "walk" }, descriptor: first },
    ], acceptedCatalog);
    const duplicateRegistration = await createResolverIssuedV2Registrations([
      { semantic: { role: "enemy", state: "walk" }, descriptor: duplicateSource },
    ], acceptedCatalog);
    expect(() => createDescriptorDrivenPresentationAdapter(
      [
        { semantic: { role: "player", state: "walk" }, descriptorId: "player-walk-six", behavior: "descriptor-driven" },
        { semantic: { role: "enemy", state: "walk" }, descriptorId: "enemy-walk-six", behavior: "descriptor-driven" },
      ],
      [...firstRegistration, ...duplicateRegistration],
    )).toThrow(expect.objectContaining({ code: "duplicate-physical-source" }));
  });

  it("rejects raw descriptors and cloned registration-shaped values without resolver provenance", async () => {
    const requirement = { role: "player", state: "walk" } as const;
    const descriptor = createWalkDescriptor(6, "player-walk");
    const declaration = [{ semantic: requirement, descriptorId: "player-walk", behavior: "descriptor-driven" }];
    const [issued] = await createResolverIssuedV2Registrations(
      [{ semantic: requirement, descriptor }],
      acceptedCatalog,
    );
    if (!issued) throw new Error("Expected one resolver-issued fixture registration");

    expect(() => createDescriptorDrivenPresentationAdapter(
      declaration,
      [descriptor as unknown as AssetContractV2SemanticRegistration],
    )).toThrow(expect.objectContaining({ code: "missing-descriptor" }));
    expect(() => createDescriptorDrivenPresentationAdapter(
      declaration,
      [{ ...issued }],
    )).toThrow(expect.objectContaining({ code: "missing-descriptor" }));
    expect(() => createDescriptorDrivenPresentationAdapter(declaration, [issued])).not.toThrow();
  });

  it("deep-freezes resolver-issued release, geometry, and clip metadata", async () => {
    const requirement = { role: "player", state: "walk" } as const;
    const [issued] = await createResolverIssuedV2Registrations([
      { semantic: requirement, descriptor: createWalkDescriptor() },
    ], acceptedCatalog);
    if (!issued) throw new Error("Expected one resolver-issued fixture registration");
    const descriptor = issued.descriptor;
    const clip = descriptor.clips?.[0];
    const frame = clip?.frames[0];
    if (!descriptor.geometry || !clip || !frame) {
      throw new Error("Expected an issued animation descriptor with geometry and clip metadata");
    }

    expect(Object.isFrozen(issued)).toBe(true);
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.release)).toBe(true);
    expect(Object.isFrozen(descriptor.geometry)).toBe(true);
    expect(Object.isFrozen(descriptor.clips)).toBe(true);
    expect(Object.isFrozen(clip)).toBe(true);
    expect(Object.isFrozen(clip.frames)).toBe(true);
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(clip.timing)).toBe(true);

    expect(() => {
      (descriptor.release as { version: string }).version = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (descriptor.geometry as { width: number }).width = 1;
    }).toThrow(TypeError);
    expect(() => {
      (frame as { column: number }).column = 99;
    }).toThrow(TypeError);
    expect(descriptor.release.version).toBe(ACCEPTED_STANDARD_ASSET_RELEASE.version);
    expect(descriptor.geometry.width).toBe(192);
    expect(frame.column).toBe(0);
  });

  it("rejects fixed-frame semantic assumptions while allowing descriptor-owned frame counts", async () => {
    expect(assetContractV2AdapterDeclarationSchema.safeParse({
      semantic: { role: "player", state: "walk" },
      descriptorId: "player-walk-three",
      behavior: "descriptor-driven",
      frameCount: 3,
    }).success).toBe(false);
    expectValidationCode({ ...createWalkDescriptor(3), frameCount: 3 }, "incompatible-descriptor");

    const requirement = { role: "player", state: "walk" } as const;
    const declaration = [{ semantic: requirement, descriptorId: "player-walk", behavior: "descriptor-driven" }];
    const threeRegistration = await createResolverIssuedV2Registrations([
      { semantic: requirement, descriptor: createWalkDescriptor(3, "player-walk") },
    ], acceptedCatalog);
    const sixRegistration = await createResolverIssuedV2Registrations([
      { semantic: requirement, descriptor: createWalkDescriptor(6, "player-walk") },
    ], acceptedCatalog);
    const three = createDescriptorDrivenPresentationAdapter(
      declaration,
      threeRegistration,
    ).select(requirement, "down");
    const six = createDescriptorDrivenPresentationAdapter(
      declaration,
      sixRegistration,
    ).select(requirement, "down");
    expect(three).toMatchObject({ kind: "clip", frames: expect.any(Array) });
    expect(six).toMatchObject({ kind: "clip", frames: expect.any(Array) });
    if (three.kind !== "clip" || six.kind !== "clip") throw new Error("Expected descriptor-driven clip selections");
    expect(three.frames).toHaveLength(3);
    expect(six.frames).toHaveLength(6);
  });
});
