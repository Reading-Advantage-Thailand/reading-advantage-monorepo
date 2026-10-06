/**
 * The sky and the land under it for the 3D view: a blue sky with soft clouds, a green ground a
 * few meters below the lowest bat, and forest and village props along it (a fixed layout from
 * sky-plan.ts). The camera looks across the sky from the front; the patrol happens at z = 0.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { groundLayout } from './sky-plan.js';

/** The models the 3D view names (the hero comes from the session options). */
export const SKY_MODELS = ['griffin', 'giant-bat', 'oak-tree', 'pine-tree', 'ancient-oak', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster', 'cottage', 'barn', 'well', 'hay-bale'];

export interface Sky {
  /** Drifts the clouds; `seconds` is stage time. */
  drift(seconds: number): void;
}

export function buildSky(stage: Stage3D): Sky {
  const scene = stage.scene;
  const sky = new THREE.Color('#8fcdf2');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 80, 170);
  scene.add(new THREE.HemisphereLight(0xe6f4ff, 0x5d7a3a, 1.5));
  stage.addSun(0xfff1d6, 1.5, [10, 20, 14], [0, 3, 0], 24);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), new THREE.MeshStandardMaterial({ color: 0x74ad4c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -20);
  ground.receiveShadow = true;
  scene.add(ground);

  for (const p of groundLayout()) {
    const g = stage.loader.get(stage.loader.modelPath(p.name));
    if (!g) continue;
    const obj = g.scene.clone();
    // Near props sit at z = -3, far props at z = -34; trees are scaled up so they read from the camera.
    const big = /tree|cottage|barn/.test(p.name);
    obj.position.set(p.x * (1 + p.depth * 1.2), 0, -3 - p.depth * 31);
    obj.rotation.y = p.turn;
    obj.scale.setScalar(p.scale * (big ? 1.6 : 1.2));
    obj.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = big) : undefined));
    scene.add(obj);
  }

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const clouds = Array.from({ length: 7 }, (_, i) => {
    const cloud = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4 + (k % 2) * 0.5, 14, 10), cloudMat);
      puff.position.set((k - 1.5) * 1.6, (k % 2) * 0.4, 0);
      puff.scale.y = 0.6;
      cloud.add(puff);
    }
    cloud.position.set(-30 + i * 10, 9 + (i % 3) * 2.2, -16 - (i % 4) * 6);
    scene.add(cloud);
    return cloud;
  });

  return {
    drift(seconds) {
      clouds.forEach((c, i) => (c.position.x = ((((-30 + i * 10 + seconds * (0.25 + (i % 3) * 0.1)) + 40) % 80) + 80) % 80 - 40));
    },
  };
}
