/**
 * The shared "2D mode (older phones)" setting, a copy of the Forge test
 * `tests/apk3d/renderer-setting.test.ts`. The first block repeats the cases of the module that owns
 * the setting (`advantage-play-kit/src/responsive/__tests__/renderer.test.ts`); the kit file is a
 * byte copy of that module. The second block tests `savedRendererSetting`, which the story game
 * host uses when the app passes no setting.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { RENDERER_SETTINGS_KEY, chooseRenderer, readFlatMode, saveFlatMode, savedRendererSetting, selectRenderer } from '../factory/index.js';

describe('chooseRenderer (the shared 2D mode setting)', () => {
  it('picks 3D on a device with WebGL2 and no setting', () => {
    expect(chooseRenderer({ search: '', saved: null, webgl2: true })).toBe('3d');
  });
  it('falls back to 2D without WebGL2', () => {
    expect(chooseRenderer({ search: '', saved: null, webgl2: false })).toBe('2d');
  });
  it('honours the saved flat setting of the Chibi Quest host', () => {
    expect(chooseRenderer({ search: '', saved: JSON.stringify({ flat: true, looks: {} }), webgl2: true })).toBe('2d');
    expect(chooseRenderer({ search: '', saved: JSON.stringify({ flat: false }), webgl2: true })).toBe('3d');
  });
  it('honours ?renderer=phaser for one visit', () => {
    expect(chooseRenderer({ search: '?renderer=phaser', saved: null, webgl2: true })).toBe('2d');
  });
  it('treats unreadable settings as no setting', () => {
    expect(chooseRenderer({ search: '', saved: '{not json', webgl2: true })).toBe('3d');
  });
});

describe('savedRendererSetting (the games read the same setting)', () => {
  const g = globalThis as { window?: unknown };
  const fake = (search: string, data: Record<string, string>): void => {
    g.window = { location: { search }, localStorage: { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) } };
  };
  afterEach(() => {
    delete g.window;
  });

  it('is auto on a server and without a setting', () => {
    expect(savedRendererSetting()).toBe('auto');
    fake('', {});
    expect(savedRendererSetting()).toBe('auto');
  });
  it('forces 2D after a page saves 2D mode, and keeps the other saved fields', () => {
    const data: Record<string, string> = { [RENDERER_SETTINGS_KEY]: JSON.stringify({ hero: 'ranger' }) };
    fake('', data);
    saveFlatMode(true);
    expect(JSON.parse(data[RENDERER_SETTINGS_KEY]!)).toEqual({ hero: 'ranger', flat: true });
    expect(readFlatMode()).toBe(true);
    expect(savedRendererSetting()).toBe('phaser');
    expect(selectRenderer({ renderers: ['three', 'phaser'] }, { status: 'ok' }, savedRendererSetting())?.renderer).toBe('phaser');
  });
  it('forces 2D for one visit with ?renderer=phaser', () => {
    fake('?renderer=phaser', {});
    expect(savedRendererSetting()).toBe('phaser');
  });
});
