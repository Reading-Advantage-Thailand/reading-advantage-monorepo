/**
 * The renderer choice ("Dual renderer" section of docs/apk3d-cartridge.md): the device gate
 * decides, a player setting can force 2D, and a cartridge plays only in a renderer it lists.
 */
import { hasRenderer, type CartridgeManifest, type RendererId } from '../contracts/index.js';
import type { Cartridge, GateVerdict, PhaserCartridge, ThreeCartridge } from './types.js';

/** The player's renderer setting: `'auto'` lets the device gate decide. */
export type RendererSetting = 'auto' | 'phaser';

export interface RendererChoice {
  renderer: RendererId;
  /** Why this renderer: the gate result or the setting. */
  reason: 'ok' | 'lite' | 'unsupported' | 'forced' | 'only';
}

/**
 * Picks the renderer for a mount, or `null` when the device cannot run any renderer of the
 * cartridge (the host shows the gate screen).
 *
 * | Device gate | Setting | Cartridge lists | Choice |
 * | --- | --- | --- | --- |
 * | any | `phaser` | phaser | phaser (`forced`) |
 * | `ok` | `auto` | three | three (`ok`) |
 * | `lite` or `unsupported` | `auto` | phaser | phaser (the gate status) |
 * | `lite` | `auto` | three only | three (`lite`: the lite edition, low tier) |
 * | `unsupported` | `auto` | three only | `null` |
 * | `ok` | `auto` | phaser only | phaser (`only`) |
 */
export function selectRenderer(
  manifest: Pick<CartridgeManifest, 'renderers'>,
  verdict: Pick<GateVerdict, 'status'>,
  setting: RendererSetting = 'auto',
): RendererChoice | null {
  const phaser = hasRenderer(manifest, 'phaser');
  const three = hasRenderer(manifest, 'three');
  if (setting === 'phaser' && phaser) return { renderer: 'phaser', reason: 'forced' };
  if (verdict.status === 'ok') {
    if (three) return { renderer: 'three', reason: 'ok' };
    return phaser ? { renderer: 'phaser', reason: 'only' } : null;
  }
  if (phaser) return { renderer: 'phaser', reason: verdict.status };
  if (verdict.status === 'lite' && three) return { renderer: 'three', reason: 'lite' };
  return null;
}

/**
 * Checks that every renderer the manifest lists has its method on the cartridge, and that no
 * method is there without its renderer.
 * @throws with the cartridge id and the missing or extra part.
 */
export function validateCartridge(cartridge: Cartridge): Cartridge {
  const id = cartridge.manifest.id;
  const three = hasRenderer(cartridge.manifest, 'three');
  const phaser = hasRenderer(cartridge.manifest, 'phaser');
  if (three && typeof cartridge.createGame !== 'function')
    throw new Error(`Cartridge ${id} lists 'three' but has no createGame`);
  if (phaser && typeof cartridge.createGameConfig !== 'function')
    throw new Error(`Cartridge ${id} lists 'phaser' but has no createGameConfig`);
  if (!three && cartridge.createGame)
    throw new Error(`Cartridge ${id} has createGame but does not list 'three'`);
  if (!phaser && cartridge.createGameConfig)
    throw new Error(`Cartridge ${id} has createGameConfig but does not list 'phaser'`);
  return cartridge;
}

export const isThreeCartridge = (cartridge: Cartridge): cartridge is ThreeCartridge =>
  hasRenderer(cartridge.manifest, 'three') && typeof cartridge.createGame === 'function';

export const isPhaserCartridge = (cartridge: Cartridge): cartridge is PhaserCartridge =>
  hasRenderer(cartridge.manifest, 'phaser') && typeof cartridge.createGameConfig === 'function';
