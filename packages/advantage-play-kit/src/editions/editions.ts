import { z } from "zod";

import { APKRuntimeError } from "../runtime/errors.js";
import type { RuntimeEdition, SemanticAsset } from "../runtime/types.js";

const provenanceSchema = z
  .object({
    source: z.string().min(1),
    license: z.string().min(1),
    creator: z.string().min(1).optional(),
    sourceUrl: z.string().url().optional(),
  })
  .strict();

const semanticAssetSchema = z
  .object({
    key: z.string().min(1),
    type: z.enum(["procedural", "image", "spritesheet", "atlas", "audio", "font", "tilemap"]),
    url: z.string().min(1).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    provenance: provenanceSchema,
    metadata: z
      .object({
        version: z.string().min(1),
        format: z.string().min(1),
        optimized: z.boolean(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        frames: z.array(z.string().min(1)).optional(),
        byteSize: z.number().int().nonnegative().optional(),
      })
      .strict(),
  })
  .strict();

/** Strict browser-safe audience edition schema. */
export const runtimeEditionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    runtimeApiVersion: z.string().min(1),
    assets: z.record(z.string(), semanticAssetSchema),
    palette: z
      .object({
        background: z.number().int().min(0).max(0xffffff),
        player: z.number().int().min(0).max(0xffffff),
        friendly: z.number().int().min(0).max(0xffffff),
        hostile: z.number().int().min(0).max(0xffffff),
        accent: z.number().int().min(0).max(0xffffff),
        text: z.string().min(1),
      })
      .strict(),
    tuning: z
      .object({
        speed: z.number().min(0.25).max(3),
        targetScale: z.number().min(0.25).max(3),
        collisionScale: z.number().min(0.25).max(3),
        intensity: z.number().min(0).max(1),
        custom: z.record(z.string(), z.number().min(0).max(10)).optional(),
      })
      .strict(),
  })
  .strict();

/** Optional host resolver for local or versioned asset URLs. */
export type AssetUrlResolver = (asset: SemanticAsset) => string;

/** Minimal Phaser loader surface used by semantic assets. */
export interface SemanticAssetLoader {
  /** Loads a plain image. */
  image?(key: string, url: string): unknown;
  /** Loads an audio resource. */
  audio?(key: string, urls: string | string[]): unknown;
  /** Loads a spritesheet with frame metadata. */
  spritesheet?(key: string, url: string, config?: Readonly<Record<string, unknown>>): unknown;
  /** Loads an atlas image and data pair. */
  atlas?(key: string, textureUrl: string, atlasUrl?: string): unknown;
  /** Loads a tilemap resource. */
  tilemapTiledJSON?(key: string, url: string): unknown;
}

/**
 * Validates one audience edition against runtime and cartridge requirements.
 * @param edition Untrusted edition definition.
 * @param requiredSlots Semantic asset keys required by the cartridge.
 * @param runtimeApiVersion Runtime API version supported by the host.
 * @returns The validated original edition object.
 * @throws When the edition shape, version, or required slots are invalid.
 */
export function validateEdition(
  edition: RuntimeEdition | unknown,
  requiredSlots: readonly string[],
  runtimeApiVersion: string,
): RuntimeEdition {
  const parsed = runtimeEditionSchema.safeParse(edition);
  if (!parsed.success) {
    throw new APKRuntimeError("INVALID_EDITION", "Edition contract validation failed", {
      issues: parsed.error.issues,
    });
  }
  if (parsed.data.runtimeApiVersion !== runtimeApiVersion) {
    throw new APKRuntimeError(
      "INCOMPATIBLE_RUNTIME",
      `Edition ${parsed.data.id} requires runtime ${parsed.data.runtimeApiVersion}; host provides ${runtimeApiVersion}`,
    );
  }
  const missingSlots = requiredSlots.filter((slot) => parsed.data.assets[slot] === undefined);
  if (missingSlots.length > 0) {
    throw new APKRuntimeError(
      "MISSING_ASSET_SLOT",
      `Edition ${parsed.data.id} is missing required asset slots: ${missingSlots.join(", ")}`,
      { missingSlots },
    );
  }
  const mismatchedKeys = Object.entries(parsed.data.assets)
    .filter(([slot, asset]) => asset.key !== slot)
    .map(([slot, asset]) => ({ slot, assetKey: asset.key }));
  if (mismatchedKeys.length > 0) {
    throw new APKRuntimeError(
      "INVALID_EDITION",
      `Edition ${parsed.data.id} contains asset keys that do not match their semantic slots`,
      { mismatchedKeys },
    );
  }
  return edition as RuntimeEdition;
}

