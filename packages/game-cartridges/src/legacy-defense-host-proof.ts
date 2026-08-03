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
  gameResultsSchema,
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
  type SentenceInput,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";
import { getLegacyDefenseSelectedSemanticKeys } from "./legacy-defense-suitability.js";

/** Stable public identifiers for current-source Legacy Defense host-proof cartridges. */
export const CASTLE_DEFENSE_HOST_PROOF_ID = "castle-defense" as const;
export const WIZARD_VS_ZOMBIE_HOST_PROOF_ID = "wizard-vs-zombie" as const;
export const VILLAGE_GUARDIAN_HOST_PROOF_ID = "village-guardian" as const;

/** Storm the Castle Tower remains historical-blocked for host proof. */
export const STORM_CASTLE_TOWER_HOST_PROOF_ID = "storm-castle-tower" as const;

/** Current-source Legacy Defense host-proof titles. */
export const LEGACY_DEFENSE_HOST_PROOF_IDS = Object.freeze([
  CASTLE_DEFENSE_HOST_PROOF_ID,
  WIZARD_VS_ZOMBIE_HOST_PROOF_ID,
  VILLAGE_GUARDIAN_HOST_PROOF_ID,
] as const);

/** Exact accepted selected-union semantic keys used by Castle Defense's runtime presentation. */
export const CASTLE_DEFENSE_REQUIRED_ASSET_BINDINGS: readonly string[] = Object.freeze(
  getLegacyDefenseSelectedSemanticKeys(CASTLE_DEFENSE_HOST_PROOF_ID),
);

