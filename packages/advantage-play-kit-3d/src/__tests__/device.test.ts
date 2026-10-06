import { describe, expect, it } from 'vitest';
import { QUALITY_TIER_IDS, type QualityTierId } from '../contracts/index.js';
import {
  checkDevice,
  isLineApp,
  isSoftwareRenderer,
  parseAndroidWebViewChrome,
  parseIosVersion,
  type GateEnvironment,
  type GateGl,
} from '../device/gate.js';
import { PIXEL_RATIO_CAP, chooseTier, pixelRatioFor } from '../device/tier.js';
import { QUALITY, type QualityTierId as StageTierId } from '../stage/stage.js';

// Real user agent strings.
const UA = {
  iphone4sIos9:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1',
  ios15:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1',
  ios17:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
  ipadIos14:
    'Mozilla/5.0 (iPad; CPU OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
  webView79:
    'Mozilla/5.0 (Linux; Android 9; SM-G960F Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.136 Mobile Safari/537.36',
  webView120:
    'Mozilla/5.0 (Linux; Android 13; SM-S911B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
  lineIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0',
  lineAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 Line/14.9.0/IAB',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  headless:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.6478.63 Safari/537.36',
};

interface FakeGl {
  renderer?: string | undefined;
  maxTextureSize?: number;
  maxVertexTextureUnits?: number;
  /** Refuse the context when `failIfMajorPerformanceCaveat` is asked for (a slow GPU). */
  caveat?: boolean;
  /** No WebGL2 at all. */
  none?: boolean;
}

/** A fake environment; records the context attributes asked for and whether the context was released. */
function fakeEnv(gl: FakeGl = {}, over: Partial<GateEnvironment> = {}) {
  const asked: { failIfMajorPerformanceCaveat: boolean }[] = [];
  let lost = 0;
  const context: GateGl = {
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
    getParameter: (name) => {
      if (name === 0x0d33) return gl.maxTextureSize ?? 8192;
      if (name === 0x8b4c) return gl.maxVertexTextureUnits ?? 16;
      if (name === 0x9246) return gl.renderer;
      throw new Error(`unexpected parameter ${name}`);
    },
    getExtension: (name) => {
      if (name === 'WEBGL_debug_renderer_info') return gl.renderer === undefined ? null : { UNMASKED_RENDERER_WEBGL: 0x9246 };
      if (name === 'WEBGL_lose_context') return { loseContext: () => void lost++ };
      return null;
    },
  };
  const env: GateEnvironment = {
    userAgent: UA.desktopChrome,
    deviceMemory: 8,
    hardwareConcurrency: 8,
    devicePixelRatio: 2,
    qc: false,
    getContext: (attributes) => {
      asked.push(attributes);
      if (gl.none) return null;
      if (gl.caveat && attributes.failIfMajorPerformanceCaveat) return null;
      return context;
    },
    ...over,
  };
  return { env, asked, lost: () => lost };
}

describe('user agent parsing', () => {
  it('reads the iOS major version from iPhone and iPad user agents only', () => {
    expect(parseIosVersion(UA.iphone4sIos9)).toBe(9);
    expect(parseIosVersion(UA.ios15)).toBe(15);
    expect(parseIosVersion(UA.ios17)).toBe(17);
    expect(parseIosVersion(UA.ipadIos14)).toBe(14);
    expect(parseIosVersion(UA.lineIos)).toBe(17);
    expect(parseIosVersion(UA.webView120)).toBeUndefined();
    expect(parseIosVersion(UA.desktopChrome)).toBeUndefined();
  });

  it('reads the Chrome version of an Android WebView, and LINE on Android', () => {
    expect(parseAndroidWebViewChrome(UA.webView79)).toBe(79);
    expect(parseAndroidWebViewChrome(UA.webView120)).toBe(120);
    expect(parseAndroidWebViewChrome(UA.lineAndroid)).toBe(124);
    expect(parseAndroidWebViewChrome(UA.androidChrome)).toBeUndefined();
    expect(parseAndroidWebViewChrome(UA.ios17)).toBeUndefined();
    expect(parseAndroidWebViewChrome(UA.desktopChrome)).toBeUndefined();
  });

  it('detects the LINE in-app browser on both platforms', () => {
    expect(isLineApp(UA.lineIos)).toBe(true);
    expect(isLineApp(UA.lineAndroid)).toBe(true);
    expect(isLineApp(UA.ios17)).toBe(false);
    expect(isLineApp(UA.webView120)).toBe(false);
    expect(isLineApp('Mozilla/5.0 Outline/1.0')).toBe(false);
  });

  it('knows the software renderers', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)')).toBe(false);
    expect(isSoftwareRenderer('Mali-G78')).toBe(false);
  });
});

