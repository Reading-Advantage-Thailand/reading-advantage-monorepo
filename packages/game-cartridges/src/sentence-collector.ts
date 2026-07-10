import type { GameResults, SentenceInput } from "@reading-advantage/game-contracts";
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

const SENTENCE_COLLECTOR_ASSET_SLOTS = [
  GAMEPLAY_ASSET_SLOTS[0],
  GAMEPLAY_ASSET_SLOTS[1],
  GAMEPLAY_ASSET_SLOTS[2],
  GAMEPLAY_ASSET_SLOTS[5],
] as const;

/** One collectible sentence token placed in the Phaser world. */
export interface SentenceToken {
  /** Stable token identity within the session. */
  id: string;
  /** Visible word or punctuation token. */
  text: string;
  /** Whether the token was collected in the correct order. */
  collected: boolean;
}

/** Deterministic learning state for sentence-order collection. */
export interface SentenceCollectorState {
  /** Stable sentence-array input retained for sentence transitions. */
  sentences: SentenceInput;
  /** Active sentence index. */
  sentenceIndex: number;
  /** Correct token order for the active sentence. */
  expectedTokens: readonly string[];
  /** Index of the next token the player must collect. */
  expectedTokenIndex: number;
  /** Shuffled token field for the active sentence. */
  tokens: readonly SentenceToken[];
  /** Seed advanced deterministically across sentence transitions. */
  seed: number;
  /** Current display score. */
  score: number;
  /** Number of correctly collected tokens. */
  correctAnswers: number;
  /** Total token collisions or selections. */
  totalAttempts: number;
  /** Whether all sentences are complete. */
  complete: boolean;
  /** Frozen ABI result emitted after completion. */
  results?: GameResults;
}

function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/u).filter(Boolean);
}

function createTokenField(
  sentenceIndex: number,
  expectedTokens: readonly string[],
  seed: number,
): SentenceToken[] {
  const random = createSeededRandom(seed);
  return seededShuffle(
    expectedTokens.map((text, tokenIndex) => ({
      id: `${sentenceIndex}-${tokenIndex}`,
      text,
      collected: false,
    })),
    random,
  );
}

/** Creates a deterministic token field from the stable sentence array.
 * @param input Sentence items supplied by the host.
 * @param seed Reproducible random seed.
 * @returns Initial sentence-collector state.
 * @throws When the sentence array is empty or its first term has no tokens.
 */
export function createSentenceCollectorState(
  input: SentenceInput,
  seed: number,
): SentenceCollectorState {
  if (input.length === 0) {
    throw new Error("Sentence Collector requires at least one sentence");
  }
  if (input.some(({ translation }) => !translation.trim())) {
    throw new Error("Sentence Collector requires non-empty translations");
  }
  const tokenizedSentences = input.map(({ term }) => tokenize(term));
  const expectedTokens = tokenizedSentences[0]!;
  if (expectedTokens.length === 0) {
    throw new Error("Sentence Collector requires a sentence with words");
  }
  if (tokenizedSentences.some((tokens) => tokens.length === 0)) {
    throw new Error("Sentence Collector requires every sentence to contain words");
  }
  return {
    sentences: input,
    sentenceIndex: 0,
    expectedTokens,
    expectedTokenIndex: 0,
    tokens: createTokenField(0, expectedTokens, seed),
    seed,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    complete: false,
  };
}

/** Applies a token collection attempt to deterministic learning state.
 * @param state Current sentence-collector state.
 * @param tokenId Selected or collided token identity.
 * @returns A new state with sentence progress and optional final results.
 */
export function collectSentenceToken(
  state: SentenceCollectorState,
  tokenId: string,
): SentenceCollectorState {
  if (state.complete) return state;
  const token = state.tokens.find((candidate) => candidate.id === tokenId);
  if (!token || token.collected) return state;

  const expected = state.expectedTokens[state.expectedTokenIndex];
  const correct = token.text === expected;
  const totalAttempts = state.totalAttempts + 1;
  const correctAnswers = state.correctAnswers + (correct ? 1 : 0);
  const score = state.score + (correct ? 100 : -50);
  if (!correct) {
    return { ...state, totalAttempts, correctAnswers, score };
  }

  const tokens = state.tokens.map((candidate) =>
    candidate.id === tokenId ? { ...candidate, collected: true } : candidate,
  );
  const expectedTokenIndex = state.expectedTokenIndex + 1;
  if (expectedTokenIndex < state.expectedTokens.length) {
    return {
      ...state,
      tokens,
      expectedTokenIndex,
      totalAttempts,
      correctAnswers,
      score,
    };
  }

  const sentenceIndex = state.sentenceIndex + 1;
  const complete = sentenceIndex >= state.sentences.length;
  if (complete) {
    return {
      ...state,
      tokens,
      expectedTokenIndex,
      sentenceIndex,
      totalAttempts,
      correctAnswers,
      score,
      complete: true,
      results: createGameResults(score, correctAnswers, totalAttempts),
    };
  }

  const nextExpectedTokens = tokenize(state.sentences[sentenceIndex]!.term);
  return {
    ...state,
    sentenceIndex,
    expectedTokens: nextExpectedTokens,
    expectedTokenIndex: 0,
    tokens: createTokenField(
      sentenceIndex,
      nextExpectedTokens,
      state.seed + sentenceIndex,
    ),
    totalAttempts,
    correctAnswers,
    score,
  };
}

