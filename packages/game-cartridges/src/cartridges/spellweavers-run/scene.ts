import {
  preloadSemanticAssets,
  type APKDiagnosticInput,
  type APKInputController,
  type APKInputSnapshot,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { GameResults, SentenceInput } from "@reading-advantage/game-contracts";
import type Phaser from "phaser";

import { resolveTraversalActions, type TraversalInputBindings } from "../../families/traversal";
import {
  advanceSpellweaversRun,
  collectSpellweaverLane,
  createSpellweaversRunState,
} from "./systems";

/** Semantic assets required by both Spellweavers Run editions. */
export const SPELLWEAVERS_RUN_ASSET_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "feedback.correct",
  "feedback.incorrect",
  "ui.panel",
  "lane.marker",
  "target.word-orb",
  "zone.collection",
  "effect.mana",
] as const;

/** Options for one deterministic Spellweavers Run Phaser session. */
export interface SpellweaversRunGameConfigOptions {
  /** Strict sentence array supplied by the host. */
  readonly input: SentenceInput;
  /** Resolved audience edition. */
  readonly edition: RuntimeEdition;
  /** Host-owned normalized input controller. */
  readonly inputController: APKInputController;
  /** Receives one exact result. */
  readonly complete: (results: GameResults) => void;
  /** Receives structured scene evidence. */
  readonly diagnostics: (event: APKDiagnosticInput) => void;
  /** Reproducible session seed. */
  readonly seed: number;
}

const INPUT_BINDINGS: TraversalInputBindings = {
  keyboard: {
    left: ["ArrowLeft", "KeyA"],
    center: ["ArrowDown", "KeyS"],
    right: ["ArrowRight", "KeyD"],
  },
  regions: [
    { action: "left", minimumX: 0, maximumX: 1 / 3, minimumY: 0.25, maximumY: 1 },
    { action: "center", minimumX: 1 / 3, maximumX: 2 / 3, minimumY: 0.25, maximumY: 1 },
    { action: "right", minimumX: 2 / 3, maximumX: 1, minimumY: 0.25, maximumY: 1 },
  ],
};

function report(
  options: SpellweaversRunGameConfigOptions,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  options.diagnostics({
    level: "info",
    code,
    message,
    ...(details === undefined ? {} : { details }),
  });
}

/* v8 ignore start -- Phaser lifecycle and visuals are exercised through browser QC after catalog integration. */
/**
 * Creates the Phaser 4 Spellweavers Run lane-collector configuration.
 * @param options Stable content, edition, input, callbacks, and seed.
 * @returns Phaser configuration with one ordered word orb and three collection lanes.
 */
export function createSpellweaversRunGameConfig(
  options: SpellweaversRunGameConfigOptions,
): Phaser.Types.Core.GameConfig {
  let model = createSpellweaversRunState(options.input, options.seed);
  let previousInput = options.inputController.snapshot();
  let selectLane: (lane: number) => void = () => undefined;
  let render: () => void = () => undefined;

  return {
    width: 960,
    height: 540,
    backgroundColor: options.edition.palette.background,
    scene: {
      preload(this: Phaser.Scene) {
        preloadSemanticAssets(this.load, options.edition, SPELLWEAVERS_RUN_ASSET_SLOTS);
      },
      create(this: Phaser.Scene) {
        model = createSpellweaversRunState(options.input, options.seed);
        previousInput = options.inputController.snapshot();
        if (this.textures.exists("world.background")) {
          this.add.image(480, 270, "world.background").setDisplaySize(960, 540).setDepth(-20);
        } else {
          this.add.rectangle(480, 270, 960, 540, options.edition.palette.background).setDepth(-20);
        }
        [320, 640].forEach((x) => this.add.rectangle(x, 325, 3, 430, 0xffffff, 0.25));
        this.add.rectangle(480, 455, 920, 72, options.edition.palette.accent, 0.22)
          .setStrokeStyle(3, options.edition.palette.accent, 0.8);
        const translation = this.add.text(480, 34, "", {
          color: options.edition.palette.text,
          backgroundColor: "#0f172ddd",
          fontSize: "25px",
          fontStyle: "bold",
          padding: { x: 16, y: 10 },
          wordWrap: { width: 840 },
        }).setOrigin(0.5).setDepth(20);
        const progress = this.add.text(480, 92, "", {
          color: "#f8fafc",
          fontSize: "21px",
          wordWrap: { width: 850 },
          align: "center",
        }).setOrigin(0.5).setDepth(20);
        const status = this.add.text(22, 18, "", {
          color: "#ffffff",
          backgroundColor: "#312e81dd",
          fontSize: "18px",
          padding: { x: 10, y: 8 },
        }).setDepth(20);
        const orb = this.add.text(0, 0, "", {
          color: "#111827",
          backgroundColor: "#fde68a",
          fontSize: "24px",
          fontStyle: "bold",
          padding: { x: 16, y: 14 },
        }).setOrigin(0.5).setDepth(12);
        ["← / A", "↓ / S", "→ / D"].forEach((label, lane) => {
          this.add.text(160 + lane * 320, 500, label, {
            color: "#ffffff",
            backgroundColor: "#0f172dcc",
            fontSize: "20px",
            padding: { x: 12, y: 8 },
          }).setOrigin(0.5).setDepth(20);
        });

        render = () => {
          translation.setText(model.translation);
          progress.setText(
            model.words.map((word, index) => index < model.targetIndex ? `✓ ${word}` : word).join("   "),
          );
          status.setText(`Mana ${model.mana}  •  Combo ${model.combo}  •  Score ${Math.max(0, model.score)}`);
          orb.setText(model.orb.word);
          orb.setPosition(160 + model.orb.lane * 320, model.orb.position);
          orb.setVisible(!model.complete);
        };
        selectLane = (lane) => {
          const previousAttempts = model.totalAttempts;
          model = collectSpellweaverLane(model, lane);
          if (model.totalAttempts !== previousAttempts) {
            report(options, "SPELLWEAVERS_ANSWER", "spellweaver lane resolved", {
              outcome: model.lastOutcome,
              sentenceIndex: model.sentenceIndex,
              targetIndex: model.targetIndex,
              mana: model.mana,
            });
          }
          render();
          if (model.complete && model.results) {
            report(options, "SPELLWEAVERS_COMPLETE", "spellweaver run complete", {
              victory: model.victory,
              elapsedMs: model.elapsedMs,
            });
            options.complete(model.results);
          }
        };
        render();
        report(options, "SPELLWEAVERS_READY", "spellweaver scene ready");
      },
      update(this: Phaser.Scene, _time: number, delta: number) {
        if (model.complete) return;
        const previousAttempts = model.totalAttempts;
        model = advanceSpellweaversRun(model, delta * options.edition.tuning.speed);
        if (model.totalAttempts !== previousAttempts) {
          report(options, "SPELLWEAVERS_MISS", "spellweaver orb missed", {
            mana: model.mana,
            targetIndex: model.targetIndex,
          });
        }
        render();
        if (model.complete && model.results) {
          options.complete(model.results);
          return;
        }
        const currentInput: APKInputSnapshot = options.inputController.snapshot();
        const rect = this.game.canvas.getBoundingClientRect();
        const actions = resolveTraversalActions(previousInput, currentInput, INPUT_BINDINGS, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
        previousInput = currentInput;
        for (const action of actions) {
          if (action === "left") selectLane(0);
          if (action === "center") selectLane(1);
          if (action === "right") selectLane(2);
        }
      },
    },
  };
}
/* v8 ignore stop */
