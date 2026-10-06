/**
 * The ziggurat from the dungeon and potion-shop kits: a night plain with a stone foot (floor
 * tiles, pillars, braziers, candles), and a stepped climb that grows as the student answers. One
 * tier of cubes is one word; a cube is a stone column topped with a floor tile. The summit holds
 * an altar and a crystal cluster that lights up when the sentence is built. The rules know lanes
 * and tiers; this file maps them to meters. The hero starts at the foot (tier 0).
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import type { Lane } from '../core/index.js';

/** Every model the ziggurat names (scenery and the summit); the heroes come from the session. */
export const ZIGGURAT_MODELS = ['altar', 'brazier', 'candle-cluster', 'crystal-cluster', 'floor', 'floor-cracked', 'pillar'];

/** Meters: the lane columns, the cube width, the climb of one tier, and the distance between tiers. */
export const LANE_X: Readonly<Record<Lane, number>> = { left: -2.2, forward: 0, right: 2.2 };
export const CUBE_WIDTH = 1.8;
export const STEP_Y = 0.7;
export const STEP_Z = 2.2;
/** The z of the foot of the ziggurat (the hero starts here at tier 0). */
export const FOOT_Z = 1.2;

/** The top centre of the cube of `lane` at `tier` (tier 0 is the foot, lane `forward`). */
export function tierPoint(tier: number, lane: Lane): THREE.Vector3 {
  if (tier <= 0) return new THREE.Vector3(0, 0, FOOT_Z);
  return new THREE.Vector3(LANE_X[lane], tier * STEP_Y, FOOT_Z - tier * STEP_Z);
}

/** The summit of a ritual with `tiers` words: one tier above the last cube, in the middle. */
export const summitPoint = (tiers: number): THREE.Vector3 => tierPoint(tiers + 1, 'forward');

const STONE = 0x6b5a86;
const STONE_DIM = 0x3a3150;

export interface CubeView {
  id: string;
  lane: Lane;
  tier: number;
  group: THREE.Group;
  stone: THREE.MeshStandardMaterial;
  rune: THREE.MeshBasicMaterial;
  /** Where the hero stands on this cube. */
  top: THREE.Vector3;
}

export class ZigguratScene {
  private readonly stage: Stage3D;
  private readonly cubes = new Map<string, CubeView>();
  private summit: THREE.Group | null = null;
  private crystalMaterials: THREE.MeshStandardMaterial[] = [];
  private crystalGlow = 0.5;
  private readonly flames: THREE.Mesh[] = [];
  /** The rune ring on the ground at the foot; it pulses. */
  readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly sizes = new Map<string, { size: THREE.Vector3; min: THREE.Vector3 }>();

