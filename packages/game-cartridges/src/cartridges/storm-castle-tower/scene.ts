import {
  preloadSemanticAssets,
  type APKDiagnosticInput,
  type APKInputController,
  type APKInputSnapshot,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { GameResults, SentenceInput } from "@reading-advantage/game-contracts";
import type Phaser from "phaser";

import {
  createCompletionLatch,
  isTraversalSurfaceReady,
  resolveTraversalActions,
  type TraversalInputBindings,
} from "../../families/traversal";
import {
  advanceStormCastle,
  collectStormWindow,
  createStormCastleState,
  moveStormPlayer,
  STORM_CASTLE_COLUMNS,
} from "./systems";

/** Semantic assets required by both Storm Castle Tower editions. */
export const STORM_CASTLE_ASSET_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "feedback.correct",
  "feedback.incorrect",
  "ui.panel",
  "terrain.tower",
  "target.window",
  "hazard.oil",
  "hazard.rock",
] as const;

/** Options for one deterministic Storm Castle Tower session. */
export interface StormCastleGameConfigOptions {
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
    up: ["ArrowUp", "KeyW"],
    down: ["ArrowDown", "KeyS"],
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    collect: ["Space", "Enter"],
  },
  regions: [
    { action: "left", minimumX: 0.05, maximumX: 0.2, minimumY: 0.78, maximumY: 0.98 },
    { action: "up", minimumX: 0.2, maximumX: 0.35, minimumY: 0.68, maximumY: 0.84 },
    { action: "down", minimumX: 0.2, maximumX: 0.35, minimumY: 0.84, maximumY: 1 },
    { action: "right", minimumX: 0.35, maximumX: 0.5, minimumY: 0.78, maximumY: 0.98 },
    { action: "collect", minimumX: 0.58, maximumX: 0.95, minimumY: 0.76, maximumY: 0.98 },
  ],
};

