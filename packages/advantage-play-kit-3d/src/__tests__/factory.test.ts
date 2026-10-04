/**
 * The dual-renderer factory layer: the renderer choice, the cartridge check, the Phaser factory
 * (APK copy, driven with a fake Phaser), the input controller (APK copy, on a fake surface), and
 * the mounter that the host calls for either renderer. No DOM: every element is a plain object.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  APK3D_CAPABILITIES,
  CARTRIDGE_3D_RUNTIME_API_VERSION,
  validateCartridge3DManifest,
  type RuntimeEdition,
  type RuntimeEdition3D,
  type SupportedResponsiveComposition,
} from '../contracts/index.js';
import {
  createCartridgeMounter,
  createInputController,
  createPhaserGameFactory,
  isPhaserCartridge,
  isThreeCartridge,
  selectRenderer,
  validateCartridge,
  type Cartridge,
  type Game3DInstance,
  type MountedThreeGame,
  type MountOptions,
} from '../factory/index.js';

const manifest = (renderers: ('three' | 'phaser')[]) =>
  validateCartridge3DManifest({
    id: 'potion-rush',
    title: 'Potion Rush',
    description: 'Serve every customer.',
    runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
    inputMode: 'story',
    requiredAssetBindings: [],
    capabilities: [...APK3D_CAPABILITIES],
    renderers,
    simulation: 'realtime',
    orientation: 'portrait',
    levels: ['A0'],
    needs: {},
    requiredModelBindings: [],
    packs: ['heroes'],
    device: {},
    budget: { firstLoadBytes: 1, totalBytes: 1 },
    briefingKey: 'potionRush.briefing',
  });

const briefing = () => ({
  title: 'x',
  objective: 'x',
  instructions: [{ title: 'a', description: 'b' }],
  learningPreview: { heading: 'h' },
  controls: [],
  tip: 't',
});

const cartridge = (
  renderers: ('three' | 'phaser')[],
  parts: Partial<Cartridge> = {},
  without: ('createGame' | 'createGameConfig')[] = [],
): Cartridge => {
  const c: Cartridge = {
    manifest: manifest(renderers),
    strings: {},
    briefing,
    ...(renderers.includes('three') ? { createGame: async () => instance() } : {}),
    ...(renderers.includes('phaser') ? { createGameConfig: () => ({ scene: [] }) } : {}),
    ...parts,
  };
  for (const key of without) delete c[key];
  return c;
};

const instance = (): Game3DInstance => ({
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  resize: vi.fn(),
  recompose: vi.fn(),
  captureResponsiveState: () => 'state',
  restoreResponsiveState: vi.fn(),
  setMuted: vi.fn(),
  destroy: async () => undefined,
  test: { state: () => null, dispatch: vi.fn(), tick: vi.fn() },
});

describe('selectRenderer', () => {
  const both = manifest(['three', 'phaser']);
  const three = manifest(['three']);
  const phaser = manifest(['phaser']);

  it('prefers 3D on a supported device and 2D on a lite or unsupported one', () => {
    expect(selectRenderer(both, { status: 'ok' })).toEqual({ renderer: 'three', reason: 'ok' });
    expect(selectRenderer(both, { status: 'lite' })).toEqual({ renderer: 'phaser', reason: 'lite' });
    expect(selectRenderer(both, { status: 'unsupported' })).toEqual({
      renderer: 'phaser',
      reason: 'unsupported',
    });
  });

  it('a 3D-only cartridge keeps the lite edition and gates an unsupported device', () => {
    expect(selectRenderer(three, { status: 'ok' })).toEqual({ renderer: 'three', reason: 'ok' });
    expect(selectRenderer(three, { status: 'lite' })).toEqual({ renderer: 'three', reason: 'lite' });
    expect(selectRenderer(three, { status: 'unsupported' })).toBeNull();
  });

  it('a 2D-only cartridge plays in 2D everywhere', () => {
    for (const status of ['ok', 'lite', 'unsupported'] as const) {
      expect(selectRenderer(phaser, { status })?.renderer).toBe('phaser');
    }
    expect(selectRenderer(phaser, { status: 'ok' })).toEqual({ renderer: 'phaser', reason: 'only' });
  });

  it('the player setting forces 2D only where the cartridge has it', () => {
    expect(selectRenderer(both, { status: 'ok' }, 'phaser')).toEqual({
      renderer: 'phaser',
      reason: 'forced',
    });
    expect(selectRenderer(three, { status: 'ok' }, 'phaser')).toEqual({ renderer: 'three', reason: 'ok' });
    expect(selectRenderer(three, { status: 'unsupported' }, 'phaser')).toBeNull();
  });
});

describe('validateCartridge', () => {
  it('needs one method per listed renderer and no method without its renderer', () => {
    expect(() => validateCartridge(cartridge(['three', 'phaser']))).not.toThrow();
    expect(() => validateCartridge(cartridge(['three'], {}, ['createGame']))).toThrow(/no createGame/);
    expect(() => validateCartridge(cartridge(['phaser'], {}, ['createGameConfig']))).toThrow(
      /no createGameConfig/,
    );
    expect(() => validateCartridge(cartridge(['three'], { createGameConfig: () => ({}) }))).toThrow(
      /does not list 'phaser'/,
    );
    expect(() => validateCartridge(cartridge(['phaser'], { createGame: async () => instance() }))).toThrow(
      /does not list 'three'/,
    );
    expect(isThreeCartridge(cartridge(['three']))).toBe(true);
    expect(isPhaserCartridge(cartridge(['three']))).toBe(false);
    expect(isPhaserCartridge(cartridge(['phaser']))).toBe(true);
  });
});

// ---------------------------------------------------------------- the Phaser factory (APK copy)

const composition: SupportedResponsiveComposition = {
  supported: true,
  profile: 'compact',
  inputMode: 'touch',
  safeRect: { x: 0, y: 0, width: 390, height: 844 },
  regions: {} as SupportedResponsiveComposition['regions'],
  strategy: 'fixed-mechanic',
  minimumTouchTargetPx: 44,
  diagnostics: [],
};

const edition2d: RuntimeEdition = {
  id: 'standard',
  title: 'Primary Chibi 2D',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  pack: { id: 'forge-heroes', version: '1.0.0', root: '/assets/apk/forge-heroes/', files: {} },
  bindings: {},
  tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 1 },
};

const edition3d: RuntimeEdition3D = {
  id: 'standard',
  title: 'Primary Chibi',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  packs: {},
  bindings: {},
  tuning: { speed: 1, intensity: 1 },
};

const inputController = () => ({
  snapshot: vi.fn(),
  cancelActiveGesture: vi.fn(),
  reset: vi.fn(),
  destroy: vi.fn(),
});

/** The fake Phaser the APK test uses: scene pause/resume, scale, sound, and the render hooks. */
function fakePhaser() {
  let active = true;
  const scene = {
    scene: { pause: vi.fn(() => (active = false)), resume: vi.fn(() => (active = true)) },
    apkCaptureResponsiveState: vi.fn(() => ({ score: 12 })),
    apkRestoreResponsiveState: vi.fn(),
    apkRecompose: vi.fn(),
  };
  const renderer = { preRender: vi.fn(), postRender: vi.fn() };
  const game = {
    destroy: vi.fn(),
    scene: { getScenes: (activeOnly?: boolean) => (activeOnly && !active ? [] : [scene]), render: vi.fn() },
    renderer,
    sound: { mute: false },
    pause: vi.fn(),
    resume: vi.fn(),
    scale: { refresh: vi.fn(), setGameSize: vi.fn() },
  };
  const Game = vi.fn(function MockPhaserGame() {
    return game;
  });
  return {
    game,
    scene,
    renderer,
    Game,
    load: vi.fn(async () => ({ AUTO: 0, Scale: { FIT: 1, CENTER_BOTH: 2 }, Game })),
  };
}

