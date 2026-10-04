/**
 * The 2D asset contract (APK copies plus the forge sheet helpers): a forge sprite pack passes the
 * same checks the APK runs at mount, and the helpers describe the sheet `./forge sprites` writes.
 */
import { describe, expect, it } from 'vitest';
import {
  APK_RUNTIME_API_VERSION,
  CHARACTER_COLLISION,
  CHARACTER_ORIGIN,
  FORGE_DIRECTIONS_8,
  SpriteEditionError,
  TOP_DOWN_CHARACTER_ANIMATIONS,
  TOP_DOWN_CHARACTER_GRID,
  createAnimationKey,
  createTextureKey,
  forgeOrigin,
  forgeSheetAnimations,
  forgeSheetGrid,
  physicalAssetFileSchema,
  preloadAssetBindings,
  registerAssetAnimations,
  resolveAssetBinding,
  runtimeEditionSchema,
  spritePackRoot,
  validateEdition,
  type PhysicalAssetFile,
  type RuntimeEdition,
} from '../contracts/index.js';

/** A forge walk sheet: 8 directions, 8 frames, 128 px cells, the pivot at (64, 101). */
const walk = (): PhysicalAssetFile => ({
  id: 'heroes/knight_walk',
  path: 'heroes/knight_walk.png',
  kind: 'spritesheet',
  view: 'isometric',
  width: 1024,
  height: 1024,
  format: 'png',
  alpha: true,
  byteSize: 120_000,
  sha256: 'a'.repeat(64),
  grid: forgeSheetGrid(128, 8, 8),
  animations: forgeSheetAnimations('walk', 8, 8, 10, true),
  origin: forgeOrigin([64, 101], 128),
  provenance: { source: 'advantage-forge/assets/knight.ts', license: 'AGPL-3.0-or-later' },
});

const edition = (over: Partial<RuntimeEdition> = {}): RuntimeEdition => ({
  id: 'standard',
  title: 'Primary Chibi 2D',
  runtimeApiVersion: APK_RUNTIME_API_VERSION,
  pack: {
    id: 'forge-heroes',
    version: '1.0.0',
    root: spritePackRoot('forge-heroes'),
    files: { 'heroes/knight_walk': walk() },
  },
  bindings: {
    'hero.knight.walk': {
      key: 'hero.knight.walk',
      file: 'heroes/knight_walk',
      usage: 'animation',
      view: 'isometric',
      animation: 'walk.s',
    },
    'hero.knight.still': {
      key: 'hero.knight.still',
      file: 'heroes/knight_walk',
      usage: 'frame',
      view: 'isometric',
      frame: 0,
    },
  },
  tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 1 },
  ...over,
});

