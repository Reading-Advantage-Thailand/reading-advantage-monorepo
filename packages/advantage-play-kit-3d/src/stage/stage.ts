/**
 * The 3D stage every game draws on: one renderer per page, the scene, the camera driven by a rig,
 * a timeline for view animations, the actors, and framing for the free part of the screen (the
 * part that the HUD does not cover). It knows nothing about any game.
 */
import * as THREE from 'three';
import type { Actor } from './actor.js';
import type { CameraPose, CameraRig } from './camera.js';
import { ModelLoader } from './loader.js';
import { Timeline } from './timeline.js';

export type QualityTierId = 'high' | 'mid' | 'low';

export interface QualityTier {
  antialias: boolean;
  pixelRatioCap: number;
  shadows: boolean;
  shadowMapSize: number;
}

export const QUALITY: Record<QualityTierId, QualityTier> = {
  high: { antialias: true, pixelRatioCap: 2, shadows: true, shadowMapSize: 2048 },
  mid: { antialias: false, pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024 },
  low: { antialias: false, pixelRatioCap: 1, shadows: false, shadowMapSize: 512 },
};

/** A first guess before the device gate decides the tier: phones and dense screens get `mid`. */
export function guessTier(): QualityTierId {
  const dense = window.devicePixelRatio > 1.5 || /Android|iPhone|iPad/i.test(navigator.userAgent);
  return dense ? 'mid' : 'high';
}

/** A part of the canvas as fractions [x0, y0, x1, y1] (0,0 is the top left). */
export type ScreenRegion = readonly [number, number, number, number];

export interface StageOptions {
  /** Site root for model paths. */
  base: string;
  /** The folder of the avatar pack versions under `base` (default `packs/avatar`, see `ModelLoader`). */
  avatarRoot?: string;
  tier?: QualityTierId;
  background?: THREE.ColorRepresentation;
  /** Linear fog [near, far] in meters, in the background color. */
  fog?: readonly [number, number];
  exposure?: number;
}

