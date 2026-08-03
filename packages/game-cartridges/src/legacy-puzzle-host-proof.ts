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

/** Puzzle cohort host-proof title identifiers. */
export const LEGACY_PUZZLE_HOST_PROOF_IDS = Object.freeze([
  "enchanted-library",
  "rune-match",
  "alchemists-synthesis",
  "potion-rush",
  "rune-forge-chamber",
] as const);

export type LegacyPuzzleHostProofId = (typeof LEGACY_PUZZLE_HOST_PROOF_IDS)[number];

/** Shared selected-union presentation keys for puzzle gate host-proof. */
export const LEGACY_PUZZLE_HOST_PROOF_ASSET_BINDINGS = Object.freeze([
  "effects/32x32/combat/hit-01",
  "top-down/32x32/characters/hero-01",
] as const);

interface GateState {
  attempts: number;
  correctAnswers: number;
  completed: boolean;
  feedback: "ready" | "correct" | "incorrect" | "completed";
}

interface GateScene {
  load?: PhysicalAssetLoader;
  add?: {
    graphics?(): {
      fillStyle?(c: number, a?: number): unknown;
      fillRect?(x: number, y: number, w: number, h: number): unknown;
      lineStyle?(w: number, c: number, a?: number): unknown;
      strokeRect?(x: number, y: number, w: number, h: number): unknown;
    };
    image?(x: number, y: number, texture: string): { setOrigin?(x: number, y?: number): unknown; setScale?(s: number): unknown };
    text?(x: number, y: number, value: string, style: Readonly<Record<string, unknown>>): { setOrigin?(x: number, y?: number): unknown };
  };
  children?: { removeAll?(destroy?: boolean): void };
  scale?: { width?: number; height?: number };
}

const TITLES: Readonly<Record<LegacyPuzzleHostProofId, string>> = Object.freeze({
  "enchanted-library": "Enchanted Library",
  "rune-match": "Rune Match",
  "alchemists-synthesis": "Alchemist's Synthesis",
  "potion-rush": "Potion Rush",
  "rune-forge-chamber": "Rune Forge Chamber",
});

/**
 * Creates one Legacy Puzzle host-proof gate cartridge.
 * @param cartridgeId Puzzle title identifier.
 * @returns Runtime cartridge with single-completion emission.
 * @throws When the identifier is not a puzzle host-proof title.
 */
