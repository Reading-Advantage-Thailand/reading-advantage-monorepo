/**
 * Plays one story game in a page element: briefing, the game (3D or 2D by device and setting),
 * then the results. It is the app-side counterpart of the standalone demo host, without the
 * lobby, the selector, or the simulated class boss: the app owns the input and persistence.
 *
 * The caller passes the cartridge (loaded), the practice input (in Primary Advantage the
 * student's saved words and sentences), the base URL that serves `packs/` and `assets/apk/`, and
 * gets `onComplete` once per run with the APK completion triple.
 */
import { AudioBus, installAudioUnlock } from '../audio/index.js';
import {
  assetPackSchema,
  CARTRIDGE_3D_RUNTIME_API_VERSION,
  modelEditionOf,
  spritePackRoot,
  validateEdition,
  type AssetPackManifest,
  type Cartridge3DManifest,
  type GameInput,
  type GameResults,
  type Catalog,
  type GameTerminalOutcome,
  type RuntimeEdition,
  type RuntimeEdition3D,
  type PracticeInput,
  type StoryGameEvidence,
} from '../contracts/index.js';
import type { LaunchAvatar } from '../contracts/avatar.js';
import { checkDevice } from '../device/gate.js';
import type { SessionOptions } from '../factory/types.js';
import {
  createCartridgeMounter,
  createPhaserGameFactory,
  createThreeGameFactory,
  savedRendererSetting,
  selectRenderer,
  type Cartridge,
  type Composition3D,
  type MountedGame,
  type RendererSetting,
} from '../factory/index.js';
import { installCss } from '../hud/css.js';
import { createI18n } from '../i18n/catalog.js';
import { Stage3D } from '../stage/index.js';
import { fetchModelPack } from '../stage/loader.js';
import { sheetBindings } from '../view2d/sheets.js';
import { renderBriefing } from './briefing.js';
import hostCss from './host.css.js';
import themeCss from '../hud/theme.css.js';
import { renderGate } from './gate-screen.js';
import { renderResults } from './results.js';

/** The one 2D sprite pack every game's 2D edition binds from. */
export const PACK_2D = 'primary-chibi-2d';

export interface StoryGameOptions {
  /** The element the host draws into (cleared first). */
  container: HTMLElement;
  cartridge: Cartridge;
  /** The icon shown on the briefing. */
  icon?: string;
  /**
   * The items the game uses: the student's saved words and sentences (or a story's), or the APK
   * array of a class challenge's content (the manifest's `inputMode`).
   */
  input: PracticeInput | GameInput;
  /** The run seed; absent: a new random seed per run. A class challenge passes the server's seed. */
  seed?: number;
  /** URL prefix that serves `packs/` and `assets/apk/` (ends with a slash). */
  assetBase: string;
  /** `'phaser'` forces the 2D view; `'auto'` picks by device. Absent: the student's saved "2D mode
   *  (older phones)" choice, shared with the RPG pages (`savedRendererSetting`), else by device. */
  setting?: RendererSetting;
  hero?: string;
  /** Helper mode (easier: highlights the right answer). Off by default. */
  helper?: boolean;
  /** Hero id to the color preset the student unlocked. */
  looks?: Readonly<Record<string, string>>;
  /** The student's avatar (docs/avatar-system.md, section 11); null or absent means the `hero`. The host passes it, a game never fetches it. */
  avatar?: LaunchAvatar | null;
  /** The host's own catalog (briefing, results, gate text) and any extra catalogs. */
  catalogs: readonly Catalog[];
  /** Skip the briefing and start at once. */
  skipBriefing?: boolean;
  /** Offer "play again" on the results (default true). A class challenge run is one run. */
  replay?: boolean;
  onComplete(result: GameResults, outcome: GameTerminalOutcome, evidence: StoryGameEvidence): void;
  onExit(): void;
  onDiagnostic?(event: unknown): void;
  /** The screen the host shows: the app places its own panels (rewards, notices) around it. */
  onPhase?(phase: StoryGamePhase): void;
}

/** The screens of a run, in order; "again" returns to playing. */
export type StoryGamePhase = 'briefing' | 'playing' | 'results';

