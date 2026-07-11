import {
  preloadSemanticAssets,
  type APKDiagnosticInput,
  type APKInputController,
  type APKInputSnapshot,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { GameResults, VocabularyInput } from "@reading-advantage/game-contracts";
import type Phaser from "phaser";

import { resolveTraversalActions, type TraversalInputBindings } from "../../families/traversal";
import {
  advanceDragonRiderTime,
  chooseDragonRiderGate,
  createDragonRiderState,
  getDragonRiderGateLabel,
  resolveDragonRiderBoss,
} from "./systems";

/** Semantic assets required by both Dragon Rider editions. */
export const DRAGON_RIDER_ASSET_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "feedback.correct",
  "feedback.incorrect",
  "ui.panel",
  "target.gate",
  "ally.dragon",
  "enemy.boss",
] as const;

/** Options needed to create one deterministic Dragon Rider Phaser session. */
export interface DragonRiderGameConfigOptions {
  /** Strict vocabulary pairs supplied by the host. */
  readonly input: VocabularyInput;
  /** Resolved Primary or Secondary presentation edition. */
  readonly edition: RuntimeEdition;
  /** Normalized host-owned keyboard and pointer controller. */
  readonly inputController: APKInputController;
  /** Receives the exact result after boss resolution. */
  readonly complete: (results: GameResults) => void;
  /** Receives structured scene evidence. */
  readonly diagnostics: (event: APKDiagnosticInput) => void;
  /** Reproducible session seed. */
  readonly seed: number;
}

