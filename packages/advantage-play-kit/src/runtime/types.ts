import type {
  GameResults,
  SentenceInput,
  VocabularyInput,
} from "@reading-advantage/game-contracts";

import type { APKInputController } from "./input.js";
import type {
  ResponsiveInputMode,
  ResponsiveLayoutConfig,
  SafeAreaInsets,
  SupportedResponsiveComposition,
} from "../responsive/responsive-composition.js";

/** Current browser runtime contract understood by the APK package. */
export const APK_RUNTIME_API_VERSION = "1.0.0";

/** Canonical learning content accepted by a cartridge launch. */
export type GameInput = VocabularyInput | SentenceInput;

/** Provenance attached to every edition asset. */
export interface AssetProvenance {
  /** Original source or generation workflow. */
  source: string;
  /** SPDX identifier or documented project license label. */
  license: string;
  /** Optional original creator or vendor. */
  creator?: string;
  /** Optional upstream source URL. */
  sourceUrl?: string;
}

/** Physical file kinds admitted by a production APK asset pack. */
export type PhysicalAssetKind =
  | "image"
  | "spritesheet"
  | "wang-tileset"
  | "nine-slice"
  | "parallax"
  | "audio";

/** Camera or projection context in which an asset is valid. */
export type AssetView = "top-down" | "side-scroll" | "isometric" | "world" | "screen" | "ui";

/** Exact rectangular frame grid encoded in a physical raster. */
export interface FrameGrid {
  /** Width of one frame in pixels. */
  frameWidth: number;
  /** Height of one frame in pixels. */
  frameHeight: number;
  /** Number of frame columns. */
  columns: number;
  /** Number of frame rows. */
  rows: number;
  /** Total addressable frames. */
  frameCount: number;
}

/** One named animation over frame indices in a physical sheet. */
export interface AssetAnimation {
  /** Stable animation name within the physical file. */
  name: string;
  /** Ordered zero-based frames. */
  frames: readonly number[];
  /** Playback speed in frames per second. */
  frameRate: number;
  /** Phaser repeat count; -1 loops indefinitely. */
  repeat: number;
  /** Whether playback reverses through the frame sequence before repeating. */
  yoyo?: boolean;
}

/** Normalized sprite origin within one frame. */
export interface AssetOrigin {
  /** Horizontal origin from zero through one. */
  x: number;
  /** Vertical origin from zero through one. */
  y: number;
}

/** Arcade-physics body shared by paired theme sprites. */
export interface AssetCollisionBox {
  /** Body width in source-frame pixels. */
  width: number;
  /** Body height in source-frame pixels. */
  height: number;
  /** Horizontal body offset in source-frame pixels. */
  offsetX: number;
  /** Vertical body offset in source-frame pixels. */
  offsetY: number;
}

/** Insets used to stretch a UI raster without distorting its border. */
export interface NineSliceInsets {
  /** Left fixed border in pixels. */
  left: number;
  /** Right fixed border in pixels. */
  right: number;
  /** Top fixed border in pixels. */
  top: number;
  /** Bottom fixed border in pixels. */
  bottom: number;
}

/** One immutable physical file in a versioned audience pack. */
export interface PhysicalAssetFile {
  /** Stable file identifier shared by both audience packs. */
  id: string;
  /** Safe relative path beneath the pack root. */
  path: string;
  /** Loader and structural category. */
  kind: PhysicalAssetKind;
  /** Projection context for the art. */
  view: AssetView;
  /** Encoded width in pixels. */
  width: number;
  /** Encoded height in pixels. */
  height: number;
  /** Lowercase encoded format. */
  format: "png" | "ogg" | "webm";
  /** Whether the raster contains a real alpha channel. */
  alpha: boolean;
  /** Encoded transfer size. */
  byteSize: number;
  /** Lowercase SHA-256 digest of the encoded file. */
  sha256: string;
  /** Optional exact frame grid. */
  grid?: FrameGrid;
  /** Named animations addressable within the grid. */
  animations?: Readonly<Record<string, AssetAnimation>>;
  /** Sprite origin when the file represents a positioned actor. */
  origin?: AssetOrigin;
  /** Physics body when the file represents a collidable actor. */
  collision?: AssetCollisionBox;
  /** Wang bitmask-to-frame mapping for a 16-frame autotile. */
  wangFrames?: readonly number[];
  /** Stretch-safe UI borders. */
  nineSlice?: NineSliceInsets;
  /** Source and license evidence. */
  provenance: AssetProvenance;
}

/** A complete immutable physical asset pack for one audience. */
export interface AssetPackManifest {
  /** Stable pack identifier. */
  id: string;
  /** Semantic version of the pack. */
  version: string;
  /** Browser URL prefix containing all files. */
  root: string;
  /** Physical files keyed by stable file identifier. */
  files: Readonly<Record<string, PhysicalAssetFile>>;
}

