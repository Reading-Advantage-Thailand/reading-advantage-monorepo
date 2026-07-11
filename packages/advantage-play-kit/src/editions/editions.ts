import { z } from "zod";

import { APKRuntimeError } from "../runtime/errors.js";
import type {
  AssetAnimation,
  AssetPackManifest,
  PhysicalAssetFile,
  RuntimeEdition,
  SemanticAssetBinding,
} from "../runtime/types.js";
import {
  CHARACTER_COLLISION,
  CHARACTER_ORIGIN,
  SIDE_SCROLL_CHARACTER_ANIMATIONS,
  SIDE_SCROLL_CHARACTER_GRID,
  TOP_DOWN_CHARACTER_ANIMATIONS,
  TOP_DOWN_CHARACTER_GRID,
  WANG_MASK_FRAMES,
  WANG_TILE_GRID,
  createAnimationKey,
  createTextureKey,
} from "./asset-contract.js";

const provenanceSchema = z.object({
  source: z.string().min(1),
  license: z.string().min(1),
  creator: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
}).strict();

const frameGridSchema = z.object({
  frameWidth: z.number().int().positive(),
  frameHeight: z.number().int().positive(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  frameCount: z.number().int().positive(),
}).strict();

const animationSchema = z.object({
  name: z.string().min(1),
  frames: z.array(z.number().int().nonnegative()).min(1),
  frameRate: z.number().positive().max(60),
  repeat: z.number().int().min(-1),
}).strict();

const physicalAssetFileSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  kind: z.enum(["image", "spritesheet", "wang-tileset", "nine-slice", "parallax", "audio"]),
  view: z.enum(["top-down", "side-scroll", "isometric", "screen", "ui"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.enum(["png", "ogg", "webm"]),
  alpha: z.boolean(),
  byteSize: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  grid: frameGridSchema.optional(),
  animations: z.record(z.string(), animationSchema).optional(),
  origin: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict().optional(),
  collision: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    offsetX: z.number().nonnegative(),
    offsetY: z.number().nonnegative(),
  }).strict().optional(),
  wangFrames: z.array(z.number().int().nonnegative()).optional(),
  nineSlice: z.object({
    left: z.number().int().nonnegative(),
    right: z.number().int().nonnegative(),
    top: z.number().int().nonnegative(),
    bottom: z.number().int().nonnegative(),
  }).strict().optional(),
  provenance: provenanceSchema,
}).strict();

const assetPackSchema = z.object({
  id: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/u),
  root: z.string().min(1),
  files: z.record(z.string(), physicalAssetFileSchema),
}).strict();

const semanticBindingSchema = z.object({
  key: z.string().min(1),
  file: z.string().min(1),
  usage: z.enum(["image", "frame", "animation", "tileset", "nine-slice"]),
  view: z.enum(["top-down", "side-scroll", "isometric", "screen", "ui"]),
  animation: z.string().min(1).optional(),
  frame: z.number().int().nonnegative().optional(),
}).strict();

/** Strict browser-safe audience edition schema. */
export const runtimeEditionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  runtimeApiVersion: z.string().min(1),
  pack: assetPackSchema,
  bindings: z.record(z.string(), semanticBindingSchema),
  tuning: z.object({
    speed: z.number().min(0.25).max(3),
    targetScale: z.number().min(0.25).max(3),
    collisionScale: z.number().min(0.25).max(3),
    intensity: z.number().min(0).max(1),
    custom: z.record(z.string(), z.number().min(0).max(10)).optional(),
  }).strict(),
}).strict();

/** Optional host resolver for one physical asset URL. */
export type AssetUrlResolver = (pack: AssetPackManifest, file: PhysicalAssetFile) => string;

/** Minimal Phaser loader surface used by physical asset files. */
export interface PhysicalAssetLoader {
  /** Loads a plain raster. */
  image?(key: string, url: string): unknown;
  /** Loads an audio resource. */
  audio?(key: string, urls: string | string[]): unknown;
  /** Loads a rectangular frame grid. */
  spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
}

/** Minimal Phaser animation manager surface. */
export interface PhysicalAnimationManager {
  /** Reports whether an animation key already exists. */
  exists?(key: string): boolean;
  /** Registers one frame animation. */
  create(config: {
    key: string;
    frames: readonly { key: string; frame: number }[];
    frameRate: number;
    repeat: number;
  }): unknown;
}

