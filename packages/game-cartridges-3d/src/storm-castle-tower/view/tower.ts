/**
 * The castle tower of Storm Castle Tower from the vault kit and the prop packs: a wall of stone
 * tiles four columns wide, a ledge for every row, pillars and torches at the sides, and the gate
 * at the top. The camera looks at the wall from the front. The rules use columns 0 to 3 and rows
 * of `ROW_HEIGHT` meters; windows, the climber, and the hazards are placed by the game view.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';

/** The scene models (the heroes are loaded by the game view). */
export const TOWER_MODELS = ['wall', 'arch', 'pillar', 'torch-sconce', 'chains', 'gate', 'barrel', 'boulder'];

/** The meters between two columns, and two rows. */
export const COLUMN_WIDTH = 1.7;
export const ROW_HEIGHT = 1.5;
/** The wall face is at z = WALL_Z; the climber stands in front of it. */
export const WALL_Z = -0.3;
export const CLIMBER_Z = 0.55;

/** The world x of a column and the world y of a row (a fraction is fine). */
export const columnX = (col: number): number => (col - 1.5) * COLUMN_WIDTH;
export const rowY = (row: number): number => row * ROW_HEIGHT;

export interface FittedModel {
  root: THREE.Group;
  model: THREE.Object3D;
  /** The size after fitting, in meters. */
  size: THREE.Vector3;
}

/** A model clone with its own materials, scaled so its height (or width) is `target`, standing on y = 0 and centered on x and z. */
export function fitModel(stage: Stage3D, name: string, target: { height?: number; width?: number }): FittedModel | null {
  const g = stage.loader.get(stage.loader.modelPath(name));
  if (!g) return null;
  const model = g.scene.clone();
  model.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = target.height !== undefined ? target.height / Math.max(size.y, 1e-3) : (target.width ?? 1) / Math.max(size.x, 1e-3);
  model.scale.multiplyScalar(k);
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -fitted.min.y, -center.z);
  const root = new THREE.Group();
  root.add(model);
  return { root, model, size: fitted.getSize(new THREE.Vector3()) };
}

/** The materials of a model, for tints and glows. */
export function materialsOf(obj: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const out: THREE.MeshStandardMaterial[] = [];
  obj.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) out.push(m as THREE.MeshStandardMaterial);
  });
  return out;
}

export interface Tower {
  /** Everything of this tower; remove it to build the next one. */
  group: THREE.Group;
  /** The gate at the top (it rises when the sentence is built). */
  gate: THREE.Object3D | null;
  /** The glow behind the open gate. */
  glow: THREE.PointLight;
  dispose(): void;
}

/** Builds the scene lights once; they stay for every tower of the climb. */
export function buildSky(stage: Stage3D): { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight } {
  const scene = stage.scene;
  scene.background = new THREE.Color('#161d2e');
  scene.fog = new THREE.Fog('#161d2e', 16, 38);
  const hemi = new THREE.HemisphereLight(0x9fb4e8, 0x2b2f3d, 1.3);
  scene.add(hemi);
  const sun = stage.addSun(0xc8d6ff, 1.0, [-4, 14, 10], [0, 0, 0], 12);
  return { hemi, sun };
}

/** Builds the wall, the ledges, and the gate of a tower whose top is at row `summitRow`. */
export function buildTower(stage: Stage3D, summitRow: number): Tower {
  const group = new THREE.Group();
  const top = rowY(summitRow);
  const disposables: { dispose(): void }[] = [];

  // The wall: tiles of four columns, from below the foot to above the top.
  const tile = fitModel(stage, 'wall', { width: 2.2 });
  if (tile) {
    const h = Math.max(tile.size.y, 0.5);
    const rows = Math.ceil((top + 8) / h) + 1;
    const back = new THREE.Box3().setFromObject(tile.root).max.z;
    for (let r = -1; r < rows; r++) {
      for (const x of [-3.3, -1.1, 1.1, 3.3]) {
        const t = tile.root.clone();
        t.position.set(x, r * h, WALL_Z - back);
        group.add(t);
      }
    }
  } else {
    const plain = new THREE.Mesh(new THREE.BoxGeometry(9, top + 14, 0.4), new THREE.MeshStandardMaterial({ color: 0x5a566a, roughness: 1 }));
    plain.position.set(0, top / 2 + 2, WALL_Z - 0.2);
    group.add(plain);
    disposables.push(plain.geometry, plain.material as THREE.Material);
  }

  // A ledge for every row: the climber stands on it.
  const ledgeGeo = new THREE.BoxGeometry(7.9, 0.16, 1.15);
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x7a7088, roughness: 0.9 });
  disposables.push(ledgeGeo, ledgeMat);
  for (let r = 0; r <= summitRow; r++) {
    const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
    ledge.position.set(0, rowY(r) - 0.09, 0.2);
    ledge.castShadow = true;
    ledge.receiveShadow = true;
    group.add(ledge);
  }

  // Pillars along both sides, and a torch every three rows.
  const pillar = fitModel(stage, 'pillar', { height: 3 });
  if (pillar) {
    for (let y = 0; y < top + 6; y += 3) {
      for (const x of [-4.7, 4.7]) {
        const p = pillar.root.clone();
        p.position.set(x, y, WALL_Z + 0.25);
        group.add(p);
      }
    }
  }
  const sconce = fitModel(stage, 'torch-sconce', { height: 0.8 });
  if (sconce) {
    for (let r = 1; r <= summitRow; r += 3) {
      for (const x of [-3.9, 3.9]) {
        const s = sconce.root.clone();
        s.position.set(x, rowY(r) + 0.5, WALL_Z + 0.1);
        group.add(s);
      }
    }
  }
  const chains = fitModel(stage, 'chains', { height: 1.6 });
  if (chains) {
    for (let r = 2; r <= summitRow; r += 4) {
      const c = chains.root.clone();
      c.position.set(r % 8 === 2 ? -3.9 : 3.9, rowY(r) + 0.2, WALL_Z + 0.15);
      group.add(c);
    }
  }

  // The gate at the top, under an arch; it rises when the sentence is built.
  const arch = fitModel(stage, 'arch', { height: 2.6 });
  if (arch) {
    arch.root.position.set(0, top, WALL_Z + 0.05);
    group.add(arch.root);
  }
  const gate = fitModel(stage, 'gate', { height: 2.1 });
  if (gate) {
    gate.root.position.set(0, top, WALL_Z + 0.1);
    group.add(gate.root);
  }
  const glow = new THREE.PointLight(0x9dffb0, 0, 7, 1.5);
  glow.position.set(0, top + 1.2, WALL_Z + 0.6);
  group.add(glow);

  // A dark ground at the foot.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  group.add(ground);
  disposables.push(ground.geometry, ground.material as THREE.Material);

  stage.scene.add(group);
  return {
    group,
    gate: gate?.root ?? null,
    glow,
    dispose() {
      group.removeFromParent();
      for (const d of disposables) d.dispose();
    },
  };
}