export async function loadLegacyPuzzleHostProofCartridge(
  cartridgeId: string,
): Promise<RuntimeCartridge> {
  if (!(LEGACY_PUZZLE_HOST_PROOF_IDS as readonly string[]).includes(cartridgeId)) {
    throw new Error(`Unknown legacy-puzzle host-proof cartridge: ${cartridgeId}`);
  }
  const id = cartridgeId as LegacyPuzzleHostProofId;
  const title = TITLES[id];
  const definition = Object.freeze({
    id,
    title,
    description: `${title} host-proof gate matching vocabulary translation.`,
    requiredAssetBindings: LEGACY_PUZZLE_HOST_PROOF_ASSET_BINDINGS,
    heroBinding: "top-down/32x32/characters/hero-01",
    hitEffectBinding: "effects/32x32/combat/hit-01",
    diagnosticCode: `${id.toUpperCase().replace(/-/g, "_")}_HOST_PROOF_ACTION`,
  });

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
      const edition: RuntimeEdition = context.edition;
      const assets = Object.freeze({
        heroTextureKey: resolveAssetBinding(edition, definition.heroBinding).textureKey,
        hitEffectTextureKey: resolveAssetBinding(edition, definition.hitEffectBinding).textureKey,
      });
      const startedAt = Date.now();
      const state: GateState = { attempts: 0, correctAnswers: 0, completed: false, feedback: "ready" };
      let composition = context.composition;

      const resultFromState = (s: GateState): GameResults => {
        const accuracy = s.attempts === 0 ? 0 : s.correctAnswers / s.attempts;
        return gameResultsSchema.parse({
          accuracy,
          xp: Math.round(accuracy * 5),
          score: s.correctAnswers * 100,
          correctAnswers: s.correctAnswers,
          totalAttempts: s.attempts,
        });
      };

      const render = (scene: GateScene | undefined): void => {
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
        const prompt = (input as VocabularyInput)[0];
        if (!prompt) return;
        const graphics = add.graphics?.();
        graphics?.fillStyle?.(0x0b1426, 1);
        graphics?.fillRect?.(0, 0, sceneWidth, sceneHeight);
        graphics?.fillStyle?.(0x8f3434, 1);
        graphics?.fillRect?.(x + width * 0.03, y + height * 0.48, width * 0.4, height * 0.32);
        graphics?.fillStyle?.(0x23764a, 1);
        graphics?.fillRect?.(x + width * 0.58, y + height * 0.48, width * 0.39, height * 0.32);
        const hero = add.image?.(x + width / 2, y + height * 0.34, assets.heroTextureKey);
        hero?.setOrigin?.(0.5);
        hero?.setScale?.(3);
        const effect = add.image?.(x + width / 2, y + height * 0.46, assets.hitEffectTextureKey);
        effect?.setOrigin?.(0.5);
        effect?.setScale?.(2);
        const centered = { fontFamily: "sans-serif", fontSize: "28px", color: "#f4f0dc", align: "center" };
        add.text?.(x + width / 2, y + height * 0.08, definition.title, { ...centered, fontSize: "34px" }).setOrigin?.(0.5);
        add.text?.(x + width / 2, y + height * 0.18, `Match: ${prompt.term}`, centered).setOrigin?.(0.5);
        add.text?.(x + width * 0.23, y + height * 0.63, "LEFT\nwrong", centered).setOrigin?.(0.5);
        add.text?.(x + width * 0.77, y + height * 0.63, `RIGHT\n${prompt.translation}`, centered).setOrigin?.(0.5);
        add.text?.(
          x + width / 2,
          y + height * 0.9,
          state.completed
            ? `Complete · ${state.correctAnswers}/${state.attempts}`
            : `Attempts ${state.attempts} · ${state.feedback}`,
          { ...centered, fontSize: "20px" },
        ).setOrigin?.(0.5);
      };

      const emit = (
        context: CartridgeGameConfigContext,
        action: { kind: "choose-gate"; gate: "left" | "right" } | { kind: "launch" },
      ): void => {
        context.diagnostic({
          level: "info",
          code: definition.diagnosticCode,
          message: action.kind === "launch" ? `${title} launch` : `${title} ${action.gate}`,
          details: { ...action, elapsedMs: Math.max(0, Math.round(Date.now() - startedAt)) },
        });
      };

      return {
        scene: {
          preload(this: GateScene): void {
            if (!this.load) throw new Error(`${title} cannot preload`);
            preloadAssetBindings(this.load, context.edition, definition.requiredAssetBindings);
          },
          create(this: GateScene): void {
            render(this);
          },
          apkRecompose(this: GateScene, next: SupportedResponsiveComposition): void {
            composition = next;
            render(this);
          },
          update(this: GateScene): void {
            if (state.completed) return;
            const snapshot = context.inputController.snapshot();
            const launch = Boolean(snapshot.pressed?.some((key) => key === "Enter" || key === "Space"));
            let choice: boolean | undefined;
            if (snapshot.pressed?.some((key) => key === "ArrowLeft")) choice = false;
            else if (snapshot.pressed?.some((key) => key === "ArrowRight")) choice = true;
            else if (snapshot.pointer.released && !snapshot.pointer.cancelled) {
              const midpoint = (composition?.safeRect.x ?? 0) + (composition?.safeRect.width ?? 960) / 2;
              choice = snapshot.pointer.x >= midpoint;
            }
            if (choice !== undefined) {
              state.attempts += 1;
              if (choice) state.correctAnswers += 1;
              state.feedback = choice ? "correct" : "incorrect";
              emit(context, { kind: "choose-gate", gate: choice ? "right" : "left" });
              render(this);
            }
            if (state.attempts > 0 && launch) {
              state.completed = true;
              state.feedback = "completed";
              emit(context, { kind: "launch" });
              context.complete(resultFromState(state));
              render(this);
            }
          },
        },
      };
    },
  };
  return Object.freeze(cartridge);
}
