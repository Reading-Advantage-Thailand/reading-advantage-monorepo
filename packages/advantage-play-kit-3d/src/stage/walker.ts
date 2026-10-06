/**
 * A character that walks where the rules say: the view gives it the core's position each frame
 * (the core steps at 30 Hz), and the walker glides there, turns to face its motion, and plays its
 * walk loop while it moves and its idle loop when it stops.
 */
import * as THREE from 'three';
import type { Actor } from './actor.js';

export class Walker {
  private readonly last = new THREE.Vector3();
  private moving = false;
  /** Seconds a one-shot clip owns the actor (the walker does not switch loops meanwhile). */
  private busy = 0;

  /** `walk` is the loop while moving (for example 'run' for a fast character). */
  constructor(
    readonly actor: Actor,
    private readonly walk = 'walk',
    /** Glide stiffness per second (higher follows the core more tightly). */
    private readonly stiffness = 16,
  ) {
    this.last.copy(actor.root.position);
  }

  /** Moves toward (x, z) for this frame; `y` is the ground height. */
  update(dt: number, x: number, z: number, y = 0): void {
    const root = this.actor.root;
    const k = 1 - Math.exp(-this.stiffness * dt);
    root.position.x += (x - root.position.x) * k;
    root.position.z += (z - root.position.z) * k;
    root.position.y = y;
    const dx = root.position.x - this.last.x;
    const dz = root.position.z - this.last.z;
    const speed = Math.hypot(dx, dz) / Math.max(dt, 1e-4);
    this.last.copy(root.position);
    if (speed > 0.25) this.actor.yaw = THREE.MathUtils.radToDeg(Math.atan2(dx, dz));
    this.busy = Math.max(0, this.busy - dt);
    if (this.busy > 0) return;
    const now = speed > 0.25;
    if (now !== this.moving) {
      this.moving = now;
      this.actor.loop(now ? this.walk : this.actor.idle, 0.15);
    }
  }

  /** Puts the character at (x, z) facing `yaw` degrees, standing, with no glide (a new room). */
  teleport(x: number, z: number, yaw: number): void {
    this.actor.placeAt(x, 0, z, yaw);
    this.actor.root.rotation.y = THREE.MathUtils.degToRad(yaw);
    this.last.copy(this.actor.root.position);
    this.moving = false;
    this.busy = 0;
    this.actor.loop(this.actor.idle, 0);
  }

  /** Plays a one-shot clip (a cheer, a bump) and holds the loops until it ends. */
  play(clip: string, speed = 1): void {
    if (!this.actor.has(clip)) return;
    const run = this.actor.play(clip, 0.5, speed);
    const action = this.actor.actions.get(clip);
    this.busy = action ? action.getClip().duration / speed : 0;
    void run.done.then(() => (this.moving = false));
  }
}