const INPUT_BINDINGS: TraversalInputBindings = {
  keyboard: { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"] },
  regions: [
    { action: "left", minimumX: 0, maximumX: 0.5, minimumY: 0.3, maximumY: 1 },
    { action: "right", minimumX: 0.5, maximumX: 1, minimumY: 0.3, maximumY: 1 },
  ],
};

function report(
  options: DragonRiderGameConfigOptions,
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
 * Creates the Phaser 4 Dragon Rider gate-flight configuration.
 * @param options Stable content, edition, input, callbacks, and seed.
 * @returns Phaser configuration with two-gate traversal and a final boss reveal.
 */
export function createDragonRiderGameConfig(
  options: DragonRiderGameConfigOptions,
): Phaser.Types.Core.GameConfig {
  let model = createDragonRiderState(options.input, options.seed);
  let previousInput: APKInputSnapshot = options.inputController.snapshot();
  let chooseLane: (lane: number) => void = () => undefined;

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
        preloadSemanticAssets(this.load, options.edition, DRAGON_RIDER_ASSET_SLOTS);
      },
      create(this: Phaser.Scene) {
        model = createDragonRiderState(options.input, options.seed);
        previousInput = options.inputController.snapshot();
        if (this.textures.exists("world.background")) {
          this.add.image(480, 270, "world.background").setDisplaySize(960, 540).setDepth(-20);
        } else {
          this.add.rectangle(480, 270, 960, 540, options.edition.palette.background).setDepth(-20);
        }
        for (let line = 0; line < 8; line += 1) {
          this.add.rectangle(480, 120 + line * 55, 8 + line * 16, 3, 0xffffff, 0.3);
        }
        const player = this.textures.exists("player.hero")
          ? this.add.image(480, 455, "player.hero").setDisplaySize(72, 88)
          : this.add.triangle(480, 455, 0, 70, 36, 0, 72, 70, options.edition.palette.player);
        this.physics.add.existing(player);
        this.cameras.main.startFollow(player, true, 0.12, 0.12);

        const prompt = this.add.text(480, 36, "", {
          color: options.edition.palette.text,
          backgroundColor: "#0f172ddd",
          fontFamily: "sans-serif",
          fontSize: "34px",
          fontStyle: "bold",
          padding: { x: 18, y: 10 },
        }).setOrigin(0.5).setDepth(20);
        const status = this.add.text(24, 24, "", {
          color: "#f8fafc",
          backgroundColor: "#1e293bdd",
          fontSize: "19px",
          padding: { x: 12, y: 8 },
        }).setDepth(20);
        const labels = [0, 1].map((lane) =>
          this.add.text(lane === 0 ? 250 : 710, 245, "", {
            color: "#f8fafc",
            backgroundColor: lane === 0 ? "#4338cacc" : "#7c3aedcc",
            fontSize: "27px",
            fontStyle: "bold",
            align: "center",
            padding: { x: 22, y: 28 },
            wordWrap: { width: 260 },
          }).setOrigin(0.5).setDepth(10),
        );
        const leftHint = this.add.text(250, 470, "←  A", {
          color: "#ffffff",
          backgroundColor: "#0f172dcc",
          fontSize: "24px",
          padding: { x: 18, y: 10 },
        }).setOrigin(0.5).setDepth(20);
        const rightHint = this.add.text(710, 470, "D  →", {
          color: "#ffffff",
          backgroundColor: "#0f172dcc",
          fontSize: "24px",
          padding: { x: 18, y: 10 },
        }).setOrigin(0.5).setDepth(20);
        void leftHint;
        void rightHint;

        const renderRound = () => {
          const round = model.rounds[model.roundIndex];
          if (!round) return;
          prompt.setText(round.term);
          labels.forEach((label, lane) => label.setText(getDragonRiderGateLabel(round, lane)));
          status.setText(`Flight ${model.dragonCount}  •  ${model.roundIndex + 1}/${model.rounds.length}`);
        };
        let locked = false;
        chooseLane = (lane) => {
          if (locked || model.phase !== "running") return;
          locked = true;
          const priorRound = model.roundIndex;
          model = chooseDragonRiderGate(model, lane);
          const correct = model.lastAnswerCorrect === true;
          report(options, "DRAGON_RIDER_ANSWER", "dragon rider gate resolved", {
            correct,
            roundIndex: priorRound,
            dragonCount: model.dragonCount,
          });
          this.tweens.add({
            targets: player,
            x: lane === 0 ? 250 : 710,
            duration: 160 / options.edition.tuning.speed,
            yoyo: true,
            onComplete: () => {
              if (model.phase === "boss") {
                labels.forEach((label) => label.setVisible(false));
                prompt.setText(`Boss power ${model.bossPower}`);
                status.setText(`Dragon flight ${model.dragonCount}`);
                const boss = this.textures.exists("enemy.boss")
                  ? this.add.image(480, 220, "enemy.boss").setDisplaySize(150, 150)
                  : this.add.circle(480, 220, 74, options.edition.palette.hostile);
                this.tweens.add({ targets: boss, scale: 1.12, yoyo: true, repeat: 1, duration: 220 });
                this.time.delayedCall(700, () => {
                  model = resolveDragonRiderBoss(model);
                  report(options, "DRAGON_RIDER_COMPLETE", "dragon rider boss resolved", {
                    victory: model.victory,
                    dragonCount: model.dragonCount,
                    bossPower: model.bossPower,
                    elapsedMs: model.elapsedMs,
                  });
                  options.complete(model.results!);
                });
                return;
              }
              renderRound();
              locked = false;
            },
          });
        };
        renderRound();
        report(options, "DRAGON_RIDER_READY", "dragon rider scene ready");
      },
      update(this: Phaser.Scene, _time: number, delta: number) {
        model = advanceDragonRiderTime(model, delta);
        const currentInput = options.inputController.snapshot();
        const rect = this.game.canvas.getBoundingClientRect();
        const actions = resolveTraversalActions(previousInput, currentInput, INPUT_BINDINGS, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
        previousInput = currentInput;
        for (const action of actions) {
          if (action === "left") chooseLane(0);
          if (action === "right") chooseLane(1);
        }
      },
    },
  };
}
/* v8 ignore stop */
