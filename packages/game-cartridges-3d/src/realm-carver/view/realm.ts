/**
 * The wild realm from the outdoor kits: a 12 m x 12 m board over forest ground, a lawn all around
 * it, a low fence, and trees, bushes, and stones outside. Claimed land is a bright green layer
 * that grows over the forest floor; the carver's trail is a gold layer. Both are one plane per
 * cell, shown or hidden from the core's grid.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { BOARD_SIZE, type CellState } from '../core/index.js';
import { HALF_M, worldOf } from './geometry.js';

/** Every model the realm names: scenery and the monsters. */
export const REALM_MODELS = [
  'grass-ground', 'forest-ground', 'fence', 'oak-tree', 'pine-tree', 'bush', 'boulder', 'rock-cluster', 'wildflowers', 'mushroom-cluster',
  'slime', 'goblin-warrior', 'bandit',
];

export interface Realm {
  /** Shows the cells as the grid says. Call it every frame; it is cheap. */
  sync(grid: readonly (readonly CellState[])[], dt: number): void;
  /** Makes cells pop up from the ground, with a short delay by order. */
  pop(cells: readonly { col: number; row: number }[]): void;
  dispose(): void;
}

export function buildRealm(stage: Stage3D): Realm {
  const scene = stage.scene;
  scene.background = new THREE.Color('#9fd3ee');
  scene.fog = new THREE.Fog('#9fd3ee', 22, 46);
  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5f7a3a, 1.6));
  stage.addSun(0xfff0cf, 1.9, [-5, 14, 8], [0, 0, 0], 12);

  const place = (name: string, x: number, z: number, yaw = 0, scale = 1): void => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return;
    const obj = g.scene.clone();
    obj.position.set(x, 0, z);
    obj.rotation.y = THREE.MathUtils.degToRad(yaw);
    obj.scale.setScalar(scale);
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = !name.endsWith('-ground');
        n.receiveShadow = true;
      }
    });
    scene.add(obj);
  };

  // Forest floor under the board (2 m tiles), lawn around it.
  for (let x = -15; x <= 15; x += 2) {
    for (let z = -15; z <= 15; z += 2) {
      const inside = Math.abs(x) < HALF_M && Math.abs(z) < HALF_M;
      place(inside ? 'forest-ground' : 'grass-ground', x, z);
    }
  }
  // A fence around the board.
  const edge = HALF_M + 0.45;
  for (let k = -5; k <= 5; k += 2) {
    place('fence', k, -edge);
    place('fence', k, edge);
    place('fence', -edge, k, 90);
    place('fence', edge, k, 90);
  }
  // Scenery outside.
  place('oak-tree', -9.5, -8.5);
  place('pine-tree', 9.8, -9.2, 40);
  place('oak-tree', 10.4, 2.2, 140);
  place('pine-tree', -10.6, 3.6, 70);
  place('oak-tree', -9.8, 11, 20);
  place('pine-tree', 9.6, 11.4, 200);
  place('bush', -8.1, -7.8);
  place('bush', 8.4, 8.6, 60);
  place('boulder', 8.8, -7.4, 30);
  place('rock-cluster', -8.6, 8.8, 120);
  place('wildflowers', 8.2, 0.6);
  place('wildflowers', -8.4, -2.4, 80);
  place('mushroom-cluster', -8.0, 5.4);

  // One plane per cell for claimed land and for the trail.
  const geometry = new THREE.PlaneGeometry(0.98, 0.98);
  geometry.rotateX(-Math.PI / 2);
  const landMat = new THREE.MeshStandardMaterial({ color: 0x86d36f, roughness: 0.9 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x6cbf5a, roughness: 0.9 });
  const trailMat = new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffa800, emissiveIntensity: 0.7, roughness: 0.5 });
  const land: THREE.Mesh[] = [];
  const trail: THREE.Mesh[] = [];
  const grow: number[] = [];
  const delay: number[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const at = worldOf({ col, row });
      const border = col === 0 || row === 0 || col === BOARD_SIZE - 1 || row === BOARD_SIZE - 1;
      const l = new THREE.Mesh(geometry, border ? edgeMat : landMat);
      l.position.set(at.x, 0.03, at.z);
      l.receiveShadow = true;
      l.visible = false;
      const t = new THREE.Mesh(geometry, trailMat);
      t.position.set(at.x, 0.05, at.z);
      t.visible = false;
      scene.add(l, t);
      land.push(l);
      trail.push(t);
      grow.push(1);
      delay.push(0);
    }
  }

  return {
    sync(grid, dt) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const i = row * BOARD_SIZE + col;
          const state = grid[row]![col]!;
          const l = land[i]!;
          l.visible = state === 'claimed';
          trail[i]!.visible = state === 'trail';
          if (l.visible) {
            if (delay[i]! > 0) {
              delay[i] = Math.max(0, delay[i]! - dt);
              l.scale.setScalar(0.001);
            } else if (grow[i]! < 1) {
              grow[i] = Math.min(1, grow[i]! + dt * 5);
              const u = grow[i]!;
              l.scale.setScalar(Math.max(0.001, u < 1 ? 1 + Math.sin(u * Math.PI) * 0.25 : 1) * u);
              l.position.y = 0.03 + Math.sin(u * Math.PI) * 0.12;
            } else {
              l.scale.setScalar(1);
              l.position.y = 0.03;
            }
          }
        }
      }
    },
    pop(cells) {
      cells.forEach((c, k) => {
        const i = c.row * BOARD_SIZE + c.col;
        grow[i] = 0;
        delay[i] = Math.min(0.6, k * 0.012);
      });
    },
    dispose() {
      geometry.dispose();
      landMat.dispose();
      edgeMat.dispose();
      trailMat.dispose();
      for (const m of [...land, ...trail]) scene.remove(m);
    },
  };
}
