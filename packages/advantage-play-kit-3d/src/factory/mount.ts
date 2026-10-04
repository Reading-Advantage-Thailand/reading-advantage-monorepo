/**
 * One call to mount a cartridge in either renderer: the host passes the choice from
 * `selectRenderer` and the same services for both, and gets a `MountedGame` back. In the APK
 * this is `mountCartridge(options, selectGameFactory(renderer))`; here the two factories are
 * given once (`createCartridgeMounter`) and the mounter branches on the renderer.
 */
import type {
  AssetUrlResolver,
  RendererId,
  RuntimeEdition,
  RuntimeEdition3D,
  StoryGameEvidence,
  GameResults,
  GameTerminalOutcome,
} from '../contracts/index.js';
import type { Stage3D } from '../stage/index.js';
import { createInputController } from './input.js';
import { isPhaserCartridge, isThreeCartridge } from './select.js';
import type {
  Cartridge,
  MountedGame,
  MountedThreeGame,
  PhaserGameFactory,
  ThreeFactoryContext,
} from './types.js';

/** The three factory as `createThreeGameFactory` returns it. */
export type ThreeGameFactory = (context: ThreeFactoryContext) => Promise<MountedThreeGame>;

export interface CartridgeMounterFactories {
  three: ThreeGameFactory;
  phaser: PhaserGameFactory;
  /** Makes the input controller of a Phaser mount; the default is the APK copy. */
  inputController?: (surface: HTMLElement) => ReturnType<typeof createInputController>;
}

/** What the host passes for one mount: the three-factory context plus the 2D edition. */
export interface MountOptions extends Omit<
  ThreeFactoryContext,
  'cartridge' | 'edition' | 'edition2d' | 'complete' | 'stage'
> {
  renderer: RendererId;
  /** The 3D stage; required for 'three' (a device without WebGL2 has none). */
  stage?: Stage3D;
  cartridge: Cartridge;
  /** The 3D edition (model packs); required for 'three'. */
  edition3d?: RuntimeEdition3D;
  /** The 2D edition (sprite packs); required for 'phaser'. */
  edition2d?: RuntimeEdition;
  /** Where the 2D pack files load from (the site's base path); none: the pack root. */
  resolveUrl?: AssetUrlResolver;
  complete(result: GameResults, outcome: GameTerminalOutcome, evidence: StoryGameEvidence): void;
}

/**
 * Returns `mount(options)`: for 'three' it calls the three factory as before; for 'phaser' it
 * makes the APK input controller on the container, calls the Phaser factory, and maps the
 * `APKGameInstance` onto `MountedGame` (`start` is a no-op: a Phaser game runs from creation).
 */