describe('createPhaserGameFactory (APK copy)', () => {
  it('constructs Phaser lazily and adapts scene, sound, scale, and destroy controls', async () => {
    const fake = fakePhaser();
    const factory = createPhaserGameFactory(fake.load);
    const container = {} as HTMLElement;
    const createGameConfig = vi.fn((_context: unknown) => ({ width: 960, height: 540, scene: [] }));
    const cart = cartridge(['phaser'], { createGameConfig });
    const i18n = { t: (k: string) => k, scope: () => i18n } as never;
    const inst = await factory({
      container,
      cartridge: cart as never,
      input: [{ term: 'river', translation: 'riviere' }],
      edition: edition2d,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: inputController(),
      composition,
      sessionMode: 'playing',
      seed: 7,
      i18n,
      options: { helper: true, hero: 'wizard', looks: {} },
    });
    expect(fake.load).toHaveBeenCalledOnce();
    expect(createGameConfig).toHaveBeenCalledOnce();
    // The APK context fields, plus the kit services as optional extras.
    expect(createGameConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        seed: 7,
        sessionMode: 'playing',
        composition,
        i18n,
        options: { helper: true, hero: 'wizard', looks: {} },
      }),
    );
    expect(createGameConfig.mock.calls[0]![0]).not.toHaveProperty('host');
    expect(fake.Game).toHaveBeenCalledWith(
      expect.objectContaining({ parent: container, type: 0, width: 390, height: 844 }),
    );

    inst.pause?.();
    inst.resize?.(390, 844);
    inst.setMuted?.(true);
    const state = inst.captureResponsiveState?.();
    inst.recompose?.(composition);
    expect(fake.renderer.preRender).toHaveBeenCalledOnce();
    expect(fake.game.scene.render).toHaveBeenCalledWith(fake.renderer);
    expect(fake.game.resume).not.toHaveBeenCalled();
    inst.restoreResponsiveState?.(state);
    inst.resume?.();
    await inst.destroy();
    expect(fake.game.pause).toHaveBeenCalledOnce();
    expect(fake.game.resume).toHaveBeenCalledOnce();
    expect(fake.scene.scene.pause).toHaveBeenCalledOnce();
    expect(fake.scene.scene.resume).toHaveBeenCalledOnce();
    expect(fake.game.scale.refresh).toHaveBeenCalledTimes(2);
    expect(fake.game.scale.setGameSize).toHaveBeenCalledWith(390, 844);
    expect(fake.game.sound.mute).toBe(true);
    expect(fake.scene.apkRecompose).toHaveBeenCalledWith(composition);
    expect(fake.scene.apkRestoreResponsiveState).toHaveBeenCalledWith({ score: 12 });
    expect(fake.game.destroy).toHaveBeenCalledWith(true);
  });

  it('waits for the Phaser destroy event before destroy resolves, once', async () => {
    let finish: () => void = () => undefined;
    const destroy = vi.fn();
    const Game = vi.fn(function MockPhaserGame() {
      return { destroy, events: { once: vi.fn((_e: string, l: () => void) => (finish = l)) } };
    });
    const factory = createPhaserGameFactory(async () => ({ AUTO: 0, Game }));
    const inst = await factory({
      container: {} as HTMLElement,
      cartridge: cartridge(['phaser']) as never,
      input: [],
      edition: edition2d,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: inputController(),
      sessionMode: 'playing',
    });
    let done = false;
    const p = Promise.resolve(inst.destroy()).then(() => (done = true));
    expect(inst.destroy()).toBe(inst.destroy());
    await Promise.resolve();
    expect(done).toBe(false);
    finish();
    await p;
    expect(done).toBe(true);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------- the input controller (APK copy)

describe('createInputController (APK copy)', () => {
  /** A fake element and window: listeners by event name. */
  function surface() {
    const listeners = new Map<string, Set<(e: unknown) => void>>();
    const on = (name: string, fn: (e: unknown) => void) =>
      (listeners.get(name) ?? listeners.set(name, new Set()).get(name)!).add(fn);
    const off = (name: string, fn: (e: unknown) => void) => listeners.get(name)?.delete(fn);
    const el = { style: { touchAction: 'auto' }, addEventListener: on, removeEventListener: off };
    const fire = (name: string, event: unknown) => listeners.get(name)?.forEach((fn) => fn(event));
    return { el, fire, count: () => [...listeners.values()].reduce((n, s) => n + s.size, 0) };
  }

  it('snapshots keys and the pointer, clears the queue per snapshot, and tears down', () => {
    const s = surface();
    vi.stubGlobal('window', {
      addEventListener: s.el.addEventListener,
      removeEventListener: s.el.removeEventListener,
    });
    vi.stubGlobal('document', {
      hidden: false,
      addEventListener: s.el.addEventListener,
      removeEventListener: s.el.removeEventListener,
    });
    try {
      const c = createInputController(s.el as unknown as HTMLElement);
      expect(s.el.style.touchAction).toBe('none');
      const key = (code: string, repeat = false) => ({
        code,
        repeat,
        isComposing: false,
        composedPath: () => [],
        preventDefault: vi.fn(),
      });
      s.fire('keydown', key('ArrowLeft'));
      s.fire('keydown', key('KeyA'));
      s.fire('keydown', key('KeyA', true));
      s.fire('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 20 });
      s.fire('pointermove', { pointerId: 1, clientX: 15, clientY: 25 });
      s.fire('pointermove', { pointerId: 2, clientX: 99, clientY: 99 });
      const a = c.snapshot();
      expect(a.keys).toEqual(['ArrowLeft', 'KeyA']);
      expect(a.pressed).toEqual(['ArrowLeft', 'KeyA']);
      expect(a.pointer).toMatchObject({
        down: true,
        id: 1,
        kind: 'touch',
        startX: 10,
        startY: 20,
        x: 15,
        y: 25,
      });
      s.fire('keyup', key('KeyA'));
      s.fire('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 16, clientY: 26 });
      const b = c.snapshot();
      expect(b.keys).toEqual(['ArrowLeft']);
      expect(b.pressed).toEqual([]);
      expect(b.pointer).toMatchObject({
        down: false,
        released: true,
        cancelled: false,
        id: null,
        x: 16,
        y: 26,
      });
      expect(c.snapshot().pointer.released).toBe(false);
      s.fire('pointerdown', { pointerId: 3, pointerType: 'mouse', clientX: 1, clientY: 1 });
      c.cancelActiveGesture();
      expect(c.snapshot().pointer).toMatchObject({ down: false, cancelled: true, id: null });
      c.reset?.();
      expect(c.snapshot().keys).toEqual([]);
      c.destroy();
      expect(s.count()).toBe(0);
      expect(s.el.style.touchAction).toBe('auto');
      expect(c.snapshot().destroyed).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// ---------------------------------------------------------------- the mounter

describe('createCartridgeMounter', () => {
  const base = (): Omit<MountOptions, 'renderer' | 'cartridge'> => ({
    container: {} as HTMLElement,
    stage: {} as never,
    input: [{ term: 'river', translation: 'riviere' }],
    edition3d,
    edition2d,
    seed: 3,
    sessionMode: 'playing',
    composition: { profile: 'compact', safe: { x: 0, y: 0, width: 390, height: 844 } },
    i18n: { t: (k: string) => k, scope: () => ({}) } as never,
    audio: {} as never,
    options: { helper: false, hero: 'knight', looks: {} },
    host: {},
    complete: vi.fn(),
    diagnostic: vi.fn(),
  });

  it("mounts 'three' through the three factory and forwards the lifecycle", async () => {
    const inst = instance();
    const three = vi.fn(async (ctx): Promise<MountedThreeGame> => ({
      instance: inst,
      stage: {} as never,
      ...inst,
      start: () => inst.start(),
      destroy: () => inst.destroy(),
    }));
    void three;
    const mount = createCartridgeMounter({ three: three as never, phaser: vi.fn() as never });
    const opts = base();
    const game = await mount({ ...opts, renderer: 'three', cartridge: cartridge(['three', 'phaser']) });
    expect(game.renderer).toBe('three');
    expect(game.three?.instance).toBe(inst);
    expect(three).toHaveBeenCalledWith(
      expect.objectContaining({ edition: edition3d, seed: 3, i18n: opts.i18n }),
    );
    game.start();
    game.pause();
    game.recompose(opts.composition);
    expect(inst.start).toHaveBeenCalledOnce();
    expect(inst.pause).toHaveBeenCalledOnce();
    expect(inst.recompose).toHaveBeenCalledWith(opts.composition);
    expect(game.captureResponsiveState()).toBe('state');
    await game.destroy();
  });

  it("mounts 'phaser' with an input controller, the 2D edition, and the completion latch", async () => {
    const ic = inputController();
    const phaserInstance = {
      pause: vi.fn(),
      resume: vi.fn(),
      resize: vi.fn(),
      recompose: vi.fn(),
      setMuted: vi.fn(),
      destroy: vi.fn(async () => undefined),
    };
    const phaser = vi.fn(async (_context: unknown) => phaserInstance);
    const mount = createCartridgeMounter({
      three: vi.fn() as never,
      phaser: phaser as never,
      inputController: () => ic,
    });
    const opts = base();
    const game = await mount({ ...opts, renderer: 'phaser', cartridge: cartridge(['three', 'phaser']) });
    expect(game.renderer).toBe('phaser');
    expect(game.phaser).toBe(phaserInstance);
    const ctx = phaser.mock.calls[0]![0] as never as Record<string, unknown>;
    expect(ctx).toMatchObject({
      edition: edition2d,
      seed: 3,
      sessionMode: 'playing',
      inputController: ic,
      options: opts.options,
      i18n: opts.i18n,
    });
    // The standalone composition is not an APK composition: the Phaser path gets none.
    expect(ctx).not.toHaveProperty('composition');
    game.pause();
    expect(ic.reset).toHaveBeenCalledOnce();
    expect(phaserInstance.pause).toHaveBeenCalledOnce();
    game.recompose(opts.composition);
    expect(phaserInstance.recompose).not.toHaveBeenCalled();
    game.recompose(composition);
    expect(phaserInstance.recompose).toHaveBeenCalledWith(composition);
    game.start();
    // Completion: the first call with evidence goes through; a second is a warning; none without evidence.
    const complete = ctx.complete as (r: unknown, o?: string, e?: unknown) => void;
    const result = { accuracy: 1, xp: 1, score: 1, correctAnswers: 1, totalAttempts: 1 };
    const evidence = { kind: 'story-game' };
    complete(result, undefined, undefined);
    expect(opts.complete).not.toHaveBeenCalled();
    expect(opts.diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: 'apk3d/missing-evidence' }));
    complete(result, 'victory', evidence);
    expect(opts.complete).toHaveBeenCalledWith(result, 'victory', evidence);
    complete(result, 'victory', evidence);
    expect(opts.complete).toHaveBeenCalledTimes(1);
    expect(opts.diagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'apk3d/second-completion' }),
    );
    await game.destroy();
    await game.destroy();
    expect(phaserInstance.destroy).toHaveBeenCalledOnce();
    expect(ic.destroy).toHaveBeenCalledOnce();
  });

  it('refuses a renderer the cartridge lacks and destroys the input controller when Phaser fails', async () => {
    const ic = inputController();
    const mount = createCartridgeMounter({
      three: vi.fn() as never,
      phaser: vi.fn(async () => {
        throw new Error('boom');
      }) as never,
      inputController: () => ic,
    });
    await expect(mount({ ...base(), renderer: 'phaser', cartridge: cartridge(['three']) })).rejects.toThrow(
      /no Phaser path/,
    );
    await expect(mount({ ...base(), renderer: 'three', cartridge: cartridge(['phaser']) })).rejects.toThrow(
      /no three.js path/,
    );
    const { edition3d: _e, ...noEdition } = base();
    await expect(mount({ ...noEdition, renderer: 'three', cartridge: cartridge(['three']) })).rejects.toThrow(
      /edition3d/,
    );
    await expect(mount({ ...base(), renderer: 'phaser', cartridge: cartridge(['phaser']) })).rejects.toThrow(
      /boom/,
    );
    expect(ic.destroy).toHaveBeenCalledOnce();
  });
});
