import {
  preloadAssetBindings,
  resolveAssetBinding,
  type PhysicalAssetLoader,
} from "@reading-advantage/advantage-play-kit/editions";
import {
  APK_RUNTIME_API_VERSION,
  type CartridgeGameConfigContext,
  type RuntimeCartridge,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit/runtime";
import type { SupportedResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import {
  EXISTING_CORE_HOST_PROOF_BINDINGS,
  gameResultsSchema,
  vocabularyInputSchema,
  type ExistingCoreHostProofCartridgeId,
  type GameResults,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";

/** Stable public identifier for the first real host-proof cartridge. */
export const DRAGON_FLIGHT_HOST_PROOF_ID = "dragon-flight" as const;

/** Stable public identifier for the Magic Defense host-proof cartridge. */
export const MAGIC_DEFENSE_HOST_PROOF_ID = "magic-defense" as const;

/** Exact selected standard-pack roles used by Dragon Flight's runtime presentation. */
export const DRAGON_FLIGHT_REQUIRED_ASSET_BINDINGS = Object.freeze([
  "audio/native/combat/hit-01",
  "effects/32x32/combat/hit-01",
  "top-down/32x32/characters/hero-01",
] as const);

/** Exact selected standard-pack roles used by Magic Defense's runtime presentation. */
export const MAGIC_DEFENSE_REQUIRED_ASSET_BINDINGS = Object.freeze([
  "audio/native/combat/hit-01",
  "effects/32x32/combat/hit-01",
  "ui/20x20/inventory/slot",
  "ui/32x32/items/armor-icons",
] as const);

/** Current-source Existing Core titles authorized for vocabulary-gate host proof. */
export const VOCABULARY_GATE_HOST_PROOF_IDS = Object.freeze([
  DRAGON_FLIGHT_HOST_PROOF_ID,
  MAGIC_DEFENSE_HOST_PROOF_ID,
] as const);

/** Existing Core titles that remain source-blocked for host proof. */
export const SOURCE_BLOCKED_HOST_PROOF_IDS = Object.freeze([
  "sorcerer-ziggurat",
  "astral-mage",
] as const);

interface VocabularyGateState {
  attempts: number;
  correctAnswers: number;
  completed: boolean;
  feedback: "ready" | "correct" | "incorrect" | "completed";
}

interface PhaserTextLike {
  setOrigin?(x: number, y?: number): PhaserTextLike;
}

interface PhaserImageLike {
  setOrigin?(x: number, y?: number): PhaserImageLike;
  setScale?(scale: number): PhaserImageLike;
}

interface PhaserGraphicsLike {
  fillStyle?(color: number, alpha?: number): PhaserGraphicsLike;
  fillRect?(x: number, y: number, width: number, height: number): PhaserGraphicsLike;
  lineStyle?(width: number, color: number, alpha?: number): PhaserGraphicsLike;
  strokeRect?(x: number, y: number, width: number, height: number): PhaserGraphicsLike;
}

interface VocabularyGateScene {
  load?: PhysicalAssetLoader;
  add?: {
    graphics?(): PhaserGraphicsLike;
    image?(x: number, y: number, texture: string): PhaserImageLike;
    text?(x: number, y: number, value: string, style: Readonly<Record<string, unknown>>): PhaserTextLike;
  };
  children?: { removeAll?(destroyChildren?: boolean): void };
  scale?: { width?: number; height?: number };
  sound?: { play?(key: string, config?: Readonly<Record<string, unknown>>): unknown };
}

interface VocabularyGateInputAction {
  choice?: boolean;
  launch: boolean;
}

interface VocabularyGatePresentationAssets {
  readonly heroTextureKey: string;
  readonly hitEffectTextureKey: string;
  readonly hitAudioKey: string;
}

type VocabularyGateRecordedAction =
  | { readonly kind: "choose-gate"; readonly gate: "left" | "right" }
  | { readonly kind: "launch" };

interface VocabularyGateHostProofDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly requiredAssetBindings: readonly string[];
  readonly heroBinding: string;
  readonly hitEffectBinding: string;
  /** Optional audio binding; omitted titles skip SFX. */
  readonly hitAudioBinding?: string;
  readonly diagnosticCode: string;
}

const VOCABULARY_GATE_DEFINITIONS: Readonly<Record<
  (typeof VOCABULARY_GATE_HOST_PROOF_IDS)[number],
  VocabularyGateHostProofDefinition
>> = Object.freeze({
  "dragon-flight": Object.freeze({
    id: DRAGON_FLIGHT_HOST_PROOF_ID,
    title: "Dragon Flight",
    description: "Fly through the gate that matches the active vocabulary translation.",
    requiredAssetBindings: DRAGON_FLIGHT_REQUIRED_ASSET_BINDINGS,
    heroBinding: "top-down/32x32/characters/hero-01",
    hitEffectBinding: "effects/32x32/combat/hit-01",
    hitAudioBinding: "audio/native/combat/hit-01",
    diagnosticCode: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
  }),
  "magic-defense": Object.freeze({
    id: MAGIC_DEFENSE_HOST_PROOF_ID,
    title: "Magic Defense",
    description: "Choose the translation-matching ward before launching the defense spell.",
    requiredAssetBindings: MAGIC_DEFENSE_REQUIRED_ASSET_BINDINGS,
    heroBinding: "ui/32x32/items/armor-icons",
    hitEffectBinding: "effects/32x32/combat/hit-01",
    hitAudioBinding: "audio/native/combat/hit-01",
    diagnosticCode: "MAGIC_DEFENSE_HOST_PROOF_ACTION",
  }),
});

/**
 * Raised when a host-proof loader is asked for a historical-source-only title.
 */
export class HostProofSourceBlockedError extends Error {
  /**
   * @param cartridgeId Title identifier that remains source-blocked.
   */
  constructor(public readonly cartridgeId: string) {
    super(`Host-proof cartridge ${cartridgeId} is source-blocked until a current accepted implementation exists`);
    this.name = "HostProofSourceBlockedError";
  }
}

/**
 * Resolves the selected physical pack files used by one vocabulary-gate title scene.
 * @param edition Validated edition selected by the server host.
 * @param definition Title definition that pins semantic bindings.
 * @returns Texture and audio keys emitted by the standard asset preloader.
 */
function resolvePresentationAssets(
  edition: RuntimeEdition,
  definition: VocabularyGateHostProofDefinition,
): VocabularyGatePresentationAssets {
  return Object.freeze({
    heroTextureKey: resolveAssetBinding(edition, definition.heroBinding).textureKey,
    hitEffectTextureKey: resolveAssetBinding(edition, definition.hitEffectBinding).textureKey,
    hitAudioKey: definition.hitAudioBinding
      ? resolveAssetBinding(edition, definition.hitAudioBinding).textureKey
      : "",
  });
}

/**
 * Produces a valid display result from vocabulary-gate title-owned state.
 * @param state The current title-owned gate state.
 * @returns The canonical five-field cartridge result.
 */
function resultFromState(state: VocabularyGateState): GameResults {
  const accuracy = state.attempts === 0 ? 0 : state.correctAnswers / state.attempts;
  return gameResultsSchema.parse({
    accuracy,
    xp: Math.round(accuracy * 5),
    score: state.correctAnswers * 100,
    correctAnswers: state.correctAnswers,
    totalAttempts: state.attempts,
  });
}

/**
 * Draws one vocabulary-gate scene using title-owned input and selected assets.
 * @param scene The Phaser scene supplied by the runtime.
 * @param definition Title presentation metadata.
 * @param input The validated vocabulary prompt data.
 * @param state The current title-owned mechanic state.
 * @param assets Texture and audio keys resolved from the selected edition.
 * @param composition Current responsive geometry owned by this title scene.
 */
function renderVocabularyGate(
  scene: VocabularyGateScene | undefined,
  definition: VocabularyGateHostProofDefinition,
  input: VocabularyInput,
  state: VocabularyGateState,
  assets: VocabularyGatePresentationAssets,
  composition: SupportedResponsiveComposition | undefined,
): void {
  const add = scene?.add;
  if (!add) return;
  scene?.children?.removeAll?.(true);
  const sceneWidth = scene.scale?.width ?? 960;
  const sceneHeight = scene.scale?.height ?? 540;
  const safeRect = composition?.safeRect;
  const x = safeRect?.x ?? 0;
  const y = safeRect?.y ?? 0;
  const width = safeRect?.width ?? sceneWidth;
  const height = safeRect?.height ?? sceneHeight;
  const prompt = input[0];
  if (!prompt) return;
  const graphics = add.graphics?.();
  graphics?.fillStyle?.(0x0b1426, 1);
  graphics?.fillRect?.(0, 0, sceneWidth, sceneHeight);
  graphics?.fillStyle?.(0x8f3434, 1);
  graphics?.fillRect?.(x + width * 0.03, y + height * 0.48, width * 0.4, height * 0.32);
  graphics?.fillStyle?.(0x23764a, 1);
  graphics?.fillRect?.(x + width * 0.58, y + height * 0.48, width * 0.39, height * 0.32);
  graphics?.lineStyle?.(4, 0xf3c969, 1);
  graphics?.strokeRect?.(x + width * 0.03, y + height * 0.48, width * 0.4, height * 0.32);
  graphics?.lineStyle?.(4, 0x8ce0b8, 1);
  graphics?.strokeRect?.(x + width * 0.58, y + height * 0.48, width * 0.39, height * 0.32);
  const hero = add.image?.(x + width / 2, y + height * 0.34, assets.heroTextureKey);
  hero?.setOrigin?.(0.5);
  hero?.setScale?.(3);
  const effect = add.image?.(x + width / 2, y + height * 0.46, assets.hitEffectTextureKey);
  effect?.setOrigin?.(0.5);
  effect?.setScale?.(2);
  const centered = { fontFamily: "sans-serif", fontSize: "28px", color: "#f4f0dc", align: "center" };
  add.text?.(x + width / 2, y + height * 0.08, definition.title, { ...centered, fontSize: "34px" }).setOrigin?.(0.5);
  add.text?.(x + width / 2, y + height * 0.18, `Match the translation for: ${prompt.term}`, centered).setOrigin?.(0.5);
  add.text?.(x + width * 0.23, y + height * 0.63, "LEFT GATE\nwrong route", centered).setOrigin?.(0.5);
  add.text?.(x + width * 0.77, y + height * 0.63, `RIGHT GATE\n${prompt.translation}`, centered).setOrigin?.(0.5);
  add.text?.(
    x + width / 2,
    y + height * 0.9,
    state.completed
      ? `Complete · ${state.correctAnswers}/${state.attempts} correct`
      : `Attempts ${state.attempts} · ${state.feedback} · arrows or tap gates; Enter launches`,
    { ...centered, fontSize: "20px" },
  ).setOrigin?.(0.5);
}

/**
 * Applies one verified vocabulary-gate choice.
 * @param state Mutable title-owned state for the mounted session.
 * @param correct Whether the player chose the translation-matching gate.
 */
function chooseGate(state: VocabularyGateState, correct: boolean): void {
  if (state.completed) return;
  state.attempts += 1;
  if (correct) state.correctAnswers += 1;
  state.feedback = correct ? "correct" : "incorrect";
}

/**
 * Emits one title-owned action for the host's signed-attempt transport.
 * @param context Runtime services for the mounted session.
 * @param definition Title that owns the diagnostic code.
 * @param action Action produced by the real vocabulary-gate mechanic.
 * @param startedAt Browser timestamp captured when this cartridge was created.
 */
function emitTitleAction(
  context: CartridgeGameConfigContext,
  definition: VocabularyGateHostProofDefinition,
  action: VocabularyGateRecordedAction,
  startedAt: number,
): void {
  context.diagnostic({
    level: "info",
    code: definition.diagnosticCode,
    message: action.kind === "launch" ? `${definition.title} launch requested` : `${definition.title} ${action.gate} gate chosen`,
    details: {
      ...action,
      elapsedMs: Math.max(0, Math.round(Date.now() - startedAt)),
    },
  });
}

/**
 * Reads the complete title-owned action from one normalized browser-input snapshot.
 * @param context Runtime services for the mounted session.
 * @param composition Latest responsive geometry owned by the title scene.
 * @returns The selected gate, when any, and whether the player requested launch.
 */
function readTitleInput(
  context: CartridgeGameConfigContext,
  composition: SupportedResponsiveComposition | undefined,
): VocabularyGateInputAction {
  const snapshot = context.inputController.snapshot();
  const launch = Boolean(snapshot.pressed?.some((key) => key === "Enter" || key === "Space"));
  if (snapshot.pressed?.some((key) => key === "ArrowLeft")) return { choice: false, launch };
  if (snapshot.pressed?.some((key) => key === "ArrowRight")) return { choice: true, launch };
  if (!snapshot.pointer.released || snapshot.pointer.cancelled) return { launch };
  const midpoint = (composition?.safeRect.x ?? 0)
    + (composition?.safeRect.width ?? 960) / 2;
  return { choice: snapshot.pointer.x >= midpoint, launch };
}

/**
 * Creates one vocabulary-gate host-proof cartridge from a frozen title definition.
 * @param definition Title metadata and selected-union presentation bindings.
 * @returns A runtime cartridge that owns its vocabulary gate mechanic and emits one result.
 */
async function loadVocabularyGateHostProofCartridge(
  definition: VocabularyGateHostProofDefinition,
): Promise<RuntimeCartridge> {
  const cartridge: RuntimeCartridge = {
    manifest: {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      version: "1.0.0",
      runtimeApiVersion: APK_RUNTIME_API_VERSION,
      inputMode: "vocabulary",
      requiredAssetBindings: definition.requiredAssetBindings,
      capabilities: [
        "capability:input-action-normalization",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:responsive-recomposition",
      ],
    },
    createGameConfig(context): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const assets = resolvePresentationAssets(context.edition, definition);
      const startedAt = Date.now();
      const state: VocabularyGateState = {
        attempts: 0,
        correctAnswers: 0,
        completed: false,
        feedback: "ready",
      };
      let composition = context.composition;
      return {
        scene: {
          preload(this: VocabularyGateScene): void {
            if (!this.load) throw new Error(`${definition.title} scene cannot preload selected assets`);
            preloadAssetBindings(this.load, context.edition, definition.requiredAssetBindings);
          },
          create(this: VocabularyGateScene): void {
            renderVocabularyGate(this, definition, input, state, assets, composition);
          },
          apkRecompose(this: VocabularyGateScene, nextComposition: SupportedResponsiveComposition): void {
            composition = nextComposition;
            renderVocabularyGate(this, definition, input, state, assets, composition);
          },
          update(this: VocabularyGateScene): void {
            const action = readTitleInput(context, composition);
            if (state.completed) return;
            if (action.choice !== undefined) {
              chooseGate(state, action.choice);
              emitTitleAction(context, definition, {
                kind: "choose-gate",
                gate: action.choice ? "right" : "left",
              }, startedAt);
              if (action.choice && assets.hitAudioKey) {
                this.sound?.play?.(assets.hitAudioKey, { volume: 0.15 });
              }
              renderVocabularyGate(this, definition, input, state, assets, composition);
            }
            if (state.attempts > 0 && action.launch) {
              state.completed = true;
              state.feedback = "completed";
              emitTitleAction(context, definition, { kind: "launch" }, startedAt);
              context.complete(resultFromState(state));
              renderVocabularyGate(this, definition, input, state, assets, composition);
            }
          },
        },
      };
    },
  };
  return Object.freeze(cartridge);
}

/**
 * Creates the first real Reading/Primary host-proof cartridge for Dragon Flight.
 * @returns A runtime cartridge that owns its vocabulary gate mechanic and emits one result.
 */
export async function loadDragonFlightHostProofCartridge(): Promise<RuntimeCartridge> {
  return loadVocabularyGateHostProofCartridge(VOCABULARY_GATE_DEFINITIONS["dragon-flight"]);
}

/**
 * Creates the Magic Defense Reading/Primary host-proof cartridge.
 * @returns A runtime cartridge that owns its vocabulary gate mechanic and emits one result.
 */
export async function loadMagicDefenseHostProofCartridge(): Promise<RuntimeCartridge> {
  return loadVocabularyGateHostProofCartridge(VOCABULARY_GATE_DEFINITIONS["magic-defense"]);
}

/** Stable public identifier for the Dungeon Liberator host-proof cartridge. */
export const DUNGEON_LIBERATOR_HOST_PROOF_ID = "dungeon-liberator" as const;

/** Exact selected standard-pack roles used by Dungeon Liberator's runtime presentation. */
export const DUNGEON_LIBERATOR_REQUIRED_ASSET_BINDINGS = Object.freeze([
  "effects/32x32/combat/hit-01",
  "side-view/32x32/characters/enemy-001-idle",
  "top-down/32x32/characters/hero-01",
  "ui/16x16/controls/gamepad-buttons",
] as const);

/**
 * Creates the Dungeon Liberator host-proof cartridge (sentence-mode vocabulary-gate surface).
 * @returns A runtime cartridge that owns its gate mechanic and emits one result.
 */
export async function loadDungeonLiberatorHostProofCartridge(): Promise<RuntimeCartridge> {
  // Sentence input shares the vocabulary item array shape; the gate presentation reuses DF mechanics.
  return loadVocabularyGateHostProofCartridge({
    id: DUNGEON_LIBERATOR_HOST_PROOF_ID,
    title: "Dungeon Liberator",
    description: "Liberate prisoners by matching the active sentence translation gate.",
    requiredAssetBindings: DUNGEON_LIBERATOR_REQUIRED_ASSET_BINDINGS,
    heroBinding: "top-down/32x32/characters/hero-01",
    hitEffectBinding: "effects/32x32/combat/hit-01",
    diagnosticCode: "DUNGEON_LIBERATOR_HOST_PROOF_ACTION",
  });
}

/**
 * Loads one Existing Core host-proof cartridge by public identifier.
 * @param cartridgeId Untrusted host-proof title identifier.
 * @returns The matching runtime cartridge for a current-source title.
 * @throws HostProofSourceBlockedError for historical-source-only titles.
 * @throws When the identifier is not an accepted Existing Core host-proof binding.
 */
export async function loadExistingCoreHostProofCartridge(
  cartridgeId: string,
): Promise<RuntimeCartridge> {
  if ((SOURCE_BLOCKED_HOST_PROOF_IDS as readonly string[]).includes(cartridgeId)) {
    throw new HostProofSourceBlockedError(cartridgeId);
  }
  if (cartridgeId === DRAGON_FLIGHT_HOST_PROOF_ID) {
    return loadDragonFlightHostProofCartridge();
  }
  if (cartridgeId === MAGIC_DEFENSE_HOST_PROOF_ID) {
    return loadMagicDefenseHostProofCartridge();
  }
  if (cartridgeId === "dungeon-liberator") {
    return loadDungeonLiberatorHostProofCartridge();
  }
  const known = EXISTING_CORE_HOST_PROOF_BINDINGS.some((binding) => binding.id === cartridgeId);
  if (!known) {
    throw new Error(`Unknown host-proof cartridge: ${cartridgeId}`);
  }
  throw new Error(`Host-proof cartridge ${cartridgeId} is not loadable`);
}

/**
 * Reports whether a cartridge id is explicitly source-blocked for host proof.
 * @param cartridgeId Candidate Existing Core host-proof identifier.
 * @returns True when the title is historical-source-only and must not load.
 */
export function isHostProofSourceBlocked(
  cartridgeId: ExistingCoreHostProofCartridgeId | string,
): boolean {
  return (SOURCE_BLOCKED_HOST_PROOF_IDS as readonly string[]).includes(cartridgeId);
}
