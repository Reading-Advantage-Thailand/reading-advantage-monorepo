/**
 * The old churchyard at night: a 12 m x 10 m yard of packed earth (the rules' rectangle
 * [-6, 6] x [-5, 5]) with stone graves along its edges (where zombies rise), a broken fence, dead
 * trees, lanterns, and moonlight. `setDawn(u)` warms the light from night (0) to morning (1).
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';


export const CHURCHYARD_MODELS = ['zombie', 'dirt-ground', 'sarcophagus', 'dead-tree', 'fence', 'lantern', 'boulder', 'rock-cluster', 'bush', 'tall-grass', 'bone-pile', 'candle-cluster', 'campfire-out'];

export interface Churchyard {
  setDawn(u: number): void;
}

export function buildChurchyard(stage: Stage3D): Churchyard {
  const scene = stage.scene;
  const night = new THREE.Color('#141c33');
  const morning = new THREE.Color('#f3c89a');
  const sky = night.clone();
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 14, 30);
  const hemi = new THREE.HemisphereLight(0x8aa4ff, 0x1c2030, 0.9);
  scene.add(hemi);
  const moon = stage.addSun(0xa9bfff, 0.9, [-6, 12, -4], [0, 0, 0], 9);

  const place = (name: string, x: number, z: number, yaw = 0, scale = 1): void => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return;
    const obj = g.scene.clone();
    obj.position.set(x, 0, z);
    obj.rotation.y = THREE.MathUtils.degToRad(yaw);
    obj.scale.setScalar(scale);
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = name !== 'dirt-ground';
        n.receiveShadow = true;
      }
    });
    scene.add(obj);
  };
  for (let x = -7; x <= 7; x += 2) for (let z = -6; z <= 8; z += 2) place('dirt-ground', x, z);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x232a1e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);
  // Graves along the edges (the rules' spawn points are near them).
  for (const x of [-4.5, -1.5, 1.5, 4.5]) place('sarcophagus', x, -5.6, 0, 0.9);
  for (const z of [-2.5, 0.5, 3.5]) {
    place('sarcophagus', -6.6, z, 90, 0.9);
    place('sarcophagus', 6.6, z, -90, 0.9);
  }
  for (const x of [-5.8, -3.8, 3.8, 5.8]) place('fence', x, -6.6, x < 0 ? 4 : -6);
  place('dead-tree', -7.4, -5.8, 30, 1.1);
  place('dead-tree', 7.6, -4.2, 200, 1.0);
  place('dead-tree', -7.8, 5.0, 120, 0.9);
  place('boulder', 7.4, 5.4, 60, 1.2);
  place('rock-cluster', -7.2, 1.8, 10, 1.1);
  for (const [x, z] of [[-6.8, -4.4], [6.9, 1.9], [-3.0, 6.6], [3.2, 6.8], [7.3, -6.3]] as [number, number][]) place('tall-grass', x, z, x * 40, 1.0);
  place('bush', -7.0, 6.9, 20, 1.2);
  place('bone-pile', 5.6, 6.0, 70);
  place('campfire-out', -0.2, 7.2, 0);
  place('candle-cluster', -1.5, -5.0, 0);
  place('candle-cluster', 4.5, -5.0, 0);
  const lanternSpots: [number, number][] = [[-6.2, -6.2], [6.2, -6.2], [-6.4, 6.4], [6.4, 6.4]];
  const lights: THREE.PointLight[] = [];
  for (const [x, z] of lanternSpots) {
    place('lantern', x, z);
    const l = new THREE.PointLight(0xffb45a, 8, 9, 1.6);
    l.position.set(x, 1.4, z);
    scene.add(l);
    lights.push(l);
  }
  let lanternPower = 8;
  stage.onFrame((_dt, t) => lights.forEach((l, i) => (l.intensity = lanternPower * (0.88 + 0.08 * Math.sin(t * 9 + i * 2) + 0.04 * Math.sin(t * 21 + i)))));

  return {
    setDawn(u) {
      sky.copy(night).lerp(morning, u);
      (scene.fog as THREE.Fog).color.copy(sky);
      hemi.intensity = 0.9 + u * 0.7;
      hemi.color.setHex(0x8aa4ff).lerp(new THREE.Color(0xfff0d8), u);
      moon.color.setHex(0xa9bfff).lerp(new THREE.Color(0xffe0b0), u);
      moon.intensity = 0.9 + u * 0.9;
      lanternPower = 8 * (1 - u * 0.7);
    },
  };
}