export interface StoryGameSession {
  readonly diagnostics: readonly unknown[];
  /** The mounted game, once started. */
  mounted(): MountedGame | null;
  destroy(): Promise<void>;
}

const randomSeed = (): number => (Math.random() * 0x7fffffff) >>> 0;

/** The input id the results name: the practice or story input's own id, or the APK input's mode. */
export const inputIdOf = (input: PracticeInput | GameInput, manifest: Pick<Cartridge3DManifest, 'inputMode'>): string =>
  Array.isArray(input) ? manifest.inputMode : input.id;

/** The session options a game receives: helper mode, the hero, the looks, and the avatar when the student has one. */
export function sessionOptionsOf(options: Pick<StoryGameOptions, 'helper' | 'hero' | 'looks' | 'avatar'>): SessionOptions {
  return { helper: options.helper ?? false, hero: options.hero ?? 'knight', looks: { ...(options.looks ?? {}) }, ...(options.avatar ? { avatar: options.avatar } : {}) };
}

async function edition2dOf(assetBase: string, cartridge: Cartridge): Promise<RuntimeEdition> {
  const res = await fetch(`${assetBase}${spritePackRoot(PACK_2D).slice(1)}/pack.json`);
  if (!res.ok) throw new Error(`pack ${PACK_2D}: HTTP ${res.status}`);
  const pack = assetPackSchema.parse(await res.json()) as AssetPackManifest;
  const required = cartridge.manifest.requiredAssetBindings;
  const edition = { id: 'standard', title: 'Primary Chibi 2D', runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION, pack, bindings: sheetBindings(pack, required), tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 1 } };
  return validateEdition(edition, required, CARTRIDGE_3D_RUNTIME_API_VERSION);
}

async function edition3dOf(assetBase: string, cartridge: Cartridge): Promise<RuntimeEdition3D> {
  const packs = Object.fromEntries(await Promise.all(cartridge.manifest.packs.map(async (id) => [id, await fetchModelPack(assetBase, id)] as const)));
  return modelEditionOf(packs, cartridge.manifest.requiredModelBindings);
}

