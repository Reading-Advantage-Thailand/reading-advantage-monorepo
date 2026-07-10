import {
  preloadSemanticAssets,
  type APKDiagnosticInput,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { GameResults, SentenceInput } from "@reading-advantage/game-contracts";
import type Phaser from "phaser";

import {
  createTargetActionState,
  isExpectedTarget,
  resolveTargetHit,
} from "../../families/target-action/state";

const WORLD_WIDTH = 1_600;
const WORLD_HEIGHT = 900;
const PROJECTILE_SPEED = 1_400;
const PROJECTILE_TEXTURE = "astral-mage-projectile-procedural";
const PARTICLE_TEXTURE = "astral-mage-particle-procedural";

/** Semantic assets required by the Astral Mage scene in every edition. */
export const ASTRAL_MAGE_ASSET_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "target.word-crystal",
  "projectile.magic",
  "feedback.correct",
  "feedback.incorrect",
  "indicator.offscreen",
  "portal.complete",
  "ui.panel",
] as const;

/** Options needed to create one deterministic Astral Mage Phaser session. */
export interface AstralMageGameConfigOptions {
  /** Strict sentence pair array supplied by the host. */
  input: SentenceInput;
  /** Resolved Primary or Secondary presentation edition. */
  edition: RuntimeEdition;
  /** Receives the exact five-field result after the last crystal. */
  complete: (results: GameResults) => void;
  /** Receives structured scene events for the host diagnostics panel. */
  diagnostics: (event: APKDiagnosticInput) => void;
  /** Reproducible session seed. */
  seed: number;
}

interface TargetView {
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

interface MovementKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  UP: Phaser.Input.Keyboard.Key;
  DOWN: Phaser.Input.Keyboard.Key;
  LEFT: Phaser.Input.Keyboard.Key;
  RIGHT: Phaser.Input.Keyboard.Key;
}

function diagnostic(
  options: AstralMageGameConfigOptions,
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
 * Measures the shortest distance from a point to a projectile's swept segment.
 * @param pointX Horizontal target coordinate.
 * @param pointY Vertical target coordinate.
 * @param startX Horizontal coordinate at the previous physics frame.
 * @param startY Vertical coordinate at the previous physics frame.
 * @param endX Horizontal coordinate at the current physics frame.
 * @param endY Vertical coordinate at the current physics frame.
 * @returns Distance from the target point to the travelled segment.
 */
export function distanceToProjectilePath(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) return Math.hypot(pointX - startX, pointY - startY);
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) /
        lengthSquared,
    ),
  );
  return Math.hypot(
    pointX - (startX + projection * segmentX),
    pointY - (startY + projection * segmentY),
  );
}

/* v8 ignore start -- Phaser scene lifecycle is exercised through browser QC after catalog integration. */
/**
 * Creates the Phaser 4 Astral Mage arena configuration.
 * @param options Stable input, edition, callbacks, and deterministic seed.
 * @returns Phaser configuration with movement, projectile collision, camera, pools, timers, particles, and tweens.
 */
