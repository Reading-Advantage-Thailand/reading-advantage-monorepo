/**
 * The highland under the ride: a grey-green ground that follows the rider, chunks of pines and
 * rocks that recycle ahead (-Z is forward), and slow clouds. A clear corridor keeps the gates readable.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { CHUNK, HIGHLAND, rng } from './land-plan.js';

/** The models of the scene (the hero the student chose is loaded on top of these). */
export const RIDER_MODELS = ['dragon-fire', 'pine-tree', 'oak-tree', 'rock-cluster', 'boulder', 'bush'];

const CHUNKS = 5;

export interface Land {
  /** Keeps the chunks around the rider at world z (negative ahead). */
  follow(z: number): void;
}

export function buildLand(stage: Stage3D): Land {
  const scene = stage.scene;
  const sky = new THREE.Color('#b7d9f2');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 40, 105);
  scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x667a58, 1.4));
  const sun = stage.addSun(0xfff1d6, 1.6, [8, 18, 10], [0, 0, 0], 20);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ color: 0x6f8f5a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(8, 320), new THREE.MeshStandardMaterial({ color: 0x8b9a78, roughness: 1 }));
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const clouds = new THREE.Group();
  const r = rng(5);
  for (let i = 0; i < 14; i++) {
    const puff = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1.4 + r() * 1.2, 10, 8), cloudMat);
      ball.position.set(j * 1.6 - 1.6, r() * 0.5, r());
      ball.scale.y = 0.55;
      puff.add(ball);
    }
    puff.position.set((r() < 0.5 ? -1 : 1) * (7 + r() * 16), 8 + r() * 5, -r() * 140);
    clouds.add(puff);
  }
  scene.add(clouds);

  const chunks = new Map<number, THREE.Group>();
  function build(index: number): THREE.Group {
    const group = new THREE.Group();
    const rand = rng(index * 7919 + 31);
    for (const [name, count] of HIGHLAND) {
      const g = stage.loader.get(stage.loader.modelPath(name));
      if (!g) continue;
      for (let i = 0; i < count; i++) {
        const side = rand() < 0.5 ? -1 : 1;
        const big = /tree|rock-cluster/.test(name);
        const obj = g.scene.clone();
        obj.position.set(side * ((big ? 7 : 5) + rand() * 14), 0, -index * CHUNK - rand() * CHUNK);
        obj.rotation.y = rand() * Math.PI * 2;
        obj.scale.setScalar((name === 'boulder' ? 1.6 : 0.9) + rand() * 0.4);
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
      clouds.position.z = z * 0.9 + 40;
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
  };
}
