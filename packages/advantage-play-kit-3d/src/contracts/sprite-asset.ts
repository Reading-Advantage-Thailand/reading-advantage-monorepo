/**
 * The 2D asset contract of the Phaser path (docs/apk3d-cartridge.md, section "Dual renderer"):
 * sprite sheets as the APK `PhysicalAssetFile` and `AssetPackManifest` shapes, the APK
 * `RuntimeEdition` (pack, bindings, tuning), and the same checks the APK runs at mount.
 *
 * Every schema and check below is copied from the APK so that a pack that passes here passes
 * `validateEdition` in the monorepo unchanged. The APK physical-file contract already carries
 * `sha256` per file; the copy keeps exactly that field and adds no other hash (the monorepo
 * hashing policy). The forge helpers at the end describe the one sheet layout the forge sprite
 * pipeline writes, so a game and the packer agree on frames, animations, and the origin.
 *
 * Source: ../reading-advantage-monorepo (commit fe6aedc2b),
 *   packages/advantage-play-kit/src/editions/editions.ts (schemas, validation, resolution)
 *   packages/advantage-play-kit/src/editions/asset-contract.ts (canonical grids, keys)
 * The APK throws `APKRuntimeError('INVALID_EDITION' | 'MISSING_ASSET_SLOT', ...)`; the copy throws
 * `SpriteEditionError` with the same `code` (contracts import zod only).
 */
import { z } from 'zod';
import type {
  AssetAnimation,
  AssetCollisionBox,
  AssetOrigin,
  AssetPackManifest,
  FrameGrid,
  PhysicalAssetFile,
  RuntimeEdition,
  SemanticAssetBinding,
} from './apk.js';

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/editions/asset-contract.ts (fe6aedc2b)
// ---------------------------------------------------------------------------------------------

/** Canonical 4x8 grid for top-down characters. */
export const TOP_DOWN_CHARACTER_GRID: FrameGrid = {
  frameWidth: 128,
  frameHeight: 128,
  columns: 4,
  rows: 8,
  frameCount: 32,
};

/** Canonical 4x4 grid for side-scroll characters. */
export const SIDE_SCROLL_CHARACTER_GRID: FrameGrid = {
  frameWidth: 128,
  frameHeight: 128,
  columns: 4,
  rows: 4,
  frameCount: 16,
};

/** Canonical 4x4 grid for 64px Wang autotiles. */
export const WANG_TILE_GRID: FrameGrid = {
  frameWidth: 64,
  frameHeight: 64,
  columns: 4,
  rows: 4,
  frameCount: 16,
};

/** Canonical 4x4 grid for 128x64 isometric Wang autotiles. */
export const ISOMETRIC_WANG_TILE_GRID: FrameGrid = {
  frameWidth: 128,
  frameHeight: 64,
  columns: 4,
  rows: 4,
  frameCount: 16,
};

/** Canonical bottom-center actor origin. */
export const CHARACTER_ORIGIN: AssetOrigin = { x: 0.5, y: 1 };

/** Canonical collision body shared by both visual themes. */
export const CHARACTER_COLLISION: AssetCollisionBox = {
  width: 32,
  height: 48,
  offsetX: 48,
  offsetY: 80,
};

/** North/east/south/west bitmasks map directly to frames zero through fifteen. */
export const WANG_MASK_FRAMES = Object.freeze(Array.from({ length: 16 }, (_, index) => index));

/** Exact animation rows for a 4x8 top-down character sheet. */
export const TOP_DOWN_CHARACTER_ANIMATIONS: Readonly<Record<string, AssetAnimation>> = {
  'walk.down': { name: 'walk.down', frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 },
  'walk.left': { name: 'walk.left', frames: [4, 5, 6, 7], frameRate: 8, repeat: -1 },
  'walk.right': { name: 'walk.right', frames: [8, 9, 10, 11], frameRate: 8, repeat: -1 },
  'walk.up': { name: 'walk.up', frames: [12, 13, 14, 15], frameRate: 8, repeat: -1 },
  'idle.down': { name: 'idle.down', frames: [16], frameRate: 1, repeat: -1 },
  'idle.left': { name: 'idle.left', frames: [17], frameRate: 1, repeat: -1 },
  'idle.right': { name: 'idle.right', frames: [18], frameRate: 1, repeat: -1 },
  'idle.up': { name: 'idle.up', frames: [19], frameRate: 1, repeat: -1 },
  'attack.down': { name: 'attack.down', frames: [20, 21, 22, 23], frameRate: 10, repeat: 0 },
  'attack.left': { name: 'attack.left', frames: [24, 25], frameRate: 10, repeat: 0 },
  'attack.right': { name: 'attack.right', frames: [26, 27], frameRate: 10, repeat: 0 },
  'attack.up': { name: 'attack.up', frames: [28, 29, 30, 31], frameRate: 10, repeat: 0 },
};

