import type {
  GameResults,
  VocabularyInput,
  VocabularyItem,
} from "@reading-advantage/game-contracts";
import { preloadSemanticAssets } from "@reading-advantage/advantage-play-kit";
import type Phaser from "phaser";

import { GAMEPLAY_ASSET_SLOTS } from "./editions";
import { createSeededRandom, seededShuffle } from "./internal/random";
import { createGameResults } from "./internal/results";
import type {
  CartridgeGameConfigOptions,
  GameCartridgeDefinition,
} from "./internal/types";
import { toAPKDiagnostic } from "./internal/types";

const GATE_RUNNER_ASSET_SLOTS = [
  GAMEPLAY_ASSET_SLOTS[0],
  GAMEPLAY_ASSET_SLOTS[1],
  GAMEPLAY_ASSET_SLOTS[2],
  GAMEPLAY_ASSET_SLOTS[3],
] as const;

/** One vocabulary decision presented as two physical gates. */
export interface GateRunnerRound {
  /** Vocabulary prompt shown above the track. */
  term: string;
  /** Translation that advances the learning loop. */
  correctTranslation: string;
  /** Translation choices mapped to left and right gates. */
  options: readonly [string, string];
  /** Index of the correct gate in the options tuple. */
  correctOptionIndex: number;
}

/** Deterministic learning state for the gate-runner mechanic. */
export interface GateRunnerState {
  /** Precomputed round order and gate placement. */
  rounds: readonly GateRunnerRound[];
  /** Active round index. */
  roundIndex: number;
  /** Current display score. */
  score: number;
  /** Number of correct gate choices. */
  correctAnswers: number;
  /** Total gate-choice attempts. */
  totalAttempts: number;
  /** Whether every vocabulary round is complete. */
  complete: boolean;
  /** Frozen ABI result emitted after completion. */
  results?: GameResults;
}

function buildRound(
  item: VocabularyItem,
  distractor: VocabularyItem,
  random: () => number,
): GateRunnerRound {
  const correctOptionIndex = random() < 0.5 ? 0 : 1;
  const options: [string, string] =
    correctOptionIndex === 0
      ? [item.translation, distractor.translation]
      : [distractor.translation, item.translation];
  return {
    term: item.term,
    correctTranslation: item.translation,
    options,
    correctOptionIndex,
  };
}

/** Creates deterministic gate rounds from the stable vocabulary array.
 * @param input Vocabulary items supplied by the host.
 * @param seed Reproducible random seed.
 * @returns Initial gate-runner state.
 * @throws When fewer than two vocabulary items are supplied.
 */
export function createGateRunnerState(
  input: VocabularyInput,
  seed: number,
): GateRunnerState {
  if (input.length < 2) {
    throw new Error("Gate Runner requires at least two vocabulary items");
  }
  if (input.some(({ term, translation }) => !term.trim() || !translation.trim())) {
    throw new Error("Gate Runner requires non-empty terms and translations");
  }
  const distinctTranslations = new Set(
    input.map(({ translation }) => translation.trim().toLocaleLowerCase()),
  );
  if (distinctTranslations.size < 2) {
    throw new Error("Gate Runner requires at least two distinct translations");
  }
  const random = createSeededRandom(seed);
  const items = seededShuffle(input, random);
  const rounds = items.map((item) => {
    const normalizedTranslation = item.translation.trim().toLocaleLowerCase();
    const distractors = items.filter(
      (candidate) =>
        candidate.translation.trim().toLocaleLowerCase() !== normalizedTranslation,
    );
    const distractor = distractors[Math.floor(random() * distractors.length)]!;
    return buildRound(item, distractor, random);
  });
  return {
    rounds,
    roundIndex: 0,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    complete: false,
  };
}

/** Applies a left or right gate choice to deterministic game state.
 * @param state Current gate-runner state.
 * @param optionIndex Selected gate index.
 * @returns A new state with updated score, progress, and optional results.
 */
export function chooseGate(
  state: GateRunnerState,
  optionIndex: number,
): GateRunnerState {
  if (state.complete) return state;
  const round = state.rounds[state.roundIndex];
  if (!round || (optionIndex !== 0 && optionIndex !== 1)) return state;

  const correct = optionIndex === round.correctOptionIndex;
  const totalAttempts = state.totalAttempts + 1;
  const correctAnswers = state.correctAnswers + (correct ? 1 : 0);
  const score = state.score + (correct ? 100 : -20);
  const roundIndex = state.roundIndex + (correct ? 1 : 0);
  const complete = roundIndex >= state.rounds.length;

  return {
    ...state,
    roundIndex,
    score,
    correctAnswers,
    totalAttempts,
    complete,
    results: complete
      ? createGameResults(score, correctAnswers, totalAttempts)
      : undefined,
  };
}

