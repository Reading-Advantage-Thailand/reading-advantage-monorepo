/**
 * A character in a 2D (Phaser) view, the 2D twin of the stage `Actor` + `Walker`: a sprite drawn
 * from forge sheets (one sheet per clip, one row per direction), placed at a world point through
 * the shared 2D projection, drawn in depth order, turned toward its motion, walking while it
 * moves, and able to play one-shot clips (a cheer, a hit) that return to its idle loop.
 *
 * With `figure`, the actor is the student's own figure (./figure.ts) instead of the model's sheets:
 * the same calls move it, and its clips are simple motions. A view gives the player's hero a
 * figure whenever the session has an avatar (owner rule: the avatar is the student's identity).
 */
import type * as Phaser from 'phaser';
import { forgeDirections, type RuntimeEdition } from '../contracts/index.js';
import { Figure2D, type FigureSource } from './figure.js';
import { depthOf, directionRow, project, type Projection2D } from './projection.js';
import { animationKeyOf, textureKeyOf } from './sheets.js';

/** Phaser 4 `TintModes` values (a type-only Phaser import here). */
const TINT_MULTIPLY = 0;
const TINT_FILL = 1;

export interface Actor2DOptions {
  /** Sheet directions of this model (8 heroes, 4 everyone else). */
  dirs: 1 | 4 | 8;
  /** The clips this model has in the pack (file ids `<model>.<clip>`). */
  clips: readonly string[];
  idle?: string;
  walk?: string;
  /** Glide stiffness per second toward the target point. */
  stiffness?: number;
  /** The student's figure in place of the model's sheets (the player's hero when the session has an avatar). */
  figure?: FigureSource | null;
}