  constructor(stage: Stage3D) {
    this.stage = stage;
    const scene = stage.scene;
    scene.background = new THREE.Color('#0d0b24');
    scene.fog = new THREE.Fog('#0d0b24', 14, 44);
    scene.add(new THREE.HemisphereLight(0x9a8cff, 0x2a2140, 1.2));
    stage.addSun(0xc6c0ff, 1.1, [-5, 12, 8], [0, 2, -6], 14);

    // The plain: one dark disc under everything.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({ color: 0x241c3d, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -10);
    ground.receiveShadow = true;
    scene.add(ground);

    // The foot: a platform of floor tiles, pillars at its corners, braziers and candles.
    for (const x of [-2.2, 0, 2.2]) for (const z of [FOOT_Z - 0.2, FOOT_Z + 1.8]) this.tile('floor', 2.2, x, 0, z);
    for (const [x, z] of [[-3.6, FOOT_Z - 1], [3.6, FOOT_Z - 1], [-3.6, FOOT_Z + 2.4], [3.6, FOOT_Z + 2.4]] as const) this.piece('pillar', x, 0, z, 0, 1.5);
    for (const x of [-3, 3]) {
      this.piece('brazier', x, 0, FOOT_Z + 0.6, 0, 0.9);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      flame.position.set(x, 1.0, FOOT_Z + 0.6);
      scene.add(flame);
      this.flames.push(flame);
    }
    this.piece('candle-cluster', -1.4, 0, FOOT_Z + 2.6, 20, 1);
    this.piece('candle-cluster', 1.4, 0, FOOT_Z + 2.6, -30, 1);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 3.7, 64),
      new THREE.MeshBasicMaterial({ color: 0x8f7bff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(0, 0.04, FOOT_Z + 0.8);
    scene.add(this.ring);

    // Stars: fixed points on a far dome (no randomness).
    const stars: number[] = [];
    for (let i = 0; i < 180; i++) {
      const a = i * 2.399963;
      const u = ((i * 0.6180339) % 1) * 0.8 + 0.12;
      const r = 60;
      stars.push(Math.cos(a) * Math.sqrt(1 - u * u) * r, u * r * 0.7 + 6, -Math.abs(Math.sin(a)) * Math.sqrt(1 - u * u) * r - 14);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true, fog: false })));
  }

  // ---------------------------------------------------------------- model helpers

  private measure(name: string): { size: THREE.Vector3; min: THREE.Vector3 } | null {
    const hit = this.sizes.get(name);
    if (hit) return hit;
    const gltf = this.stage.loader.get(this.stage.loader.modelPath(name));
    if (!gltf) return null;
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const out = { size: box.getSize(new THREE.Vector3()), min: box.min.clone() };
    this.sizes.set(name, out);
    return out;
  }

  private clone(name: string): THREE.Object3D | null {
    const gltf = this.stage.loader.get(this.stage.loader.modelPath(name));
    if (!gltf) return null;
    const obj = gltf.scene.clone();
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = !name.startsWith('floor');
        n.receiveShadow = true;
      }
    });
    return obj;
  }

  /** A model of its own size, scaled by `scale`, standing with its feet at (x, y, z). */
  private piece(name: string, x: number, y: number, z: number, yaw = 0, scale = 1, parent: THREE.Object3D = this.stage.scene): THREE.Object3D | null {
    const obj = this.clone(name);
    const m = this.measure(name);
    if (!obj || !m) return null;
    const wrap = new THREE.Group();
    obj.scale.setScalar(scale);
    obj.position.set(-(m.min.x + m.size.x / 2) * scale, -m.min.y * scale, -(m.min.z + m.size.z / 2) * scale);
    wrap.add(obj);
    wrap.rotation.y = THREE.MathUtils.degToRad(yaw);
    wrap.position.set(x, y, z);
    parent.add(wrap);
    return wrap;
  }

  /** A tile fitted to `width` meters (square), its top at height `y`. */
  private tile(name: string, width: number, x: number, y: number, z: number, parent: THREE.Object3D = this.stage.scene): THREE.Object3D | null {
    const m = this.measure(name);
    if (!m) return null;
    const s = width / Math.max(0.1, Math.max(m.size.x, m.size.z));
    return this.piece(name, x, y - m.size.y * s, z, 0, s, parent);
  }

  // ---------------------------------------------------------------- the climb

  /** Removes the cubes and the summit of the last ritual and builds the summit for `tiers` words. */
  startRitual(tiers: number): void {
    for (const c of this.cubes.values()) this.removeCube(c);
    this.cubes.clear();
    this.summit?.removeFromParent();
    const top = summitPoint(tiers);
    const group = new THREE.Group();
    group.position.set(top.x, 0, top.z);
    const column = new THREE.Mesh(new THREE.BoxGeometry(2.4, top.y, 2.4), new THREE.MeshStandardMaterial({ color: 0x8a6fb0, roughness: 0.9 }));
    column.position.y = top.y / 2 - 0.02;
    column.castShadow = true;
    group.add(column);
    this.tile('floor', 2.6, 0, top.y, 0, group);
    this.piece('altar', 0, top.y, 0, 0, 0.9, group);
    const crystal = this.piece('crystal-cluster', 0, top.y + 0.55, 0, 0, 0.9, group);
    this.crystalMaterials = [];
    crystal?.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const own = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const copy = m.clone() as THREE.MeshStandardMaterial;
        if (copy.emissive) copy.emissive.setHex(0x9b7bff);
        this.crystalMaterials.push(copy);
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? own : own[0]!;
    });
    this.glowCrystal(0.35);
    this.stage.scene.add(group);
    this.summit = group;
  }

  /** The crystal's glow (0.3 dim, 1.8 bright). */
  glowCrystal(intensity: number): void {
    this.crystalGlow = intensity;
    for (const m of this.crystalMaterials) m.emissiveIntensity = intensity;
  }

  addCube(id: string, lane: Lane, tier: number): CubeView {
    const top = tierPoint(tier, lane);
    const group = new THREE.Group();
    group.position.set(top.x, 0, top.z);
    const stone = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.85 });
    const column = new THREE.Mesh(new THREE.BoxGeometry(CUBE_WIDTH - 0.1, top.y, CUBE_WIDTH - 0.1), stone);
    column.position.y = top.y / 2 - 0.03;
    column.castShadow = true;
    column.receiveShadow = true;
    group.add(column);
    this.tile('floor', CUBE_WIDTH, 0, top.y, 0, group);
    const rune = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.58, 24),
      new THREE.MeshBasicMaterial({ color: 0xb69cff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = top.y + 0.03;
    group.add(rune);
    const view: CubeView = { id, lane, tier, group, stone, rune: rune.material, top };
    this.stage.scene.add(group);
    this.cubes.set(id, view);
    return view;
  }

  cube(id: string): CubeView | undefined {
    return this.cubes.get(id);
  }

  /** Dims a cube that is no longer on offer (the hero chose another one). */
  settle(view: CubeView, stood: boolean): void {
    view.stone.color.setHex(stood ? STONE : STONE_DIM);
    view.rune.visible = stood;
  }

  setCrumbled(view: CubeView, crumbled: boolean): void {
    view.stone.color.setHex(crumbled ? STONE_DIM : STONE);
    view.rune.visible = !crumbled;
  }

  private removeCube(view: CubeView): void {
    view.group.removeFromParent();
    // Model geometry belongs to the loader's cache; only the boxes and rings built here are ours.
    view.group.traverse((n) => {
      const geometry = (n as THREE.Mesh).geometry;
      if (geometry instanceof THREE.BoxGeometry || geometry instanceof THREE.RingGeometry) geometry.dispose();
    });
    view.stone.dispose();
    view.rune.dispose();
  }

  frame(time: number): void {
    this.ring.material.opacity = 0.4 + 0.15 * Math.sin(time * 1.4);
    this.ring.rotation.z += 0.002;
    this.flames.forEach((f, i) => f.scale.setScalar(0.9 + 0.2 * Math.sin(time * 9 + i * 2)));
    for (const m of this.crystalMaterials) m.emissiveIntensity = this.crystalGlow * (0.85 + 0.15 * Math.sin(time * 2.2));
  }

  dispose(): void {
    for (const c of this.cubes.values()) this.removeCube(c);
    this.cubes.clear();
    this.summit?.removeFromParent();
    this.summit = null;
  }
}