export class Stage3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
  readonly timeline = new Timeline();
  readonly loader: ModelLoader;
  readonly tier: QualityTier;
  /** The pose the rig writes each frame (before shake). */
  readonly pose: CameraPose = { pos: new THREE.Vector3(0, 2, 6), look: new THREE.Vector3(0, 1, 0), fov: 40 };
  private rig: CameraRig | null = null;
  private readonly actors = new Set<Actor>();
  private readonly updaters = new Set<(dt: number, time: number) => void>();
  private readonly clock = new THREE.Timer();
  private time = 0;
  private running = false;
  private region: ScreenRegion = [0, 0, 1, 1];
  private shakeLeft = 0;
  private shakePower = 0;
  private readonly tmp = new THREE.Vector3();

  constructor(private readonly canvas: HTMLCanvasElement, options: StageOptions) {
    this.tier = QUALITY[options.tier ?? guessTier()];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.tier.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.tier.pixelRatioCap));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = options.exposure ?? 1.3;
    this.renderer.shadowMap.enabled = this.tier.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.loader = new ModelLoader(options.base, options.avatarRoot);
    const bg = new THREE.Color(options.background ?? '#0c1118');
    this.scene.background = bg;
    if (options.fog) this.scene.fog = new THREE.Fog(bg, options.fog[0], options.fog[1]);
    this.clock.connect(document);
    this.resume();
  }

  // ---------------------------------------------------------------- lifecycle

  /** Stops the frame loop and the timeline; the last frame stays on screen. */
  pause(): void {
    if (!this.running) return;
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  /** Restarts the frame loop with no catch-up time. */
  resume(): void {
    if (this.running) return;
    this.running = true;
    this.clock.reset();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  get paused(): boolean {
    return !this.running;
  }

  /**
   * Empties the stage for the next game (one renderer per page): stops every animation, removes
   * the actors and every scene object, and resets the camera, framing, and background. Loaded
   * models stay in the loader cache, so a second game reuses them.
   */
  clear(options: Pick<StageOptions, 'background' | 'fog' | 'exposure'> = {}): void {
    this.timeline.clear();
    for (const a of this.actors) a.dispose();
    this.actors.clear();
    this.updaters.clear();
    this.scene.clear();
    this.rig = null;
    this.shakeLeft = 0;
    this.setFreeArea(null);
    const bg = new THREE.Color(options.background ?? '#0c1118');
    this.scene.background = bg;
    this.scene.fog = options.fog ? new THREE.Fog(bg, options.fog[0], options.fog[1]) : null;
    this.renderer.toneMappingExposure = options.exposure ?? 1.3;
  }

  /** Frees everything this stage made; the canvas can then be removed. */
  dispose(): void {
    this.pause();
    this.timeline.clear();
    for (const a of this.actors) a.dispose();
    this.actors.clear();
    this.updaters.clear();
    this.loader.dispose();
    this.clock.dispose();
    this.renderer.dispose();
  }

  // ---------------------------------------------------------------- scene

  /** Adds an actor to the scene; the stage updates it every frame. */
  addActor(actor: Actor): Actor {
    this.actors.add(actor);
    this.scene.add(actor.root);
    return actor;
  }

  removeActor(actor: Actor): void {
    this.actors.delete(actor);
    actor.dispose();
  }

  /** Calls `fn(dt, time)` every frame until the returned function is called. */
  onFrame(fn: (dt: number, time: number) => void): () => void {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  /** A directional key light that casts shadows over a square of `extent` meters around `target`. */
  addSun(color: THREE.ColorRepresentation, intensity: number, from: readonly [number, number, number], target: readonly [number, number, number], extent = 8): THREE.DirectionalLight {
    const sun = new THREE.DirectionalLight(color, intensity);
    sun.position.set(...from);
    sun.target.position.set(...target);
    sun.castShadow = this.tier.shadows;
    sun.shadow.mapSize.set(this.tier.shadowMapSize, this.tier.shadowMapSize);
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 40 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    return sun;
  }

  // ---------------------------------------------------------------- camera

  setRig(rig: CameraRig | null): void {
    this.rig = rig;
  }

  /**
   * Frames every shot for a part of the screen (the part the HUD leaves free); the whole canvas
   * is still drawn. Null frames for the whole screen.
   */
  setFreeArea(region: ScreenRegion | null): void {
    this.region = region ?? [0, 0, 1, 1];
    this.applyView();
  }

  shake(power: number, seconds: number): void {
    this.shakePower = power;
    this.shakeLeft = seconds;
  }

  /** Where a world point is on screen, in CSS pixels relative to the canvas. */
  screenOfPoint(p: THREE.Vector3): { x: number; y: number; visible: boolean } {
    this.tmp.copy(p).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: (this.tmp.x * 0.5 + 0.5) * r.width, y: (-this.tmp.y * 0.5 + 0.5) * r.height, visible: this.tmp.z < 1 };
  }

  /** Where the point `lift` meters above an actor (scaled with it) is on screen. */
  screenOf(actor: Actor, lift = 1.3): { x: number; y: number; visible: boolean } {
    if (!actor.root.visible) return { x: 0, y: 0, visible: false };
    return this.screenOfPoint(new THREE.Vector3(0, lift * actor.scale, 0).add(actor.root.position));
  }

  /** The canvas size in CSS pixels. */
  get size(): { width: number; height: number } {
    return { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
  }

  // ---------------------------------------------------------------- frame

  private applyView(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    const [x0, y0, x1, y1] = this.region;
    if (x0 === 0 && y0 === 0 && x1 === 1 && y1 === 1) this.camera.clearViewOffset();
    // A virtual frame the size of the free area; the canvas is a window onto it that starts at
    // the free area's corner, so the frame's center lands in the middle of the free area.
    else this.camera.setViewOffset(w * (x1 - x0), h * (y1 - y0), -w * x0, -h * y0, w, h);
    this.camera.aspect = (w * (x1 - x0)) / (h * (y1 - y0));
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    const size = this.renderer.getSize(this.sizeTmp);
    if (size.x !== w || size.y !== h) {
      this.renderer.setSize(w, h, false);
      this.applyView();
    }
  }

  private readonly sizeTmp = new THREE.Vector2();

  private frame(now: number): void {
    this.clock.update(now);
    // The APK frame ceiling: a long frame (a tab switch, a slow phone) never jumps the animation.
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    this.resize();
    this.timeline.update(dt);
    for (const fn of this.updaters) fn(dt, this.time);
    for (const a of this.actors) a.update(dt);
    this.rig?.update(dt, this.pose);
    this.camera.position.copy(this.pose.pos);
    if (this.camera.fov !== this.pose.fov) {
      this.camera.fov = this.pose.fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      const p = this.shakePower * Math.min(1, Math.max(0, this.shakeLeft * 3));
      this.camera.position.x += (Math.random() - 0.5) * p * 2;
      this.camera.position.y += (Math.random() - 0.5) * p * 2;
    }
    this.camera.lookAt(this.pose.look);
    this.renderer.render(this.scene, this.camera);
  }
}