interface CastleDefenseGateState {
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

interface CastleDefenseGateScene {
  load?: PhysicalAssetLoader;
  add?: {
    graphics?(): PhaserGraphicsLike;
    image?(x: number, y: number, texture: string): PhaserImageLike;
    text?(x: number, y: number, value: string, style: Readonly<Record<string, unknown>>): PhaserTextLike;
  };
  children?: { removeAll?(destroyChildren?: boolean): void };
  scale?: { width?: number; height?: number };
}

interface CastleDefenseGateInputAction {
  choice?: boolean;
  launch: boolean;
}

interface CastleDefenseGatePresentationAssets {
  readonly heroTextureKey: string;
  readonly hitEffectTextureKey: string;
}

type CastleDefenseGateRecordedAction =
  | { readonly kind: "choose-gate"; readonly gate: "left" | "right" }
  | { readonly kind: "launch" };

interface LegacyDefenseHostProofDefinition {
  readonly id: (typeof LEGACY_DEFENSE_HOST_PROOF_IDS)[number];
  readonly title: string;
  readonly description: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly requiredAssetBindings: readonly string[];
  readonly heroBinding: string;
  readonly hitEffectBinding: string;
  readonly diagnosticCode: string;
}

const LEGACY_DEFENSE_HOST_PROOF_DEFINITIONS: Readonly<Record<
  (typeof LEGACY_DEFENSE_HOST_PROOF_IDS)[number],
  LegacyDefenseHostProofDefinition
>> = Object.freeze({
  "castle-defense": Object.freeze({
    id: CASTLE_DEFENSE_HOST_PROOF_ID,
    title: "Castle Defense",
    description: "Defend the castle by choosing the gate that matches the active sentence translation.",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(getLegacyDefenseSelectedSemanticKeys("castle-defense")),
    heroBinding: "top-down/32x32/characters/hero-01",
    hitEffectBinding: "effects/32x32/combat/hit-01",
    diagnosticCode: "CASTLE_DEFENSE_HOST_PROOF_ACTION",
  }),
  "wizard-vs-zombie": Object.freeze({
    id: WIZARD_VS_ZOMBIE_HOST_PROOF_ID,
    title: "Wizard vs Zombie",
    description: "Choose the ward matching the active vocabulary translation before launching.",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(getLegacyDefenseSelectedSemanticKeys("wizard-vs-zombie")),
    heroBinding: "top-down/32x32/characters/hero-01",
    hitEffectBinding: "effects/32x32/combat/hit-01",
    diagnosticCode: "WIZARD_VS_ZOMBIE_HOST_PROOF_ACTION",
  }),
  "village-guardian": Object.freeze({
    id: VILLAGE_GUARDIAN_HOST_PROOF_ID,
    title: "Village Guardian",
    description: "Guard the village by matching the active sentence translation gate.",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(getLegacyDefenseSelectedSemanticKeys("village-guardian")),
    heroBinding: "top-down/32x32/characters/hero-01",
    hitEffectBinding: "effects/32x32/combat/hit-01",
    diagnosticCode: "VILLAGE_GUARDIAN_HOST_PROOF_ACTION",
  }),
});

/** @deprecated Use LEGACY_DEFENSE_HOST_PROOF_DEFINITIONS["castle-defense"]. */
const CASTLE_DEFENSE_HOST_PROOF_DEFINITION = LEGACY_DEFENSE_HOST_PROOF_DEFINITIONS["castle-defense"];


/**
 * Resolves the selected physical pack files used by the Castle Defense gate scene.
 * @param edition Validated edition selected by the server host.
 * @param definition Title definition that pins semantic bindings.
 * @returns Texture keys emitted by the standard asset preloader.
 */
function resolveCastleDefenseGateAssets(
  edition: RuntimeEdition,
  definition: LegacyDefenseHostProofDefinition,
): CastleDefenseGatePresentationAssets {
  return Object.freeze({
    heroTextureKey: resolveAssetBinding(edition, definition.heroBinding).textureKey,
    hitEffectTextureKey: resolveAssetBinding(edition, definition.hitEffectBinding).textureKey,
  });
}

/**
 * Produces a valid display result from Castle Defense title-owned gate state.
 * @param state The current title-owned gate state.
 * @returns The canonical five-field cartridge result.
 */
function castleDefenseResultFromState(state: CastleDefenseGateState): GameResults {
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
 * Draws one Castle Defense gate scene using title-owned input and selected assets.
 * @param scene The Phaser scene supplied by the runtime.
 * @param definition Title presentation metadata.
 * @param input The validated sentence prompt data.
 * @param state The current title-owned mechanic state.
 * @param assets Texture keys resolved from the selected edition.
 * @param composition Current responsive geometry owned by this title scene.
 */
function renderCastleDefenseGate(
  scene: CastleDefenseGateScene | undefined,
  definition: LegacyDefenseHostProofDefinition,
  input: SentenceInput | VocabularyInput,
  state: CastleDefenseGateState,
  assets: CastleDefenseGatePresentationAssets,
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
 * Applies one verified Castle Defense gate choice.
 * @param state Mutable title-owned state for the mounted session.
 * @param correct Whether the player chose the translation-matching gate.
 */
function chooseCastleDefenseGate(state: CastleDefenseGateState, correct: boolean): void {
  if (state.completed) return;
  state.attempts += 1;
  if (correct) state.correctAnswers += 1;
  state.feedback = correct ? "correct" : "incorrect";
}

/**
 * Emits one title-owned action for the host's signed-attempt transport.
 * @param context Runtime services for the mounted session.
 * @param definition Title that owns the diagnostic code.
 * @param action Action produced by the real Castle Defense gate mechanic.
 * @param startedAt Browser timestamp captured when this cartridge was created.
 */
function emitCastleDefenseTitleAction(
  context: CartridgeGameConfigContext,
  definition: LegacyDefenseHostProofDefinition,
  action: CastleDefenseGateRecordedAction,
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
function readCastleDefenseTitleInput(
  context: CartridgeGameConfigContext,
  composition: SupportedResponsiveComposition | undefined,
): CastleDefenseGateInputAction {
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
 * Creates one Castle Defense gate host-proof cartridge from its frozen definition.
 * @param definition Title metadata and selected-union presentation bindings.
 * @returns A runtime cartridge that owns its gate mechanic and emits one result.
 */
async function loadCastleDefenseGateHostProofCartridge(
  definition: LegacyDefenseHostProofDefinition,
): Promise<RuntimeCartridge> {
  const cartridge: RuntimeCartridge = {
    manifest: {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      version: "1.0.0",
      runtimeApiVersion: APK_RUNTIME_API_VERSION,
      inputMode: definition.inputMode,
      requiredAssetBindings: definition.requiredAssetBindings,
      capabilities: [
        "capability:input-action-normalization",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:responsive-recomposition",
      ],
    },
    createGameConfig(context): Readonly<Record<string, unknown>> {
      const input = definition.inputMode === "vocabulary"
        ? vocabularyInputSchema.parse(context.input)
        : sentenceInputSchema.parse(context.input);
      const assets = resolveCastleDefenseGateAssets(context.edition, definition);
      const startedAt = Date.now();
      const state: CastleDefenseGateState = {
        attempts: 0,
        correctAnswers: 0,
        completed: false,
        feedback: "ready",
      };
      let composition = context.composition;
      return {
        scene: {
          preload(this: CastleDefenseGateScene): void {
            if (!this.load) throw new Error(`${definition.title} scene cannot preload selected assets`);
            preloadAssetBindings(this.load, context.edition, definition.requiredAssetBindings);
          },
          create(this: CastleDefenseGateScene): void {
            renderCastleDefenseGate(this, definition, input, state, assets, composition);
          },
          apkRecompose(this: CastleDefenseGateScene, nextComposition: SupportedResponsiveComposition): void {
            composition = nextComposition;
            renderCastleDefenseGate(this, definition, input, state, assets, composition);
          },
          update(this: CastleDefenseGateScene): void {
            const action = readCastleDefenseTitleInput(context, composition);
            if (state.completed) return;
            if (action.choice !== undefined) {
              chooseCastleDefenseGate(state, action.choice);
              emitCastleDefenseTitleAction(context, definition, {
                kind: "choose-gate",
                gate: action.choice ? "right" : "left",
              }, startedAt);
              renderCastleDefenseGate(this, definition, input, state, assets, composition);
            }
            if (state.attempts > 0 && action.launch) {
              state.completed = true;
              state.feedback = "completed";
              emitCastleDefenseTitleAction(context, definition, { kind: "launch" }, startedAt);
              context.complete(castleDefenseResultFromState(state));
              renderCastleDefenseGate(this, definition, input, state, assets, composition);
            }
          },
        },
      };
    },
  };
  return Object.freeze(cartridge);
}

/**
 * Creates the Castle Defense legacy-defense host-proof cartridge.
 * @returns A runtime cartridge that owns its sentence gate mechanic and emits one result.
 */
export async function loadCastleDefenseHostProofCartridge(): Promise<RuntimeCartridge> {
  return loadCastleDefenseGateHostProofCartridge(CASTLE_DEFENSE_HOST_PROOF_DEFINITION);
}

/**
 * Creates the Wizard vs Zombie host-proof cartridge.
 * @returns A runtime cartridge that owns its gate mechanic and emits one result.
 */
export async function loadWizardVsZombieHostProofCartridge(): Promise<RuntimeCartridge> {
  return loadCastleDefenseGateHostProofCartridge(LEGACY_DEFENSE_HOST_PROOF_DEFINITIONS["wizard-vs-zombie"]);
}

/**
 * Creates the Village Guardian host-proof cartridge.
 * @returns A runtime cartridge that owns its gate mechanic and emits one result.
 */
export async function loadVillageGuardianHostProofCartridge(): Promise<RuntimeCartridge> {
  return loadCastleDefenseGateHostProofCartridge(LEGACY_DEFENSE_HOST_PROOF_DEFINITIONS["village-guardian"]);
}

/**
 * Loads one current-source Legacy Defense host-proof cartridge.
 * @param cartridgeId Untrusted defense title identifier.
 * @returns The matching runtime cartridge.
 * @throws When the title is historical-blocked or unknown.
 */
export async function loadLegacyDefenseHostProofCartridge(cartridgeId: string): Promise<RuntimeCartridge> {
  if (cartridgeId === STORM_CASTLE_TOWER_HOST_PROOF_ID) {
    throw new Error("Storm the Castle Tower is historical-blocked for host proof");
  }
  if ((LEGACY_DEFENSE_HOST_PROOF_IDS as readonly string[]).includes(cartridgeId)) {
    return loadCastleDefenseGateHostProofCartridge(
      LEGACY_DEFENSE_HOST_PROOF_DEFINITIONS[cartridgeId as (typeof LEGACY_DEFENSE_HOST_PROOF_IDS)[number]],
    );
  }
  throw new Error(`Unknown legacy-defense host-proof cartridge: ${cartridgeId}`);
}
