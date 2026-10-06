/**
 * Exact copies of the Advantage Play Kit (APK) and game-contracts pieces the 3D kit needs.
 *
 * This repo does not depend on the monorepo, so each block below is copied verbatim (comments
 * and all) and marked with its source path and the monorepo commit it was copied from. At port
 * time the copies are replaced by imports from `@reading-advantage/game-contracts` and
 * `@reading-advantage/advantage-play-kit`; nothing in this file may drift from those sources.
 *
 * Monorepo: ../reading-advantage-monorepo at commit fe6aedc2b.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------------------------
// Source: packages/game-contracts/src/educational-io.ts (fe6aedc2b)
// ---------------------------------------------------------------------------------------------

/** Strict schema for one canonical learning-content item. */
export const vocabularyItemSchema = z
  .object({
    term: z.string(),
    translation: z.string(),
  })
  .strict();

/** Strict cartridge-facing vocabulary-array schema. */
export const vocabularyInputSchema = z.array(vocabularyItemSchema);

/** Strict cartridge-facing sentence-array schema. */
export const sentenceInputSchema = z.array(vocabularyItemSchema);

/** Strict schema for the established five-field cartridge result. */
export const gameResultsSchema = z
  .object({
    accuracy: z.number().min(0).max(1),
    xp: z.number().int().min(0),
    score: z.number().int().min(0),
    correctAnswers: z.number().int().min(0),
    totalAttempts: z.number().int().min(0),
  })
  .strict();

/** A canonical vocabulary item accepted by every APK cartridge. */
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

/** The established vocabulary array calling convention. */
export type VocabularyInput = z.infer<typeof vocabularyInputSchema>;

/** The sentence-mode array calling convention, semantically distinct from vocabulary. */
export type SentenceInput = z.infer<typeof sentenceInputSchema>;

/** The established result emitted by an APK cartridge. */
export type GameResults = z.infer<typeof gameResultsSchema>;

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/runtime/cartridge-manifest.ts (fe6aedc2b)
// `semanticAssetKeySchema` and `capabilityIdSchema` are module-private there; the kit exports
// them because `cartridge3DManifestSchema` reuses them (section 2.1 of docs/apk3d-cartridge.md).
// ---------------------------------------------------------------------------------------------

/** Rejects a physical file path where a semantic asset key is required. */
export const semanticAssetKeySchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith("/") && !/\.(png|jpe?g|webp|gif|svg|json|atlas|mp3|ogg|wav)$/iu.test(value), {
    message: "Asset bindings must be semantic keys, not physical file paths",
  });

/** Rejects a capability id that does not use the capability namespace. */
export const capabilityIdSchema = z.string().regex(/^capability:[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
  message: "Capability ids must use the capability: namespace and kebab-case",
});

/** Zod schema for the manifest that every mounted cartridge must supply. */
export const runtimeCartridgeManifestSchema = z
  .object({
    id: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
      message: "Cartridge id must be lowercase kebab-case",
    }),
    title: z.string().min(1),
    description: z.string().min(1),
    runtimeApiVersion: z.string().min(1),
    inputMode: z.enum(["vocabulary", "sentence"]),
    requiredAssetBindings: z.array(semanticAssetKeySchema),
    capabilities: z.array(capabilityIdSchema).min(1),
  })
  .strict();

/**
 * Validates the manifest of a cartridge that the runtime is about to mount.
 * @param manifest Untrusted manifest supplied by a cartridge module.
 * @returns The validated manifest.
 * @throws When a field is missing, an asset binding is a physical path, or a capability id is malformed.
 */