describe('tier', () => {
  it('follows the memory and core hints', () => {
    expect(chooseTier({})).toEqual({ tier: 'high', lite: false });
    expect(chooseTier({ deviceMemory: 8, hardwareConcurrency: 8 })).toEqual({ tier: 'high', lite: false });
    expect(chooseTier({ deviceMemory: 4 })).toEqual({ tier: 'high', lite: false });
    expect(chooseTier({ deviceMemory: 3 })).toEqual({ tier: 'high', lite: false });
    expect(chooseTier({ deviceMemory: 2 })).toEqual({ tier: 'mid', lite: false });
    expect(chooseTier({ deviceMemory: 1 })).toEqual({ tier: 'low', lite: true });
    expect(chooseTier({ deviceMemory: 0.5, hardwareConcurrency: 8 })).toEqual({ tier: 'low', lite: true });
    expect(chooseTier({ deviceMemory: 8, hardwareConcurrency: 4 })).toEqual({ tier: 'mid', lite: false });
    expect(chooseTier({ hardwareConcurrency: 2 })).toEqual({ tier: 'mid', lite: false });
    expect(chooseTier({ deviceMemory: 2, hardwareConcurrency: 2 })).toEqual({ tier: 'mid', lite: false });
  });

  it('caps the pixel ratio per tier, with the same caps as the stage', () => {
    expect(pixelRatioFor('high', 3)).toBe(2);
    expect(pixelRatioFor('high', 1.5)).toBe(1.5);
    expect(pixelRatioFor('mid', 3)).toBe(1.5);
    expect(pixelRatioFor('low', 3)).toBe(1);
    expect(pixelRatioFor('low', 0)).toBe(0.5);
    for (const tier of QUALITY_TIER_IDS) expect(PIXEL_RATIO_CAP[tier]).toBe(QUALITY[tier].pixelRatioCap);
  });

  it('uses the same tier ids as the stage', () => {
    const ids: readonly StageTierId[] = QUALITY_TIER_IDS;
    const back: readonly QualityTierId[] = Object.keys(QUALITY) as StageTierId[];
    expect([...ids].sort()).toEqual([...back].sort());
  });
});

