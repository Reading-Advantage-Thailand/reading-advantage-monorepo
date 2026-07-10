import {
  preloadSemanticAssets,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type {
  GameResults,
  SentenceInput,
} from "@reading-advantage/game-contracts";
import type Phaser from "phaser";

import { projectIsometricPoint } from "../../families/isometric-step-graph";
import type {
  CartridgeDiagnostic,
  CartridgeGameConfigOptions,
} from "../../internal/types";
import {
  attemptZigguratStep,
  createZigguratState,
} from "./systems";

/** Semantic assets required by the shared Ziggurat scene in either edition. */
export const SORCERER_ZIGGURAT_ASSET_SLOTS = [
  "world.background",
  "terrain.ziggurat",
  "platform.rune-cube",
  "player.hero",
  "token.rune",
  "feedback.correct",
  "feedback.incorrect",
  "effect.ritual",
  "ui.panel",
] as const;

/** Function that accepts a completed stable result from a scene. */
export type ZigguratCompletionEmitter = (results: GameResults) => void;

/**
 * Creates a fire-once scene completion boundary with diagnostic evidence.
 * @param complete Validated host completion callback.
 * @param diagnostics Cartridge diagnostic callback.
 * @returns A callback that accepts only the first completed result.
 */
export function createCompletionEmitter(
  complete: (results: GameResults) => void,
  diagnostics: (event: CartridgeDiagnostic) => void,
): ZigguratCompletionEmitter {
  let emitted = false;
  return (results) => {
    if (emitted) return;
    emitted = true;
    diagnostics({ type: "complete", details: results });
    complete(results);
  };
}

function textureExists(edition: RuntimeEdition, key: string): boolean {
  return edition.assets[key]?.type !== "procedural";
}

/* v8 ignore start -- Phaser display lifecycle is exercised in real-browser QC. */
/**
 * Creates the Phaser scene for deterministic isometric sentence traversal.
 * @param options Stable sentence input, edition, diagnostics, completion, and seed.
 * @returns A Phaser 4 configuration owned by the APK runtime.
 */
export function createSorcererZigguratGameConfig(
  options: CartridgeGameConfigOptions<SentenceInput>,
): Phaser.Types.Core.GameConfig {
  let model = createZigguratState(options.input, options.seed);

  return {
    width: 960,
    height: 540,
    backgroundColor: options.edition.palette.background,
    scene: {
      preload(this: Phaser.Scene) {
        preloadSemanticAssets(
          this.load,
          options.edition,
          SORCERER_ZIGGURAT_ASSET_SLOTS,
        );
      },
      create(this: Phaser.Scene) {
        model = createZigguratState(options.input, options.seed);
        const emitComplete = createCompletionEmitter(
          options.complete,
          options.diagnostics,
        );
        const maxTokenCount = Math.max(
          ...options.input.map(({ term }) => term.trim().split(/\s+/u).length),
        );
        const worldHeight = Math.max(540, 300 + maxTokenCount * 62);
        const projection = {
          originX: 480,
          originY: worldHeight - 72,
          tileWidth: 176,
          tileHeight: 56,
          elevationHeight: 108,
        };
        this.cameras.main.setBounds(0, 0, 960, worldHeight);

        if (
          textureExists(options.edition, "world.background") &&
          this.textures.exists("world.background")
        ) {
          this.add
            .image(480, 270, "world.background")
            .setDisplaySize(960, 540)
            .setScrollFactor(0)
            .setDepth(-1_000_000);
        }

        if (
          textureExists(options.edition, "ui.panel") &&
          this.textures.exists("ui.panel")
        ) {
          this.add
            .image(480, 48, "ui.panel")
            .setDisplaySize(760, 82)
            .setScrollFactor(0)
            .setDepth(900_000);
        }

        const prompt = this.add
          .text(480, 26, "", {
            color: options.edition.palette.text,
            fontFamily: "sans-serif",
            fontSize: "24px",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: 720 },
          })
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(900_001);
        const progress = this.add
          .text(480, 74, "", {
            color: options.edition.palette.text,
            fontFamily: "sans-serif",
            fontSize: "17px",
          })
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(900_001);

        const particleSource = this.add.graphics();
        particleSource.fillStyle(options.edition.palette.accent, 1);
        particleSource.fillCircle(4, 4, 4);
        particleSource.generateTexture("apk-ziggurat-particle", 8, 8);
        particleSource.destroy();
        const particles = this.add.particles(0, 0, "apk-ziggurat-particle", {
          lifespan: 500,
          speed: { min: 45, max: 150 },
          scale: { start: 1, end: 0 },
          emitting: false,
        });

        const origin = projectIsometricPoint(
          { gridX: 0, gridY: 0, elevation: 0 },
          projection,
        );
        const player =
          textureExists(options.edition, "player.hero") &&
          this.textures.exists("player.hero")
            ? this.add
                .image(origin.x, origin.y - 40, "player.hero")
                .setDisplaySize(
                  54 * options.edition.tuning.targetScale,
                  68 * options.edition.tuning.targetScale,
                )
            : this.add.circle(
                origin.x,
                origin.y - 40,
                24 * options.edition.tuning.targetScale,
                options.edition.palette.player,
              );
        player.setDepth(origin.depth + 2);
        this.cameras.main.startFollow(player, true, 0.1, 0.1, 0, 72);

        const graphObjects: Phaser.GameObjects.GameObject[] = [];
        const tileObjects = new Map<
          string,
          Phaser.GameObjects.Image | Phaser.GameObjects.Polygon
        >();
        let moving = false;
        let queuedTargetNodeId: string | undefined;

        const destroyGraph = () => {
          for (const object of graphObjects.splice(0)) object.destroy();
          tileObjects.clear();
        };

        const showSemanticEffect = (key: string, x: number, y: number) => {
          if (!textureExists(options.edition, key) || !this.textures.exists(key)) {
            return;
          }
          const effect = this.add
            .image(x, y, key)
            .setDisplaySize(80, 80)
            .setDepth(999_000)
            .setAlpha(0.9);
          this.tweens.add({
            targets: effect,
            alpha: 0,
            scale: 1.5,
            duration: 350 / options.edition.tuning.speed,
            onComplete: () => effect.destroy(),
          });
        };

        const updateHUD = () => {
          prompt.setText(model.activeTranslation);
          progress.setText(
            `Ritual ${Math.min(model.sentenceIndex + 1, model.sentences.length)}/${model.sentences.length} · Word ${Math.min(model.expectedTokenIndex + 1, model.graph.levels.length)}/${model.graph.levels.length}`,
          );
        };

        const setTileState = (
          tile: Phaser.GameObjects.Image | Phaser.GameObjects.Polygon,
          active: boolean,
          correct: boolean,
          lit: boolean,
        ) => {
          const color = lit
            ? options.edition.palette.friendly
            : active
              ? correct
                ? options.edition.palette.accent
                : options.edition.palette.hostile
              : 0x475569;
          if ("setTint" in tile) {
            tile.setTint(color);
          } else {
            tile.setFillStyle(color, active || lit ? 1 : 0.45);
          }
          tile.setAlpha(active || lit ? 1 : 0.4);
        };

        const refreshTileStates = () => {
          for (const level of model.graph.levels) {
            for (const node of level) {
              const tile = tileObjects.get(node.id);
              if (!tile) continue;
              const active = node.reachableFrom.includes(model.currentNodeId);
              setTileState(
                tile,
                active,
                node.correct,
                model.litNodeIds.includes(node.id),
              );
            }
          }
          updateHUD();
        };

        const renderGraph = () => {
          destroyGraph();
          for (const level of model.graph.levels) {
            for (const node of level) {
              const point = projectIsometricPoint(node.coordinate, projection);
              const tile =
                textureExists(options.edition, "platform.rune-cube") &&
                this.textures.exists("platform.rune-cube")
                  ? this.add
                      .image(point.x, point.y, "platform.rune-cube")
                      .setDisplaySize(
                        136 * options.edition.tuning.targetScale,
                        74 * options.edition.tuning.targetScale,
                      )
                  : this.add.polygon(
                      point.x,
                      point.y,
                      [-68, 0, 0, -34, 68, 0, 0, 34],
                      options.edition.palette.accent,
                    );
              tile
                .setDepth(point.depth)
                .setInteractive({ useHandCursor: true });
              tile.on("pointerdown", () => selectNode(node.id));
              graphObjects.push(tile);
              tileObjects.set(node.id, tile);

              if (
                textureExists(options.edition, "token.rune") &&
                this.textures.exists("token.rune")
              ) {
                const rune = this.add
                  .image(point.x, point.y - 8, "token.rune")
                  .setDisplaySize(42, 42)
                  .setDepth(point.depth + 1);
                graphObjects.push(rune);
              }
              const label = this.add
                .text(point.x, point.y - 8, node.text, {
                  color: "#f8fafc",
                  fontFamily: "sans-serif",
                  fontSize: "20px",
                  fontStyle: "bold",
                  backgroundColor: "#0f172acc",
                  padding: { x: 12, y: 12 },
                })
                .setOrigin(0.5)
                .setDepth(point.depth + 2)
                .setInteractive({ useHandCursor: true });
              label.on("pointerdown", () => selectNode(node.id));
              graphObjects.push(label);
            }
          }
          refreshTileStates();
        };

        const selectNode = (targetNodeId: string) => {
          if (model.complete) return;
          if (moving) {
            queuedTargetNodeId = targetNodeId;
            return;
          }
          const targetNode = model.graph.nodes[targetNodeId];
          if (!targetNode) return;
          const previous = model;
          const next = attemptZigguratStep(model, targetNodeId);
          if (next === previous) return;
          model = next;
          const correct = model.lastOutcome === "correct";
          const target = projectIsometricPoint(targetNode.coordinate, projection);
          options.diagnostics({
            type: "answer",
            details: {
              correct,
              sentenceIndex: previous.sentenceIndex,
              tokenIndex: previous.expectedTokenIndex,
              nodeId: targetNode.id,
            },
          });

          if (!correct) {
            particles.emitParticleAt(target.x, target.y, 8);
            showSemanticEffect("feedback.incorrect", target.x, target.y);
            this.cameras.main.shake(
              120,
              0.004 * options.edition.tuning.intensity,
            );
            refreshTileStates();
            return;
          }

          moving = true;
          particles.emitParticleAt(target.x, target.y, 14);
          showSemanticEffect("feedback.correct", target.x, target.y);
          this.tweens.add({
            targets: player,
            x: target.x,
            y: target.y - 42,
            scale: 1.08,
            duration: 260 / options.edition.tuning.speed,
            ease: "Sine.easeInOut",
            onComplete: () => {
              player.setScale(1);
              moving = false;
              const ritualCompleted =
                model.completedRituals > previous.completedRituals;
              if (ritualCompleted) {
                particles.emitParticleAt(target.x, target.y, 30);
                showSemanticEffect("effect.ritual", target.x, target.y - 30);
                this.cameras.main.flash(
                  180,
                  255,
                  255,
                  255,
                  false,
                  undefined,
                );
              }
              if (model.complete && model.results) {
                emitComplete(model.results);
                updateHUD();
                return;
              }
              if (ritualCompleted) {
                player.setPosition(origin.x, origin.y - 40);
                renderGraph();
              } else {
                refreshTileStates();
              }
              const queuedNodeId = queuedTargetNodeId;
              queuedTargetNodeId = undefined;
              if (queuedNodeId) selectNode(queuedNodeId);
            },
          });
        };

        const selectDirection = (direction: "left" | "forward" | "right") => {
          const target = model.graph.levels
            .flat()
            .find(
              (node) =>
                node.direction === direction &&
                node.reachableFrom.includes(model.currentNodeId),
            );
          if (target) selectNode(target.id);
        };

        const addTouchDirection = (
          label: string,
          x: number,
          direction: "left" | "forward" | "right",
        ) => {
          this.add
            .text(x, 480, label, {
              color: "#f8fafc",
              backgroundColor: "#1e293bdd",
              fontFamily: "sans-serif",
              fontSize: "24px",
              fontStyle: "bold",
              padding: { x: 20, y: 12 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(1_000_000)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => selectDirection(direction));
        };
        addTouchDirection("↖", 380, "left");
        addTouchDirection("↑", 480, "forward");
        addTouchDirection("↗", 580, "right");

        this.input.keyboard?.on("keydown-LEFT", () => selectDirection("left"));
        this.input.keyboard?.on("keydown-A", () => selectDirection("left"));
        this.input.keyboard?.on("keydown-UP", () => selectDirection("forward"));
        this.input.keyboard?.on("keydown-W", () => selectDirection("forward"));
        this.input.keyboard?.on("keydown-RIGHT", () => selectDirection("right"));
        this.input.keyboard?.on("keydown-D", () => selectDirection("right"));

        renderGraph();
        options.diagnostics({
          type: "scene-ready",
          details: { sentenceCount: model.sentences.length },
        });
      },
    },
  };
}
/* v8 ignore stop */