/** Fully resolved semantic binding with its physical source identity. */
export interface ResolvedAssetBinding {
  /** Semantic role requested by cartridge code. */
  binding: SemanticAssetBinding;
  /** Physical file in the selected pack. */
  file: PhysicalAssetFile;
  /** Browser URL for the file. */
  url: string;
  /** Phaser texture key for the physical file. */
  textureKey: string;
  /** Phaser animation key when the binding selects an animation. */
  animationKey?: string;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function invalid(message: string, details?: Readonly<Record<string, unknown>>): never {
  throw new APKRuntimeError("INVALID_EDITION", message, details);
}

function assertSafePackPath(pack: AssetPackManifest, file: PhysicalAssetFile): void {
  if (!pack.root.startsWith(`/assets/apk/${pack.id}/`) || pack.root.includes("..")) {
    invalid(`Pack ${pack.id} has an unsafe or non-canonical root`, { root: pack.root });
  }
  if (file.path.startsWith("/") || file.path.split("/").includes("..")) {
    invalid(`Physical file ${file.id} has an unsafe relative path`, { path: file.path });
  }
  const expectedExtension = `.${file.format}`;
  if (!file.path.endsWith(expectedExtension)) {
    invalid(`Physical file ${file.id} format does not match its path`, { path: file.path });
  }
}

function assertGrid(file: PhysicalAssetFile): void {
  if (!file.grid) return;
  if (
    file.width !== file.grid.frameWidth * file.grid.columns ||
    file.height !== file.grid.frameHeight * file.grid.rows ||
    file.grid.frameCount !== file.grid.columns * file.grid.rows
  ) {
    invalid(`Physical file ${file.id} dimensions do not match its frame grid`);
  }
  for (const [name, animation] of Object.entries(file.animations ?? {})) {
    if (animation.name !== name || animation.frames.some((frame) => frame >= file.grid!.frameCount)) {
      invalid(`Physical file ${file.id} contains an invalid animation ${name}`);
    }
  }
}

function assertCanonicalActor(file: PhysicalAssetFile): void {
  if (file.kind !== "spritesheet" || !file.origin || !file.collision) return;
  if (!file.alpha || file.format !== "png") {
    invalid(`Actor sheet ${file.id} must be an alpha PNG`);
  }
  if (!same(file.origin, CHARACTER_ORIGIN) || !same(file.collision, CHARACTER_COLLISION)) {
    invalid(`Actor sheet ${file.id} violates the shared origin or collision contract`);
  }
  if (file.view === "top-down") {
    if (!same(file.grid, TOP_DOWN_CHARACTER_GRID) || !same(file.animations, TOP_DOWN_CHARACTER_ANIMATIONS)) {
      invalid(`Top-down actor ${file.id} violates the canonical 4x8 animation contract`);
    }
  } else if (file.view === "side-scroll") {
    if (!same(file.grid, SIDE_SCROLL_CHARACTER_GRID) || !same(file.animations, SIDE_SCROLL_CHARACTER_ANIMATIONS)) {
      invalid(`Side-scroll actor ${file.id} violates the canonical 4x4 animation contract`);
    }
  } else {
    invalid(`Actor sheet ${file.id} uses an unsupported view`);
  }
}

function assertPhysicalFile(file: PhysicalAssetFile): void {
  assertGrid(file);
  assertCanonicalActor(file);
  if (file.kind === "wang-tileset") {
    if (!same(file.grid, WANG_TILE_GRID) || !same(file.wangFrames, WANG_MASK_FRAMES)) {
      invalid(`Wang tileset ${file.id} violates the canonical 16-mask contract`);
    }
  }
  if ((file.kind === "spritesheet" || file.kind === "wang-tileset") && !file.grid) {
    invalid(`Physical file ${file.id} requires a frame grid`);
  }
  if (file.kind === "nine-slice" && !file.nineSlice) {
    invalid(`Nine-slice file ${file.id} requires fixed insets`);
  }
}

function assertBinding(
  edition: RuntimeEdition,
  key: string,
  binding: SemanticAssetBinding,
): void {
  if (binding.key !== key) invalid(`Binding key mismatch for ${key}`);
  const file = edition.pack.files[binding.file];
  if (!file) invalid(`Binding ${key} references missing physical file ${binding.file}`);
  if (file.view !== binding.view) invalid(`Binding ${key} uses the wrong asset view`);
  if (binding.usage === "animation") {
    if (!binding.animation || !file.animations?.[binding.animation]) {
      invalid(`Binding ${key} references a missing animation`);
    }
    if (binding.frame !== undefined) invalid(`Animation binding ${key} cannot select a frame`);
  } else if (binding.usage === "frame") {
    if (binding.frame === undefined || !file.grid || binding.frame >= file.grid.frameCount) {
      invalid(`Frame binding ${key} references an invalid frame`);
    }
    if (binding.animation !== undefined) invalid(`Frame binding ${key} cannot select an animation`);
  } else {
    if (binding.animation !== undefined || binding.frame !== undefined) {
      invalid(`Binding ${key} has selectors incompatible with ${binding.usage}`);
    }
  }
  if (binding.usage === "tileset" && file.kind !== "wang-tileset") {
    invalid(`Tileset binding ${key} does not reference a Wang tileset`);
  }
  if (binding.usage === "nine-slice" && file.kind !== "nine-slice") {
    invalid(`Nine-slice binding ${key} references the wrong physical kind`);
  }
}

/**
 * Validates one audience edition against the physical pack and semantic binding contract.
 * @param edition Untrusted edition definition.
 * @param requiredBindings Semantic binding keys required by the cartridge.
 * @param runtimeApiVersion Runtime API version supported by the host.
 * @returns The validated original edition object.
 * @throws When the edition, physical files, bindings, or runtime version are invalid.
 */
export function validateEdition(
  edition: RuntimeEdition | unknown,
  requiredBindings: readonly string[],
  runtimeApiVersion: string,
): RuntimeEdition {
  const parsed = runtimeEditionSchema.safeParse(edition);
  if (!parsed.success) {
    invalid("Edition contract validation failed", { issues: parsed.error.issues });
  }
  const validated = parsed.data as RuntimeEdition;
  if (validated.runtimeApiVersion !== runtimeApiVersion) {
    throw new APKRuntimeError(
      "INCOMPATIBLE_RUNTIME",
      `Edition ${validated.id} requires runtime ${validated.runtimeApiVersion}; host provides ${runtimeApiVersion}`,
    );
  }
  for (const [id, file] of Object.entries(validated.pack.files)) {
    if (file.id !== id) invalid(`Physical file key mismatch for ${id}`);
    assertSafePackPath(validated.pack, file);
    assertPhysicalFile(file);
  }
  for (const [key, binding] of Object.entries(validated.bindings)) {
    assertBinding(validated, key, binding);
  }
  const missing = requiredBindings.filter((key) => validated.bindings[key] === undefined);
  if (missing.length > 0) {
    throw new APKRuntimeError(
      "MISSING_ASSET_SLOT",
      `Edition ${validated.id} is missing required asset bindings: ${missing.join(", ")}`,
      { missingBindings: missing },
    );
  }
  return edition as RuntimeEdition;
}

/**
 * Verifies that two audience packs are structural drop-in replacements.
 * @param left First validated edition.
 * @param right Second validated edition.
 * @returns Nothing when physical files and semantic bindings have exact parity.
 * @throws When filenames, dimensions, grids, animations, origins, collisions, or bindings differ.
 */
export function validateEditionPair(left: RuntimeEdition, right: RuntimeEdition): void {
  const leftFiles = Object.keys(left.pack.files).sort();
  const rightFiles = Object.keys(right.pack.files).sort();
  if (!same(leftFiles, rightFiles)) invalid("Audience packs contain different physical file IDs");
  for (const id of leftFiles) {
    const a = left.pack.files[id]!;
    const b = right.pack.files[id]!;
    const shape = (file: PhysicalAssetFile) => ({
      id: file.id,
      path: file.path,
      kind: file.kind,
      view: file.view,
      width: file.width,
      height: file.height,
      format: file.format,
      alpha: file.alpha,
      grid: file.grid,
      animations: file.animations,
      origin: file.origin,
      collision: file.collision,
      wangFrames: file.wangFrames,
      nineSlice: file.nineSlice,
    });
    if (!same(shape(a), shape(b))) invalid(`Audience packs disagree on physical contract ${id}`);
  }
  if (!same(left.bindings, right.bindings)) invalid("Audience packs contain different semantic bindings");
}

/**
 * Finds and validates an edition selected by its stable identifier.
 * @param editions Available audience editions.
 * @param editionId Host-selected edition identifier.
 * @param requiredBindings Semantic binding keys required by the cartridge.
 * @param runtimeApiVersion Runtime API version supported by the host.
 * @returns The selected validated edition.
 * @throws When the requested edition is absent or incompatible.
 */
export function resolveEdition(
  editions: readonly RuntimeEdition[],
  editionId: string,
  requiredBindings: readonly string[],
  runtimeApiVersion: string,
): RuntimeEdition {
  const edition = editions.find((candidate) => candidate.id === editionId);
  if (!edition) throw new APKRuntimeError("MISSING_EDITION", `Edition ${editionId} is missing`);
  return validateEdition(edition, requiredBindings, runtimeApiVersion);
}

/**
 * Resolves one gameplay role to its physical source, texture, and optional animation key.
 * @param edition Validated audience edition.
 * @param key Semantic binding requested by cartridge code.
 * @param resolveUrl Optional host URL resolver.
 * @returns The resolved semantic and physical asset data.
 * @throws When the semantic key or physical source is absent.
 */
export function resolveAssetBinding(
  edition: RuntimeEdition,
  key: string,
  resolveUrl?: AssetUrlResolver,
): ResolvedAssetBinding {
  const binding = edition.bindings[key];
  if (!binding) throw new APKRuntimeError("MISSING_ASSET_SLOT", `Edition ${edition.id} has no binding ${key}`);
  const file = edition.pack.files[binding.file];
  if (!file) invalid(`Binding ${key} references missing physical file ${binding.file}`);
  const url = resolveUrl ? resolveUrl(edition.pack, file) : `${edition.pack.root}/${file.path}`;
  return {
    binding,
    file,
    url,
    textureKey: createTextureKey(edition.id, file.id),
    ...(binding.animation
      ? { animationKey: createAnimationKey(edition.id, file.id, binding.animation) }
      : {}),
  };
}

/**
 * Preloads each physical file once for the requested semantic bindings.
 * @param loader Phaser scene loader or compatible test double.
 * @param edition Validated audience edition.
 * @param keys Semantic binding keys to preload.
 * @param resolveUrl Optional host URL resolver.
 */
export function preloadAssetBindings(
  loader: PhysicalAssetLoader,
  edition: RuntimeEdition,
  keys: readonly string[],
  resolveUrl?: AssetUrlResolver,
): void {
  const loaded = new Set<string>();
  for (const key of keys) {
    const resolved = resolveAssetBinding(edition, key, resolveUrl);
    if (loaded.has(resolved.file.id)) continue;
    loaded.add(resolved.file.id);
    if (resolved.file.kind === "spritesheet" || resolved.file.kind === "wang-tileset") {
      if (!loader.spritesheet || !resolved.file.grid) invalid(`Spritesheet loader unavailable for ${resolved.file.id}`);
      loader.spritesheet(resolved.textureKey, resolved.url, {
        frameWidth: resolved.file.grid.frameWidth,
        frameHeight: resolved.file.grid.frameHeight,
      });
    } else if (resolved.file.kind === "audio") {
      if (!loader.audio) invalid(`Audio loader unavailable for ${resolved.file.id}`);
      loader.audio(resolved.textureKey, resolved.url);
    } else {
      if (!loader.image) invalid(`Image loader unavailable for ${resolved.file.id}`);
      loader.image(resolved.textureKey, resolved.url);
    }
  }
}

/**
 * Registers named physical animations required by semantic animation bindings.
 * @param manager Phaser animation manager or compatible test double.
 * @param edition Validated audience edition.
 * @param keys Semantic binding keys whose animations should exist.
 */
export function registerAssetAnimations(
  manager: PhysicalAnimationManager,
  edition: RuntimeEdition,
  keys: readonly string[],
): void {
  const created = new Set<string>();
  for (const key of keys) {
    const resolved = resolveAssetBinding(edition, key);
    if (resolved.binding.usage !== "animation" || !resolved.binding.animation) continue;
    const animation = resolved.file.animations?.[resolved.binding.animation] as AssetAnimation | undefined;
    if (!animation || !resolved.animationKey) invalid(`Binding ${key} has no resolvable animation`);
    if (created.has(resolved.animationKey) || manager.exists?.(resolved.animationKey)) continue;
    created.add(resolved.animationKey);
    manager.create({
      key: resolved.animationKey,
      frames: animation.frames.map((frame) => ({ key: resolved.textureKey, frame })),
      frameRate: animation.frameRate,
      repeat: animation.repeat,
    });
  }
}
