/**
 * The 2D stage of an arena game (a hero steered over a floor bigger than the screen): the baked
 * background in a world container, a camera that follows a point and stays over the floor,
 * depth sorting, and word tags pinned to the screen edge when their point is off screen, so every
 * word stays readable (the 2D twin of the 3D HUD's `anchor(..., { pin: true })`).
 *
 * Three coordinate spaces: background pixels (`px`, for objects inside `world`), scene pixels
 * (`at`, for top-level objects that scroll with the camera, such as tags and popups), and screen
 * pixels (`screen`, for HUD objects with scroll factor 0).
 */
import type * as Phaser from 'phaser';
import type { RuntimeEdition } from '../contracts/index.js';
import { project, type Point2D, type Projection2D } from './projection.js';
import { textureKeyOf } from './sheets.js';

export interface Arena2DOptions {
  /** Screen pixels per background pixel (the zoom). */
  scale: number;
  /** Screen pixels the HUD covers at the top (the status bar and a word panel). */
  top: number;
  /** Screen pixels the HUD covers at the bottom. */
  bottom?: number;
}

const clamp = (v: number, lo: number, hi: number): number => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

export class Arena2D {
  readonly world: Phaser.GameObjects.Container;
  /** Screen pixels per background pixel; `zoom` changes it. */
  scale: number;
  /** Screen pixels the HUD covers at the top; a view changes it when its word panel grows. */
  top: number;
  bottom: number;

  constructor(
    private readonly scene: Phaser.Scene,
    edition: RuntimeEdition,
    readonly projection: Projection2D,
    backgroundFile: string,
    options: Arena2DOptions,
  ) {
    this.scale = options.scale;
    this.top = options.top;
    this.bottom = options.bottom ?? 0;
    this.world = scene.add.container(0, 0).setScale(this.scale).setDepth(0);
    this.world.add(scene.add.image(0, 0, textureKeyOf(edition, backgroundFile)).setOrigin(0, 0).setDepth(-1e9));
  }

  /**
   * Zooms the world (a growing slime pulls the view back). The camera zoom would also scale the
   * HUD, so the world container scales instead; tags and followers read `scale` every frame.
   */
  zoom(scale: number): void {
    this.scale = scale;
    this.world.setScale(scale);
  }

  /** Background pixels of a world point (for objects inside `world`). */
  px(x: number, y: number, z: number): Point2D {
    return project(this.projection, x, y, z);
  }

  /** Scene pixels of a world point (for top-level objects that scroll with the camera). */
  at(x: number, y: number, z: number): Point2D {
    const p = project(this.projection, x, y, z);
    return { x: p.x * this.scale, y: p.y * this.scale };
  }

  /** Screen pixels of a world point. */
  screen(x: number, y: number, z: number): Point2D {
    const p = this.at(x, y, z);
    const cam = this.scene.cameras.main;
    return { x: p.x - cam.scrollX, y: p.y - cam.scrollY };
  }

  /**
   * Moves the camera toward a world point: the point sits a little below the middle of the free
   * area between the HUD bars, and the camera stays over the floor. `snap` jumps at once.
   */
  follow(x: number, z: number, dt: number, snap = false): void {
    const p = this.at(x, 0, z);
    const cam = this.scene.cameras.main;
    const { width, height } = this.scene.scale;
    const ww = this.projection.width * this.scale;
    const wh = this.projection.height * this.scale;
    const midY = this.top + (height - this.top - this.bottom) * 0.55;
    const tx = clamp(p.x - width / 2, 0, ww - width);
    const ty = clamp(p.y - midY, -this.top, wh - height + this.bottom);
    const k = snap ? 1 : 1 - Math.exp(-dt * 5);
    cam.scrollX += (tx - cam.scrollX) * k;
    cam.scrollY += (ty - cam.scrollY) * k;
  }

  /** Depth-sorts the world; call once per frame after moving things. */
  sort(): void {
    this.world.sort('depth');
  }

  /**
   * Places a top-level tag `lift` screen pixels over a world point, pinned inside the free screen
   * area when the point is off screen (a pinned tag is half transparent). Returns true if pinned.
   */
  pin(tag: Phaser.GameObjects.Container, x: number, y: number, z: number, lift = 0): boolean {
    const s = this.screen(x, y, z);
    s.y -= lift;
    const hw = tag.width / 2 + 6;
    const hh = tag.height / 2 + 6;
    const { width, height } = this.scene.scale;
    const cx = clamp(s.x, hw, width - hw);
    const cy = clamp(s.y, this.top + hh, height - this.bottom - hh);
    const pinned = Math.abs(cx - s.x) > 0.5 || Math.abs(cy - s.y) > 0.5;
    const cam = this.scene.cameras.main;
    tag.setPosition(cx + cam.scrollX, cy + cam.scrollY).setAlpha(pinned ? 0.72 : 1);
    return pinned;
  }
}
