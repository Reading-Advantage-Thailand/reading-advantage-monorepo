import { preloadSemanticAssets, type APKInputController, type APKInputSnapshot, type RuntimeEdition } from "@reading-advantage/advantage-play-kit";
import { sentenceInputSchema, vocabularyInputSchema, type GameResults, type SentenceInput, type VocabularyInput } from "@reading-advantage/game-contracts";
import type Phaser from "phaser";

import type { ArenaWaveBlueprint } from "../../arena-wave-blueprints";
import { createGameResults } from "../../internal/results";
import type { GameCartridgeDefinition } from "../../internal/types";

/** Options used by the shared W4 arena scene. */
export interface ArenaSceneOptions {
  /** Frozen public blueprint. */
  readonly blueprint: ArenaWaveBlueprint;
  /** Stable educational input. */
  readonly input: VocabularyInput | SentenceInput;
  /** Resolved audience presentation. */
  readonly edition: RuntimeEdition;
  /** Normalized keyboard and pointer controller. */
  readonly inputController: APKInputController;
  /** Fire-once host completion callback. */
  readonly complete: (results: GameResults) => void;
  /** Structured runtime diagnostic callback. */
  readonly diagnostic: (code: string, details?: Record<string, unknown>) => void;
}

interface ArenaRound { readonly prompt: string; readonly correct: string; readonly choices: readonly string[] }

function sentenceRounds(input: SentenceInput): ArenaRound[] {
  const words = input.flatMap(({ term }) => term.trim().split(/\s+/u).filter(Boolean));
  return input.flatMap(({ term, translation }) => {
    const sentenceWords = term.trim().split(/\s+/u).filter(Boolean);
    return sentenceWords.map((correct, index) => ({
      prompt: `${translation} · ${sentenceWords.slice(0, index).join(" ") || "…"}`,
      correct,
      choices: [correct, words[(words.indexOf(correct) + 1) % words.length] ?? correct],
    }));
  });
}

function vocabularyRounds(input: VocabularyInput): ArenaRound[] {
  return input.map(({ term, translation }, index) => ({
    prompt: term,
    correct: translation,
    choices: [translation, input[(index + 1) % input.length]?.translation ?? translation],
  }));
}

function resolveRounds(blueprint: ArenaWaveBlueprint, input: VocabularyInput | SentenceInput): ArenaRound[] {
  return blueprint.inputMode === "sentence"
    ? sentenceRounds(sentenceInputSchema.parse(input))
    : vocabularyRounds(vocabularyInputSchema.parse(input));
}

/* v8 ignore start -- Phaser lifecycle and rendering are exercised by W4 desktop/mobile browser acceptance. */
/** Creates one shared Phaser arena scene with cartridge-specific identity.
 * @param options Blueprint, content, edition, input, and host callbacks.
 * @returns A Phaser configuration with bounded movement and target resolution.
 */
