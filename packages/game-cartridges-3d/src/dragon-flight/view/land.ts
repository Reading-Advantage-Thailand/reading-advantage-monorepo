/**
 * The land under the flight: a green ground that follows the dragon, and chunks of forest and
 * village placed from forge models that recycle ahead as the dragon flies (-Z is forward). A clear
 * corridor down the middle keeps the gates readable. Placement uses its own seeded random, so a
 * flight always looks the same for the same chunks.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';


export const FLIGHT_MODELS = ['dragon-fire', 'arch', 'oak-tree', 'pine-tree', 'ancient-oak', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster', 'cottage', 'barn', 'well', 'fence', 'hay-bale', 'farm-field'];

import { CHUNK, FOREST, PATTERN, rng, VILLAGE, type Kind } from './land-plan.js';

const CHUNKS = 5;

export interface Land {
  /** Keeps the chunks around the dragon at z (world z, negative ahead). */
  follow(z: number): void;
  /** A rocky hill for the dark dragon. */
  bossHill(at: THREE.Vector3): void;
}

export function buildLand(stage: Stage3D): Land {
  const scene = stage.scene;
  const sky = new THREE.Color('#9fd4f5');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 45, 115);
  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x5d7a3a, 1.4));
  const sun = stage.addSun(0xfff1d6, 1.6, [8, 18, 10], [0, 0, 0], 20);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ color: 0x7fb24e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // A darker path down the corridor, under the gates.
  const path = new THREE.Mesh(new THREE.PlaneGeometry(7, 320), new THREE.MeshStandardMaterial({ color: 0x6a9a40, roughness: 1 }));
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);

  const chunks = new Map<number, THREE.Group>();

  function build(index: number): THREE.Group {
    const group = new THREE.Group();
    const kind: Kind = PATTERN[((index % PATTERN.length) + PATTERN.length) % PATTERN.length]!;
    const r = rng(index * 7919 + 13);
    for (const [name, count] of kind === 'forest' ? FOREST : VILLAGE) {
      const g = stage.loader.get(stage.loader.modelPath(name));
      if (!g) continue;
      for (let i = 0; i < count; i++) {
        const side = r() < 0.5 ? -1 : 1;
        const big = /tree|cottage|barn|farm-field/.test(name);
        const x = side * ((big ? 7 : 4.5) + r() * (big ? 14 : 12));
        const z = -index * CHUNK - r() * CHUNK;
        const obj = g.scene.clone();
        obj.position.set(x, 0, z);
        obj.rotation.y = r() * Math.PI * 2;
        obj.scale.setScalar(0.85 + r() * 0.35);
        obj.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = big) : undefined));
        group.add(obj);
      }
    }
    scene.add(group);
    return group;
  }

  return {
    follow(z) {
      ground.position.z = z - 60;
      path.position.z = z - 60;
      sun.position.set(8, 18, z + 10);
      sun.target.position.set(0, 0, z - 12);
      const first = Math.floor(-z / CHUNK) - 1;
      for (let i = first; i < first + CHUNKS; i++) if (!chunks.has(i)) chunks.set(i, build(i));
      for (const [i, group] of chunks) {
        if (i >= first && i < first + CHUNKS) continue;
        group.removeFromParent();
        chunks.delete(i);
      }
    },
    bossHill(at) {
      for (const [name, dx, dz, s] of [['rock-cluster', 0, 0, 3.2], ['boulder', -2.6, 0.8, 2.4], ['boulder', 2.8, 0.4, 2.1], ['rock-cluster', 0.5, -2.2, 2.6]] as [string, number, number, number][]) {
        const g = stage.loader.get(stage.loader.modelPath(name));
        if (!g) continue;
        const obj = g.scene.clone();
        obj.position.set(at.x + dx, 0, at.z + dz);
        obj.scale.setScalar(s);
        scene.add(obj);
      }
    },
  };
}