describe('checkDevice', () => {
  it('passes a desktop Chrome with a real GPU at the high tier and releases the probe context', () => {
    const { env, asked, lost } = fakeEnv({ renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' });
    const result = checkDevice({ env });
    expect(result).toMatchObject({ status: 'ok', tier: 'high' });
    expect(result.reason).toBeUndefined();
    expect(result.details).toMatchObject({
      webgl2: true,
      line: false,
      qc: false,
      maxTextureSize: 8192,
      maxVertexTextureUnits: 16,
      deviceMemory: 8,
      hardwareConcurrency: 8,
      devicePixelRatio: 2,
      pixelRatio: 2,
    });
    expect(result.details.renderer).toContain('NVIDIA');
    expect(asked).toEqual([{ failIfMajorPerformanceCaveat: true }]);
    expect(lost()).toBe(1);
  });

  it('requires WebGL2', () => {
    const { env } = fakeEnv({ none: true });
    expect(checkDevice({ env })).toMatchObject({ status: 'unsupported', reason: 'webgl', tier: 'low' });
    expect(checkDevice({ env }).details.webgl2).toBe(false);
    const slow = fakeEnv({ caveat: true });
    expect(checkDevice({ env: slow.env })).toMatchObject({ status: 'unsupported', reason: 'webgl' });
  });

  it('rejects software renderers, but not under the QC driver', () => {
    const swift = 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)';
    const { env } = fakeEnv({ renderer: swift, caveat: true }, { userAgent: UA.headless });
    expect(checkDevice({ env })).toMatchObject({ status: 'unsupported', reason: 'webgl' });
    const noCaveat = fakeEnv({ renderer: swift }, { userAgent: UA.headless });
    expect(checkDevice({ env: noCaveat.env })).toMatchObject({ status: 'unsupported', reason: 'software-gl' });

    const qc = fakeEnv({ renderer: swift, caveat: true }, { userAgent: UA.headless, qc: true });
    const result = checkDevice({ env: qc.env });
    expect(result).toMatchObject({ status: 'ok', tier: 'high' });
    expect(result.details.qc).toBe(true);
    expect(result.details.renderer).toContain('SwiftShader');
    expect(qc.asked).toEqual([{ failIfMajorPerformanceCaveat: false }]);
  });

  it('qc does not skip the other checks', () => {
    const swift = 'SwiftShader';
    expect(checkDevice({ env: fakeEnv({ renderer: swift, maxTextureSize: 1024 }, { qc: true }).env })).toMatchObject({
      status: 'unsupported',
      reason: 'texture-size',
    });
    expect(checkDevice({ env: fakeEnv({ renderer: swift }, { qc: true, userAgent: UA.iphone4sIos9 }).env })).toMatchObject({
      status: 'unsupported',
      reason: 'ios-version',
    });
    expect(checkDevice({ env: fakeEnv({ none: true }, { qc: true }).env })).toMatchObject({ status: 'unsupported', reason: 'webgl' });
  });

  it('skips the software check when the debug extension is absent', () => {
    const { env } = fakeEnv({ renderer: undefined });
    const result = checkDevice({ env });
    expect(result.status).toBe('ok');
    expect(result.details.renderer).toBeUndefined();
  });

  it('checks texture size and vertex texture units against the kit defaults and a manifest override', () => {
    expect(checkDevice({ env: fakeEnv({ maxTextureSize: 2047 }).env })).toMatchObject({ status: 'unsupported', reason: 'texture-size' });
    expect(checkDevice({ env: fakeEnv({ maxTextureSize: 2048 }).env }).status).toBe('ok');
    expect(checkDevice({ env: fakeEnv({ maxVertexTextureUnits: 0 }).env })).toMatchObject({ status: 'unsupported', reason: 'skinning' });
    expect(checkDevice({ env: fakeEnv({ maxVertexTextureUnits: 4 }).env }).status).toBe('ok');
    expect(checkDevice({ env: fakeEnv({ maxTextureSize: 4096 }).env, requirements: { minTextureSize: 8192 } })).toMatchObject({
      status: 'unsupported',
      reason: 'texture-size',
    });
  });

  it('gates iOS by version: iOS 9 and 14 fail, 15 and 17 pass', () => {
    const ios = (userAgent: string) => checkDevice({ env: fakeEnv({}, { userAgent, deviceMemory: undefined, hardwareConcurrency: undefined }).env });
    expect(ios(UA.iphone4sIos9)).toMatchObject({ status: 'unsupported', reason: 'ios-version' });
    expect(ios(UA.iphone4sIos9).details.ios).toBe(9);
    expect(ios(UA.ipadIos14)).toMatchObject({ status: 'unsupported', reason: 'ios-version' });
    expect(ios(UA.ios15)).toMatchObject({ status: 'ok', tier: 'high' });
    expect(ios(UA.ios17)).toMatchObject({ status: 'ok' });
    expect(ios(UA.ios17).details.webViewChrome).toBeUndefined();
    expect(checkDevice({ env: fakeEnv({}, { userAgent: UA.ios17 }).env, requirements: { minIosVersion: 18 } })).toMatchObject({
      reason: 'ios-version',
    });
  });

  it('gates Android WebViews by Chrome version: 79 fails, 120 passes, Chrome proper is not a WebView', () => {
    const android = (userAgent: string) => checkDevice({ env: fakeEnv({}, { userAgent, deviceMemory: 4, hardwareConcurrency: 8 }).env });
    expect(android(UA.webView79)).toMatchObject({ status: 'unsupported', reason: 'webview-version' });
    expect(android(UA.webView79).details.webViewChrome).toBe(79);
    expect(android(UA.webView120)).toMatchObject({ status: 'ok', tier: 'high' });
    expect(android(UA.androidChrome)).toMatchObject({ status: 'ok' });
    expect(android(UA.androidChrome).details.webViewChrome).toBeUndefined();
  });

  it('passes LINE on iOS and Android and marks details.line', () => {
    const line = (userAgent: string) => checkDevice({ env: fakeEnv({ renderer: 'Apple GPU' }, { userAgent }).env });
    expect(line(UA.lineIos)).toMatchObject({ status: 'ok' });
    expect(line(UA.lineIos).details).toMatchObject({ line: true, ios: 17 });
    expect(line(UA.lineAndroid)).toMatchObject({ status: 'ok' });
    expect(line(UA.lineAndroid).details).toMatchObject({ line: true, webViewChrome: 124 });
    expect(line(UA.desktopChrome).details.line).toBe(false);
  });

  it('maps memory and cores to the tier, and low memory to lite', () => {
    const tier = (deviceMemory: number | undefined, hardwareConcurrency: number | undefined) =>
      checkDevice({ env: fakeEnv({}, { deviceMemory, hardwareConcurrency, devicePixelRatio: 3 }).env });
    expect(tier(undefined, undefined)).toMatchObject({ status: 'ok', tier: 'high' });
    expect(tier(undefined, undefined).details.deviceMemory).toBeUndefined();
    expect(tier(4, 8).details.pixelRatio).toBe(2);
    expect(tier(2, 8)).toMatchObject({ status: 'ok', tier: 'mid' });
    expect(tier(2, 8).details.pixelRatio).toBe(1.5);
    expect(tier(8, 4)).toMatchObject({ status: 'ok', tier: 'mid' });
    expect(tier(1, 8)).toMatchObject({ status: 'lite', tier: 'low' });
    expect(tier(1, 8).details.pixelRatio).toBe(1);
    expect(tier(1, 8).reason).toBeUndefined();
  });
});
