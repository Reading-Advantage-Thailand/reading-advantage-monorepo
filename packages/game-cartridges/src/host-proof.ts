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
  vocabularyInputSchema,
  type GameResults,
  type VocabularyInput,
} from "@reading-advantage/game-contracts";

/** Stable public identifier for the first real host-proof cartridge. */
export const DRAGON_FLIGHT_HOST_PROOF_ID = "dragon-flight" as const;

/** Exact selected standard-pack roles used by Dragon Flight's runtime presentation. */
export const DRAGON_FLIGHT_REQUIRED_ASSET_BINDINGS = Object.freeze([
  "audio/native/combat/hit-01",
  "effects/32x32/combat/hit-01",
  "top-down/32x32/characters/hero-01",
] as const);

interface DragonFlightState {
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

interface DragonFlightScene {
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

interface DragonFlightInputAction {
  choice?: boolean;
  launch: boolean;
}

interface DragonFlightPresentationAssets {
  readonly heroTextureKey: string;
  readonly hitEffectTextureKey: string;
  readonly hitAudioKey: string;
}

type DragonFlightRecordedAction =
  | { readonly kind: "choose-gate"; readonly gate: "left" | "right" }
  | { readonly kind: "launch" };

/**
 * Resolves the selected physical pack files used by this title's real scene.
 * @param edition Validated edition selected by the server host.
 * @returns Texture and audio keys emitted by the standard asset preloader.
 */
function resolvePresentationAssets(edition: RuntimeEdition): DragonFlightPresentationAssets {
  return Object.freeze({
    heroTextureKey: resolveAssetBinding(edition, "top-down/32x32/characters/hero-01").textureKey,
    hitEffectTextureKey: resolveAssetBinding(edition, "effects/32x32/combat/hit-01").textureKey,
    hitAudioKey: resolveAssetBinding(edition, "audio/native/combat/hit-01").textureKey,
  });
}

/**
 * Produces a valid display result from Dragon Flight's title-owned gate state.
 * @param state The current title-owned gate state.
 * @returns The canonical five-field cartridge result.
 */
function resultFromState(state: DragonFlightState): GameResults {
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
 * Draws the live Dragon Flight gate scene using title-owned input and selected assets.
 * @param scene The Phaser scene supplied by the runtime.
 * @param input The validated vocabulary prompt data.
 * @param state The current title-owned mechanic state.
 * @param assets Texture and audio keys resolved from the selected edition.
 * @param composition Current responsive geometry owned by this title scene.
 */
function renderDragonFlight(
  scene: DragonFlightScene | undefined,
  input: VocabularyInput,
  state: DragonFlightState,
  assets: DragonFlightPresentationAssets,
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
  add.text?.(x + width / 2, y + height * 0.08, "Dragon Flight", { ...centered, fontSize: "34px" }).setOrigin?.(0.5);
  add.text?.(x + width / 2, y + height * 0.18, `Fly through the gate matching: ${prompt.term}`, centered).setOrigin?.(0.5);
  add.text?.(x + width * 0.23, y + height * 0.63, "LEFT GATE\nwrong route", centered).setOrigin?.(0.5);
  add.text?.(x + width * 0.77, y + height * 0.63, `RIGHT GATE\n${prompt.translation}`, centered).setOrigin?.(0.5);
  add.text?.(
    x + width / 2,
    y + height * 0.9,
    state.completed
      ? `Flight complete · ${state.correctAnswers}/${state.attempts} correct`
      : `Attempts ${state.attempts} · ${state.feedback} · arrows or tap gates; Enter launches`,
    { ...centered, fontSize: "20px" },
  ).setOrigin?.(0.5);
}

/**
 * Applies one verified Dragon Flight gate choice.
 * @param state Mutable title-owned state for the mounted session.
 * @param correct Whether the player chose the translation-matching gate.
 */
function chooseGate(state: DragonFlightState, correct: boolean): void {
  if (state.completed) return;
  state.attempts += 1;
  if (correct) state.correctAnswers += 1;
  state.feedback = correct ? "correct" : "incorrect";
}

/**
 * Emits one title-owned action for the host's signed-attempt transport.
 * @param context Runtime services for the mounted session.
 * @param action Action produced by the real Dragon Flight mechanic.
 * @param startedAt Browser timestamp captured when this cartridge was created.
 */
function emitTitleAction(
  context: CartridgeGameConfigContext,
  action: DragonFlightRecordedAction,
  startedAt: number,
): void {
  context.diagnostic({
    level: "info",
    code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
    message: action.kind === "launch" ? "Dragon Flight launch requested" : `Dragon Flight ${action.gate} gate chosen`,
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
): DragonFlightInputAction {
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
 * Creates the first real Reading/Primary host-proof cartridge for Dragon Flight.
 * @returns A runtime cartridge that owns its vocabulary gate mechanic and emits one result.
 */
export async function loadDragonFlightHostProofCartridge(): Promise<RuntimeCartridge> {
  const cartridge: RuntimeCartridge = {
    manifest: {
      id: DRAGON_FLIGHT_HOST_PROOF_ID,
      title: "Dragon Flight",
      description: "Fly through the gate that matches the active vocabulary translation.",
      version: "1.0.0",
      runtimeApiVersion: APK_RUNTIME_API_VERSION,
      inputMode: "vocabulary",
      requiredAssetBindings: DRAGON_FLIGHT_REQUIRED_ASSET_BINDINGS,
      capabilities: [
        "capability:input-action-normalization",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:responsive-recomposition",
      ],
    },
    createGameConfig(context): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const assets = resolvePresentationAssets(context.edition);
      const startedAt = Date.now();
      const state: DragonFlightState = {
        attempts: 0,
        correctAnswers: 0,
        completed: false,
        feedback: "ready",
      };
      let composition = context.composition;
      return {
        scene: {
          preload(this: DragonFlightScene): void {
            if (!this.load) throw new Error("Dragon Flight scene cannot preload selected assets");
            preloadAssetBindings(this.load, context.edition, DRAGON_FLIGHT_REQUIRED_ASSET_BINDINGS);
          },
          create(this: DragonFlightScene): void {
            renderDragonFlight(this, input, state, assets, composition);
          },
          apkRecompose(this: DragonFlightScene, nextComposition: SupportedResponsiveComposition): void {
            composition = nextComposition;
            renderDragonFlight(this, input, state, assets, composition);
          },
          update(this: DragonFlightScene): void {
            const action = readTitleInput(context, composition);
            if (state.completed) return;
            if (action.choice !== undefined) {
              chooseGate(state, action.choice);
              emitTitleAction(context, {
                kind: "choose-gate",
                gate: action.choice ? "right" : "left",
              }, startedAt);
              if (action.choice) this.sound?.play?.(assets.hitAudioKey, { volume: 0.15 });
              renderDragonFlight(this, input, state, assets, composition);
            }
            if (state.attempts > 0 && action.launch) {
              state.completed = true;
              state.feedback = "completed";
              emitTitleAction(context, { kind: "launch" }, startedAt);
              context.complete(resultFromState(state));
              renderDragonFlight(this, input, state, assets, composition);
            }
          },
        },
      };
    },
  };
  return Object.freeze(cartridge);
}
