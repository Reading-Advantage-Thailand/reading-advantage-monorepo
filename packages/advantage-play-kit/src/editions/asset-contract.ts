import type { AssetAnimation, AssetCollisionBox, AssetOrigin, FrameGrid } from "../runtime/types.js";

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
  "walk.down": { name: "walk.down", frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 },
  "walk.left": { name: "walk.left", frames: [4, 5, 6, 7], frameRate: 8, repeat: -1 },
  "walk.right": { name: "walk.right", frames: [8, 9, 10, 11], frameRate: 8, repeat: -1 },
  "walk.up": { name: "walk.up", frames: [12, 13, 14, 15], frameRate: 8, repeat: -1 },
  "idle.down": { name: "idle.down", frames: [16], frameRate: 1, repeat: -1 },
  "idle.left": { name: "idle.left", frames: [17], frameRate: 1, repeat: -1 },
  "idle.right": { name: "idle.right", frames: [18], frameRate: 1, repeat: -1 },
  "idle.up": { name: "idle.up", frames: [19], frameRate: 1, repeat: -1 },
  "attack.down": { name: "attack.down", frames: [20, 21, 22, 23], frameRate: 10, repeat: 0 },
  "attack.left": { name: "attack.left", frames: [24, 25], frameRate: 10, repeat: 0 },
  "attack.right": { name: "attack.right", frames: [26, 27], frameRate: 10, repeat: 0 },
  "attack.up": { name: "attack.up", frames: [28, 29, 30, 31], frameRate: 10, repeat: 0 },
};

/** Exact animation rows for a 4x4 side-scroll character sheet. */
export const SIDE_SCROLL_CHARACTER_ANIMATIONS: Readonly<Record<string, AssetAnimation>> = {
  idle: { name: "idle", frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
  run: { name: "run", frames: [4, 5, 6, 7], frameRate: 10, repeat: -1 },
  attack: { name: "attack", frames: [8, 9, 10, 11], frameRate: 10, repeat: 0 },
  hurt: { name: "hurt", frames: [12, 13], frameRate: 8, repeat: 0 },
  death: { name: "death", frames: [14, 15], frameRate: 5, repeat: 0 },
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
export function createAnimationKey(
  editionId: string,
  fileId: string,
  animationName: string,
): string {
  return `${createTextureKey(editionId, fileId)}:${animationName}`;
}
