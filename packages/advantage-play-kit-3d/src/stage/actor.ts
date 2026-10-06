/**
 * A skinned character on the stage: its own copy of the model and materials (so a flash or a
 * color preset touches only this actor), animation clips by forge name, and a smooth turn toward
 * `yaw`. One-shot clips resolve promises on the stage timeline.
 */
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import type { GLTF } from './loader.js';
import type { Timeline } from './timeline.js';

export interface ActorOptions {
  /** The loop clip the actor returns to after a one-shot clip. */
  idle?: string;
  scale?: number;
  /** Seconds into the idle loop, so a group does not move in step. */
  phase?: number;
}

export interface ClipRun {
  /** Resolves at the `at` moment of the clip (the impact of a swing). */
  hit: Promise<void>;
  /** Resolves when the clip ends. */
  done: Promise<void>;
}

export class Actor {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly actions = new Map<string, THREE.AnimationAction>();
  readonly materials: THREE.MeshStandardMaterial[] = [];
  /** Where the actor stands when it is not moving (games tween from and back to it). */
  readonly home = new THREE.Vector3();
  readonly scale: number;
  /** Facing in degrees about +Y; the actor turns toward it smoothly. */
  yaw = 0;
  idle: string;
  private current: THREE.AnimationAction | null = null;
  private readonly baseMaps = new Map<THREE.MeshStandardMaterial, THREE.Texture | null>();

  constructor(
    readonly kind: string,
    gltf: GLTF,
    private readonly timeline: Timeline,
    options: ActorOptions = {},
  ) {
    this.model = skeletonClone(gltf.scene);
    this.model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false; // skinned bounds do not follow the animation
      const own = (Array.isArray(node.material) ? node.material : [node.material]).map((m: THREE.Material) => {
        const copy = m.clone() as THREE.MeshStandardMaterial;
        this.materials.push(copy);
        this.baseMaps.set(copy, copy.map);
        return copy;
      });
      node.material = Array.isArray(node.material) ? own : own[0]!;
    });
    this.scale = options.scale ?? 1;
    this.model.scale.setScalar(this.scale);
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.idle = options.idle ?? 'idle';
    this.loop(this.idle, 0);
    if (options.phase) this.mixer.update(options.phase);
  }

  has(clip: string): boolean {
    return this.actions.has(clip);
  }

  /** Cross-fades to a looping clip (the idle clip when `clip` is missing). */
  loop(clip: string, fade = 0.2): void {
    const next = this.actions.get(clip) ?? this.actions.get(this.idle);
    if (!next || next === this.current) return;
    next.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    this.current?.fadeOut(fade);
    this.current = next;
  }

  /**
   * Plays a one-shot clip, then returns to the idle loop (except `death`, which holds its last
   * frame). A missing clip resolves at once.
   */
  play(clip: string, at = 0.5, speed = 1): ClipRun {
    const action = this.actions.get(clip);
    if (!action) return { hit: Promise.resolve(), done: Promise.resolve() };
    const seconds = action.getClip().duration / speed;
    action.reset().setLoop(THREE.LoopOnce, 1).setEffectiveTimeScale(speed).setEffectiveWeight(1).fadeIn(0.12).play();
    action.clampWhenFinished = true;
    this.current?.fadeOut(0.12);
    this.current = action;
    const hit = this.timeline.wait(seconds * at);
    const done = this.timeline.wait(seconds).then(() => {
      if (this.current !== action || clip === 'death') return;
      this.current = null;
      this.loop(this.idle, 0.25);
      action.fadeOut(0.25);
    });
    return { hit, done };
  }

  /** Holds the first frame of a clip (a closed chest, a heap of bones before it rises). */
  hold(clip: string): void {
    const action = this.actions.get(clip);
    if (!action) return;
    this.current?.stop();
    action.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1).play();
    action.paused = true;
    action.time = 0;
    this.current = action;
  }

  /** A short glow in `color` that fades out (a hit, a heal). */
  flash(color: THREE.ColorRepresentation, seconds = 0.3, strength = 0.9): Promise<void> {
    const c = new THREE.Color(color);
    for (const m of this.materials) m.emissive.copy(c);
    return this.timeline
      .tween(seconds, (u) => {
        for (const m of this.materials) m.emissiveIntensity = (1 - u) * strength;
      })
      .then(() => {
        for (const m of this.materials) m.emissive.setRGB(0, 0, 0);
      });
  }

  /** Replaces the base color map (a color preset); null restores the default look. */
  setMap(texture: THREE.Texture | null): void {
    for (const m of this.materials) {
      const base = this.baseMaps.get(m) ?? null;
      if (!base) continue;
      if (texture) {
        texture.wrapS = base.wrapS;
        texture.wrapT = base.wrapT;
        texture.channel = base.channel;
      }
      m.map = texture ?? base;
      m.needsUpdate = true;
    }
  }

  /** Places the actor at `home` (and moves `home` there). */
  placeAt(x: number, y: number, z: number, yaw?: number): void {
    this.home.set(x, y, z);
    this.root.position.copy(this.home);
    if (yaw !== undefined) {
      this.yaw = yaw;
      this.root.rotation.y = THREE.MathUtils.degToRad(yaw);
    }
  }

  update(dt: number): void {
    this.mixer.update(dt);
    const target = THREE.MathUtils.degToRad(this.yaw);
    this.root.rotation.y += (target - this.root.rotation.y) * Math.min(1, dt * 10);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
    this.root.removeFromParent();
  }
}