export function startStoryGame(options: StoryGameOptions): StoryGameSession {
  const { container, cartridge, input, assetBase } = options;
  const diagnostics: unknown[] = [];
  const report = (event: unknown): void => {
    diagnostics.push(event);
    options.onDiagnostic?.(event);
  };
  installCss('apk3d-theme', themeCss);
  installCss('apk3d-story-host', hostCss);
  const i18n = createI18n([...options.catalogs, cartridge.strings], { onMissing: (key) => report({ level: 'warning', code: 'apk3d/i18n-missing-key', message: key }) });
  const t = i18n.t;
  const audio = new AudioBus();
  const stopUnlock = installAudioUnlock(audio);
  const mount = createCartridgeMounter({ three: createThreeGameFactory({ base: assetBase, gate: () => checkDevice() }), phaser: createPhaserGameFactory() });
  const compact = window.matchMedia('(orientation: portrait), (max-width: 699px)');
  const composition = (): Composition3D => ({ profile: compact.matches ? 'compact' : 'wide', safe: { x: 0, y: 0, width: container.clientWidth || innerWidth, height: container.clientHeight || innerHeight } });
  const onCompose = (): void => mounted?.recompose(composition());
  compact.addEventListener('change', onCompose);

  container.innerHTML = '';
  container.classList.add('apk3d-story-host');
  const screen = document.createElement('div');
  screen.className = 'apk3d-screen';
  const gameEl = document.createElement('div');
  gameEl.className = 'apk3d-play';
  container.append(screen, gameEl);

  let mounted: MountedGame | null = null;
  /** The 3D stage of the run in progress; the host owns it and disposes it with the game. */
  let stage: Stage3D | null = null;
  let destroyed = false;
  let starting = false;

  const show = (): void => {
    gameEl.classList.remove('on');
    screen.classList.add('on');
  };

  async function start(): Promise<void> {
    if (starting || destroyed) return;
    starting = true;
    try {
      const verdict = checkDevice({ requirements: cartridge.manifest.device });
      const pick = selectRenderer(cartridge.manifest, verdict, options.setting ?? savedRendererSetting());
      if (!pick) {
        renderGate(screen, verdict.status === 'unsupported' ? verdict.reason : undefined, t);
        screen.querySelector('[data-back]')?.addEventListener('click', () => options.onExit());
        show();
        return;
      }
      const [edition2d, edition3d] = await Promise.all([
        pick.renderer === 'phaser' ? edition2dOf(assetBase, cartridge) : Promise.resolve(undefined),
        edition3dOf(assetBase, cartridge).catch((err: unknown): RuntimeEdition3D => {
          report({ level: 'error', code: 'apk3d/edition-3d', message: String(err) });
          return { id: 'standard', title: 'Primary Chibi', runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION, packs: {}, bindings: {}, tuning: { speed: 1, intensity: 1 } };
        }),
      ]);
      if (destroyed) return;
      screen.classList.remove('on');
      gameEl.innerHTML = '';
      gameEl.classList.add('on');
      const run = { game: cartridge.manifest.id, input: inputIdOf(input, cartridge.manifest) };
      if (pick.renderer === 'three') {
        const canvas = document.createElement('canvas');
        canvas.className = 'apk3d-canvas';
        gameEl.append(canvas);
        stage = new Stage3D(canvas, { base: assetBase, tier: verdict.status === 'lite' ? 'low' : verdict.tier });
      }
      mounted = await mount({
        renderer: pick.renderer,
        container: gameEl,
        ...(stage ? { stage } : {}),
        cartridge,
        input,
        edition3d,
        ...(edition2d ? { edition2d, resolveUrl: (pack: AssetPackManifest, file: { path: string }) => `${assetBase}${pack.root.slice(1)}/${file.path}` } : {}),
        seed: options.seed ?? randomSeed(),
        sessionMode: 'playing',
        composition: composition(),
        i18n: i18n.scope(cartridge.manifest.briefingKey.split('.')[0]!),
        audio,
        options: sessionOptionsOf(options),
        host: {
          toggleMute: () => {
            audio.setMuted(!audio.muted);
            mounted?.setMuted(audio.muted);
            return audio.muted;
          },
        },
        complete: (result, outcome, evidence) => {
          options.onComplete(result, outcome, evidence);
          renderResults(screen, { ...run, result, evidence }, t);
          if (options.replay === false) screen.querySelector('[data-again]')?.remove();
          else screen.querySelector('[data-again]')?.addEventListener('click', () => void again());
          screen.querySelector('[data-done]')?.addEventListener('click', () => options.onExit());
          void stopGame().then(show).then(() => options.onPhase?.('results'));
        },
        diagnostic: report,
      });
      mounted.start();
      options.onPhase?.('playing');
    } catch (err) {
      report({ level: 'error', code: 'apk3d/start-failed', message: String(err) });
      renderGate(screen, undefined, t);
      screen.querySelector('[data-back]')?.addEventListener('click', () => options.onExit());
      show();
    } finally {
      starting = false;
    }
  }

  async function stopGame(): Promise<void> {
    const current = mounted;
    mounted = null;
    if (current) await current.destroy().catch((err: unknown) => report({ level: 'warning', code: 'apk3d/destroy-failed', message: String(err) }));
    stage?.dispose();
    stage = null;
    gameEl.innerHTML = '';
  }

  async function again(): Promise<void> {
    await stopGame();
    await start();
  }

  const showBriefing = (): void => {
    const b = cartridge.briefing(i18n.scope(cartridge.manifest.briefingKey.split('.')[0]!), input);
    renderBriefing(screen, b, input, cartridge.manifest, options.icon ?? '🎮', t);
    screen.classList.add('on');
    screen.querySelector('[data-back]')?.addEventListener('click', () => options.onExit());
    screen.querySelector('[data-start]')?.addEventListener('click', () => void start());
    options.onPhase?.('briefing');
  };

  if (options.skipBriefing) void start();
  else showBriefing();

  return {
    diagnostics,
    mounted: () => mounted,
    async destroy() {
      destroyed = true;
      compact.removeEventListener('change', onCompose);
      stopUnlock();
      await stopGame();
      container.innerHTML = '';
      container.classList.remove('apk3d-story-host');
    },
  };
}
