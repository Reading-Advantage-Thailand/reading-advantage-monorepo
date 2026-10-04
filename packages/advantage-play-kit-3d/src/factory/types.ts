/**
 * The cartridge boundary (section 2 and the "Dual renderer" section of docs/apk3d-cartridge.md).
 * A Phaser cartridge in the APK has `createGameConfig`; a 3D cartridge has `createGame`, and the
 * three factory gives it the kit services: stage, HUD, audio, and strings. One cartridge may have
 * both; `manifest.renderers` says which. These types name kit classes, so they live in the
 * factory layer, not in `contracts`.
 */
import type {
  APKDiagnosticInput,
  AssetUrlResolver,
  APKGameInstance,
  APKInputController,
  APKSessionMode,
  Cartridge3DManifest,
  CartridgeGameConfigContext,
  Catalog,
  GameBriefing,
  GameInput,
  GameResults,
  GameTerminalOutcome,
  LayoutRect,
  RendererId,
  RuntimeEdition,
  RuntimeEdition3D,
  ScopedI18n,
  StoryGameEvidence,
  StoryInput,
  SupportedResponsiveComposition,
} from '../contracts/index.js';
import type { AudioBus } from '../audio/bus.js';
import type { HudRoot } from '../hud/root.js';
import type { QualityTierId, Stage3D } from '../stage/stage.js';

/** The standalone host's layout; the APK passes a `SupportedResponsiveComposition`. */
export interface StandaloneComposition {
  profile: 'compact' | 'wide';
  /** The area inside the safe-area insets, in CSS pixels. */
  safe: LayoutRect;
}

export type Composition3D = SupportedResponsiveComposition | StandaloneComposition;

/**
 * Host controls a game may call from its own HUD. In the APK the host page draws its own mute
 * and story controls (and `APKHostAdapter.navigate` opens the story), so a game hides a button
 * when the service is absent.
 */
export interface HostServices {
  /** Opens the story over the game at a paragraph (look back); the host pauses the game meanwhile. */
  openStory?(paragraph?: number): void;
  /** Toggles the page sound; returns true when it is now muted. */
  toggleMute?(): boolean;
}

/** Choices the student made before the game (the APK maps Helper mode to difficulty 'easy'). */
export interface SessionOptions {
  helper: boolean;
  /** The hero the student chose ('knight', 'wizard', 'cleric'); games that show one hero use it. */
  hero: string;
  /** Hero id to the color preset the student unlocked (cosmetic; the APK reads it from the profile). */
  looks: Readonly<Record<string, string>>;
}

/** What a 3D game receives from the factory. */
export interface Game3DContext {
  stage: Stage3D;
  hud: HudRoot;
  audio: AudioBus;
  /** Strings scoped to the game's catalog key (`manifest.briefingKey`'s first segment). */
  i18n: ScopedI18n;
  input: GameInput | StoryInput;
  edition: RuntimeEdition3D;
  seed: number;
  sessionMode: APKSessionMode;
  composition: Composition3D;
  options: SessionOptions;
  host: HostServices;
  /** Once per mount; later calls become a `warning` diagnostic (the APK completion latch). */
  complete(result: GameResults, outcome: GameTerminalOutcome, evidence: StoryGameEvidence): void;
  diagnostic(event: APKDiagnosticInput): void;
}

export interface Game3DInstance {
  /** After the briefing's Start tap (audio is unlocked by then). */
  start(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number): void;
  recompose(composition: Composition3D): void;
  captureResponsiveState(): unknown;
  restoreResponsiveState(state: unknown): void;
  setMuted(muted: boolean): void;
  destroy(): Promise<void>;
  /** Test hook: the QC driver and the tutorial driver use it; production hosts do not. */
  readonly test: {
    state(): unknown;
    dispatch(command: unknown): void;
    tick(steps: number): void;
    /** QC only: plays one correct move if there is one (a real-time game's bot); true when it moved. */
    auto?(): boolean;
  };
}

/**
 * What a 2D (Phaser) game receives: exactly the APK `CartridgeGameConfigContext`, plus three
 * optional kit services the APK factory never sets. A view falls back when they are absent: its
 * own `strings.en.ts` for `i18n`, `SESSION_OPTIONS_DEFAULT` for `options`, no host buttons.
 * `complete` takes the evidence as a third argument; the APK port adds that parameter.
 */
export interface Game2DContext extends Omit<CartridgeGameConfigContext, 'input' | 'complete'> {
  /** The APK `GameInput`, or the whole story for `inputMode: 'story'` (the port adds it to `GameInput`). */
  input: GameInput | StoryInput;
  complete: (result: unknown, outcome?: GameTerminalOutcome, evidence?: StoryGameEvidence) => void;
  i18n?: ScopedI18n;
  options?: SessionOptions;
  host?: HostServices;
  /** The page's audio bus (standalone host); a 2D view makes its own when the APK gives none. */
  audio?: AudioBus;
  /** Where pack files load from; pass it to `preloadAssetBindings`. None in the APK. */
  resolveUrl?: AssetUrlResolver;
}