export class Actor2D {
  readonly sprite: Phaser.GameObjects.Sprite;
  /** The world point the actor stands on (meters). */
  x = 0;
  z = 0;
  /** Meters above the ground (a hovering bat); 0 stands on the floor. */
  lift = 0;
  private baseTint = 0xffffff;
  private tx = 0;
  private tz = 0;
  private facingX = 0;
  private facingZ = 1;
  private busy = 0;
  private current = '';
  private readonly dirs: 1 | 4 | 8;
  private readonly clips: Set<string>;
  private readonly idle: string;
  private readonly walk: string;
  private readonly stiffness: number;
  private readonly figure: Figure2D | null;
  private moving = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly edition: RuntimeEdition,
    readonly model: string,
    private readonly projection: Projection2D,
    options: Actor2DOptions,
    /** The world container (it scales and places the whole 2D world); none: the scene root. */
    parent?: Phaser.GameObjects.Container,
  ) {
    this.dirs = options.dirs;
    this.clips = new Set(options.clips);
    this.idle = options.idle ?? 'idle';
    this.walk = options.walk ?? 'walk';
    this.stiffness = options.stiffness ?? 14;
    if (options.figure) {
      this.figure = new Figure2D(scene, options.figure, projection.ppm, parent);
      this.sprite = this.figure.sprite;
    } else {
      this.figure = null;
      const file = edition.pack.files[`${model}.${this.idle}`] ?? edition.pack.files[`${model}.${[...this.clips][0]}`];
      this.sprite = scene.add.sprite(0, 0, file ? textureKeyOf(edition, file.id) : '__MISSING');
      if (file?.origin) this.sprite.setOrigin(file.origin.x, file.origin.y);
      parent?.add(this.sprite);
    }
    this.loop(this.idle);
  }

  has(clip: string): boolean {
    return this.clips.has(clip);
  }

  /** Puts the actor at a world point at once. */
  placeAt(x: number, z: number): void {
    this.x = this.tx = x;
    this.z = this.tz = z;
    this.draw();
  }

  /** Where the actor should be; it glides there (the core moves at 30 Hz). */
  moveTo(x: number, z: number): void {
    this.tx = x;
    this.tz = z;
  }

  /** Faces a direction on the ground (dx, dz) without moving. */
  face(dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return;
    this.facingX = dx;
    this.facingZ = dz;
    this.figure?.face(dx);
    this.refresh();
  }

  /** A looping clip (the idle clip when missing). */
  loop(clip: string): void {
    this.busy = 0;
    this.current = this.has(clip) ? clip : this.idle;
    this.figure?.rest();
    this.refresh(true);
  }

  /**
   * A one-shot clip; resolves when it ends, then the actor returns to its loop. With `hold`, the
   * actor keeps the last frame (a knocked-down zombie stays down) until the next `play` or `loop`.
   */
  play(clip: string, speed = 1, hold = false): Promise<void> {
    if (!this.has(clip)) return Promise.resolve();
    if (this.figure) {
      this.busy = hold ? Infinity : this.figure.seconds(clip, speed);
      return this.figure.play(clip, speed, hold);
    }
    const key = animationKeyOf(this.edition, `${this.model}.${clip}`, this.animName(clip));
    const anim = this.scene.anims.get(key);
    if (!anim) return Promise.resolve();
    this.sprite.play({ key, timeScale: speed });
    this.busy = hold ? Infinity : anim.duration / 1000 / speed;
    return new Promise((resolve) => this.sprite.once('animationcomplete', () => resolve()));
  }

  /** A lasting color tint (multiplied: a cool night, a dark boss). */
  tint(color: number): void {
    this.baseTint = color;
    this.sprite.setTintMode(TINT_MULTIPLY).setTint(color);
  }

  /** A short flash in one color (white for a hit, red for a hurt hero). */
  flash(color = 0xffffff, ms = 110): void {
    this.sprite.setTint(color).setTintMode(TINT_FILL);
    this.scene.time.delayedCall(ms, () => this.sprite.setTintMode(TINT_MULTIPLY).setTint(this.baseTint));
  }

  /** The length of a clip in seconds at a speed (0 when the model has no such clip). */
  clipSeconds(clip: string, speed = 1): number {
    if (this.figure) return this.has(clip) ? this.figure.seconds(clip, speed) : 0;
    const anim = this.has(clip) ? this.scene.anims.get(animationKeyOf(this.edition, `${this.model}.${clip}`, this.animName(clip))) : null;
    return anim ? anim.duration / 1000 / speed : 0;
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-this.stiffness * dt);
    const px = this.x;
    const pz = this.z;
    this.x += (this.tx - this.x) * k;
    this.z += (this.tz - this.z) * k;
    const dx = this.x - px;
    const dz = this.z - pz;
    const moving = Math.hypot(dx, dz) / Math.max(dt, 1e-4) > 0.25;
    if (moving) {
      this.facingX = dx;
      this.facingZ = dz;
      this.figure?.face(dx);
    }
    this.moving = moving;
    this.busy = Math.max(0, this.busy - dt);
    if (this.busy <= 0) {
      const want = moving && this.has(this.walk) ? this.walk : this.current === this.walk ? this.idle : this.current;
      if (want !== this.current || moving) {
        this.current = want;
        this.refresh();
      }
    }
    this.draw(dt);
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private animName(clip: string): string {
    const row = directionRow(this.facingX, this.facingZ, this.dirs);
    return `${clip}.${forgeDirections(this.dirs)[row]!.toLowerCase()}`;
  }

  /** Plays the current loop in the current facing (keeps the frame when only the facing changes). */
  private refresh(restart = false): void {
    if (this.busy > 0 || this.figure) return;
    const key = animationKeyOf(this.edition, `${this.model}.${this.current}`, this.animName(this.current));
    if (this.sprite.anims.currentAnim?.key === key && !restart) return;
    if (this.scene.anims.exists(key)) this.sprite.play(key, !restart);
  }

  private draw(dt = 0): void {
    const p = project(this.projection, this.x, this.lift, this.z);
    const o = this.figure ? this.figure.update(dt, this.moving && this.busy <= 0) : { x: 0, y: 0 };
    this.sprite.setPosition(p.x + o.x, p.y + o.y);
    this.sprite.setDepth(depthOf(this.z, this.lift));
  }
}
