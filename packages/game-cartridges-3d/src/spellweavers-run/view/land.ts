/**
 * The land beside the spell road: a green ground that follows the wizard, a darker road down the
 * middle, and chunks of forest and meadow placed from forge models that recycle ahead as the
 * wizard runs (-Z is forward). A clear corridor keeps the orbs readable. Placement uses its own
 * seeded random, so a run always looks the same for the same chunks.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { CHUNK, FOREST, kindOf, MEADOW, rng } from './land-plan.js';

/** The models the 3D view names (the hero comes from the session options). */
export const RUN_MODELS = ['arch', 'gate', 'oak-tree', 'pine-tree', 'ancient-oak', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster'];

const CHUNKS = 5;

export interface Land {
  /** Keeps the chunks around the wizard at z (world z, negative ahead). */
  follow(z: number): void;
  /** The portal at the end of the road: a gate with a glowing disc. Returns the disc to fade in. */
  portal(at: THREE.Vector3): THREE.Mesh;
}

export function buildLand(stage: Stage3D): Land {
  const scene = stage.scene;
  const sky = new THREE.Color('#b7a6e8');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 40, 105);
  scene.add(new THREE.HemisphereLight(0xece4ff, 0x4f6d3a, 1.4));
  const sun = stage.addSun(0xfff1d6, 1.5, [8, 18, 10], [0, 0, 0], 20);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ color: 0x6fae52, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 320), new THREE.MeshStandardMaterial({ color: 0xb69a74, roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  const chunks = new Map<number, THREE.Group>();

  function build(index: number): THREE.Group {
    const group = new THREE.Group();
    const r = rng(index * 7919 + 31);
    for (const [name, count] of kindOf(index) === 'forest' ? FOREST : MEADOW) {
      const g = stage.loader.get(stage.loader.modelPath(name));
      if (!g) continue;
      for (let i = 0; i < count; i++) {
        const side = r() < 0.5 ? -1 : 1;
        const big = /tree/.test(name);
        const x = side * ((big ? 7 : 5.2) + r() * (big ? 14 : 12));
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
      road.position.z = z - 60;
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
    portal(at) {
      const g = stage.loader.get(stage.loader.modelPath('gate'));
      if (g) {
        const obj = g.scene.clone();
        obj.position.set(at.x, 0, at.z);
        obj.scale.setScalar(2.2);
        obj.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = true) : undefined));
        scene.add(obj);
      }
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 40),
        new THREE.MeshBasicMaterial({ color: 0xc9a7ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      disc.position.set(at.x, 2.6, at.z - 0.2);
      scene.add(disc);
      return disc;
    },
  };
}
