import { readStandardPackCatalogFixture } from "./standard-pack-test-paths.test-support.js";

import { describe, expect, it } from "vitest";

import {
  ASSET_CONTRACT_V2_FAILURE_CODES,
  AssetContractV2ValidationError,
  assetContractV2AdapterDeclarationSchema,
  assetContractV2PhysicalDescriptorSchema,
  assetContractV2SemanticRequirementSchema,
  createAssetContractV2CompatibilityReport,
  createDescriptorDrivenPresentationAdapter,
  validateAssetContractV2Descriptor,
} from "./asset-contract-v2.js";
import { createResolverIssuedV2Registrations } from "./asset-contract-v2-test-fixtures.js";

const ACCEPTED_CATALOG = readStandardPackCatalogFixture();

function createWalkDescriptor(
  frameCount: number,
  catalogEntryKey = "side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747",
) {
  return {
    contractVersion: 2,
    descriptorId: `player-walk-${frameCount}`,
    catalogEntryKey,
    release: {
      version: "2026.08.04",
      catalogDigest: "535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33",
      sourceReceiptDigest: "c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c",
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

describe("Asset Contract v2", () => {
  it("keeps player:walk semantic identity independent from three- and six-frame descriptor behavior", () => {
    const requirement = assetContractV2SemanticRequirementSchema.parse({ role: "player", state: "walk" });
    const threeFrame = validateAssetContractV2Descriptor(createWalkDescriptor(3));
    const sixFrame = validateAssetContractV2Descriptor(createWalkDescriptor(6));

    expect(requirement).toEqual({ role: "player", state: "walk" });
    expect(threeFrame.clips[0]?.frames).toHaveLength(3);
    expect(sixFrame.clips[0]?.frames).toHaveLength(6);
  });

  it("rejects bad clip order, timing, directions, anchors, scaling, and atlas bounds", () => {
    expect(assetContractV2PhysicalDescriptorSchema.safeParse({
      ...createWalkDescriptor(3),
      clips: [{ id: "walk", frames: [{ column: 0, row: 0 }, { column: 0, row: 0 }], timing: { fps: 0, loop: true } }],
      directions: [{ direction: "down", clipId: "missing" }],
      anchor: { x: 1.1, y: 1 },
      renderScale: 0,
    }).success).toBe(false);
    expect(assetContractV2PhysicalDescriptorSchema.safeParse({
      ...createWalkDescriptor(3),
      clips: [{ id: "walk", frames: [{ column: 6, row: 0 }], timing: { fps: 12, loop: true } }],
    }).success).toBe(false);
  });

  it("supports descriptor-specific tileset and audio metadata without physical paths", () => {
    const tileset = assetContractV2PhysicalDescriptorSchema.parse({
      contractVersion: 2,
      descriptorId: "forest-tiles",
      catalogEntryKey: "side-view/16x16/platformer-world/tilesets/animated-tiles/ps-animated-tiles-01-16x16-source-f282ca12a114",
      release: { version: "2026.08.04", catalogDigest: "535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33", sourceReceiptDigest: "c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c" },
      mediaKind: "tileset",
      geometry: { width: 288, height: 176, frameWidth: 16, frameHeight: 16, columns: 18, rows: 11 },
      tiles: { tileWidth: 16, tileHeight: 16, columns: 18, rows: 11 },
      anchor: { x: 0.5, y: 0.5 },
      renderScale: 1,
      collisionEnvelope: { x: 0, y: 0, width: 1, height: 1 },
      readabilityEnvelope: { minimumRenderPixels: 16, minimumContrastRatio: 3 },
    });
    const audio = assetContractV2PhysicalDescriptorSchema.parse({
      contractVersion: 2,
      descriptorId: "correct-chime",
      catalogEntryKey: "audio/native/combat/hit-01",
      release: { version: "2026.08.04", catalogDigest: "535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33", sourceReceiptDigest: "c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c" },
      mediaKind: "audio",
      audio: { durationMs: 480, channels: 2, loop: false },
      anchor: { x: 0.5, y: 0.5 },
      renderScale: 1,
      collisionEnvelope: { x: 0, y: 0, width: 1, height: 1 },
      readabilityEnvelope: { minimumRenderPixels: 1, minimumContrastRatio: 1 },
    });

    expect(tileset.tiles).toEqual({ tileWidth: 16, tileHeight: 16, columns: 18, rows: 11 });
    expect(audio.audio).toEqual({ durationMs: 480, channels: 2, loop: false });
    expect(JSON.stringify({ tileset, audio })).not.toContain(".png");
  });

  it("fails closed for unsafe catalog keys and invalid envelopes with stable codes", () => {
    const unsafe = { ...createWalkDescriptor(3), catalogEntryKey: "/private/assets/player.png" };
    expect(() => validateAssetContractV2Descriptor(unsafe)).toThrow(AssetContractV2ValidationError);
    try {
      validateAssetContractV2Descriptor(unsafe);
    } catch (error) {
      expect(error).toMatchObject({ code: "unsafe-physical-path" });
    }
    expect(assetContractV2PhysicalDescriptorSchema.safeParse({
      ...createWalkDescriptor(3),
      collisionEnvelope: { x: 0.8, y: 0.4, width: 0.4, height: 0.6 },
      readabilityEnvelope: { minimumRenderPixels: 0, minimumContrastRatio: 22 },
    }).success).toBe(false);
    expect(ASSET_CONTRACT_V2_FAILURE_CODES).toEqual(expect.arrayContaining([
      "missing-descriptor", "incompatible-descriptor", "stale-release-identity", "unsafe-physical-path", "duplicate-physical-source", "unsupported-media",
    ]));
  });

  it("declares descriptor-driven adapter behavior and opt-in v1/T11 compatibility", () => {
    expect(assetContractV2AdapterDeclarationSchema.parse({
      semantic: { role: "player", state: "walk" },
      descriptorId: "player-walk-6",
      behavior: "descriptor-driven",
    })).toEqual({ semantic: { role: "player", state: "walk" }, descriptorId: "player-walk-6", behavior: "descriptor-driven" });
    expect(assetContractV2AdapterDeclarationSchema.safeParse({
      semantic: { role: "player", state: "walk" }, descriptorId: "player-walk-3", behavior: "descriptor-driven", frameCount: 3,
    }).success).toBe(false);

    const report = createAssetContractV2CompatibilityReport();
    expect(report.adoption).toEqual({ explicitOptInRequired: true, v1ConsumersRemainV1Only: true });
    expect(report.acceptedStandardPackRelease.version).toBe("2026.08.04");
    expect(report.t11Inputs).toEqual(["version", "catalogDigest", "sourceReceiptDigest"]);
  });

  it("selects semantic states into descriptor-owned image, clip, tileset, UI, and audio behavior", async () => {
    const walk = createWalkDescriptor(6);
    const image = {
      ...createWalkDescriptor(3, "top-down/32x32/characters/hero-01"),
      descriptorId: "player-idle",
      mediaKind: "image",
      geometry: { width: 192, height: 384, frameWidth: 32, frameHeight: 32, columns: 6, rows: 12 },
      clips: undefined,
      directions: undefined,
    };
    const tileset = {
      ...createWalkDescriptor(
        3,
        "side-view/16x16/platformer-world/tilesets/animated-tiles/ps-animated-tiles-01-16x16-source-f282ca12a114",
      ), descriptorId: "forest-tiles", mediaKind: "tileset",
      geometry: { width: 288, height: 176, frameWidth: 16, frameHeight: 16, columns: 18, rows: 11 },
      clips: undefined, directions: undefined, tiles: { tileWidth: 16, tileHeight: 16, columns: 18, rows: 11 },
    };
    const ui = {
      ...image,
      descriptorId: "panel-default",
      catalogEntryKey: "ui/20x20/inventory/slot",
      mediaKind: "ui",
      geometry: { width: 20, height: 20, frameWidth: 20, frameHeight: 20, columns: 1, rows: 1 },
      nineSlice: { left: 4, right: 4, top: 4, bottom: 4 },
    };
    const audio = {
      contractVersion: 2, descriptorId: "correct-chime", catalogEntryKey: "audio/native/combat/hit-01",
      release: walk.release, mediaKind: "audio", audio: { durationMs: 480, channels: 2, loop: false },
      anchor: { x: 0.5, y: 0.5 }, renderScale: 1, collisionEnvelope: { x: 0, y: 0, width: 1, height: 1 },
      readabilityEnvelope: { minimumRenderPixels: 1, minimumContrastRatio: 1 },
    };
    const declarations = [
      { semantic: { role: "player", state: "walk" }, descriptorId: "player-walk-6", behavior: "descriptor-driven" },
      { semantic: { role: "player", state: "idle" }, descriptorId: "player-idle", behavior: "descriptor-driven" },
      { semantic: { role: "world", state: "forest" }, descriptorId: "forest-tiles", behavior: "descriptor-driven" },
      { semantic: { role: "panel", state: "default" }, descriptorId: "panel-default", behavior: "descriptor-driven" },
      { semantic: { role: "feedback", state: "correct" }, descriptorId: "correct-chime", behavior: "descriptor-driven" },
    ] as const;
    const registrations = await createResolverIssuedV2Registrations([
      { semantic: declarations[0].semantic, descriptor: walk },
      { semantic: declarations[1].semantic, descriptor: image },
      { semantic: declarations[2].semantic, descriptor: tileset },
      { semantic: declarations[3].semantic, descriptor: ui },
      { semantic: declarations[4].semantic, descriptor: audio },
    ], ACCEPTED_CATALOG);
    expect(registrations.map((registration) => registration.semanticKey)).toEqual([
      walk.catalogEntryKey,
      image.catalogEntryKey,
      tileset.catalogEntryKey,
      ui.catalogEntryKey,
      audio.catalogEntryKey,
    ]);
    expect(registrations.every(
      (registration) => registration.semanticKey === registration.descriptor.catalogEntryKey
        && ACCEPTED_CATALOG.assets.some((entry) => entry.key === registration.semanticKey),
    )).toBe(true);
    const adapter = createDescriptorDrivenPresentationAdapter(declarations, registrations);

    const gameplayState = Object.freeze({ position: Object.freeze({ x: 4, y: 7 }), score: 9 });
    const walkSelection = adapter.select({ role: "player", state: "walk" }, "down");
    expect(walkSelection).toMatchObject({ kind: "clip", descriptorId: "player-walk-6", clipId: "walk", fps: 12, loop: true });
    expect(walkSelection.kind === "clip" && walkSelection.frames).toHaveLength(6);
    expect(adapter.select({ role: "player", state: "idle" })).toMatchObject({ kind: "image", descriptorId: "player-idle" });
    expect(adapter.select({ role: "world", state: "forest" })).toMatchObject({ kind: "tileset", descriptorId: "forest-tiles", tiles: { columns: 18 } });
    expect(adapter.select({ role: "panel", state: "default" })).toMatchObject({ kind: "ui", descriptorId: "panel-default", nineSlice: { left: 4 } });
    expect(adapter.select({ role: "feedback", state: "correct" })).toMatchObject({ kind: "audio", descriptorId: "correct-chime", durationMs: 480 });
    expect(gameplayState).toEqual({ position: { x: 4, y: 7 }, score: 9 });
    expect(() => adapter.select({ role: "player", state: "walk" }, "left")).toThrow(/direction/i);
    expect(() => adapter.select({ role: "player", state: "jump" })).toThrow(/unmapped/i);
  });
});
