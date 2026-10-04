/**
 * Quality tier from device hints (section 9 of docs/apk3d-cartridge.md). Pure: the gate passes
 * `navigator.deviceMemory` and `hardwareConcurrency`; tests pass numbers.
 */
import type { QualityTierId } from '../contracts/device.js';

export interface TierHints {
  /** `navigator.deviceMemory` in GiB (Chromium only; absent elsewhere). */
  deviceMemory?: number | undefined;
  hardwareConcurrency?: number | undefined;
}

export interface TierChoice {
  tier: QualityTierId;
  /** Memory below 2 GiB: the lite edition and the `low` tier. */
  lite: boolean;
}

/** Memory absent or >= 3 gives `high`, 2 gives `mid`, below 2 gives lite; <= 4 cores caps at `mid`. */
export function chooseTier(hints: TierHints): TierChoice {
  const memory = hints.deviceMemory;
  if (memory !== undefined && memory < 2) return { tier: 'low', lite: true };
  let tier: QualityTierId = memory === undefined || memory >= 3 ? 'high' : 'mid';
  const cores = hints.hardwareConcurrency;
  if (cores !== undefined && cores <= 4 && tier === 'high') tier = 'mid';
  return { tier, lite: false };
}

/** Pixel ratio cap per tier; the stage's `QUALITY` table has the same values. */
export const PIXEL_RATIO_CAP: Readonly<Record<QualityTierId, number>> = { high: 2, mid: 1.5, low: 1 };

/** The pixel ratio the stage renders at: the device ratio, capped by the tier. */
export function pixelRatioFor(tier: QualityTierId, devicePixelRatio: number): number {
  return Math.min(Math.max(devicePixelRatio, 0.5), PIXEL_RATIO_CAP[tier]);
}