function report(
  options: StormCastleGameConfigOptions,
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

/**
 * Creates the Phaser 4 Storm Castle Tower vertical-grid configuration.
 * @param options Stable content, edition, input, callbacks, and seed.
 * @returns Phaser configuration with ordered windows, hazards, and D-pad controls.
 */
export function createStormCastleGameConfig(
  options: StormCastleGameConfigOptions,
): Phaser.Types.Core.GameConfig {
  let model = createStormCastleState(options.input, options.seed);
  const deliverComplete = createCompletionLatch(options.complete);
  let previousInput = options.inputController.snapshot();
  let render: () => void = () => undefined;

  return {
    width: 960,
    height: 540,
    backgroundColor: options.edition.palette.background,
    scene: {
      preload(this: Phaser.Scene) {
        preloadSemanticAssets(this.load, options.edition, STORM_CASTLE_ASSET_SLOTS);
      },
      create(this: Phaser.Scene) {
        model = createStormCastleState(options.input, options.seed);
        previousInput = options.inputController.snapshot();
        if (this.textures.exists("world.background")) {
          this.add.image(480, 270, "world.background").setDisplaySize(960, 540).setDepth(-20);
        } else {
          this.add.rectangle(480, 270, 960, 540, options.edition.palette.background).setDepth(-20);
        }
        this.add.rectangle(480, 300, 760, 480, 0x1e293b, 0.92).setDepth(-10);
        for (let column = 1; column < STORM_CASTLE_COLUMNS; column += 1) {
          this.add.rectangle(100 + column * 190, 300, 2, 480, 0x94a3b8, 0.28).setDepth(-9);
        }
        const translation = this.add.text(480, 28, model.translation, {
          color: options.edition.palette.text,
          backgroundColor: "#0f172ddd",
          fontSize: "24px",
          fontStyle: "bold",
          padding: { x: 16, y: 9 },
          wordWrap: { width: 820 },
        }).setOrigin(0.5).setDepth(30);
        const status = this.add.text(22, 18, "", {
          color: "#ffffff",
          backgroundColor: "#7f1d1ddd",
          fontSize: "18px",
          padding: { x: 10, y: 8 },
        }).setDepth(30);
        const target = this.add.text(480, 78, "", {
          color: "#fde68a",
          fontSize: "22px",
          fontStyle: "bold",
        }).setOrigin(0.5).setDepth(30);
        const windowViews = new Map<string, { body: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }>();
        const hazardViews = new Map<string, Phaser.GameObjects.Arc>();
        const player = this.textures.exists("player.hero")
          ? this.add.image(0, 0, "player.hero").setDisplaySize(66, 74).setDepth(20)
          : this.add.circle(0, 0, 30, options.edition.palette.player).setDepth(20);
        const controls = [
          ["←", 120, 460],
          ["↑", 260, 430],
          ["↓", 260, 492],
          ["→", 400, 460],
          ["COLLECT", 720, 460],
        ] as const;
        controls.forEach(([label, x, y]) => {
          this.add.text(x, y, label, {
            color: "#ffffff",
            backgroundColor: label === "COLLECT" ? "#6d28d9dd" : "#334155dd",
            fontSize: label === "COLLECT" ? "20px" : "27px",
            padding: { x: label === "COLLECT" ? 28 : 18, y: 12 },
          }).setOrigin(0.5).setDepth(40);
        });

        render = () => {
          translation.setText(model.translation);
          status.setText(`Lives ${model.lives}  •  Floor ${model.player.row}  •  Score ${Math.max(0, model.score)}`);
          target.setText(`Target: ${model.words[model.targetIndex] ?? "Tower complete"}`);
          player.setPosition(195 + model.player.column * 190, 385);
          windowViews.forEach((view) => {
            view.body.setVisible(false);
            view.label.setVisible(false);
          });
          for (const window of model.windows) {
            let view = windowViews.get(window.id);
            if (!view) {
              view = {
                body: this.add.rectangle(0, 0, 124, 54, 0x475569, 0.95)
                  .setStrokeStyle(3, options.edition.palette.accent, 0.9).setDepth(8),
                label: this.add.text(0, 0, window.word, {
                  color: "#f8fafc",
                  fontSize: "18px",
                  fontStyle: "bold",
                  align: "center",
                  wordWrap: { width: 112 },
                }).setOrigin(0.5).setDepth(9),
              };
              windowViews.set(window.id, view);
            }
            const x = 195 + window.column * 190;
            const y = 385 - (window.row - model.player.row) * 64;
            const visible = window.state === "open" && y > 105 && y < 420;
            view.body.setPosition(x, y).setVisible(visible);
            view.label.setPosition(x, y).setVisible(visible);
          }
          hazardViews.forEach((view) => view.setVisible(false));
          for (const hazard of model.hazards) {
            let view = hazardViews.get(hazard.id);
            if (!view) {
              view = this.add.circle(0, 0, 18, options.edition.palette.hostile).setDepth(15);
              hazardViews.set(hazard.id, view);
            }
            const y = 385 - (hazard.position - model.player.row) * 64;
            view.setPosition(195 + hazard.column * 190, y).setVisible(y > 100 && y < 420);
          }
        };
        render();
        report(options, "STORM_CASTLE_READY", "storm castle scene ready");
      },
      update(this: Phaser.Scene, _time: number, delta: number) {
        if (model.complete) return;
        const previousLives = model.lives;
        model = advanceStormCastle(model, delta * options.edition.tuning.speed);
        if (model.lives < previousLives) {
          report(options, "STORM_CASTLE_HAZARD", "storm castle hazard collision", {
            lives: model.lives,
          });
        }
        const currentInput: APKInputSnapshot = options.inputController.snapshot();
        const rect = this.game.canvas.getBoundingClientRect();
        const bounds = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        if (!isTraversalSurfaceReady(bounds)) return;
        const actions = resolveTraversalActions(previousInput, currentInput, INPUT_BINDINGS, bounds);
        previousInput = currentInput;
        for (const action of actions) {
          if (action === "up" || action === "down" || action === "left" || action === "right") {
            model = moveStormPlayer(model, action);
          }
          if (action === "collect") {
            const previousAttempts = model.totalAttempts;
            model = collectStormWindow(model);
            if (model.totalAttempts !== previousAttempts) {
              report(options, "STORM_CASTLE_WINDOW", "storm castle window resolved", {
                outcome: model.lastOutcome,
                targetIndex: model.targetIndex,
                lives: model.lives,
              });
            }
          }
        }
        render();
        if (model.complete && model.results) {
          report(options, "STORM_CASTLE_COMPLETE", "storm castle climb complete", {
            victory: model.victory,
            elapsedMs: model.elapsedMs,
          });
          deliverComplete(model.results);
        }
      },
    },
  };
}