/** Exact animation rows for a 4x4 side-scroll character sheet. */
export const SIDE_SCROLL_CHARACTER_ANIMATIONS: Readonly<Record<string, AssetAnimation>> = {
  idle: { name: 'idle', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
  run: { name: 'run', frames: [4, 5, 6, 7], frameRate: 10, repeat: -1 },
  attack: { name: 'attack', frames: [8, 9, 10, 11], frameRate: 10, repeat: 0 },
  hurt: { name: 'hurt', frames: [12, 13], frameRate: 8, repeat: 0 },
  death: { name: 'death', frames: [14, 15], frameRate: 5, repeat: 0 },
};

/**
 * Builds the stable Phaser texture key for one physical file.
 * @param editionId Stable audience edition identifier.
 * @param fileId Stable physical file identifier.
 * @returns A collision-safe texture key.
 */
export function createTextureKey(editionId: string, fileId: string): string {
  return `apk:${editionId}:${fileId}`;
}

/**
 * Builds the stable Phaser animation key for one physical animation.
 * @param editionId Stable audience edition identifier.
 * @param fileId Stable physical file identifier.
 * @param animationName Animation name within the file.
 * @returns A collision-safe animation key.
 */
export function createAnimationKey(editionId: string, fileId: string, animationName: string): string {
  return `${createTextureKey(editionId, fileId)}:${animationName}`;
}

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/editions/editions.ts (fe6aedc2b)
// ---------------------------------------------------------------------------------------------

const provenanceSchema = z
  .object({
    source: z.string().min(1),
    license: z.string().min(1),
    creator: z.string().min(1).optional(),
    sourceUrl: z.string().url().optional(),
  })
  .strict();

const frameGridSchema = z
  .object({
    frameWidth: z.number().int().positive(),
    frameHeight: z.number().int().positive(),
    columns: z.number().int().positive(),
    rows: z.number().int().positive(),
    frameCount: z.number().int().positive(),
  })
  .strict();

const animationSchema = z
  .object({
    name: z.string().min(1),
    frames: z.array(z.number().int().nonnegative()).min(1),
    frameRate: z.number().positive().max(60),
    repeat: z.number().int().min(-1),
    yoyo: z.boolean().optional(),
  })
  .strict();

/** The APK physical file schema; `sha256` is the APK's existing contract field, kept as is. */
export const physicalAssetFileSchema = z
  .object({
    id: z.string().min(1),
    path: z.string().min(1),
    kind: z.enum(['image', 'spritesheet', 'wang-tileset', 'nine-slice', 'parallax', 'audio']),
    view: z.enum(['top-down', 'side-scroll', 'isometric', 'world', 'screen', 'ui']),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.enum(['png', 'ogg', 'webm']),
    alpha: z.boolean(),
    byteSize: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    grid: frameGridSchema.optional(),
    animations: z.record(z.string(), animationSchema).optional(),
    origin: z
      .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
      .strict()
      .optional(),
    collision: z
      .object({
        width: z.number().positive(),
        height: z.number().positive(),
        offsetX: z.number().nonnegative(),
        offsetY: z.number().nonnegative(),
      })
      .strict()
      .optional(),
    wangFrames: z.array(z.number().int().nonnegative()).optional(),
    nineSlice: z
      .object({
        left: z.number().int().nonnegative(),
        right: z.number().int().nonnegative(),
        top: z.number().int().nonnegative(),
        bottom: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
    provenance: provenanceSchema,
  })
  .strict();

export const assetPackSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/u),
    root: z.string().min(1),
    files: z.record(z.string(), physicalAssetFileSchema),
  })
  .strict();

const semanticBindingSchema = z
  .object({
    key: z.string().min(1),
    file: z.string().min(1),
    usage: z.enum(['image', 'frame', 'animation', 'tileset', 'nine-slice']),
    view: z.enum(['top-down', 'side-scroll', 'isometric', 'world', 'screen', 'ui']),
    animation: z.string().min(1).optional(),
    frame: z.number().int().nonnegative().optional(),
  })
  .strict();

/** Strict browser-safe audience edition schema. */
export const runtimeEditionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    runtimeApiVersion: z.string().min(1),
    pack: assetPackSchema,
    bindings: z.record(z.string(), semanticBindingSchema),
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
    yoyo?: boolean;
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