/** The `options` a 2D view uses when the APK factory mounts it (no hero choice, no helper). */
export const SESSION_OPTIONS_DEFAULT: SessionOptions = { helper: false, hero: 'knight', looks: {} };

/**
 * One cartridge, one or two renderers. `manifest.renderers` lists the renderers; each listed
 * renderer has its method (`validateCartridge` checks it).
 */
export interface Cartridge {
  manifest: Cartridge3DManifest;
  /** The game's English catalog (merged by the host). */
  strings: Catalog;
  /** The start screen, from the game's catalog scope (the APK briefing contract). */
  briefing(i18n: ScopedI18n, input: GameInput | StoryInput): GameBriefing;
  /** The three.js path ('three'). */
  createGame?(context: Game3DContext): Promise<Game3DInstance>;
  /** The Phaser path ('phaser'): the APK `RuntimeCartridge.createGameConfig` shape. */
  createGameConfig?(context: Game2DContext): Readonly<Record<string, unknown>>;
}

/** A cartridge with the three.js path. */
export type ThreeCartridge = Cartridge & Required<Pick<Cartridge, 'createGame'>>;

/** A cartridge with the Phaser path. */
export type PhaserCartridge = Cartridge & Required<Pick<Cartridge, 'createGameConfig'>>;

// ---------------------------------------------------------------- the APK boundary

/**
 * The APK's `APKGameInstance` (advantage-play-kit/src/runtime/types.ts, monorepo fe6aedc2b),
 * with `start` added for the standalone host: the APK starts a game when it mounts it.
 */
export interface MountedThreeGame {
  pause(): void;
  resume(): void;
  resize(width: number, height: number): void;
  captureResponsiveState(): unknown;
  restoreResponsiveState(state: unknown): void;
  recompose(composition: Composition3D): void;
  setMuted(muted: boolean): void;
  destroy(): Promise<void>;
  start(): void;
  readonly instance: Game3DInstance;
  readonly stage: Stage3D;
}

/** The device check result the factory needs (the kit gate returns more). */
export interface GateVerdict {
  status: 'ok' | 'lite' | 'unsupported';
  reason?: string;
  tier: QualityTierId;
}

/**
 * The APK's `GameFactoryContext` for a 3D cartridge. `i18n` and `audio` are page services that
 * the standalone host passes; in the APK the factory makes them from the host's locale and mute.
 */
export interface ThreeFactoryContext {
  container: HTMLElement;
  /** Ignored by the three factory; present so one options object serves both renderers. */
  edition2d?: RuntimeEdition;
  /**
   * The page's stage, when the host keeps one renderer for the whole page (the standalone host
   * does: phones limit WebGL contexts). The factory then draws into it, clears it on destroy, and
   * never disposes it. Without it, the factory makes its own canvas in `container`.
   */
  stage?: Stage3D;
  cartridge: ThreeCartridge;
  input: GameInput | StoryInput;
  edition: RuntimeEdition3D;
  seed: number;
  sessionMode: APKSessionMode;
  composition: Composition3D;
  i18n: ScopedI18n;
  audio: AudioBus;
  options: SessionOptions;
  host: HostServices;
  complete(result: GameResults, outcome: GameTerminalOutcome, evidence: StoryGameEvidence): void;
  diagnostic(event: APKDiagnosticInput): void;
}

/**
 * The APK `GameFactoryContext` for a Phaser cartridge, with the kit services the standalone host
 * passes (`i18n`, `options`, `host`); the factory hands them to `createGameConfig` as the optional
 * `Game2DContext` fields.
 */
export interface PhaserFactoryContext {
  container: HTMLElement;
  cartridge: PhaserCartridge;
  input: GameInput | StoryInput;
  edition: RuntimeEdition;
  complete(result: unknown, outcome?: GameTerminalOutcome, evidence?: StoryGameEvidence): void;
  diagnostic(event: APKDiagnosticInput): void;
  inputController: APKInputController;
  sessionMode: APKSessionMode;
  composition?: SupportedResponsiveComposition;
  seed?: number;
  listening?: unknown;
  answerAudio?: unknown;
  i18n?: ScopedI18n;
  options?: SessionOptions;
  host?: HostServices;
  /** The page's audio bus (standalone host); the APK factory sets none. */
  audio?: AudioBus;
  /** Where pack files load from (standalone host); none: `<pack.root>/<file.path>`, as the APK. */
  resolveUrl?: AssetUrlResolver;
}

/** The Phaser game factory the kit copies from the APK. */
export type PhaserGameFactory = (context: PhaserFactoryContext) => Promise<APKGameInstance>;

/** One mounted game of either renderer: the APK lifecycle plus `start` and the renderer id. */
export interface MountedGame {
  readonly renderer: RendererId;
  start(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number): void;
  captureResponsiveState(): unknown;
  restoreResponsiveState(state: unknown): void;
  recompose(composition: Composition3D): void;
  setMuted(muted: boolean): void;
  destroy(): Promise<void>;
  /** The 3D game, when the renderer is 'three' (the QC driver reads `instance.test`). */
  readonly three?: MountedThreeGame;
  /** The Phaser instance, when the renderer is 'phaser'. */
  readonly phaser?: APKGameInstance;
}