describe('forge sheet helpers', () => {
  it('lay out rows as directions and columns as frames, in forge order', () => {
    expect(FORGE_DIRECTIONS_8).toEqual(['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']);
    expect(forgeSheetGrid(128, 8, 6)).toEqual({
      frameWidth: 128,
      frameHeight: 128,
      columns: 6,
      rows: 8,
      frameCount: 48,
    });
    expect(forgeSheetGrid(96, 1, 1)).toEqual({
      frameWidth: 96,
      frameHeight: 96,
      columns: 1,
      rows: 1,
      frameCount: 1,
    });
    const anims = forgeSheetAnimations('attack', 4, 6, 12, false);
    expect(Object.keys(anims)).toEqual(['attack.s', 'attack.w', 'attack.n', 'attack.e']);
    expect(anims['attack.w']).toEqual({
      name: 'attack.w',
      frames: [6, 7, 8, 9, 10, 11],
      frameRate: 12,
      repeat: 0,
    });
    expect(forgeSheetAnimations('walk', 8, 8, 10, true)['walk.se']!.frames).toEqual([
      56, 57, 58, 59, 60, 61, 62, 63,
    ]);
    expect(forgeSheetAnimations('idle', 1, 4, 6, true)).toEqual({
      'idle.s': { name: 'idle.s', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
    });
  });

  it('turns the forge pivot into a normalized origin', () => {
    expect(forgeOrigin([64, 101], 128)).toEqual({ x: 0.5, y: 101 / 128 });
    expect(forgeOrigin([64, 128], 128)).toEqual(CHARACTER_ORIGIN);
  });

  it('names the pack root the APK accepts', () => {
    expect(spritePackRoot('forge-heroes')).toBe('/assets/apk/forge-heroes/v1');
    expect(spritePackRoot('forge-heroes', 'v2')).toBe('/assets/apk/forge-heroes/v2');
  });
});

describe('physical files (APK copy)', () => {
  it('accepts a forge sheet and keeps the APK sha256 field as the only hash', () => {
    expect(physicalAssetFileSchema.safeParse(walk()).success).toBe(true);
    const { sha256, ...noHash } = walk();
    void sha256;
    expect(physicalAssetFileSchema.safeParse(noHash).success).toBe(false);
    expect(physicalAssetFileSchema.safeParse({ ...walk(), sha256: 'A'.repeat(64) }).success).toBe(false);
    expect(physicalAssetFileSchema.safeParse({ ...walk(), kind: 'model' }).success).toBe(false);
    expect(physicalAssetFileSchema.safeParse({ ...walk(), extra: 1 }).success).toBe(false);
  });

  it('keys textures and animations per edition and file', () => {
    expect(createTextureKey('standard', 'heroes/knight_walk')).toBe('apk:standard:heroes/knight_walk');
    expect(createAnimationKey('standard', 'heroes/knight_walk', 'walk.s')).toBe(
      'apk:standard:heroes/knight_walk:walk.s',
    );
  });
});

describe('validateEdition (APK copy)', () => {
  it('accepts a forge edition and resolves its bindings', () => {
    const e = edition();
    expect(runtimeEditionSchema.safeParse(e).success).toBe(true);
    expect(validateEdition(e, ['hero.knight.walk'], APK_RUNTIME_API_VERSION)).toBe(e);
    const resolved = resolveAssetBinding(e, 'hero.knight.walk');
    expect(resolved.url).toBe('/assets/apk/forge-heroes/v1/heroes/knight_walk.png');
    expect(resolved.textureKey).toBe('apk:standard:heroes/knight_walk');
    expect(resolved.animationKey).toBe('apk:standard:heroes/knight_walk:walk.s');
    const base = resolveAssetBinding(
      e,
      'hero.knight.still',
      (pack, file) => `./${pack.root.slice(1)}/${file.path}`,
    );
    expect(base.url).toBe('./assets/apk/forge-heroes/v1/heroes/knight_walk.png');
    expect(base.animationKey).toBeUndefined();
  });

  it('rejects a bad root, a grid that does not match the image, and a missing required binding', () => {
    const bad = (e: RuntimeEdition, code: string, message: RegExp) => {
      let error: unknown;
      try {
        validateEdition(e, ['hero.knight.walk'], APK_RUNTIME_API_VERSION);
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(SpriteEditionError);
      expect((error as SpriteEditionError).code).toBe(code);
      expect((error as SpriteEditionError).message).toMatch(message);
    };
    const e = edition();
    bad({ ...e, pack: { ...e.pack, root: 'packs/forge-heroes' } }, 'INVALID_EDITION', /non-canonical root/);
    bad(
      { ...e, pack: { ...e.pack, files: { 'heroes/knight_walk': { ...walk(), width: 1000 } } } },
      'INVALID_EDITION',
      /frame grid/,
    );
    bad(edition({ bindings: {} }), 'MISSING_ASSET_SLOT', /hero.knight.walk/);
    bad(edition({ runtimeApiVersion: '0.9.0' }), 'INCOMPATIBLE_RUNTIME', /requires runtime/);
    bad(
      {
        ...e,
        bindings: {
          ...e.bindings,
          'hero.knight.walk': { ...e.bindings['hero.knight.walk']!, animation: 'walk.x' },
        },
      },
      'INVALID_EDITION',
      /missing animation/,
    );
  });

  it('a forge sheet with a collision box must be a canonical APK actor sheet', () => {
    const file = { ...walk(), collision: CHARACTER_COLLISION };
    const e = edition({ pack: { ...edition().pack, files: { 'heroes/knight_walk': file } } });
    expect(() => validateEdition(e, [], APK_RUNTIME_API_VERSION)).toThrow(/origin or collision contract/);
    // With the canonical origin the sheet still fails: 'isometric' is not a canonical actor view.
    const canonical = { ...file, origin: CHARACTER_ORIGIN };
    const e2 = edition({ pack: { ...edition().pack, files: { 'heroes/knight_walk': canonical } } });
    expect(() => validateEdition(e2, [], APK_RUNTIME_API_VERSION)).toThrow(/unsupported view/);
    // A canonical top-down sheet passes.
    const topDown = {
      ...canonical,
      view: 'top-down' as const,
      width: 512,
      height: 1024,
      grid: TOP_DOWN_CHARACTER_GRID,
      animations: TOP_DOWN_CHARACTER_ANIMATIONS,
    };
    const e3 = edition({
      pack: { ...edition().pack, files: { 'heroes/knight_walk': topDown } },
      bindings: {},
    });
    expect(() => validateEdition(e3, [], APK_RUNTIME_API_VERSION)).not.toThrow();
  });

  it('preloads each file once and registers the bound animations once', () => {
    const e = edition();
    const calls: unknown[] = [];
    preloadAssetBindings(
      { spritesheet: (...args) => calls.push(args), image: (...args) => calls.push(args) },
      e,
      ['hero.knight.walk', 'hero.knight.still'],
    );
    expect(calls).toEqual([
      [
        'apk:standard:heroes/knight_walk',
        '/assets/apk/forge-heroes/v1/heroes/knight_walk.png',
        { frameWidth: 128, frameHeight: 128 },
      ],
    ]);
    const created: unknown[] = [];
    registerAssetAnimations({ create: (c) => created.push(c) }, e, [
      'hero.knight.walk',
      'hero.knight.walk',
      'hero.knight.still',
    ]);
    expect(created).toEqual([
      {
        key: 'apk:standard:heroes/knight_walk:walk.s',
        frames: Array.from({ length: 8 }, (_, i) => ({ key: 'apk:standard:heroes/knight_walk', frame: i })),
        frameRate: 10,
        repeat: -1,
      },
    ]);
    expect(() => preloadAssetBindings({}, e, ['hero.knight.walk'])).toThrow(/Spritesheet loader unavailable/);
  });
});
