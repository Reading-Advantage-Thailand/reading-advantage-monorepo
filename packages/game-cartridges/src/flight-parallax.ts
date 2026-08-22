import { preloadAssetBindings, resolveAssetBinding, type RuntimeEdition } from "@reading-advantage/advantage-play-kit";

/**
 * Flight layers from farthest to nearest for an aerial camera.
 * Ground is below the dragon. Air and clouds are around the dragon.
 */
export const FLIGHT_PARALLAX_KEYS = Object.freeze([
  "world:parallax-near",
  "world:parallax-far",
  "world:parallax-mid",
]);

/** Scroll speed in pixels per second. Ground is slowest. Nearby air is fastest. */
export const FLIGHT_PARALLAX_SPEEDS = Object.freeze([18, 36, 64]);

/** Ground stays solid. Air layers stay transparent so the land below remains visible. */
const LAYER_ALPHA = Object.freeze([1, 0.35, 0.85]);

interface PhaserImageLike {
  setOrigin?(x: number, y: number): PhaserImageLike;
  setDepth?(depth: number): PhaserImageLike;
  setAlpha?(alpha: number): PhaserImageLike;
  setTilePosition?(x: number, y: number): PhaserImageLike;
  tilePositionY?: number;
  destroy(): void;
}

interface PhaserSceneLike {
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
  };
  add?: {
    tileSprite?(x: number, y: number, width: number, height: number, key: string): PhaserImageLike;
    image?(x: number, y: number, key: string, frame?: number): PhaserImageLike;
  };
}

/** Live tiled background layers for one flight scene. */
export interface FlightParallaxLayers {
  readonly sprites: PhaserImageLike[];
  scrollY: number;
}

/**
 * Returns whether the edition includes the three flight parallax bindings.
 * @param edition Audience edition supplied by the host.
 * @returns True when ground, sky, and cloud layers are bound.
 */
export function hasFlightParallax(edition: RuntimeEdition): boolean {
  return FLIGHT_PARALLAX_KEYS.every((key) => Boolean(edition.bindings[key]));
}

/**
 * Preloads the three flight parallax textures.
 * @param scene Active Phaser scene.
 * @param edition Audience edition supplied by the host.
 * @returns Nothing.
 */
export function preloadFlightParallax(scene: PhaserSceneLike, edition: RuntimeEdition): void {
  if (!scene.load || !hasFlightParallax(edition)) return;
  preloadAssetBindings(scene.load, edition, FLIGHT_PARALLAX_KEYS);
}

/**
 * Creates three full-canvas tiling layers from farthest ground to nearest air.
 * @param scene Active Phaser scene.
 * @param edition Audience edition supplied by the host.
 * @param width Current scene width.
 * @param height Current scene height.
 * @returns Layer sprites, or an empty set when tileSprite is unavailable.
 */
export function createFlightParallax(
  scene: PhaserSceneLike,
  edition: RuntimeEdition,
  width: number,
  height: number,
): FlightParallaxLayers {
  const sprites: PhaserImageLike[] = [];
  if (!hasFlightParallax(edition) || !scene.add?.tileSprite) {
    return { sprites, scrollY: 0 };
  }
  FLIGHT_PARALLAX_KEYS.forEach((key, index) => {
    const texture = resolveAssetBinding(edition, key);
    const layer = scene.add!.tileSprite!(0, 0, width, height, texture.textureKey);
    layer.setOrigin?.(0, 0);
    layer.setDepth?.(-30 + index * 6);
    layer.setAlpha?.(LAYER_ALPHA[index] ?? 1);
    sprites.push(layer);
  });
  return { sprites, scrollY: 0 };
}

/**
 * Advances each parallax layer by its scroll speed.
 * @param layers Live parallax layer bag.
 * @param deltaMs Frame delta in milliseconds.
 * @returns Nothing. Mutates tile positions.
 */
export function tickFlightParallax(layers: FlightParallaxLayers, deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
  layers.scrollY += deltaMs;
  layers.sprites.forEach((sprite, index) => {
    const speed = FLIGHT_PARALLAX_SPEEDS[index] ?? 18;
    const offset = (layers.scrollY / 1000) * speed;
    if (sprite.setTilePosition) {
      sprite.setTilePosition(0, offset);
      return;
    }
    sprite.tilePositionY = offset;
  });
}

/**
 * Destroys every parallax tileSprite.
 * @param layers Live parallax layer bag.
 * @returns Nothing.
 */
export function destroyFlightParallax(layers: FlightParallaxLayers): void {
  for (const sprite of layers.sprites) sprite.destroy();
  layers.sprites.length = 0;
  layers.scrollY = 0;
}
