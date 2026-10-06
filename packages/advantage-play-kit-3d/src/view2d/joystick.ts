/**
 * The 2D twin of the HUD joystick (`hud/joystick.ts`): a floating stick for touch and mouse, and
 * the arrow keys or WASD for a keyboard. A drag that starts anywhere on the free screen (not on a
 * button) moves the stick there; at rest it waits at the bottom left with a "Drag to move" hint,
 * so a student on a phone sees how to play. It calls `change(x, z)` with a direction of length 0
 * to 1 (screen right = +x, screen down = +z, toward the camera) only when the direction changes.
 */
import type * as Phaser from 'phaser';
import { text } from './hud2d.js';

export interface Joystick2DOptions {
  /** The hint under the resting stick ("Drag to move"). */
  hint: string;
  change(x: number, z: number): void;
  /** Held `KeyboardEvent.code`s, e.g. from the APK input controller's snapshot. */
  keys?: () => readonly string[];
  /** A drag must start below this screen y (the top HUD). */
  top?: number;
  radius?: number;
}

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];

export class Joystick2D {
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly rest: { x: number; y: number };
  private readonly radius: number;
  private active: number | null = null;
  private sx = 0;
  private sy = 0;
  private lastX = 0;
  private lastZ = 0;
  private readonly off: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: Joystick2DOptions,
  ) {
    const { height } = scene.scale;
    this.radius = options.radius ?? 54;
    this.rest = { x: 24 + this.radius, y: height - 30 - this.radius };
    this.base = scene.add.circle(this.rest.x, this.rest.y, this.radius, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.55).setScrollFactor(0).setDepth(19_400);
    this.knob = scene.add.circle(this.rest.x, this.rest.y, this.radius * 0.45, 0xffffff, 0.5).setScrollFactor(0).setDepth(19_401);
    this.hint = text(scene, this.rest.x, this.rest.y - this.radius - 8, options.hint, 14).setOrigin(0.5, 1).setStroke('#121a2c', 5).setScrollFactor(0).setDepth(19_402);
    const top = options.top ?? 0;
    const down = (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void => {
      if (over.length || this.active !== null || p.y < top) return;
      this.active = p.id;
      this.sx = p.x;
      this.sy = p.y;
      this.base.setPosition(p.x, p.y).setFillStyle(0xffffff, 0.18);
      this.knob.setPosition(p.x, p.y);
      this.hint.setVisible(false);
    };
    const move = (p: Phaser.Input.Pointer): void => {
      if (p.id !== this.active) return;
      const dx = p.x - this.sx;
      const dy = p.y - this.sy;
      const d = Math.hypot(dx, dy);
      const k = d > this.radius ? this.radius / d : 1;
      this.knob.setPosition(this.sx + dx * k, this.sy + dy * k);
      if (d < 6) return this.emit(0, 0);
      const m = Math.min(1, d / this.radius);
      this.emit((dx / d) * m, (dy / d) * m);
    };
    const up = (p: Phaser.Input.Pointer): void => {
      if (p.id !== this.active) return;
      this.active = null;
      this.base.setPosition(this.rest.x, this.rest.y).setFillStyle(0xffffff, 0.12);
      this.knob.setPosition(this.rest.x, this.rest.y);
      this.emit(0, 0);
    };
    scene.input.on('pointerdown', down);
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
    this.off.push(() => {
      scene.input.off('pointerdown', down);
      scene.input.off('pointermove', move);
      scene.input.off('pointerup', up);
      scene.input.off('pointerupoutside', up);
    });
  }

  /** Reads the keys once per frame (the stick has priority while a drag runs). */
  update(): void {
    if (this.active !== null || !this.options.keys) return;
    const keys = this.options.keys();
    const has = (codes: string[]): number => (codes.some((c) => keys.includes(c)) ? 1 : 0);
    const x = has(RIGHT) - has(LEFT);
    const z = has(DOWN) - has(UP);
    const d = Math.hypot(x, z);
    if (d) this.hint.setVisible(false);
    this.emit(d ? x / d : 0, d ? z / d : 0);
  }

  /** Hides the stick (the game is over). */
  destroy(): void {
    this.off.forEach((f) => f());
    this.base.destroy();
    this.knob.destroy();
    this.hint.destroy();
  }

  private emit(x: number, z: number): void {
    const zero = x === 0 && z === 0;
    if (zero ? this.lastX === 0 && this.lastZ === 0 : Math.hypot(x - this.lastX, z - this.lastZ) < 0.04) return;
    this.lastX = x;
    this.lastZ = z;
    this.options.change(x, z);
  }
}