/** Runtime presentation operation selected by a semantic binding. */
export type SemanticAssetUsage = "image" | "frame" | "animation" | "tileset" | "nine-slice";

/** One gameplay role bound to a physical file, frame, or animation. */
export interface SemanticAssetBinding {
  /** Stable gameplay-facing semantic key. */
  key: string;
  /** Physical file identifier in the owning pack. */
  file: string;
  /** How the runtime consumes the physical file. */
  usage: SemanticAssetUsage;
  /** Required projection context. */
  view: AssetView;
  /** Named animation for animation bindings. */
  animation?: string;
  /** Zero-based frame for static-frame bindings. */
  frame?: number;
}

/** Audience-safe tuning knobs that do not alter educational I/O. */
export interface AudienceTuning {
  /** Relative gameplay speed. */
  speed: number;
  /** Relative visual target scale. */
  targetScale: number;
  /** Relative collision-body generosity. */
  collisionScale: number;
  /** Audiovisual intensity from zero through one. */
  intensity: number;
  /** Optional cartridge-specific bounded values. */
  custom?: Readonly<Record<string, number>>;
}

/** Complete physical-asset and tuning edition selected by a host. */
export interface RuntimeEdition {
  /** Stable edition identifier. */
  id: string;
  /** Human-readable edition title. */
  title: string;
  /** APK runtime API version required by this edition. */
  runtimeApiVersion: string;
  /** Versioned physical source pack. */
  pack: AssetPackManifest;
  /** Gameplay roles mapped to physical files and frames. */
  bindings: Readonly<Record<string, SemanticAssetBinding>>;
  /** Audience-specific presentation and game-feel tuning. */
  tuning: AudienceTuning;
}

/** Browser-safe cartridge metadata used by hosts and diagnostics. */
export interface RuntimeCartridgeManifest {
  /** Stable cartridge identifier. */
  id: string;
  /** Human-readable cartridge title. */
  title: string;
  /** Short catalog description of the mechanic. */
  description: string;
  /** Independently releasable cartridge version. */
  version: string;
  /** APK runtime API version required by the cartridge. */
  runtimeApiVersion: string;
  /** Educational input mode. */
  inputMode: "vocabulary" | "sentence";
  /** Semantic bindings that every edition must provide. */
  requiredAssetBindings: readonly string[];
  /** Phaser capability families exercised by the cartridge. */
  capabilities: readonly string[];
}

/** Diagnostic input accepted before the runtime assigns a timestamp. */
export type APKDiagnosticInput = Omit<APKDiagnosticEvent, "timestamp"> & {
  /** Optional deterministic timestamp supplied by tests or replay tooling. */
  timestamp?: number;
};

/** Context supplied while a cartridge creates its Phaser configuration. */
export interface CartridgeGameConfigContext {
  /** Validated educational array. */
  input: GameInput;
  /** Validated audience edition. */
  edition: RuntimeEdition;
  /** Fire-once validated completion callback. */
  complete: (result: unknown) => void;
  /** Runtime diagnostics callback. */
  diagnostic: (event: APKDiagnosticInput) => void;
  /** Normalized live browser input. */
  inputController: APKInputController;
  /** Initial responsive composition when the host enables responsive runtime ownership. */
  composition?: SupportedResponsiveComposition;
  /** Optional deterministic session seed. */
  seed?: number;
}

/** Phaser-native cartridge entry point consumed by the runtime. */
export interface RuntimeCartridge {
  /** Cartridge metadata and compatibility requirements. */
  manifest: RuntimeCartridgeManifest;
  /**
   * Creates a Phaser Game configuration for one mounted session.
   * @param context Validated runtime services and cartridge inputs.
   * @returns Phaser-compatible configuration consumed by the injected factory.
   */
  createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>>;
}

/** Structured runtime event rendered by QC hosts and telemetry adapters. */
export interface APKDiagnosticEvent {
  /** Event severity. */
  level: "debug" | "info" | "warning" | "error";
  /** Stable event code. */
  code: string;
  /** Human-readable description. */
  message: string;
  /** Millisecond timestamp. */
  timestamp: number;
  /** Optional structured event context. */
  details?: Readonly<Record<string, unknown>>;
}

/** Host callbacks available to the browser runtime. */
export interface APKHostAdapter {
  /** Receives exactly one validated display result per mounted session. */
  complete(result: GameResults): void | Promise<void>;
  /** Receives diagnostics without coupling cartridges to app telemetry. */
  diagnostic?(event: APKDiagnosticEvent): void;
  /** Optional host navigation boundary. */
  navigate?(destination: string): void;
}

