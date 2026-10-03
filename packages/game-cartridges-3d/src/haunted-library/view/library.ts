/**
 * The haunted library from the potion shop and dungeon kits: four floors of wood planks stacked
 * 3 m apart inside a plaster back wall, shelves, sconces, and chandeliers, with a glowing pad at
 * both ends of each floor (the bounce up). The camera looks in from the front (+Z). The rules use
 * `x` in [-5.5, 5.5] and `floor` 0 to 3; here a floor is the height `floor * FLOOR_HEIGHT`.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { FLOOR_COUNT, FLOOR_HEIGHT, TUNING } from '../core/index.js';

/** Every model the library names: scenery, doors, and the haunts (ghosts are skeletons, bats are giant bats). */
export const LIBRARY_MODELS = [
  'wood-floor', 'plaster-wall', 'plaster-wall-window', 'shelf', 'door', 'torch-sconce', 'candle-cluster', 'chandelier', 'lantern',
  'skeleton', 'giant-bat',
];

/** Depth (z) of the things on a floor: doors in the back, the hero in front of them, the haunts nearest. */
export const DEPTH = { door: -0.55, hero: 0.2, ghost: 0.5, bat: 0.45 } as const;
/** The door model is scaled to fit a 3 m floor and 2.2 m of spacing. */
export const DOOR_SCALE = 0.85;
/** Height of a door's top above the floor, for the word tags. */
export const DOOR_TOP = 2.28 * DOOR_SCALE + 0.15;

/** Width of a pad: from `padX` to the end of the floor. */
const HALF_PAD = 5.5 - TUNING.padX;

export const floorY = (floor: number): number => floor * FLOOR_HEIGHT;

export interface Library {
  /** Moves the pads' arrows (call every frame with the stage time in seconds). */
  update(time: number): void;
}

export function buildLibrary(stage: Stage3D): Library {
  const scene = stage.scene;
  scene.background = new THREE.Color('#171226');
  scene.fog = new THREE.Fog('#171226', 26, 48);
  scene.add(new THREE.HemisphereLight(0xe8dcff, 0x3a2c4a, 1.7));
  stage.addSun(0xffe9c8, 1.3, [-4, 16, 12], [0, 6, 0], 14);

  const place = (name: string, x: number, y: number, z: number, scale = 1, yaw = 0): THREE.Object3D | null => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return null;
    const obj = g.scene.clone();
    obj.position.set(x, y, z);
    obj.rotation.y = THREE.MathUtils.degToRad(yaw);
    obj.scale.setScalar(scale);
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = name !== 'wood-floor';
        n.receiveShadow = true;
      }
    });
    scene.add(obj);
    return obj;
  };

  const pads: THREE.Mesh[] = [];
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2fbf71, emissive: 0x2fbf71, emissiveIntensity: 0.9, roughness: 0.5 });
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x9dffc4, transparent: true, opacity: 0.85 });

  for (let f = 0; f < FLOOR_COUNT; f++) {
    const y = floorY(f);
    // The floor boards (2 m tiles), the plaster back wall (2x scale: 4 m wide, 3 m tall), shelves, sconces, a chandelier.
    for (let x = -5; x <= 5; x += 2) place('wood-floor', x, y - 0.08, 0);
    ['plaster-wall', f % 2 ? 'plaster-wall' : 'plaster-wall-window', 'plaster-wall'].forEach((name, i) => place(name, (i - 1) * 4, y, -1.05, 2));
    for (const x of [-3.6, 3.6]) place('shelf', x + (f % 2 ? 0.3 : -0.3), y, -1.0, 1.6);
    for (const x of [-1.9, 1.9]) place('torch-sconce', x, y + 1.5, -0.98, 1);
    place('candle-cluster', f % 2 ? 0.9 : -0.9, y + 0.0, -0.8, 1.4);
    place('chandelier', 0, y + 2.45, 0.1, 1.1);
    place('lantern', -5.75, y, 0.3, 0.8);
    place('lantern', 5.75, y, 0.3, 0.8);
    if (f < FLOOR_COUNT - 1) {
      for (const side of [-1, 1]) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(HALF_PAD, 0.14, 1.7), padMat);
        pad.position.set(side * ((TUNING.padX + 5.5) / 2), y + 0.07, 0);
        pad.receiveShadow = true;
        scene.add(pad);
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 4), arrowMat);
        arrow.position.set(pad.position.x, y + 1.0, 0.1);
        arrow.userData.base = arrow.position.y;
        scene.add(arrow);
        pads.push(arrow);
      }
    }
  }
  // The roof over the top floor and the dark side walls.
  for (let x = -5; x <= 5; x += 2) place('wood-floor', x, floorY(FLOOR_COUNT) - 0.08, 0);
  const side = new THREE.MeshStandardMaterial({ color: 0x2a1f33, roughness: 1 });
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, FLOOR_COUNT * FLOOR_HEIGHT, 2.2), side);
    wall.position.set(sx * 6.15, (FLOOR_COUNT * FLOOR_HEIGHT) / 2, -0.1);
    scene.add(wall);
  }

  return {
    update(time) {
      for (const [i, arrow] of pads.entries()) arrow.position.y = (arrow.userData.base as number) + Math.sin(time * 3 + i) * 0.12;
    },
  };
}

export interface DoorView {
  /** The word's door on a floor, hinged on its left side. */
  readonly pivot: THREE.Group;
  /** The warm light behind an open door. */
  readonly glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Swings the door open and lights the room behind it. */
  open(): Promise<void>;
  dispose(): void;
}

/** Builds one door at `x` on `floor`. */
export function buildDoor(stage: Stage3D, x: number, floor: number): DoorView | null {
  const g = stage.loader.get(stage.loader.modelPath('door'));
  if (!g) return null;
  const y = floorY(floor);
  const half = 1.05 * DOOR_SCALE;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * half * 0.86, 2.28 * DOOR_SCALE * 0.95),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.position.set(x, y + 1.1, DEPTH.door - 0.08);
  stage.scene.add(glow);
  const pivot = new THREE.Group();
  pivot.position.set(x - half, y, DEPTH.door);
  const model = g.scene.clone();
  model.scale.setScalar(DOOR_SCALE);
  model.position.x = half;
  model.traverse((n) => {
    if ((n as THREE.Mesh).isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  pivot.add(model);
  stage.scene.add(pivot);
  return {
    pivot,
    glow,
    open: async () => {
      void stage.timeline.tween(0.5, (u) => (glow.material.opacity = u * 0.85));
      await stage.timeline.tween(0.6, (u) => (pivot.rotation.y = -THREE.MathUtils.degToRad(105) * u * (2 - u)));
    },
    dispose: () => {
      pivot.removeFromParent();
      glow.removeFromParent();
      glow.geometry.dispose();
      glow.material.dispose();
    },
  };
}