export function validateRuntimeCartridgeManifest(
  manifest: unknown,
): z.infer<typeof runtimeCartridgeManifestSchema> {
  const parsed = runtimeCartridgeManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    throw new Error(
      `Cartridge manifest validation failed: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/runtime/types.ts (fe6aedc2b)
// ---------------------------------------------------------------------------------------------

/** Current browser runtime contract understood by the APK package. */
export const APK_RUNTIME_API_VERSION = "1.0.0";

/** Terminal presentation outcome supplied with an authoritative game result. */
export type GameTerminalOutcome = "victory" | "defeat" | "complete";

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

/** Browser-safe cartridge metadata used by hosts and diagnostics. */
export interface RuntimeCartridgeManifest {
  /** Stable cartridge identifier. */
  id: string;
  /** Human-readable cartridge title. */
  title: string;
  /** Short catalog description of the mechanic. */
  description: string;
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

/** Runtime authority assigned to one mounted cartridge session. */
export type APKSessionMode = "playing" | "tutorial" | "demo";

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

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/systems/bounded-frame-loop.ts (fe6aedc2b)
// ---------------------------------------------------------------------------------------------

/** The exact frame-delta ceiling accepted from babel-architect, in milliseconds. */
export const BOUNDED_FRAME_DELTA_CEILING_MS = 50;

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/systems/capability-manifest.ts and the cartridges that
// list them (fe6aedc2b). The ids a 3D cartridge lists; the kit implements the same behaviors.
// ---------------------------------------------------------------------------------------------

/** The APK capability ids the 3D kit implements for every cartridge (section 2.1). */
export const APK3D_CAPABILITIES = [
  'capability:bounded-frame-delta',
  'capability:single-completion-emission',
  'capability:result-accounting',
  'capability:nonempty-content-precondition',
  'capability:input-action-normalization',
  'capability:time-and-frame-loop',
] as const;

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/responsive/responsive-composition.ts (fe6aedc2b)
// ---------------------------------------------------------------------------------------------

/** Rectangle in host-container coordinates. */
export interface LayoutRect {
  /** Horizontal offset from the container origin. */
  readonly x: number;
  /** Vertical offset from the container origin. */
  readonly y: number;
  /** Rectangle width. */
  readonly width: number;
  /** Rectangle height. */
  readonly height: number;
}

/** Insets removed from the host container before composition. */
export interface SafeAreaInsets {
  /** Top obstruction. */
  readonly top: number;
  /** Right obstruction. */
  readonly right: number;
  /** Bottom obstruction. */
  readonly bottom: number;
  /** Left obstruction. */
  readonly left: number;
}

/** Supported spatial composition profile. */
export type LayoutProfile = "compact" | "wide";

/** Input capability mode resolved independently from spatial composition. */
export type ResponsiveInputMode = "touch" | "pointer-keyboard" | "hybrid";

/** Standard APK region identifiers. */
export type StandardRegionId =
  | "gameplay"
  | "primary-prompt"
  | "primary-status"
  | "secondary-status"
  | "controls"
  | "feedback"
  | "navigation"
  | "modal";

/** Complete standard-region plan for a supported composition. */
export type StandardRegionPlan = Readonly<Record<StandardRegionId, LayoutRect>>;

/** World-adaptation strategy selected by a cartridge profile. */
export type WorldAdaptationStrategy = "reveal" | "follow" | "reflow" | "stage" | "panel" | "fixed-mechanic";

/** One structured responsive diagnostic. */
export interface ResponsiveDiagnostic {
  /** Stable diagnostic code. */
  readonly code: string;
  /** Diagnostic severity. */
  readonly severity: "info" | "warning" | "error";
  /** Human-readable actionable description. */
  readonly message: string;
  /** Optional diagnostic context. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Successful responsive composition. */
export interface SupportedResponsiveComposition {
  /** Discriminator for a usable composition. */
  readonly supported: true;
  /** Selected spatial profile. */
  readonly profile: LayoutProfile;
  /** Independently selected interaction mode. */
  readonly inputMode: ResponsiveInputMode;
  /** Usable host rectangle after safe-area insets. */
  readonly safeRect: LayoutRect;
  /** Standard reserved, transient, modal, and gameplay regions. */
  readonly regions: StandardRegionPlan;
  /** Product-approved world adaptation strategy. */
  readonly strategy: WorldAdaptationStrategy;
  /** Minimum accessible touch target for this composition. */
  readonly minimumTouchTargetPx: number;
  /** Structured resolution diagnostics. */
  readonly diagnostics: readonly ResponsiveDiagnostic[];
}

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/runtime/types.ts (fe6aedc2b): the asset, edition,
// cartridge, and factory shapes of the Phaser path. `ListeningAudioController` and
// `AnswerChoiceAudioController` are APK audio classes the 3D kit does not carry; the copies type
// those two optional fields as `unknown`, so a cartridge written here accepts the APK context.
// ---------------------------------------------------------------------------------------------

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

/** Context supplied while a cartridge creates its Phaser configuration. */
export interface CartridgeGameConfigContext {
  /** Optional listening controller owned by the current playing session. */
  listening?: unknown;
  /** Optional answer audio controller owned by the current playing session. */
  answerAudio?: unknown;
  /** Validated educational array. */
  input: GameInput;
  /** Validated audience edition. */
  edition: RuntimeEdition;
  /** Fire-once validated completion callback. */
  complete: (result: unknown, outcome?: GameTerminalOutcome) => void;
  /** Runtime diagnostics callback. */
  diagnostic: (event: APKDiagnosticInput) => void;
  /** Normalized live browser input. */
  inputController: APKInputController;
  /** Whether this mount is authoritative gameplay or a safe preview. */
  sessionMode?: APKSessionMode;
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
  /** Optional listening controller owned by the current playing session. */
  listening?: unknown;
  /** Optional answer audio controller owned by the current playing session. */
  answerAudio?: unknown;
  /** DOM element that owns the game canvas. */
  container: HTMLElement;
  /** Cartridge definition for this launch. */
  cartridge: RuntimeCartridge;
  /** Strict educational input array. */
  input: GameInput;
  /** Validated audience edition. */
  edition: RuntimeEdition;
  /** Fire-once completion callback. */
  complete: (result: unknown, outcome?: GameTerminalOutcome) => void;
  /** Runtime diagnostic emitter. */
  diagnostic: (event: APKDiagnosticInput) => void;
  /** Normalized browser input controller. */
  inputController: APKInputController;
  /** Whether this mount is authoritative gameplay or a safe preview. */
  sessionMode: APKSessionMode;
  /** Initial responsive composition when host-owned responsive configuration is present. */
  composition?: SupportedResponsiveComposition;
  /** Optional deterministic seed. */
  seed?: number;
}

/** Injectable renderer construction boundary used by production and tests. */
export type GameFactory = (
  context: GameFactoryContext,
) => APKGameInstance | Promise<APKGameInstance>;

// ---------------------------------------------------------------------------------------------
// Source: packages/advantage-play-kit/src/runtime/input.ts (fe6aedc2b): the input types. The
// controller itself (`createInputController`) is copied to src/apk3d/factory/input.ts.
// ---------------------------------------------------------------------------------------------

/** Normalized pointer position and button state. */
export interface APKPointerState {
  /** Whether the pointer is currently pressed. */
  down: boolean;
  /** Whether a completed release is queued for the next snapshot. */
  released?: boolean;
  /** Whether the most recent active gesture ended through browser cancellation. */
  cancelled: boolean;
  /** Active pointer identifier. */
  id: number | null;
  /** Browser pointer category retained through release for gesture resolution. */
  kind: "mouse" | "pen" | "touch" | null;
  /** Client-space horizontal coordinate where the active gesture began. */
  startX: number;
  /** Client-space vertical coordinate where the active gesture began. */
  startY: number;
  /** Client-space horizontal coordinate. */
  x: number;
  /** Client-space vertical coordinate. */
  y: number;
}

/** Immutable normalized input snapshot read by a cartridge. */
export interface APKInputSnapshot {
  /** Pressed KeyboardEvent codes. */
  keys: readonly string[];
  /** Key-down codes observed since the previous snapshot, including short taps. */
  pressed?: readonly string[];
  /** Current primary pointer state. */
  pointer: APKPointerState;
  /** Whether this controller has released its listeners. */
  destroyed: boolean;
}

/** Browser input controller owned by one mounted cartridge. */
export interface APKInputController {
  /** Returns the current normalized input state. */
  snapshot(): APKInputSnapshot;
  /** Cancels an active pointer gesture before responsive targets move. */
  cancelActiveGesture(): void;
  /** Clears held and queued input when play pauses or loses focus. */
  reset?(): void;
  /** Releases listeners and restores host element styles. */
  destroy(): void;
}