/** Runtime state exposed to QC tooling. */
export type APKRuntimeStatus =
  | "mounting"
  | "running"
  | "paused"
  | "restarting"
  | "completed"
  | "error"
  | "destroyed";

/** Immutable runtime snapshot for operator diagnostics. */
export interface APKRuntimeDiagnostics {
  /** Current lifecycle state. */
  status: APKRuntimeStatus;
  /** Cartridge identifier. */
  cartridgeId: string;
  /** Edition identifier. */
  editionId: string;
  /** Number of successful recreation requests. */
  restartCount: number;
  /** Number of accepted results, constrained to zero or one. */
  completionCount: number;
  /** Current audio mute state. */
  muted: boolean;
  /** Last measured container width. */
  width: number;
  /** Last measured container height. */
  height: number;
  /** Current resolved layout profile when responsive ownership is enabled. */
  layoutProfile?: "compact" | "wide";
  /** Current independently resolved input mode when responsive ownership is enabled. */
  inputMode?: ResponsiveInputMode;
  /** Most recent diagnostic event. */
  lastEvent?: APKDiagnosticEvent;
}

/** Imperative game instance returned by an injected renderer factory. */
export interface APKGameInstance {
  /** Pauses live scenes or simulation. */
  pause?(): void;
  /** Resumes live scenes or simulation. */
  resume?(): void;
  /** Resizes the renderer to the host container. */
  resize?(width: number, height: number): void;
  /** Captures game-owned state before a responsive reflow. */
  captureResponsiveState?(): unknown;
  /** Restores game-owned state after a responsive reflow. */
  restoreResponsiveState?(state: unknown): void;
  /** Atomically applies camera, world, HUD, text, and controls for a new composition. */
  recompose?(composition: SupportedResponsiveComposition): void;
  /** Changes the renderer mute state. */
  setMuted?(muted: boolean): void;
  /** Permanently destroys this renderer instance. */
  destroy(): void | Promise<void>;
}

/** Fully validated context passed to a renderer factory. */
export interface GameFactoryContext {
  /** DOM element that owns the game canvas. */
  container: HTMLElement;
  /** Cartridge definition for this launch. */
  cartridge: RuntimeCartridge;
  /** Strict educational input array. */
  input: GameInput;
  /** Validated audience edition. */
  edition: RuntimeEdition;
  /** Fire-once completion callback. */
  complete: (result: unknown) => void;
  /** Runtime diagnostic emitter. */
  diagnostic: (event: APKDiagnosticInput) => void;
  /** Normalized browser input controller. */
  inputController: APKInputController;
  /** Initial responsive composition when host-owned responsive configuration is present. */
  composition?: SupportedResponsiveComposition;
  /** Optional deterministic seed. */
  seed?: number;
}

/** Injectable renderer construction boundary used by production and tests. */
export type GameFactory = (
  context: GameFactoryContext,
) => APKGameInstance | Promise<APKGameInstance>;

/** Host values enabling APK-owned responsive recomposition. */
export interface ResponsiveRuntimeOptions {
  /** Strict compact/wide layout policy. */
  readonly config: ResponsiveLayoutConfig;
  /** Current browser/device safe-area insets. */
  readonly safeArea: SafeAreaInsets;
  /** Current independently detected input capabilities. */
  readonly inputCapabilities: Readonly<{ touch: boolean; pointer: boolean; keyboard: boolean }>;
  /** Current accessibility scaling values. */
  readonly accessibility: Readonly<{ textScale: number; touchScale: number }>;
  /** Whether the runtime starts in fullscreen. */
  readonly fullscreen?: boolean;
}

/** Options required to mount one cartridge session. */
export interface MountCartridgeOptions {
  /** DOM element that owns all game rendering. */
  container: HTMLElement;
  /** Cartridge definition to launch. */
  cartridge: RuntimeCartridge;
  /** Vocabulary or sentence array passed without wrapper drift. */
  input: unknown;
  /** Audience edition selected by the host. */
  edition: RuntimeEdition;
  /** Host-controlled result, navigation, and diagnostics callbacks. */
  host: APKHostAdapter;
  /** Optional deterministic seed. */
  seed?: number;
  /** Optional responsive runtime ownership; omitted for legacy fixed-composition cartridges. */
  responsive?: ResponsiveRuntimeOptions;
}

/** Imperative lifecycle and diagnostics API returned to a host. */
export interface APKGameHandle {
  /** Pauses the session. */
  pause(): void;
  /** Resumes the session. */
  resume(): void;
  /** Recreates the session with the same validated launch options. */
  restart(): Promise<void>;
  /** Changes audio mute state. */
  setMuted(muted: boolean): void;
  /** Returns the latest immutable diagnostics snapshot. */
  getDiagnostics(): APKRuntimeDiagnostics;
  /** Permanently tears down the session and all browser listeners. */
  destroy(): Promise<void>;
}