/* v8 ignore start -- Phaser scene lifecycle is verified by browser QC rather than DOM-free unit coverage. */
/** Creates a Phaser configuration for sentence-order collection.
 * @param options Stable input, edition, callbacks, and deterministic seed.
 * @returns Phaser configuration using physics, cameras, particles, and tweens.
 */
export function createSentenceCollectorGameConfig(
  options: CartridgeGameConfigOptions<SentenceInput>,
): Phaser.Types.Core.GameConfig {
  let model = createSentenceCollectorState(options.input, options.seed);
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
        preloadSemanticAssets(
          this.load,
          options.edition,
          SENTENCE_COLLECTOR_ASSET_SLOTS,
        );
      },
      create(this: Phaser.Scene) {
        model = createSentenceCollectorState(options.input, options.seed);
        completed = false;
        if (this.textures.exists(GAMEPLAY_ASSET_SLOTS[0])) {
          this.add
            .image(480, 270, GAMEPLAY_ASSET_SLOTS[0])
            .setDisplaySize(960, 540)
            .setDepth(-10);
        }
        const player = this.textures.exists(GAMEPLAY_ASSET_SLOTS[1])
          ? this.add
              .image(480, 430, GAMEPLAY_ASSET_SLOTS[1])
              .setDisplaySize(
                48 * options.edition.tuning.targetScale,
                48 * options.edition.tuning.targetScale,
              )
          : this.add.circle(
              480,
              430,
              24 * options.edition.tuning.targetScale,
              options.edition.palette.player,
            );
        this.physics.add.existing(player);
        this.cameras.main.startFollow(player, true, 0.08, 0.08);

        const particleSource = this.add.graphics();
        particleSource.fillStyle(options.edition.palette.accent, 1);
        particleSource.fillCircle(3, 3, 3);
        particleSource.generateTexture("apk-sentence-particle", 6, 6);
        particleSource.destroy();
        const particles = this.add.particles(0, 0, "apk-sentence-particle", {
          lifespan: 350,
          speed: { min: 40, max: 120 },
          scale: { start: 1, end: 0 },
          emitting: false,
        });

        const prompt = this.add
          .text(480, 45, "", {
            color: options.edition.palette.text,
            fontFamily: "sans-serif",
            fontSize: "26px",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        const tokenObjects: Phaser.GameObjects.Text[] = [];

        const renderRound = () => {
          for (const object of tokenObjects.splice(0)) object.destroy();
          prompt.setText(
            `Build: ${model.expectedTokens.slice(0, model.expectedTokenIndex).join(" ")}`,
          );
          model.tokens.forEach((token, index) => {
            if (token.collected) return;
            const columns = Math.max(2, Math.ceil(Math.sqrt(model.tokens.length)));
            const x = 170 + (index % columns) * (620 / Math.max(1, columns - 1));
            const y = 160 + Math.floor(index / columns) * 110;
            const text = this.add
              .text(x, y, token.text, {
                color: "#f8fafc",
                backgroundColor: "#334155",
                fontSize: "24px",
                padding: { x: 18, y: 15 },
              })
              .setOrigin(0.5)
              .setInteractive();
            this.physics.add.existing(text);
            text.on("pointerdown", () => selectToken(token.id, text));
            tokenObjects.push(text);
          });
        };

        const selectToken = (
          tokenId: string,
          target: Phaser.GameObjects.Text,
        ) => {
          const previousCorrect = model.correctAnswers;
          model = collectSentenceToken(model, tokenId);
          const correct = model.correctAnswers > previousCorrect;
          options.diagnostics({
            type: "answer",
            details: { correct, sentenceIndex: model.sentenceIndex },
          });
          if (correct) {
            particles.emitParticleAt(target.x, target.y, 10);
            this.tweens.add({
              targets: target,
              scale: 1.5 * options.edition.tuning.intensity,
              alpha: 0,
              duration: 180,
              onComplete: renderRound,
            });
          } else {
            this.cameras.main.shake(
              100,
              0.004 * options.edition.tuning.intensity,
            );
          }
          if (model.complete && model.results && !completed) {
            completed = true;
            options.diagnostics({ type: "complete", details: model.results });
            options.complete(model.results);
          }
        };

        renderRound();
        options.diagnostics({ type: "scene-ready" });
      },
    },
  };
}

/** Phaser-native sentence-order collection proof cartridge. */
export const sentenceCollectorCartridge: GameCartridgeDefinition = {
  manifest: {
    id: "sentence-collector",
    title: "Rune Trail",
    description: "Collect word runes in order to rebuild each sentence.",
    inputMode: "sentence",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["arcade-physics", "camera", "particles", "tweens"],
    requiredAssetSlots: SENTENCE_COLLECTOR_ASSET_SLOTS,
  },
  createGameConfig: (context) =>
    createSentenceCollectorGameConfig({
      input: context.input as SentenceInput,
      edition: context.edition,
      complete: (result) => context.complete(result),
      diagnostics: (event) => context.diagnostic(toAPKDiagnostic(event)),
      seed: context.seed ?? Date.now(),
    }),
};

export default sentenceCollectorCartridge;
/* v8 ignore stop */