/* v8 ignore start -- Phaser scene lifecycle is verified by browser QC rather than DOM-free unit coverage. */
/** Creates a Phaser configuration for the vocabulary gate-runner cartridge.
 * @param options Stable input, edition, callbacks, and deterministic seed.
 * @returns Phaser configuration using Arcade Physics, cameras, and tweens.
 */
export function createGateRunnerGameConfig(
  options: CartridgeGameConfigOptions<VocabularyInput>,
): Phaser.Types.Core.GameConfig {
  let model = createGateRunnerState(options.input, options.seed);
  let completed = false;

  return {
    width: 960,
    height: 540,
    backgroundColor: options.edition.palette.background,
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: {
      preload(this: Phaser.Scene) {
        preloadSemanticAssets(this.load, options.edition, GATE_RUNNER_ASSET_SLOTS);
      },
      create(this: Phaser.Scene) {
        model = createGateRunnerState(options.input, options.seed);
        completed = false;
        if (this.textures.exists(GAMEPLAY_ASSET_SLOTS[0])) {
          this.add
            .image(480, 270, GAMEPLAY_ASSET_SLOTS[0])
            .setDisplaySize(960, 540)
            .setDepth(-10);
        }
        const player = this.textures.exists(GAMEPLAY_ASSET_SLOTS[1])
          ? this.add
              .image(480, 440, GAMEPLAY_ASSET_SLOTS[1])
              .setDisplaySize(
                54 * options.edition.tuning.targetScale,
                72 * options.edition.tuning.targetScale,
              )
          : this.add.rectangle(
              480,
              440,
              54 * options.edition.tuning.targetScale,
              72 * options.edition.tuning.targetScale,
              options.edition.palette.player,
            );
        this.physics.add.existing(player);
        this.cameras.main.startFollow(player, true, 0.12, 0.12);

        const prompt = this.add
          .text(480, 54, model.rounds[0]!.term, {
            color: options.edition.palette.text,
            fontFamily: "sans-serif",
            fontSize: "34px",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        const left = this.add
          .text(260, 250, model.rounds[0]!.options[0], {
            color: "#f8fafc",
            backgroundColor: "#1f2937",
            fontSize: "28px",
            padding: { x: 24, y: 28 },
          })
          .setOrigin(0.5)
          .setInteractive();
        const right = this.add
          .text(700, 250, model.rounds[0]!.options[1], {
            color: "#f8fafc",
            backgroundColor: "#1f2937",
            fontSize: "28px",
            padding: { x: 24, y: 28 },
          })
          .setOrigin(0.5)
          .setInteractive();

        const select = (optionIndex: number) => {
          const previousRound = model.roundIndex;
          model = chooseGate(model, optionIndex);
          const correct = model.roundIndex > previousRound;
          options.diagnostics({
            type: "answer",
            details: { correct, roundIndex: previousRound },
          });
          this.tweens.add({
            targets: player,
            x: optionIndex === 0 ? 260 : 700,
            duration: 180 / options.edition.tuning.speed,
            yoyo: true,
          });
          if (model.complete && model.results && !completed) {
            completed = true;
            options.diagnostics({ type: "complete", details: model.results });
            options.complete(model.results);
            return;
          }
          const round = model.rounds[model.roundIndex];
          if (round) {
            prompt.setText(round.term);
            left.setText(round.options[0]);
            right.setText(round.options[1]);
            options.diagnostics({
              type: "round",
              details: { roundIndex: model.roundIndex },
            });
          }
        };

        left.on("pointerdown", () => select(0));
        right.on("pointerdown", () => select(1));
        this.input.keyboard?.on("keydown-LEFT", () => select(0));
        this.input.keyboard?.on("keydown-A", () => select(0));
        this.input.keyboard?.on("keydown-RIGHT", () => select(1));
        this.input.keyboard?.on("keydown-D", () => select(1));
        options.diagnostics({ type: "scene-ready" });
      },
    },
  };
}

/** Public Dragon Flight cartridge backed by the gate-runner mechanic. */
export const dragonFlightCartridge: GameCartridgeDefinition = {
  manifest: {
    id: "dragon-flight",
    title: "Dragon Flight",
    description: "Choose the correct translation gate while racing forward.",
    inputMode: "vocabulary",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["arcade-physics", "camera", "tweens"],
    requiredAssetSlots: GATE_RUNNER_ASSET_SLOTS,
  },
  createGameConfig: (context) =>
    createGateRunnerGameConfig({
      input: context.input as VocabularyInput,
      edition: context.edition,
      complete: (result) => context.complete(result),
      diagnostics: (event) => context.diagnostic(toAPKDiagnostic(event)),
      seed: context.seed ?? Date.now(),
    }),
};

export default dragonFlightCartridge;
/* v8 ignore stop */
