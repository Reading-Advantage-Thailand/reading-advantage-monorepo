/**
 * Forge sprite sheets in a 2D (Phaser) view: bindings for an edition, and every direction's
 * animation of a bound sheet registered from the pack's own data (APK-compatible: the frames,
 * rates, and repeats come from the `PhysicalAssetFile`).
 */
import type * as Phaser from 'phaser';
import { createAnimationKey, createTextureKey, type PhysicalAssetFile, type RuntimeEdition } from '../contracts/index.js';

export type SemanticBinding = RuntimeEdition['bindings'][string];

/** A binding that loads a whole sheet (usage `frame`: the loader loads the sheet once). */
export function sheetBinding(key: string, file: PhysicalAssetFile): SemanticBinding {
  return file.kind === 'spritesheet'
    ? { key, file: file.id, usage: 'frame', view: file.view, frame: 0 }
    : { key, file: file.id, usage: 'image', view: file.view };
}

/** Bindings for the given pack files (keys = file ids); files missing from the pack are skipped. */
export function sheetBindings(pack: RuntimeEdition['pack'], fileIds: readonly string[]): Record<string, SemanticBinding> {
  const out: Record<string, SemanticBinding> = {};
  for (const id of fileIds) {
    const file = pack.files[id];
    if (file) out[id] = sheetBinding(id, file);
  }
  return out;
}

/** Registers every animation of a sheet file (one per direction: `walk.s`, `walk.sw`, ...). */
export function registerSheetAnimations(anims: Phaser.Animations.AnimationManager, edition: RuntimeEdition, fileId: string): void {
  const file = edition.pack.files[fileId];
  if (!file?.animations) return;
  const texture = createTextureKey(edition.id, file.id);
  for (const [name, a] of Object.entries(file.animations)) {
    const key = createAnimationKey(edition.id, file.id, name);
    if (anims.exists(key)) continue;
    anims.create({ key, frames: a.frames.map((frame) => ({ key: texture, frame })), frameRate: a.frameRate, repeat: a.repeat, ...(a.yoyo === undefined ? {} : { yoyo: a.yoyo }) });
  }
}

export const textureKeyOf = (edition: RuntimeEdition, fileId: string): string => createTextureKey(edition.id, fileId);
export const animationKeyOf = (edition: RuntimeEdition, fileId: string, name: string): string => createAnimationKey(edition.id, fileId, name);
