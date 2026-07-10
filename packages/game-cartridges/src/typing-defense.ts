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

const TYPING_DEFENSE_ASSET_SLOTS = [
  GAMEPLAY_ASSET_SLOTS[0],
  GAMEPLAY_ASSET_SLOTS[4],
  GAMEPLAY_ASSET_SLOTS[5],
  GAMEPLAY_ASSET_SLOTS[6],
] as const;

/** One typed-answer enemy wave. */
export interface TypingDefenseWave extends VocabularyItem {
  /** Stable wave sequence number after seeded shuffling. */
  waveNumber: number;
}

/** Deterministic learning state for typing defense. */
export interface TypingDefenseState {
  /** Seeded enemy wave order. */
  waves: readonly TypingDefenseWave[];
  /** Active enemy wave index. */
  waveIndex: number;
  /** Current display score. */
  score: number;
  /** Number of defeated enemies. */
  correctAnswers: number;
  /** Total submitted answers. */
  totalAttempts: number;
  /** Whether every enemy wave is complete. */
  complete: boolean;
  /** Frozen ABI result emitted after completion. */
  results?: GameResults;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** Creates a bounded touch-choice set that always includes the correct answer.
 * @param correctAnswer Translation that must remain selectable.
 * @param translations Candidate translations from the current vocabulary session.
 * @param seed Reproducible random seed.
 * @param maximumChoices Maximum number of visible touch choices.
 * @returns Seeded choices containing the correct answer and distinct distractors.
 */
export function createTouchAnswers(
  correctAnswer: string,
  translations: readonly string[],
  seed: number,
  maximumChoices: number,
): string[] {
  if (maximumChoices < 1) return [];
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  const distractors = Array.from(
    new Map(
      translations
        .filter((translation) => normalizeAnswer(translation) !== normalizedCorrect)
        .map((translation) => [normalizeAnswer(translation), translation]),
    ).values(),
  );
  const random = createSeededRandom(seed);
  const selectedDistractors = seededShuffle(distractors, random).slice(
    0,
    Math.max(0, maximumChoices - 1),
  );
  return seededShuffle([correctAnswer, ...selectedDistractors], random);
}

/** Creates a deterministic typing-defense wave order.
 * @param input Vocabulary items supplied by the host.
 * @param seed Reproducible random seed.
 * @returns Initial typing-defense state.
 * @throws When no vocabulary items are supplied.
 */
export function createTypingDefenseState(
  input: VocabularyInput,
  seed: number,
): TypingDefenseState {
  if (input.length === 0) {
    throw new Error("Typing Defense requires at least one vocabulary item");
  }
  if (input.some(({ term, translation }) => !term.trim() || !translation.trim())) {
    throw new Error("Typing Defense requires non-empty terms and translations");
  }
  const random = createSeededRandom(seed);
  const waves = seededShuffle(input, random).map((item, waveNumber) => ({
    ...item,
    waveNumber,
  }));
  return {
    waves,
    waveIndex: 0,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    complete: false,
  };
}

/** Applies a typed translation attempt to deterministic defense state.
 * @param state Current typing-defense state.
 * @param answer Player-entered translation.
 * @returns A new state with wave progress and optional final results.
 */
export function submitDefenseAnswer(
  state: TypingDefenseState,
  answer: string,
): TypingDefenseState {
  if (state.complete) return state;
  const wave = state.waves[state.waveIndex];
  if (!wave) return state;

  const correct = normalizeAnswer(answer) === normalizeAnswer(wave.translation);
  const totalAttempts = state.totalAttempts + 1;
  const correctAnswers = state.correctAnswers + (correct ? 1 : 0);
  const score = state.score + (correct ? 120 : -30);
  const waveIndex = state.waveIndex + (correct ? 1 : 0);
  const complete = waveIndex >= state.waves.length;
  return {
    ...state,
    waveIndex,
    totalAttempts,
    correctAnswers,
    score,
    complete,
    results: complete
      ? createGameResults(score, correctAnswers, totalAttempts)
      : undefined,
  };
}

/* v8 ignore start -- Phaser scene lifecycle is verified by browser QC rather than DOM-free unit coverage. */
/** Creates a Phaser configuration for the typing-defense cartridge.
 * @param options Stable input, edition, callbacks, and deterministic seed.
 * @returns Phaser configuration using physics, timers, tweens, and pooling.
 */
export function createTypingDefenseGameConfig(
  options: CartridgeGameConfigOptions<VocabularyInput>,
): Phaser.Types.Core.GameConfig {
  let model = createTypingDefenseState(options.input, options.seed);
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
        preloadSemanticAssets(this.load, options.edition, TYPING_DEFENSE_ASSET_SLOTS);
      },
      create(this: Phaser.Scene) {
        model = createTypingDefenseState(options.input, options.seed);
        completed = false;
        let typed = "";
        let touchAnswers: string[] = [];
        let submit: (answer?: string) => void = () => undefined;
        const pool: Phaser.GameObjects.Text[] = [];
        let activeEnemy: Phaser.GameObjects.Text | undefined;

        if (this.textures.exists(GAMEPLAY_ASSET_SLOTS[0])) {
          this.add
            .image(480, 270, GAMEPLAY_ASSET_SLOTS[0])
            .setDisplaySize(960, 540)
            .setDepth(-10);
        }

        this.add.rectangle(
          480,
          505,
          880,
          44,
          options.edition.palette.friendly,
        );
        const prompt = this.add
          .text(480, 70, "", {
            color: options.edition.palette.text,
            fontFamily: "sans-serif",
            fontSize: "34px",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        const typedText = this.add
          .text(480, 455, "Type the translation…", {
            color: "#f8fafc",
            backgroundColor: "#1e293b",
            fontFamily: "monospace",
            fontSize: "25px",
            padding: { x: 18, y: 12 },
          })
          .setOrigin(0.5);
        const touchChoices = [150, 370, 590, 810].map((x, index) =>
          this.add
            .text(x, 405, "", {
              color: "#f8fafc",
              backgroundColor: "#334155",
              fontSize: "18px",
              padding: { x: 12, y: 10 },
            })
            .setOrigin(0.5)
            .setInteractive()
            .on("pointerdown", () => submit(touchAnswers[index] ?? "")),
        );

        const acquireEnemy = () => {
          const reused = pool.pop();
          if (reused) return reused.setVisible(true).setActive(true);
          const enemy = this.add
            .text(480, 130, "", {
              color: "#f8fafc",
              backgroundColor: "#7f1d1d",
              fontSize: "24px",
              padding: { x: 20, y: 14 },
            })
            .setOrigin(0.5);
          this.physics.add.existing(enemy);
          return enemy;
        };

        const releaseEnemy = (enemy: Phaser.GameObjects.Text) => {
          this.tweens.killTweensOf(enemy);
          enemy.setActive(false).setVisible(false);
          pool.push(enemy);
        };

        const showWave = () => {
          const wave = model.waves[model.waveIndex];
          if (!wave) return;
          if (activeEnemy) releaseEnemy(activeEnemy);
          activeEnemy = acquireEnemy();
          activeEnemy.setPosition(480, 130).setText(wave.term);
          prompt.setText(`Defend with: ${wave.term}`);
          touchAnswers = createTouchAnswers(
            wave.translation,
            model.waves.map((candidate) => candidate.translation),
            options.seed + model.waveIndex + 1_000,
            touchChoices.length,
          );
          touchChoices.forEach((choice, index) => {
            const answer = touchAnswers[index];
            choice.setText(answer ?? "").setVisible(answer !== undefined);
          });
          this.tweens.add({
            targets: activeEnemy,
            y: 390,
            duration: 5_000 / options.edition.tuning.speed,
            ease: "Linear",
            onComplete: () => {
              options.diagnostics({
                type: "error",
                details: { code: "enemy-reached-wall", wave: model.waveIndex },
              });
              activeEnemy?.setPosition(480, 130);
              showWave();
            },
          });
          options.diagnostics({
            type: "round",
            details: { waveIndex: model.waveIndex },
          });
        };

        submit = (answer: string = typed) => {
          const previousWave = model.waveIndex;
          model = submitDefenseAnswer(model, answer);
          const correct = model.waveIndex > previousWave;
          options.diagnostics({
            type: "answer",
            details: { correct, waveIndex: previousWave },
          });
          typed = "";
          typedText.setText("Type the translation…");
          if (correct && activeEnemy) {
            this.cameras.main.flash(
              80,
              52,
              211,
              153,
              false,
              undefined,
              undefined,
            );
          } else if (!correct) {
            this.cameras.main.shake(
              90,
              0.004 * options.edition.tuning.intensity,
            );
          }
          if (model.complete && model.results && !completed) {
            completed = true;
            if (activeEnemy) releaseEnemy(activeEnemy);
            options.diagnostics({ type: "complete", details: model.results });
            options.complete(model.results);
            return;
          }
          if (correct) showWave();
        };

        this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
          if (event.key === "Enter") {
            submit();
          } else if (event.key === "Backspace") {
            typed = typed.slice(0, -1);
            typedText.setText(typed || "Type the translation…");
          } else if (event.key.length === 1) {
            typed += event.key;
            typedText.setText(typed);
          }
        });

        this.time.addEvent({
          delay: 1_000,
          loop: true,
          callback: () =>
            options.diagnostics({
              type: "round",
              details: { waveIndex: model.waveIndex, heartbeat: true },
            }),
        });
        showWave();
        options.diagnostics({ type: "scene-ready" });
      },
    },
  };
}

/** Public Magic Defense cartridge backed by the typing-defense mechanic. */
export const magicDefenseCartridge: GameCartridgeDefinition = {
  manifest: {
    id: "magic-defense",
    title: "Magic Defense",
    description: "Type translations to stop enemies before they reach the wall.",
    inputMode: "vocabulary",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["arcade-physics", "timers", "tweens", "object-pool"],
    requiredAssetSlots: TYPING_DEFENSE_ASSET_SLOTS,
  },
  createGameConfig: (context) =>
    createTypingDefenseGameConfig({
      input: context.input as VocabularyInput,
      edition: context.edition,
      complete: (result) => context.complete(result),
      diagnostics: (event) => context.diagnostic(toAPKDiagnostic(event)),
      seed: context.seed ?? Date.now(),
    }),
};

export default magicDefenseCartridge;
/* v8 ignore stop */
