/**
 * The device gate (section 9 of docs/apk3d-cartridge.md): `checkDevice()` runs on the selector
 * page before any model download and again in the factory.
 *
 * WebGL2 is required (three r163 and later has no WebGL1 renderer). Under the QC driver
 * (`?qc=1`) the performance-caveat and software-renderer checks are skipped: headless Chromium
 * renders with SwiftShader. The user-agent checks (iOS, Android WebView) run before the WebGL
 * checks so an old phone gets the more specific reason.
 *
 * Testable without a browser: pass a `GateEnvironment` (`options.env`); `browserEnvironment()`
 * builds the real one from `navigator`, `location`, and a canvas.
 */
import type { GateDetails, GateReason, GateResult } from '../contracts/device.js';
import { DEVICE_REQUIREMENTS_DEFAULT, type DeviceRequirements } from '../contracts/manifest.js';
import { chooseTier, pixelRatioFor } from './tier.js';

/** The part of `WebGL2RenderingContext` the gate reads. */
export interface GateGl {
  readonly MAX_TEXTURE_SIZE: number;
  readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS: number;
  getParameter(name: number): unknown;
  getExtension(name: string): unknown;
}

export interface GateContextAttributes {
  failIfMajorPerformanceCaveat: boolean;
}

export interface GateEnvironment {
  readonly userAgent: string;
  readonly deviceMemory?: number | undefined;
  readonly hardwareConcurrency?: number | undefined;
  readonly devicePixelRatio: number;
  /** True when the page URL has `qc=1`. */
  readonly qc: boolean;
  /** `canvas.getContext('webgl2', attributes)`; null when the browser cannot create it. */
  getContext(attributes: GateContextAttributes): GateGl | null;
}

export interface CheckDeviceOptions {
  /** The environment to check; default: the browser's. */
  env?: GateEnvironment;
  /** The game's `manifest.device`; a missing field takes the kit default. */
  requirements?: Partial<DeviceRequirements>;
  /** The canvas for the probe context (browser only); default: a new canvas. */
  canvas?: HTMLCanvasElement;
}

// ---------------------------------------------------------------- user agent

/** iOS major version of an iPhone, iPad, or iPod user agent; undefined for everything else. */
export function parseIosVersion(userAgent: string): number | undefined {
  if (!/\b(?:iPhone|iPad|iPod)\b/.test(userAgent)) return undefined;
  const m = /\bOS (\d+)[_.]\d+/.exec(userAgent);
  return m ? Number(m[1]) : undefined;
}

/** True for the LINE in-app browser (`Line/` token). */
export const isLineApp = (userAgent: string): boolean => /\bLine\//.test(userAgent);

/**
 * Chrome major version of an Android WebView (`; wv)` in the platform token, the `Version/x.x`
 * token, or the LINE app); undefined for Android Chrome proper and every other browser.
 */
export function parseAndroidWebViewChrome(userAgent: string): number | undefined {
  if (!/\bAndroid\b/.test(userAgent)) return undefined;
  const webView = /;\s*wv\)/.test(userAgent) || /\bVersion\/\d/.test(userAgent) || isLineApp(userAgent);
  if (!webView) return undefined;
  const m = /\bChrome\/(\d+)/.exec(userAgent);
  return m ? Number(m[1]) : 0;
}

/** SwiftShader (Chromium) and llvmpipe (Mesa) render on the CPU. */
export const isSoftwareRenderer = (renderer: string): boolean => /SwiftShader|llvmpipe/i.test(renderer);

// ---------------------------------------------------------------- the check

/** The real environment: `navigator`, `location.search`, and a probe canvas. */
export function browserEnvironment(canvas?: HTMLCanvasElement): GateEnvironment {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const qc = new URLSearchParams(location.search).get('qc') === '1';
  return {
    userAgent: nav.userAgent,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio || 1,
    qc,
    getContext: (attributes) =>
      (canvas ?? document.createElement('canvas')).getContext('webgl2', attributes) as GateGl | null,
  };
}

export function checkDevice(options: CheckDeviceOptions = {}): GateResult {
  const env = options.env ?? browserEnvironment(options.canvas);
  const req: DeviceRequirements = { ...DEVICE_REQUIREMENTS_DEFAULT, ...options.requirements };
  const { tier, lite } = chooseTier(env);

  const ios = parseIosVersion(env.userAgent);
  const webViewChrome = parseAndroidWebViewChrome(env.userAgent);
  const details: Mutable<GateDetails> = {
    userAgent: env.userAgent,
    qc: env.qc,
    line: isLineApp(env.userAgent),
    webgl2: false,
    devicePixelRatio: env.devicePixelRatio,
    pixelRatio: pixelRatioFor(tier, env.devicePixelRatio),
  };
  if (ios !== undefined) details.ios = ios;
  if (webViewChrome !== undefined) details.webViewChrome = webViewChrome;
  if (env.deviceMemory !== undefined) details.deviceMemory = env.deviceMemory;
  if (env.hardwareConcurrency !== undefined) details.hardwareConcurrency = env.hardwareConcurrency;

  const unsupported = (reason: GateReason): GateResult => ({ status: 'unsupported', reason, tier: 'low', details });

  if (ios !== undefined && ios < req.minIosVersion) return unsupported('ios-version');
  if (webViewChrome !== undefined && webViewChrome < req.minWebViewChromeVersion) return unsupported('webview-version');

  const gl = env.getContext({ failIfMajorPerformanceCaveat: !env.qc });
  if (!gl) return unsupported('webgl');
  details.webgl2 = true;
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
    if (info) details.renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    details.maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    details.maxVertexTextureUnits = Number(gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
  } finally {
    (gl.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
  }

  if (!env.qc && details.renderer !== undefined && isSoftwareRenderer(details.renderer)) {
    return unsupported('software-gl');
  }
  if (!(details.maxTextureSize >= req.minTextureSize)) return unsupported('texture-size');
  if (!(details.maxVertexTextureUnits >= req.minVertexTextureUnits)) return unsupported('skinning');

  return { status: lite ? 'lite' : 'ok', tier, details };
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