/**
 * Finds and validates an edition selected by its stable identifier.
 * @param editions Available cartridge editions.
 * @param editionId Host-selected edition identifier.
 * @param requiredSlots Semantic asset keys required by the cartridge.
 * @param runtimeApiVersion Runtime API version supported by the host.
 * @returns The selected validated edition.
 * @throws When the requested edition is absent or incompatible.
 */
export function resolveEdition(
  editions: readonly RuntimeEdition[],
  editionId: string,
  requiredSlots: readonly string[],
  runtimeApiVersion: string,
): RuntimeEdition {
  const edition = editions.find((candidate) => candidate.id === editionId);
  if (!edition) {
    throw new APKRuntimeError("MISSING_EDITION", `Edition ${editionId} is missing`);
  }
  return validateEdition(edition, requiredSlots, runtimeApiVersion);
}

/**
 * Resolves one semantic asset without exposing edition branches to scenes.
 * @param edition Validated audience edition.
 * @param key Semantic asset key requested by game source.
 * @param resolveUrl Optional host URL resolver.
 * @returns Asset metadata with its resolved URL.
 * @throws When the semantic key is absent.
 */
export function resolveSemanticAsset(
  edition: RuntimeEdition,
  key: string,
  resolveUrl?: AssetUrlResolver,
): SemanticAsset {
  const asset = edition.assets[key];
  if (!asset) {
    throw new APKRuntimeError("MISSING_ASSET_SLOT", `Edition ${edition.id} has no asset ${key}`, {
      key,
    });
  }
  return { ...asset, url: resolveUrl ? resolveUrl(asset) : asset.url };
}

/**
 * Converts semantic edition entries into Phaser preload operations.
 * @param loader Phaser scene loader or a compatible test double.
 * @param edition Validated audience edition.
 * @param keys Semantic keys to preload.
 * @param resolveUrl Optional host URL resolver.
 * @throws When an asset is missing or its loader operation is unavailable.
 */
export function preloadSemanticAssets(
  loader: SemanticAssetLoader,
  edition: RuntimeEdition,
  keys: readonly string[],
  resolveUrl?: AssetUrlResolver,
): void {
  for (const key of keys) {
    const asset = resolveSemanticAsset(edition, key, resolveUrl);
    switch (asset.type) {
      case "procedural":
        break;
      case "image":
      case "font":
        if (!loader.image) throw new APKRuntimeError("INVALID_EDITION", "Image loader unavailable");
        if (!asset.url) throw new APKRuntimeError("INVALID_EDITION", `Asset ${asset.key} has no URL`);
        loader.image(asset.key, asset.url);
        break;
      case "audio":
        if (!loader.audio) throw new APKRuntimeError("INVALID_EDITION", "Audio loader unavailable");
        if (!asset.url) throw new APKRuntimeError("INVALID_EDITION", `Asset ${asset.key} has no URL`);
        loader.audio(asset.key, asset.url);
        break;
      case "spritesheet":
        if (!loader.spritesheet) {
          throw new APKRuntimeError("INVALID_EDITION", "Spritesheet loader unavailable");
        }
        if (!asset.url) throw new APKRuntimeError("INVALID_EDITION", `Asset ${asset.key} has no URL`);
        loader.spritesheet(asset.key, asset.url, asset.config);
        break;
      case "atlas": {
        if (!loader.atlas) throw new APKRuntimeError("INVALID_EDITION", "Atlas loader unavailable");
        if (!asset.url) throw new APKRuntimeError("INVALID_EDITION", `Asset ${asset.key} has no URL`);
        const atlasUrl = typeof asset.config?.atlasUrl === "string" ? asset.config.atlasUrl : undefined;
        loader.atlas(asset.key, asset.url, atlasUrl);
        break;
      }
      case "tilemap":
        if (!loader.tilemapTiledJSON) {
          throw new APKRuntimeError("INVALID_EDITION", "Tilemap loader unavailable");
        }
        if (!asset.url) throw new APKRuntimeError("INVALID_EDITION", `Asset ${asset.key} has no URL`);
        loader.tilemapTiledJSON(asset.key, asset.url);
        break;
    }
  }
}