export function createCartridgeMounter(
  factories: CartridgeMounterFactories,
): (options: MountOptions) => Promise<MountedGame> {
  const mountOne = async (options: MountOptions): Promise<MountedGame> => {
    const { renderer, cartridge, edition3d, edition2d, complete, stage, ...rest } = options;
    if (renderer === 'three') {
      if (!isThreeCartridge(cartridge))
        throw new Error(`Cartridge ${cartridge.manifest.id} has no three.js path`);
      if (!edition3d) throw new Error(`Mounting ${cartridge.manifest.id} in 3D needs edition3d`);
      if (!stage) throw new Error(`Mounting ${cartridge.manifest.id} in 3D needs a stage`);
      const three = await factories.three({ ...rest, stage, cartridge, edition: edition3d, complete });
      return {
        renderer,
        three,
        start: () => three.start(),
        pause: () => three.pause(),
        resume: () => three.resume(),
        resize: (w, h) => three.resize(w, h),
        captureResponsiveState: () => three.captureResponsiveState(),
        restoreResponsiveState: (s) => three.restoreResponsiveState(s),
        recompose: (c) => three.recompose(c),
        setMuted: (m) => three.setMuted(m),
        destroy: () => three.destroy(),
      };
    }
    if (!isPhaserCartridge(cartridge))
      throw new Error(`Cartridge ${cartridge.manifest.id} has no Phaser path`);
    if (!edition2d) throw new Error(`Mounting ${cartridge.manifest.id} in 2D needs edition2d`);
    const inputController = (factories.inputController ?? createInputController)(rest.container);
    let completed = false;
    let phaser;
    try {
      phaser = await factories.phaser({
        container: rest.container,
        cartridge,
        input: rest.input,
        edition: edition2d,
        inputController,
        sessionMode: rest.sessionMode,
        seed: rest.seed,
        ...('supported' in rest.composition ? { composition: rest.composition } : {}),
        i18n: rest.i18n,
        options: rest.options,
        host: rest.host,
        audio: rest.audio,
        ...(rest.resolveUrl ? { resolveUrl: rest.resolveUrl } : {}),
        diagnostic: rest.diagnostic,
        // The kit completion latch (the APK `single-completion-emission` behavior), as in the three factory.
        complete: (result, outcome = 'complete', evidence) => {
          if (completed) {
            rest.diagnostic({
              level: 'warning',
              code: 'apk3d/second-completion',
              message: 'The game completed more than once; the later result is ignored.',
            });
            return;
          }
          if (!evidence) {
            rest.diagnostic({
              level: 'error',
              code: 'apk3d/missing-evidence',
              message: 'The game completed without story evidence; the result is ignored.',
            });
            return;
          }
          completed = true;
          complete(result as GameResults, outcome, evidence);
        },
      });
    } catch (err) {
      inputController.destroy();
      throw err;
    }
    let destroyed = false;
    const composition2d = (c: MountOptions['composition']) => ('supported' in c ? c : undefined);
    return {
      renderer,
      phaser,
      start: () => undefined,
      pause: () => {
        inputController.reset?.();
        phaser.pause?.();
      },
      resume: () => phaser.resume?.(),
      resize: (w, h) => phaser.resize?.(w, h),
      captureResponsiveState: () => phaser.captureResponsiveState?.(),
      restoreResponsiveState: (s) => phaser.restoreResponsiveState?.(s),
      recompose: (c) => {
        const full = composition2d(c);
        if (full) phaser.recompose?.(full);
      },
      setMuted: (m) => phaser.setMuted?.(m),
      destroy: async () => {
        if (destroyed) return;
        destroyed = true;
        try {
          await phaser.destroy();
        } finally {
          inputController.destroy();
        }
      },
    };
  };
  return async (options) => {
    const game = await mountOne(options);
    return options.cartridge.manifest.orientation === 'portrait' ? guardOrientation(options.container, game) : game;
  };
}

/** A phone on its side: too short for a game whose manifest says portrait. */
const SHORT_LANDSCAPE = '(orientation: landscape) and (max-height: 500px)';

/**
 * A portrait game on a short landscape screen (a phone on its side) has no room for its layout:
 * a cover shows a phone and a turn arrow (no words, so it needs no strings), and the game pauses
 * until the student turns the device. A tablet or a computer in landscape is not short.
 */
export function guardOrientation(container: HTMLElement, game: MountedGame): MountedGame {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return game;
  const query = window.matchMedia(SHORT_LANDSCAPE);
  const cover = document.createElement('div');
  cover.className = 'apk3d-turn';
  cover.setAttribute('aria-hidden', 'true');
  cover.style.cssText =
    'position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(18,26,44,0.94);color:#fff;font-size:64px;line-height:1;touch-action:none';
  cover.innerHTML = '<span style="display:inline-block;transform:rotate(-90deg)">📱</span><span style="font-size:44px">↻</span>';
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.append(cover);
  // Only a pause the cover made is resumed (the host may pause the game for its own reasons).
  let paused = false;
  const apply = (): void => {
    cover.style.display = query.matches ? 'flex' : 'none';
    if (query.matches && !paused) {
      paused = true;
      game.pause();
    } else if (!query.matches && paused) {
      paused = false;
      game.resume();
    }
  };
  apply();
  query.addEventListener('change', apply);
  return {
    ...game,
    pause: () => {
      paused = false;
      game.pause();
    },
    resume: () => {
      if (!query.matches) game.resume();
      else paused = true;
    },
    destroy: async () => {
      query.removeEventListener('change', apply);
      cover.remove();
      await game.destroy();
    },
  };
}
