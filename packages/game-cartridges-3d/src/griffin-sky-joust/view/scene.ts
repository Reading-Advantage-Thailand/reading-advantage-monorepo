/**
 * The sky and the ground of Griffin Sky-Joust 3D, and the map from the core's arena (960 by 540
 * pixels, y down) to world meters. The arena is a flat stage at z = 0 seen from the side; clouds
 * drift behind it and a strip of hills with trees and rocks lies along the bottom.
 */
import * as THREE from 'three';
import { ARENA } from '../core/index.js';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';

/** The models of the scene (the hero the student chose is loaded on top of these). */
export const SCENE_MODELS = ['griffin', 'giant-bat', 'oak-tree', 'pine-tree', 'rock-cluster', 'bush'];

/** Arena pixels per world meter. */
export const PX_PER_M = 40;
export const WORLD_W = ARENA.width / PX_PER_M;
export const WORLD_H = ARENA.height / PX_PER_M;

/** World x of an arena x, centered on the stage. */
export const worldX = (px: number): number => (px - ARENA.width / 2) / PX_PER_M;
/** World y of an arena y (up is positive). */
export const worldY = (py: number): number => (ARENA.height - py) / PX_PER_M;

/** Ground props along the bottom: model, world x, depth behind the stage, scale. */
const PLAN: [string, number, number, number][] = [
  ['pine-tree', -10.5, 3.2, 1.5], ['oak-tree', -8.2, 4.5, 1.4], ['rock-cluster', -6.4, 2.6, 1.1], ['bush', -4.6, 2.2, 1.0],
  ['pine-tree', -2.2, 5.0, 1.6], ['oak-tree', 0.8, 4.0, 1.5], ['bush', 2.6, 2.4, 1.0], ['rock-cluster', 4.2, 3.4, 1.3],
  ['pine-tree', 6.4, 3.0, 1.5], ['oak-tree', 8.6, 5.0, 1.4], ['bush', 10.4, 2.4, 1.0], ['pine-tree', 11.6, 4.0, 1.4],
];

export interface Sky {
  /** Drifts the clouds; `seconds` is the frame time. */
  update(seconds: number): void;
}

export function buildSky(stage: Stage3D): Sky {
  const scene = stage.scene;
  const sky = new THREE.Color('#8fd0f5');
  scene.background = sky;
  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x6a8a4a, 1.5));
  stage.addSun(0xfff1d6, 1.5, [6, 14, 12], [0, 4, 0], 18);

  // Hills along the bottom: a green block whose top sits just under the lowest flight height.
  const hill = new THREE.Mesh(new THREE.BoxGeometry(WORLD_W + 8, 1.2, 14), new THREE.MeshStandardMaterial({ color: 0x7fb24e, roughness: 1 }));
  hill.position.set(0, -0.1, -8);
  hill.receiveShadow = true;
  scene.add(hill);
  for (const [name, x, depth, scale] of PLAN) {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) continue;
    const obj = g.scene.clone();
    obj.position.set(x, 0.5, -depth);
    obj.scale.setScalar(scale);
    obj.rotation.y = x * 1.7;
    obj.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = true) : undefined));
    scene.add(obj);
  }

  // Clouds: a few soft white blobs behind the stage.
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const cloud = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9 + (k % 2) * 0.35, 16, 12), mat);
      puff.position.set((k - 1.5) * 1.1, (k % 2) * 0.3, 0);
      puff.scale.y = 0.65;
      cloud.add(puff);
    }
    cloud.position.set(-WORLD_W / 2 + (i * WORLD_W) / 6, 5.5 + ((i * 37) % 7) * 0.9, -6 - (i % 3) * 2.5);
    cloud.scale.setScalar(1 + (i % 3) * 0.35);
    scene.add(cloud);
    return { cloud, speed: 0.15 + (i % 3) * 0.07 };
  });

  return {
    update(seconds) {
      for (const { cloud, speed } of clouds) {
        cloud.position.x += speed * seconds;
        if (cloud.position.x > WORLD_W / 2 + 4) cloud.position.x = -WORLD_W / 2 - 4;
      }
    },
  };
}
