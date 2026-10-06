/**
 * The forest clearing of Devourer Slime: a round meadow (the rules' circle of radius 7 m) ringed
 * with trees, rocks, and flowers from the forest kit, in warm afternoon light.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';


export const CLEARING_MODELS = ['slime', 'guard', 'bandit', 'oak-tree', 'pine-tree', 'bush', 'boulder', 'rock-cluster', 'fern', 'wildflowers', 'mushroom-cluster', 'tree-stump'];

export function buildClearing(stage: Stage3D): void {
  const scene = stage.scene;
  const sky = new THREE.Color('#a8dcf2');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 18, 40);
  scene.add(new THREE.HemisphereLight(0xe4f4ff, 0x5a7a36, 1.35));
  stage.addSun(0xfff0d0, 1.5, [6, 14, 8], [0, 0, 0], 10);
  const meadow = new THREE.Mesh(new THREE.CircleGeometry(7.6, 64), new THREE.MeshStandardMaterial({ color: 0x86bd52, roughness: 1 }));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = 0.01;
  meadow.receiveShadow = true;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x5f8f3a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground, meadow);

  const place = (name: string, x: number, z: number, yaw: number, scale: number): void => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return;
    const obj = g.scene.clone();
    obj.position.set(x, 0, z);
    obj.rotation.y = yaw;
    obj.scale.setScalar(scale);
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    scene.add(obj);
  };
  // A ring of trees and rocks just outside the meadow, and small plants on its edge.
  let seed = 7;
  const r = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * 0.15;
    const d = 8.6 + r() * 2.8;
    const name = ['oak-tree', 'pine-tree', 'oak-tree', 'boulder', 'pine-tree', 'rock-cluster'][i % 6]!;
    place(name, Math.cos(a) * d, Math.sin(a) * d, r() * 6.3, name.includes('tree') ? 0.8 + r() * 0.3 : 1.2 + r() * 0.6);
  }
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const d = 7.2 + r() * 1.2;
    place(['bush', 'fern', 'wildflowers', 'mushroom-cluster', 'tree-stump'][i % 5]!, Math.cos(a) * d, Math.sin(a) * d, r() * 6.3, 0.9 + r() * 0.4);
  }
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 6;
    place('wildflowers', Math.cos(a) * d, Math.sin(a) * d, r() * 6.3, 0.7);
  }
}
