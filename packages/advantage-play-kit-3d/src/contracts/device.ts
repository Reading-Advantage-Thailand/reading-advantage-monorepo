/**
 * Device gate types (section 9 of docs/apk3d-cartridge.md). The implementation is
 * `src/apk3d/device/gate.ts`; the host and the factory read only `GateResult`.
 *
 * `QualityTierId` is also declared in `src/apk3d/stage/stage.ts` (`QUALITY`). The import rules
 * (section 4) let `device` import `contracts` only, so the literal union lives here as well; the
 * two must stay equal (`tests/apk3d/device.test.ts` checks it).
 */

/** Renderer quality tiers, from the gate to the stage: pixel ratio cap, antialias, shadows. */
export const QUALITY_TIER_IDS = ['high', 'mid', 'low'] as const;

export type QualityTierId = (typeof QUALITY_TIER_IDS)[number];

/** `lite` selects the lite model edition and the `low` tier; `unsupported` shows the gate screen. */
export type GateStatus = 'ok' | 'lite' | 'unsupported';

/** Why a device is unsupported; the host shows the catalog text `gate.reason.<reason>`. */
export const GATE_REASONS = [
  'webgl',
  'software-gl',
  'texture-size',
  'skinning',
  'ios-version',
  'webview-version',
] as const;

export type GateReason = (typeof GATE_REASONS)[number];

/** What the gate measured, for diagnostics and the QC report. */
export interface GateDetails {
  readonly userAgent: string;
  /** The page runs under the QC driver (`?qc=1`): the performance-caveat and software checks are skipped. */
  readonly qc: boolean;
  /** The LINE in-app browser (`Line/` in the user agent); diagnostics only. */
  readonly line: boolean;
  /** A WebGL2 context was created. */
  readonly webgl2: boolean;
  /** `WEBGL_debug_renderer_info` unmasked renderer, when the extension exists. */
  readonly renderer?: string;
  readonly maxTextureSize?: number;
  readonly maxVertexTextureUnits?: number;
  /** iOS major version from the user agent (iPhone, iPad, iPod). */
  readonly ios?: number;
  /** Chrome major version of an Android WebView (`; wv)` or the LINE app). */
  readonly webViewChrome?: number;
  /** `navigator.deviceMemory` in GiB, when the browser exposes it. */
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly devicePixelRatio: number;
  /** The pixel ratio the stage uses: `min(devicePixelRatio, cap of the tier)`. */
  readonly pixelRatio: number;
}

export interface GateResult {
  readonly status: GateStatus;
  /** Set when `status` is `unsupported`. */
  readonly reason?: GateReason;
  readonly tier: QualityTierId;
  readonly details: GateDetails;
}