/** The APK `APKRuntimeError` codes an edition check raises; the kit keeps the codes. */
export class SpriteEditionError extends Error {
  constructor(
    readonly code: 'INVALID_EDITION' | 'MISSING_ASSET_SLOT' | 'INCOMPATIBLE_RUNTIME' | 'MISSING_EDITION',
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'SpriteEditionError';
  }
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function invalid(message: string, details?: Readonly<Record<string, unknown>>): never {
  throw new SpriteEditionError('INVALID_EDITION', message, details);
}

function assertSafePackPath(pack: AssetPackManifest, file: PhysicalAssetFile): void {
  if (!pack.root.startsWith(`/assets/apk/${pack.id}/`) || pack.root.includes('..')) {
    invalid(`Pack ${pack.id} has an unsafe or non-canonical root`, { root: pack.root });
  }
  if (file.path.startsWith('/') || file.path.split('/').includes('..')) {
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
  if (file.kind !== 'spritesheet' || !file.origin || !file.collision) return;
  if (!file.alpha || file.format !== 'png') {
    invalid(`Actor sheet ${file.id} must be an alpha PNG`);
  }
  if (!same(file.origin, CHARACTER_ORIGIN) || !same(file.collision, CHARACTER_COLLISION)) {
    invalid(`Actor sheet ${file.id} violates the shared origin or collision contract`);
  }
  if (file.view === 'top-down') {
    if (!same(file.grid, TOP_DOWN_CHARACTER_GRID) || !same(file.animations, TOP_DOWN_CHARACTER_ANIMATIONS)) {
      invalid(`Top-down actor ${file.id} violates the canonical 4x8 animation contract`);
    }
  } else if (file.view === 'side-scroll') {
    if (
      !same(file.grid, SIDE_SCROLL_CHARACTER_GRID) ||
      !same(file.animations, SIDE_SCROLL_CHARACTER_ANIMATIONS)
    ) {
      invalid(`Side-scroll actor ${file.id} violates the canonical 4x4 animation contract`);
    }
  } else {
    invalid(`Actor sheet ${file.id} uses an unsupported view`);
  }
}

function assertPhysicalFile(file: PhysicalAssetFile): void {
  assertGrid(file);
  assertCanonicalActor(file);
  if (file.kind === 'wang-tileset') {
    const expectedGrid = file.view === 'isometric' ? ISOMETRIC_WANG_TILE_GRID : WANG_TILE_GRID;
    if (!same(file.grid, expectedGrid) || !same(file.wangFrames, WANG_MASK_FRAMES)) {
      invalid(`Wang tileset ${file.id} violates the canonical 16-mask contract`);
    }
  }
  if ((file.kind === 'spritesheet' || file.kind === 'wang-tileset') && !file.grid) {
    invalid(`Physical file ${file.id} requires a frame grid`);
  }
  if (file.kind === 'nine-slice' && !file.nineSlice) {
    invalid(`Nine-slice file ${file.id} requires fixed insets`);
  }
}

function assertBinding(edition: RuntimeEdition, key: string, binding: SemanticAssetBinding): void {
  if (binding.key !== key) invalid(`Binding key mismatch for ${key}`);
  const file = edition.pack.files[binding.file];
  if (!file) invalid(`Binding ${key} references missing physical file ${binding.file}`);
  if (file.view !== binding.view) invalid(`Binding ${key} uses the wrong asset view`);
  if (binding.usage === 'animation') {
    if (!binding.animation || !file.animations?.[binding.animation]) {
      invalid(`Binding ${key} references a missing animation`);
    }
    if (binding.frame !== undefined) invalid(`Animation binding ${key} cannot select a frame`);
  } else if (binding.usage === 'frame') {
    if (binding.frame === undefined || !file.grid || binding.frame >= file.grid.frameCount) {
      invalid(`Frame binding ${key} references an invalid frame`);
    }
    if (binding.animation !== undefined) invalid(`Frame binding ${key} cannot select an animation`);
  } else {
    if (binding.animation !== undefined || binding.frame !== undefined) {
      invalid(`Binding ${key} has selectors incompatible with ${binding.usage}`);
    }
  }
  if (binding.usage === 'tileset' && file.kind !== 'wang-tileset') {
    invalid(`Tileset binding ${key} does not reference a Wang tileset`);
  }
  if (binding.usage === 'nine-slice' && file.kind !== 'nine-slice') {
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
    invalid('Edition contract validation failed', { issues: parsed.error.issues });
  }
  const validated = parsed.data as RuntimeEdition;
  if (validated.runtimeApiVersion !== runtimeApiVersion) {
    throw new SpriteEditionError(
      'INCOMPATIBLE_RUNTIME',
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
    throw new SpriteEditionError(
      'MISSING_ASSET_SLOT',
      `Edition ${validated.id} is missing required asset bindings: ${missing.join(', ')}`,
      { missingBindings: missing },
    );
  }
  return edition as RuntimeEdition;
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
  if (!binding)
    throw new SpriteEditionError('MISSING_ASSET_SLOT', `Edition ${edition.id} has no binding ${key}`);
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
    if (resolved.file.kind === 'spritesheet' || resolved.file.kind === 'wang-tileset') {
      if (!loader.spritesheet || !resolved.file.grid)
        invalid(`Spritesheet loader unavailable for ${resolved.file.id}`);
      loader.spritesheet(resolved.textureKey, resolved.url, {
        frameWidth: resolved.file.grid.frameWidth,
        frameHeight: resolved.file.grid.frameHeight,
      });
    } else if (resolved.file.kind === 'audio') {
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
    if (resolved.binding.usage !== 'animation' || !resolved.binding.animation) continue;
    const animation = resolved.file.animations?.[resolved.binding.animation] as AssetAnimation | undefined;
    if (!animation || !resolved.animationKey) invalid(`Binding ${key} has no resolvable animation`);
    if (created.has(resolved.animationKey) || manager.exists?.(resolved.animationKey)) continue;
    created.add(resolved.animationKey);
    manager.create({
      key: resolved.animationKey,
      frames: animation.frames.map((frame) => ({ key: resolved.textureKey, frame })),
      frameRate: animation.frameRate,
      repeat: animation.repeat,
      ...(animation.yoyo === undefined ? {} : { yoyo: animation.yoyo }),
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Forge sprite sheets (this repo): the one layout `./forge sprites` writes and the 2D packer
// (Phase A') turns into `PhysicalAssetFile` entries. Not an APK copy.
// ---------------------------------------------------------------------------------------------

/** Pack root prefix the APK accepts; the standalone host maps it under its site base. */
export const SPRITE_PACK_ROOT_PREFIX = '/assets/apk/';

/**
 * The pack root for a pack id, in the APK's canonical form: a version folder and no trailing
 * slash (`/assets/apk/<id>/v1`), so `resolveAssetBinding` makes `<root>/<path>` without `//`.
 */
export const spritePackRoot = (packId: string, version = 'v1'): string => `${SPRITE_PACK_ROOT_PREFIX}${packId}/${version}`;

/** The 8 forge directions in sheet row order (src/render/page.ts `DIRECTION_NAMES`). */
export const FORGE_DIRECTIONS_8 = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;
/** The 4 forge directions in sheet row order. */
export const FORGE_DIRECTIONS_4 = ['S', 'W', 'N', 'E'] as const;

export type ForgeDirection = (typeof FORGE_DIRECTIONS_8)[number];

/** The directions of a sheet with `count` rows. */
export function forgeDirections(count: 1 | 4 | 8): readonly ForgeDirection[] {
  return count === 8 ? FORGE_DIRECTIONS_8 : count === 4 ? FORGE_DIRECTIONS_4 : ['S'];
}

/**
 * The frame grid of a forge sheet: rows are directions, columns are frames of one clip (a
 * still sheet has one column). `cell` is the sprite cell edge (`metrics.json` `size`).
 */
export function forgeSheetGrid(cell: number, directions: 1 | 4 | 8, frames: number): FrameGrid {
  return {
    frameWidth: cell,
    frameHeight: cell,
    columns: frames,
    rows: directions,
    frameCount: frames * directions,
  };
}

/**
 * The animations of a forge clip sheet, one per direction, named `<clip>.<direction>` in lower
 * case (`walk.sw`): frames of row `d` are `d * frames .. d * frames + frames - 1`.
 * `repeat` is -1 for a looping clip and 0 for a one-shot (attack, hurt, death).
 */
export function forgeSheetAnimations(
  clip: string,
  directions: 1 | 4 | 8,
  frames: number,
  frameRate: number,
  loop: boolean,
): Readonly<Record<string, AssetAnimation>> {
  const out: Record<string, AssetAnimation> = {};
  forgeDirections(directions).forEach((direction, row) => {
    const name = `${clip}.${direction.toLowerCase()}`;
    out[name] = {
      name,
      frames: Array.from({ length: frames }, (_, i) => row * frames + i),
      frameRate,
      repeat: loop ? -1 : 0,
    };
  });
  return out;
}

/**
 * The sprite origin from the forge pivot (`metrics.json` `pivot`, the asset's ground point in
 * cell pixels): the point the game places on the floor.
 */
export function forgeOrigin(pivot: readonly [number, number], cell: number): AssetOrigin {
  return { x: pivot[0] / cell, y: pivot[1] / cell };
}