export function createAstralMageGameConfig(
  options: AstralMageGameConfigOptions,
): Phaser.Types.Core.GameConfig {
  let model = createTargetActionState(options.input, options.seed);
  let completed = false;
  let player: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | undefined;
  let movementKeys: MovementKeys | undefined;
  let resolveProjectileCollisions: () => void = () => undefined;
  const touchMovement = new Set<"up" | "down" | "left" | "right">();

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
        preloadSemanticAssets(this.load, options.edition, ASTRAL_MAGE_ASSET_SLOTS);
      },
      create(this: Phaser.Scene) {
        model = createTargetActionState(options.input, options.seed);
        completed = false;
        touchMovement.clear();
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        if (this.textures.exists("world.background")) {
          this.add
            .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "world.background")
            .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
            .setDepth(-20);
        } else {
          this.add.rectangle(
            WORLD_WIDTH / 2,
            WORLD_HEIGHT / 2,
            WORLD_WIDTH,
            WORLD_HEIGHT,
            options.edition.palette.background,
          ).setDepth(-20);
        }

        if (!this.textures.exists(PROJECTILE_TEXTURE)) {
          const projectileSource = this.add.graphics();
          projectileSource.fillStyle(options.edition.palette.accent, 1);
          projectileSource.fillCircle(8, 8, 8);
          projectileSource.generateTexture(PROJECTILE_TEXTURE, 16, 16);
          projectileSource.destroy();
        }
        if (!this.textures.exists(PARTICLE_TEXTURE)) {
          const particleSource = this.add.graphics();
          particleSource.fillStyle(options.edition.palette.friendly, 1);
          particleSource.fillCircle(3, 3, 3);
          particleSource.generateTexture(PARTICLE_TEXTURE, 6, 6);
          particleSource.destroy();
        }

        player = this.textures.exists("player.hero")
          ? this.add
              .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "player.hero")
              .setDisplaySize(
                56 * options.edition.tuning.targetScale,
                72 * options.edition.tuning.targetScale,
              )
          : this.add.rectangle(
              WORLD_WIDTH / 2,
              WORLD_HEIGHT / 2,
              52 * options.edition.tuning.targetScale,
              64 * options.edition.tuning.targetScale,
              options.edition.palette.player,
            );
        this.physics.add.existing(player);
        const playerBody = player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);
        playerBody.setCircle(
          22 * options.edition.tuning.collisionScale,
        );
        this.cameras.main.startFollow(player, true, 0.1, 0.1);

        const targetGroup = this.physics.add.staticGroup();
        const targetViews = new Map<string, TargetView>();
        const projectileKey = this.textures.exists("projectile.magic")
          ? "projectile.magic"
          : PROJECTILE_TEXTURE;
        const projectilePool = this.physics.add.group({
          defaultKey: projectileKey,
          maxSize: 24,
        });
        const particles = this.add.particles(0, 0, PARTICLE_TEXTURE, {
          lifespan: 420,
          speed: { min: 55, max: 150 },
          scale: { start: 1.2, end: 0 },
          emitting: false,
        });

        const prompt = this.add
          .text(480, 28, "", {
            color: options.edition.palette.text,
            backgroundColor: "#0f172acc",
            fontFamily: "sans-serif",
            fontSize: "22px",
            padding: { x: 14, y: 9 },
          })
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(30);
        const progress = this.add
          .text(480, 78, "", {
            color: "#f8fafc",
            fontFamily: "sans-serif",
            fontSize: "20px",
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(30);
        const indicator = this.add
          .text(936, 102, "", {
            color: "#fde68a",
            backgroundColor: "#1e1b4bcc",
            fontSize: "17px",
            padding: { x: 10, y: 7 },
          })
          .setOrigin(1, 0)
          .setScrollFactor(0)
          .setDepth(30);
        if (this.textures.exists("indicator.offscreen")) {
          this.add
            .image(936, 102, "indicator.offscreen")
            .setDisplaySize(44, 44)
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(29);
        }

        const styleTarget = (targetId: string) => {
          const target = model.targets.find((candidate) => candidate.id === targetId);
          const view = targetViews.get(targetId);
          if (!target || !view) return;
          const correct = isExpectedTarget(model, target);
          if ("setTexture" in view.body) {
            const image = view.body as Phaser.GameObjects.Image;
            const texture = correct ? "target.correct" : "target.incorrect";
            if (this.textures.exists(texture)) image.setTexture(texture);
            image.setTint(
              correct
                ? options.edition.palette.friendly
                : options.edition.palette.accent,
            );
          } else {
            view.body.setFillStyle(
              correct
                ? options.edition.palette.friendly
                : options.edition.palette.accent,
              0.95,
            );
          }
          view.label.setStyle({ fontStyle: correct ? "bold" : "normal" });
        };

        const updateHud = () => {
          const sentence = model.sentences[Math.min(model.sentenceIndex, model.sentences.length - 1)]!;
          prompt.setText(sentence.translation);
          progress.setText(
            model.complete
              ? model.expectedTokens.join(" ")
              : model.expectedTokens
                  .map((token, index) => index < model.expectedTokenIndex ? token : "＿")
                  .join(" "),
          );
          const nextToken = model.expectedTokens[model.expectedTokenIndex];
          indicator.setText(nextToken ? `Next crystal: ${nextToken}` : "Portal stabilized");
        };

        let fireToward: (x: number, y: number, targetId?: string) => void = () => undefined;
        let nextFlightId = 0;
        const renderTargets = () => {
          targetGroup.clear(true, true);
          for (const view of targetViews.values()) view.label.destroy();
          targetViews.clear();

          for (const target of model.targets) {
            const correct = isExpectedTarget(model, target);
            const texture = this.textures.exists("target.word-crystal")
              ? "target.word-crystal"
              : correct
                ? "target.correct"
                : "target.incorrect";
            const body = this.textures.exists(texture)
              ? this.add
                  .image(target.x, target.y, texture)
                  .setDisplaySize(
                    74 * options.edition.tuning.targetScale,
                    74 * options.edition.tuning.targetScale,
                  )
              : this.add.circle(
                  target.x,
                  target.y,
                  36 * options.edition.tuning.targetScale,
                  correct
                    ? options.edition.palette.friendly
                    : options.edition.palette.accent,
                );
            body.setData("targetId", target.id).setInteractive();
            body.on("pointerdown", () => fireToward(body.x, body.y, target.id));
            targetGroup.add(body);
            const label = this.add
              .text(target.x, target.y, target.text, {
                color: "#f8fafc",
                fontFamily: "sans-serif",
                fontSize: `${Math.round(18 * options.edition.tuning.targetScale)}px`,
                fontStyle: correct ? "bold" : "normal",
              })
              .setOrigin(0.5)
              .setDepth(3);
            targetViews.set(target.id, { body, label });
          }
          updateHud();
        };

        const showCompletionPortal = () => {
          const portal = this.textures.exists("portal.complete")
            ? this.add.image(player!.x, player!.y - 110, "portal.complete")
            : this.add.circle(
                player!.x,
                player!.y - 110,
                46,
                options.edition.palette.friendly,
                0.8,
              );
          this.tweens.add({
            targets: portal,
            scale: 1.35,
            alpha: 0.25,
            duration: 650,
            yoyo: true,
            repeat: 1,
          });
        };

        const handleTargetHit = (
          targetId: string,
          projectile?: Phaser.Physics.Arcade.Image,
        ) => {
          if (projectile?.active) projectile.disableBody(true, true);
          const previous = model;
          const hitTarget = model.targets.find((candidate) => candidate.id === targetId);
          const correct = hitTarget !== undefined && isExpectedTarget(model, hitTarget);
          model = resolveTargetHit(model, targetId);
          if (model === previous) return;

          diagnostic(options, "CARTRIDGE_ANSWER", correct ? "correct target" : "wrong target", {
            correct,
            targetId,
            sentenceIndex: previous.sentenceIndex,
          });
          if (!correct) {
            this.cameras.main.shake(110, 0.004 * options.edition.tuning.intensity);
            return;
          }

          const view = targetViews.get(targetId);
          if (view) {
            particles.emitParticleAt(view.body.x, view.body.y, 14);
            view.body.disableInteractive().setActive(false).setVisible(false);
            const physicsBody = view.body.body as Phaser.Physics.Arcade.StaticBody;
            physicsBody.enable = false;
            this.tweens.add({
              targets: view.label,
              scale: 1.5,
              alpha: 0,
              duration: 180,
            });
          }
          if (model.complete && model.results && !completed) {
            completed = true;
            updateHud();
            showCompletionPortal();
            diagnostic(options, "CARTRIDGE_COMPLETE", "complete", model.results);
            options.complete(model.results);
            return;
          }
          if (model.sentenceIndex !== previous.sentenceIndex) {
            renderTargets();
            diagnostic(options, "CARTRIDGE_ROUND", "new sentence", {
              sentenceIndex: model.sentenceIndex,
            });
          } else {
            for (const target of model.targets) {
              if (target.active) styleTarget(target.id);
            }
            updateHud();
          }
        };

        fireToward = (x: number, y: number, targetId?: string) => {
          if (!player || model.complete) return;
          const projectile = projectilePool.get(player.x, player.y) as
            | Phaser.Physics.Arcade.Image
            | null;
          if (!projectile) return;
          projectile.enableBody(true, player.x, player.y, true, true);
          const flightId = ++nextFlightId;
          projectile.setData("flightId", flightId);
          projectile.setData("intendedTargetId", targetId);
          projectile.setData("previousX", player.x);
          projectile.setData("previousY", player.y);
          projectile.setDisplaySize(16, 16).setDepth(5);
          const angle = Math.atan2(y - player.y, x - player.x);
          const projectileBody = projectile.body as Phaser.Physics.Arcade.Body;
          this.physics.velocityFromRotation(
            angle,
            PROJECTILE_SPEED * options.edition.tuning.speed,
            projectileBody.velocity,
          );
          const maximumFlightTime =
            (Math.hypot(x - player.x, y - player.y) /
              (PROJECTILE_SPEED * options.edition.tuning.speed)) *
              1_000 + 500;
          this.time.delayedCall(maximumFlightTime, () => {
            if (
              projectile.active &&
              projectile.getData("flightId") === flightId
            ) {
              projectile.disableBody(true, true);
            }
          });
        };

        resolveProjectileCollisions = () => {
          const collisionRadius = 42 * options.edition.tuning.collisionScale;
          for (const child of projectilePool.getChildren()) {
            const projectile = child as Phaser.Physics.Arcade.Image;
            if (!projectile.active) continue;
            const targetId = projectile.getData("intendedTargetId") as
              | string
              | undefined;
            const view = targetId ? targetViews.get(targetId) : undefined;
            if (!targetId || !view || !view.body.active) continue;
            const previousX = projectile.getData("previousX") as number;
            const previousY = projectile.getData("previousY") as number;
            if (
              distanceToProjectilePath(
                view.body.x,
                view.body.y,
                previousX,
                previousY,
                projectile.x,
                projectile.y,
              ) <= collisionRadius
            ) {
              handleTargetHit(targetId, projectile);
              continue;
            }
            projectile.setData("previousX", projectile.x);
            projectile.setData("previousY", projectile.y);
          }
        };

        this.physics.add.overlap(projectilePool, targetGroup, (projectileObject, targetObject) => {
          const projectile = projectileObject as Phaser.Physics.Arcade.Image;
          const targetBody = targetObject as Phaser.GameObjects.GameObject;
          const targetId = targetBody.getData("targetId") as string | undefined;
          if (!targetId) return;
          const intendedTargetId = projectile.getData("intendedTargetId") as
            | string
            | undefined;
          if (intendedTargetId && intendedTargetId !== targetId) return;
          handleTargetHit(targetId, projectile);
        });

        movementKeys = this.input.keyboard?.addKeys(
          "W,A,S,D,UP,DOWN,LEFT,RIGHT",
        ) as MovementKeys | undefined;
        this.input.keyboard?.on("keydown-SPACE", () => {
          const next = model.targets.find(
            (target) => isExpectedTarget(model, target),
          );
          if (next) {
            fireToward(next.x, next.y, next.id);
          }
        });

        const addTouchControl = (
          label: string,
          x: number,
          y: number,
          direction: "up" | "down" | "left" | "right",
        ) => {
          const control = this.add
            .text(x, y, label, {
              color: "#f8fafc",
              backgroundColor: "#1e293bdd",
              fontSize: "24px",
              padding: { x: 15, y: 10 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(40)
            .setInteractive();
          control.on("pointerdown", () => touchMovement.add(direction));
          for (const event of ["pointerup", "pointerout", "pointercancel"] as const) {
            control.on(event, () => touchMovement.delete(direction));
          }
        };
        addTouchControl("↑", 100, 410, "up");
        addTouchControl("←", 48, 462, "left");
        addTouchControl("↓", 100, 462, "down");
        addTouchControl("→", 152, 462, "right");
        this.add
          .text(860, 450, "FIRE", {
            color: "#f8fafc",
            backgroundColor: "#7c3aeddd",
            fontSize: "20px",
            fontStyle: "bold",
            padding: { x: 19, y: 14 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(40)
          .setInteractive()
          .on("pointerdown", () => {
            const next = model.targets.find(
              (target) => isExpectedTarget(model, target),
            );
            if (next) {
              fireToward(next.x, next.y, next.id);
            }
          });

        this.time.addEvent({
          delay: 1_200 / options.edition.tuning.speed,
          loop: true,
          callback: () => {
            const next = model.targets.find(
              (target) => isExpectedTarget(model, target),
            );
            const view = next ? targetViews.get(next.id) : undefined;
            if (view) {
              this.tweens.add({
                targets: [view.body, view.label],
                scale: 1.12,
                duration: 220,
                yoyo: true,
              });
            }
          },
        });

        renderTargets();
        diagnostic(options, "CARTRIDGE_SCENE_READY", "scene ready", {
          sentenceIndex: model.sentenceIndex,
        });
      },
      update(this: Phaser.Scene) {
        if (!player) return;
        resolveProjectileCollisions();
        const body = player.body as Phaser.Physics.Arcade.Body;
        const left = movementKeys?.A.isDown || movementKeys?.LEFT.isDown || touchMovement.has("left");
        const right = movementKeys?.D.isDown || movementKeys?.RIGHT.isDown || touchMovement.has("right");
        const up = movementKeys?.W.isDown || movementKeys?.UP.isDown || touchMovement.has("up");
        const down = movementKeys?.S.isDown || movementKeys?.DOWN.isDown || touchMovement.has("down");
        const horizontal = Number(Boolean(right)) - Number(Boolean(left));
        const vertical = Number(Boolean(down)) - Number(Boolean(up));
        const magnitude = Math.hypot(horizontal, vertical);
        const speed = 260 * options.edition.tuning.speed;
        body.setVelocity(
          magnitude === 0 ? 0 : (horizontal / magnitude) * speed,
          magnitude === 0 ? 0 : (vertical / magnitude) * speed,
        );
      },
    },
  };
}
/* v8 ignore stop */
