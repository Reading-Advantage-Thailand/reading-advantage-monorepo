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
  advanceGriffinRiders,
  createGriffinRidersState,
  moveGriffinLane,
} from "./systems";

/** Semantic assets required by both Griffin Riders Escape editions. */
export const GRIFFIN_RIDERS_ASSET_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "feedback.correct",
  "feedback.incorrect",
  "ui.panel",
  "lane.marker",
  "target.gate",
  "hazard.obstacle",
  "effect.wind",
] as const;

/** Options for one deterministic Griffin Riders Escape session. */
export interface GriffinRidersGameConfigOptions {
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
  keyboard: { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"] },
  regions: [
    { action: "left", minimumX: 0, maximumX: 0.5, minimumY: 0.72, maximumY: 1 },
    { action: "right", minimumX: 0.5, maximumX: 1, minimumY: 0.72, maximumY: 1 },
  ],
  swipe: { threshold: 55, left: "left", right: "right" },
};

function report(
  options: GriffinRidersGameConfigOptions,
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

interface TargetView {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
}

/* v8 ignore start -- Phaser lifecycle and visuals are exercised through browser QC after catalog integration. */
/**
 * Creates the Phaser 4 Griffin Riders Escape perspective-gate configuration.
 * @param options Stable content, edition, input, callbacks, and seed.
 * @returns Phaser configuration with lane switching, wave projection, and collision resolution.
 */
export function createGriffinRidersGameConfig(
  options: GriffinRidersGameConfigOptions,
): Phaser.Types.Core.GameConfig {
  let model = createGriffinRidersState(options.input, options.seed);
  let previousInput = options.inputController.snapshot();
  let views: TargetView[] = [];
  let player: Phaser.GameObjects.Triangle | Phaser.GameObjects.Image | undefined;
  let render: () => void = () => undefined;

  return {
    width: 960,
    height: 540,
    backgroundColor: options.edition.palette.background,
    scene: {
      preload(this: Phaser.Scene) {
        preloadSemanticAssets(this.load, options.edition, GRIFFIN_RIDERS_ASSET_SLOTS);
      },
      create(this: Phaser.Scene) {
        model = createGriffinRidersState(options.input, options.seed);
        previousInput = options.inputController.snapshot();
        if (this.textures.exists("world.background")) {
          this.add.image(480, 270, "world.background").setDisplaySize(960, 540).setDepth(-20);
        } else {
          this.add.rectangle(480, 270, 960, 540, options.edition.palette.background).setDepth(-20);
        }
        [160, 480, 800].forEach((x) => {
          this.add.line(0, 0, 480, 120, x, 500, 0xffffff, 0.24).setOrigin(0);
        });
        const translation = this.add.text(480, 34, model.translation, {
          color: options.edition.palette.text,
          backgroundColor: "#0f172ddd",
          fontSize: "25px",
          fontStyle: "bold",
          padding: { x: 16, y: 10 },
          wordWrap: { width: 820 },
        }).setOrigin(0.5).setDepth(20);
        const progress = this.add.text(480, 86, "", {
          color: "#f8fafc",
          fontSize: "20px",
        }).setOrigin(0.5).setDepth(20);
        const status = this.add.text(22, 18, "", {
          color: "#ffffff",
          backgroundColor: "#075985dd",
          fontSize: "18px",
          padding: { x: 10, y: 8 },
        }).setDepth(20);
        views = model.targets.map((target) => {
          const color = target.kind === "correct"
            ? options.edition.palette.friendly
            : target.kind === "decoy"
              ? options.edition.palette.accent
              : options.edition.palette.hostile;
          const body = this.add.rectangle(0, 0, 150, 94, color, 0.9)
            .setStrokeStyle(3, 0xffffff, 0.8).setDepth(8);
          const label = this.add.text(0, 0, target.kind === "obstacle" ? "⚡" : target.word!, {
            color: "#111827",
            fontSize: "21px",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: 130 },
          }).setOrigin(0.5).setDepth(9);
          return { body, label };
        });
        player = this.textures.exists("player.hero")
          ? this.add.image(480, 465, "player.hero").setDisplaySize(82, 82)
          : this.add.triangle(480, 465, 0, 60, 40, 0, 80, 60, options.edition.palette.player);
        ["← / A", "D / →"].forEach((label, index) => {
          this.add.text(index === 0 ? 170 : 790, 494, label, {
            color: "#ffffff",
            backgroundColor: "#0f172dcc",
            fontSize: "21px",
            padding: { x: 14, y: 8 },
          }).setOrigin(0.5).setDepth(20);
        });

        render = () => {
          translation.setText(model.translation);
          progress.setText(
            model.words.map((word, index) => index < model.targetIndex ? `✓ ${word}` : word).join("   "),
          );
          status.setText(`Lives ${model.lives}  •  Combo ${model.combo}  •  Score ${Math.max(0, model.score)}`);
          player?.setX(160 + model.playerLane * 320);
          model.targets.forEach((target, index) => {
            const view = views[index]!;
            const color = target.kind === "correct"
              ? options.edition.palette.friendly
              : target.kind === "decoy"
                ? options.edition.palette.accent
                : options.edition.palette.hostile;
            const ratio = Math.max(0, Math.min(1, (target.position - 100) / 350));
            const x = 480 + (target.lane - 1) * 320 * (0.25 + ratio * 0.75);
            const y = 125 + ratio * 305;
            const scale = 0.35 + ratio * 0.8;
            view.body.setFillStyle(color, 0.9)
              .setPosition(x, y).setScale(scale).setVisible(!model.complete);
            view.label.setText(target.kind === "obstacle" ? "⚡" : target.word!)
              .setPosition(x, y).setScale(scale).setVisible(!model.complete);
          });
        };
        render();
        report(options, "GRIFFIN_RIDERS_READY", "griffin riders scene ready");
      },
      update(this: Phaser.Scene, _time: number, delta: number) {
        if (model.complete) return;
        const previousAttempts = model.totalAttempts;
        model = advanceGriffinRiders(model, delta * options.edition.tuning.speed);
        if (model.totalAttempts !== previousAttempts) {
          report(options, "GRIFFIN_RIDERS_COLLISION", "griffin wave resolved", {
            outcome: model.lastOutcome,
            lives: model.lives,
            targetIndex: model.targetIndex,
          });
        }
        render();
        if (model.complete && model.results) {
          report(options, "GRIFFIN_RIDERS_COMPLETE", "griffin riders run complete", {
            victory: model.victory,
            elapsedMs: model.elapsedMs,
          });
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
          if (action === "left") model = moveGriffinLane(model, "left");
          if (action === "right") model = moveGriffinLane(model, "right");
        }
        render();
      },
    },
  };
}
/* v8 ignore stop */
