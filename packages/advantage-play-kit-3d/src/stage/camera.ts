/**
 * Camera rigs. A rig writes a pose (position, look-at point, field of view) each frame; the stage
 * adds shake and the free-area framing and aims the camera. Games switch rigs; a new shot starts
 * from the current pose, so every change is a smooth move.
 */
import * as THREE from 'three';
import { smooth } from './timeline.js';

export type V3 = readonly [number, number, number];

export interface CameraPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

export interface CameraRig {
  update(dt: number, pose: CameraPose): void;
}

export interface Shot {
  pos: V3;
  look: V3;
  fov: number;
}

/** Fixed shots with an eased move between them and a gentle hand-held sway. */
export class ShotRig implements CameraRig {
  private from: { pos: THREE.Vector3; look: THREE.Vector3; fov: number } | null = null;
  private readonly to = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };
  private t = 1;
  private seconds = 1;
  private time = 0;

  /** `sway` is the side amplitude in meters (0 for none). */
  constructor(private readonly sway = 0.12) {}

  /** Moves to `shot` over `seconds` from `current` (0: cut). */
  go(shot: Shot, seconds: number, current: CameraPose): void {
    this.from = seconds > 0 ? { pos: current.pos.clone(), look: current.look.clone(), fov: current.fov } : null;
    this.to.pos.set(...shot.pos);
    this.to.look.set(...shot.look);
    this.to.fov = shot.fov;
    this.t = seconds > 0 ? 0 : 1;
    this.seconds = Math.max(0.001, seconds);
  }

  get moving(): boolean {
    return this.t < 1;
  }

  update(dt: number, pose: CameraPose): void {
    this.time += dt;
    if (this.t < 1) this.t = Math.min(1, this.t + dt / this.seconds);
    const u = smooth(this.t);
    if (this.from && this.t < 1) {
      pose.pos.lerpVectors(this.from.pos, this.to.pos, u);
      pose.look.lerpVectors(this.from.look, this.to.look, u);
      pose.fov = THREE.MathUtils.lerp(this.from.fov, this.to.fov, u);
    } else {
      pose.pos.copy(this.to.pos);
      pose.look.copy(this.to.look);
      pose.fov = this.to.fov;
    }
    // The sway fades in with the move, so a shot never jumps when the move ends.
    const s = this.sway * u;
    pose.pos.x += Math.sin(this.time * 0.35) * s;
    pose.pos.y += Math.sin(this.time * 0.5) * s * 0.42;
  }
}

/** A slow swing back and forth in front of a point (title screens, showcases). */
export class OrbitRig implements CameraRig {
  private time = 0;

  constructor(
    private readonly center: V3,
    private readonly radius: number,
    private readonly height: number,
    /** Half the swing, in radians. */
    private readonly swing = 0.55,
    private readonly speed = 0.16,
    private readonly fov = 40,
  ) {}

  update(dt: number, pose: CameraPose): void {
    this.time += dt;
    const a = this.swing * Math.sin(this.time * this.speed);
    const [cx, cy, cz] = this.center;
    pose.pos.set(cx + Math.sin(a) * this.radius, this.height, cz + Math.cos(a) * this.radius);
    pose.look.set(cx, cy, cz);
    pose.fov = this.fov;
  }
}

/** Follows a target from a fixed offset, with smoothing (runners, explorers). */
export class FollowRig implements CameraRig {
  constructor(
    private readonly target: () => THREE.Vector3,
    private readonly offset: V3,
    private readonly lookAhead: V3 = [0, 0.8, 0],
    private readonly fov = 45,
    /** Higher is stiffer (per second). */
    private readonly stiffness = 5,
  ) {}

  private readonly want = new THREE.Vector3();
  private readonly wantLook = new THREE.Vector3();

  update(dt: number, pose: CameraPose): void {
    const t = this.target();
    this.want.set(t.x + this.offset[0], t.y + this.offset[1], t.z + this.offset[2]);
    this.wantLook.set(t.x + this.lookAhead[0], t.y + this.lookAhead[1], t.z + this.lookAhead[2]);
    const k = 1 - Math.exp(-this.stiffness * dt);
    pose.pos.lerp(this.want, k);
    pose.look.lerp(this.wantLook, k);
    pose.fov = this.fov;
  }
}
