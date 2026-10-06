/**
 * The land under the flight for the 3D view: a green ground that follows the griffin, with chunks
 * of forest, meadow, and village (forge models from land-plan.ts) that recycle ahead as the
 * griffin flies (-Z is forward), and soft clouds drifting past at flight height. A clear corridor
 * keeps the lanes readable.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { CHUNK, chunkLayout } from './land-plan.js';

/** The models the 3D view names (the rider comes from the session options). */
export const ESCAPE_MODELS = ['griffin', 'giant-bat', 'oak-tree', 'pine-tree', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster', 'cottage', 'well', 'hay-bale'];

const CHUNKS = 5;
const CLOUDS = 8;
const CLOUD_SPAN = 180;

export interface Land {
  /** Keeps the chunks and clouds around the griffin at world z (negative ahead). */
  follow(z: number): void;
}

export function buildLand(stage: Stage3D): Land {
  const scene = stage.scene;
  const sky = new THREE.Color('#8fcdf2');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 45, 115);
  scene.add(new THREE.HemisphereLight(0xe6f4ff, 0x5d7a3a, 1.5));
  const sun = stage.addSun(0xfff1d6, 1.5, [8, 18, 10], [0, 0, 0], 22);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ color: 0x74ad4c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const track = new THREE.Mesh(new THREE.PlaneGeometry(11, 320), new THREE.MeshStandardMaterial({ color: 0x8ec063, roughness: 1 }));
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.01;
  scene.add(track);

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const clouds = Array.from({ length: CLOUDS }, (_, i) => {
    const cloud = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4 + (k % 2) * 0.5, 14, 10), cloudMat);
      puff.position.set((k - 1.5) * 1.6, (k % 2) * 0.4, 0);
      puff.scale.y = 0.6;
      cloud.add(puff);
    }
    cloud.position.set((i % 2 ? 1 : -1) * (12 + (i % 3) * 7), 8 + (i % 3) * 2, -i * (CLOUD_SPAN / CLOUDS));
    scene.add(cloud);
    return cloud;
  });

  const chunks = new Map<number, THREE.Group>();

  function build(index: number): THREE.Group {
    const group = new THREE.Group();
    for (const p of chunkLayout(index)) {
      const g = stage.loader.get(stage.loader.modelPath(p.name));
      if (!g) continue;
      const big = /tree|cottage/.test(p.name);
      const obj = g.scene.clone();
      obj.position.set(p.x, 0, p.z);
      obj.rotation.y = p.turn;
      obj.scale.setScalar(p.scale * (big ? 1.5 : 1.2));
      obj.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = big) : undefined));
      group.add(obj);
    }
    scene.add(group);
    return group;
  }

  return {
    follow(z) {
      ground.position.z = z - 60;
      track.position.z = z - 60;
      sun.position.set(8, 18, z + 10);
      sun.target.position.set(0, 0, z - 12);
      const first = Math.floor(-z / CHUNK) - 1;
      for (let i = first; i < first + CHUNKS; i++) if (!chunks.has(i)) chunks.set(i, build(i));
      for (const [i, group] of chunks) {
        if (i >= first && i < first + CHUNKS) continue;
        group.removeFromParent();
        chunks.delete(i);
      }
      for (const cloud of clouds) {
        while (cloud.position.z > z + 20) cloud.position.z -= CLOUD_SPAN;
        while (cloud.position.z < z - CLOUD_SPAN + 20) cloud.position.z += CLOUD_SPAN;
      }
    },
  };
}