export function createArenaGameConfig(options: ArenaSceneOptions): Phaser.Types.Core.GameConfig {
  const rounds = resolveRounds(options.blueprint, options.input);
  let roundIndex = 0; let correctAnswers = 0; let totalAttempts = 0; let score = 0; let completed = false;
  let previous: APKInputSnapshot = options.inputController.snapshot();
  let choose: (choice: string) => void = () => undefined;
  const accentByMechanic: Record<ArenaWaveBlueprint["mechanic"], number> = {
    "protected-target-aim": 0x65a30d,
    "paired-hero-arena": 0x7c3aed,
    "aerial-ordered-targets": 0x0284c7,
    "patrol-minimap": 0x0f766e,
    "ordered-territory-capture": 0xb45309,
  };
  return {
    width: 960,
    height: 540,
    backgroundColor: options.edition.palette.background,
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: {
      preload(this: Phaser.Scene) { preloadSemanticAssets(this.load, options.edition, options.blueprint.requiredAssetSlots); },
      create(this: Phaser.Scene) {
        const accent = accentByMechanic[options.blueprint.mechanic];
        this.add.rectangle(480, 270, 960, 540, options.edition.palette.background);
        const targetLayout: readonly [number, number][] = options.blueprint.mechanic === "aerial-ordered-targets"
          ? [[575, 180], [760, 330]]
          : options.blueprint.mechanic === "patrol-minimap"
            ? [[210, 180], [735, 355]]
            : options.blueprint.mechanic === "ordered-territory-capture"
              ? [[335, 225], [625, 365]]
              : [[280, 245], [680, 245]];
        if (options.blueprint.mechanic === "ordered-territory-capture") {
          for (let x = 90; x <= 870; x += 130) for (let y = 145; y <= 465; y += 80) this.add.rectangle(x, y, 112, 62, accent, 0.18).setStrokeStyle(2, accent, 0.5);
        } else if (options.blueprint.mechanic === "aerial-ordered-targets") {
          for (let i = 0; i < 9; i += 1) this.add.ellipse(110 + i * 110, 130 + i % 3 * 120, 120, 34, 0xffffff, 0.14);
          this.add.text(90, 455, "FLAP  ↑  ·  STRIKE  SPACE", { color: "#ffffff", fontSize: "18px" });
        } else if (options.blueprint.mechanic === "patrol-minimap") {
          this.add.rectangle(480, 280, 760, 280, accent, 0.1).setStrokeStyle(3, accent, 0.55);
          this.add.line(0, 0, 100, 390, 860, 150, accent, 0.65).setLineWidth(5);
          this.add.text(55, 430, "PATROL BOUNDS 1600 × 900", { color: "#ffffff", fontSize: "18px" });
        } else {
          for (let i = 0; i < 12; i += 1) this.add.circle(80 + (i % 6) * 160, 150 + Math.floor(i / 6) * 260, 36, accent, 0.22);
        }
        if (options.blueprint.mechanic === "protected-target-aim") {
          this.add.rectangle(480, 478, 620, 28, 0x713f12).setStrokeStyle(4, 0xfde68a);
          this.add.text(480, 478, "KEEP WALL  ♥♥♥", { color: "#ffffff", fontSize: "17px" }).setOrigin(0.5);
          this.add.line(0, 0, 480, 420, 280, 245, options.edition.palette.accent, 0.8).setLineWidth(4);
        }
        const playerStart = options.blueprint.mechanic === "aerial-ordered-targets" ? { x: 165, y: 290 } : { x: 480, y: 430 };
        const player = this.add.rectangle(playerStart.x, playerStart.y, 58, 58, options.edition.palette.player).setStrokeStyle(4, 0xffffff);
        if (options.blueprint.mechanic === "paired-hero-arena") {
          this.add.rectangle(playerStart.x + 86, playerStart.y, 52, 52, options.edition.palette.friendly).setStrokeStyle(4, 0xffffff);
          this.add.text(480, 475, "TWIN SOULS  ♥♥  ·  WAVE 1", { color: "#ffffff", fontSize: "18px" }).setOrigin(0.5);
        }
        this.physics.add.existing(player);
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        const title = this.add.text(24, 20, options.blueprint.id.replaceAll("-", " ").toUpperCase(), { color: options.edition.palette.text, fontSize: "18px", fontStyle: "bold" });
        const prompt = this.add.text(480, 55, "", { color: options.edition.palette.text, backgroundColor: "#0f172add", fontSize: "28px", padding: { x: 16, y: 10 }, align: "center", wordWrap: { width: 760 } }).setOrigin(0.5, 0);
        const progress = this.add.text(24, 500, "", { color: "#ffffff", fontSize: "17px" });
        const minimap = this.add.rectangle(874, 478, 132, 76, 0x020617, 0.82).setStrokeStyle(2, accent);
        const marker = this.add.circle(874, 478, 6, options.edition.palette.player);
        void title; void minimap;
        const targets = [0, 1].map((slot) => {
          const [x, y] = targetLayout[slot]!;
          const bodyView = options.blueprint.mechanic === "ordered-territory-capture"
            ? this.add.rectangle(x, y, 178, 86, slot === 0 ? accent : options.edition.palette.hostile, 0.9).setStrokeStyle(4, 0xffffff).setInteractive({ useHandCursor: true })
            : this.add.circle(x, y, 88 * options.edition.tuning.targetScale, slot === 0 ? accent : options.edition.palette.hostile, 0.9).setStrokeStyle(4, 0xffffff).setInteractive({ useHandCursor: true });
          const label = this.add.text(x, y, "", { color: "#ffffff", fontSize: "25px", fontStyle: "bold", align: "center", wordWrap: { width: 150 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          bodyView.on("pointerdown", () => choose(label.text)); label.on("pointerdown", () => choose(label.text));
          return { bodyView, label };
        });
        const render = () => {
          const round = rounds[roundIndex];
          if (!round) return;
          prompt.setText(round.prompt);
          targets.forEach((target, index) => target.label.setText(round.choices[index] ?? round.correct));
          progress.setText(`${options.blueprint.mechanic} · ${roundIndex + 1}/${rounds.length}`);
        };
        choose = (choice) => {
          if (completed) return;
          const round = rounds[roundIndex]; if (!round) return;
          totalAttempts += 1;
          const correct = choice === round.correct;
          if (correct) { correctAnswers += 1; score += 100; roundIndex += 1; } else { score = Math.max(0, score - 20); }
          options.diagnostic("ARENA_TARGET_RESOLVED", { id: options.blueprint.id, roundIndex, correct });
          if (roundIndex >= rounds.length) { completed = true; options.complete(createGameResults(score, correctAnswers, totalAttempts)); return; }
          render();
        };
        render();
        options.diagnostic("ARENA_SCENE_READY", { id: options.blueprint.id, rounds: rounds.length });
        (this as Phaser.Scene & { update?: () => void }).update = () => {
          const snapshot = options.inputController.snapshot();
          const speed = 220 * options.edition.tuning.speed;
          body.setVelocity(
            (snapshot.keys.some((key) => ["ArrowLeft", "KeyA"].includes(key)) ? -speed : 0) + (snapshot.keys.some((key) => ["ArrowRight", "KeyD"].includes(key)) ? speed : 0),
            (snapshot.keys.some((key) => ["ArrowUp", "KeyW"].includes(key)) ? -speed : 0) + (snapshot.keys.some((key) => ["ArrowDown", "KeyS"].includes(key)) ? speed : 0),
          );
          marker.setPosition(808 + player.x / 960 * 132, 440 + player.y / 540 * 76);
          const newlyPressed = snapshot.keys.filter((key) => !previous.keys.includes(key));
          if (newlyPressed.includes("Space") || newlyPressed.includes("Enter")) choose(rounds[roundIndex]?.correct ?? "");
          previous = snapshot;
        };
      },
    },
  };
}
/* v8 ignore stop */

/** Builds a public W4 cartridge from a frozen blueprint.
 * @param blueprint Frozen public identity and mechanic contract.
 * @param title Product-facing title.
 * @param description Catalog description.
 * @returns Runtime cartridge definition backed by the shared arena scene.
 */
export function createArenaCartridge(blueprint: ArenaWaveBlueprint, title: string, description: string): GameCartridgeDefinition {
  return {
    manifest: { id: blueprint.id, title, description, inputMode: blueprint.inputMode, runtimeApiVersion: "1.0.0", version: "0.1.0", capabilities: ["arcade-physics", "camera", "object-pool", "tweens"], requiredAssetSlots: blueprint.requiredAssetSlots },
    createGameConfig: (context) => createArenaGameConfig({ blueprint, input: context.input, edition: context.edition, inputController: context.inputController, complete: (result) => context.complete(result), diagnostic: (code, details) => context.diagnostic({ level: "info", code, message: code.toLowerCase().replaceAll("_", " "), ...(details ? { details } : {}) }) }),
  };
}
