/**
 * Shared actor sprite layer.
 *
 * A cartridge draws its actors with this layer instead of painting a fixed
 * wallpaper. The layer creates each sprite one time and then moves it to the
 * position that the cartridge computes on every frame, so the standard-pack art
 * follows real gameplay actors.
 */

import { resolveAssetBinding } from "../editions/editions.js";
import type { RuntimeEdition } from "./types.js";

/** The minimal Phaser image surface that the layer uses. */
export interface ActorSpriteLike {
  setOrigin?(x: number, y: number): ActorSpriteLike;
  setDisplaySize?(width: number, height: number): ActorSpriteLike;
  setDepth?(depth: number): ActorSpriteLike;
  setPosition?(x: number, y: number): ActorSpriteLike;
  setVisible?(visible: boolean): ActorSpriteLike;
  setFlipX?(flip: boolean): ActorSpriteLike;
  setAngle?(angle: number): ActorSpriteLike;
  setAlpha?(alpha: number): ActorSpriteLike;
  destroy?(): void;
}

/** The minimal Phaser scene surface that the layer uses. */
export interface ActorSpriteSceneLike {
  add?: {
    image?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    sprite?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): ActorSpriteLike;
  };
}

/** Where and how one actor sprite appears this frame. */
export interface ActorSpritePlacement {
  /** Scene x position of the sprite. */
  readonly x: number;
  /** Scene y position of the sprite. */
  readonly y: number;
  /** Displayed width in pixels. */
  readonly width: number;
  /** Displayed height in pixels. Defaults to the width. */
  readonly height?: number;
  /** Draw order. Defaults to 6, which sits above a cartridge background. */
  readonly depth?: number;
  /** Horizontal origin. Defaults to 0.5. */
  readonly originX?: number;
  /** Vertical origin. Defaults to 0.5. */
  readonly originY?: number;
  /** Mirrors the sprite horizontally, for an actor that faces left. */
  readonly flipX?: boolean;
  /** Rotation in degrees. */
  readonly angle?: number;
  /** Opacity between 0 and 1. */
  readonly alpha?: number;
}

/** Draws standard-pack art that follows the actors of one cartridge. */
export interface ActorSpriteLayer {
  /** Reports whether the edition supplies art for one semantic binding. */
  readonly has: (bindingKey: string) => boolean;
  /** Fills the whole scene with one repeating ground tile. */
  readonly ground: (bindingKey: string, width: number, height: number, depth?: number) => boolean;
  /** Creates the sprite on the first call, then moves it on every later call. */
  readonly place: (id: string, bindingKey: string, placement: ActorSpritePlacement) => boolean;
  /** Hides every sprite that no place call named since the previous sweep. */
  readonly sweep: () => void;
  /** Destroys every sprite that the layer owns. */
  readonly destroy: () => void;
}

/**
 * Creates an actor sprite layer for one scene and edition.
 * @param scene The Phaser scene that owns the sprites.
 * @param edition The validated edition that supplies the semantic bindings.
 * @returns A layer that binds standard-pack art to cartridge actors.
 */
export function createActorSpriteLayer(
  scene: ActorSpriteSceneLike,
  edition: RuntimeEdition,
): ActorSpriteLayer {
  const sprites = new Map<string, ActorSpriteLike>();
  let placedThisFrame = new Set<string>();
  let visible = new Set<string>();

  // A host may mount with a minimal edition that declares no bindings.
  const has = (bindingKey: string): boolean => Boolean(edition?.bindings?.[bindingKey]);

  const create = (
    bindingKey: string,
    x: number,
    y: number,
  ): ActorSpriteLike | undefined => {
    if (!has(bindingKey)) return undefined;
    const resolved = resolveAssetBinding(edition, bindingKey);
    const frame = resolved.binding.frame ?? 0;
    return scene.add?.sprite?.(x, y, resolved.textureKey, frame)
      ?? scene.add?.image?.(x, y, resolved.textureKey, frame);
  };

  const place: ActorSpriteLayer["place"] = (id, bindingKey, placement) => {
    let sprite = sprites.get(id);
    if (!sprite) {
      sprite = create(bindingKey, placement.x, placement.y);
      if (!sprite) return false;
      sprites.set(id, sprite);
    }
    sprite.setOrigin?.(placement.originX ?? 0.5, placement.originY ?? 0.5);
    sprite.setPosition?.(placement.x, placement.y);
    sprite.setDisplaySize?.(placement.width, placement.height ?? placement.width);
    sprite.setDepth?.(placement.depth ?? 6);
    if (placement.flipX !== undefined) sprite.setFlipX?.(placement.flipX);
    if (placement.angle !== undefined) sprite.setAngle?.(placement.angle);
    if (placement.alpha !== undefined) sprite.setAlpha?.(placement.alpha);
    if (!visible.has(id)) {
      sprite.setVisible?.(true);
      visible.add(id);
    }
    placedThisFrame.add(id);
    return true;
  };

  const ground: ActorSpriteLayer["ground"] = (bindingKey, width, height, depth = -25) => {
    if (!has(bindingKey)) return false;
    const existing = sprites.get("apk:ground");
    if (existing) {
      existing.setPosition?.(0, 0);
      existing.setDisplaySize?.(width, height);
      placedThisFrame.add("apk:ground");
      return true;
    }
    const resolved = resolveAssetBinding(edition, bindingKey);
    const tiled = scene.add?.tileSprite?.(0, 0, width, height, resolved.textureKey);
    if (tiled) {
      tiled.setOrigin?.(0, 0);
      tiled.setDepth?.(depth);
      sprites.set("apk:ground", tiled);
      visible.add("apk:ground");
      placedThisFrame.add("apk:ground");
      return true;
    }
    const image = create(bindingKey, width / 2, height / 2);
    if (!image) return false;
    image.setOrigin?.(0.5, 0.5);
    image.setDisplaySize?.(width, height);
    image.setDepth?.(depth);
    sprites.set("apk:ground", image);
    visible.add("apk:ground");
    placedThisFrame.add("apk:ground");
    return true;
  };

  const sweep: ActorSpriteLayer["sweep"] = () => {
    for (const id of visible) {
      if (placedThisFrame.has(id)) continue;
      sprites.get(id)?.setVisible?.(false);
    }
    visible = new Set(placedThisFrame);
    placedThisFrame = new Set<string>();
  };

  const destroy: ActorSpriteLayer["destroy"] = () => {
    for (const sprite of sprites.values()) sprite.destroy?.();
    sprites.clear();
    placedThisFrame = new Set<string>();
    visible = new Set<string>();
  };

  return { has, ground, place, sweep, destroy };
}
