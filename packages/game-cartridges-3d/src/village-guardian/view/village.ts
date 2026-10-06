/**
 * The village green from the outdoor kits: an 11 m x 9 m lawn inside a low fence, a barn across
 * the far end (its door is the sanctuary), cottages, a well, a field, hay, and trees around. The
 * camera looks in from the open south side. The rules use the green [-5.5, 5.5] x [-4.5, 4.5] and
 * the barn door at (0, -4.5).
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';

/** Every model the village names: scenery and the people (villagers and threats). */
export const VILLAGE_MODELS = [
  'grass-ground', 'barn', 'cottage', 'well', 'fence', 'farm-field', 'hay-bale', 'oak-tree', 'pine-tree', 'ancient-oak', 'bush', 'wildflowers', 'rock-cluster',
  'villager', 'farmer', 'innkeeper', 'druid', 'guard', 'bandit', 'goblin-warrior',
];

export interface Village {
  /** The glowing disc on the ground at the barn door (it fades in when the barn opens). */
  door: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  /** The warm light at the barn door. */
  glow: THREE.PointLight;
}

export function buildVillage(stage: Stage3D): Village {
  const scene = stage.scene;
  scene.background = new THREE.Color('#a9d8f5');
  scene.fog = new THREE.Fog('#a9d8f5', 20, 42);
  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5f7a3a, 1.5));
  stage.addSun(0xfff0cf, 1.9, [-5, 12, 8], [0, 0, 0], 12);

  const place = (name: string, x: number, z: number, yaw = 0, scale = 1): THREE.Object3D | null => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return null;
    const obj = g.scene.clone();
    obj.position.set(x, 0, z);
    obj.rotation.y = THREE.MathUtils.degToRad(yaw);
    obj.scale.setScalar(scale);
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = name !== 'grass-ground';
        n.receiveShadow = true;
      }
    });
    scene.add(obj);
    return obj;
  };

  // Grass tiles (2 m) under everything, running on past the open south side.
  for (let x = -13; x <= 13; x += 2) for (let z = -11; z <= 13; z += 2) place('grass-ground', x, z);

  // The barn across the far end; its front face stands on the green's far edge.
  place('barn', 0, -6.9);
  // The fence around the green: the far side beside the barn, and both long sides.
  for (const x of [-3.6, 3.6, -5.5, 5.5]) place('fence', x, -4.95);
  for (const z of [-3.4, -1.4, 0.6, 2.6, 4.4]) {
    place('fence', -5.95, z, 90);
    place('fence', 5.95, z, 90);
  }
  // Cottages, well, and field beside the green.
  place('cottage', -7.6, -2.8, 90);
  place('cottage', 7.8, -1.2, -90);
  place('well', 7.4, 3.3, -20);
  place('farm-field', -8.2, 2.6, 90);
  place('hay-bale', 7.0, -4.4, 20);
  place('hay-bale', 7.8, -5.2, -30);
  place('hay-bale', -6.8, -5.4, 70);
  // Trees, bushes, and stones around the edge.
  place('ancient-oak', -3.6, -11, 20);
  place('oak-tree', -10.5, -5.5);
  place('oak-tree', 10.8, -6.2, 140);
  place('pine-tree', 11.2, 1.5);
  place('pine-tree', -11.5, 6.5, 60);
  place('oak-tree', 10.2, 8.5, 200);
  place('pine-tree', 4.6, -10.2, 30);
  place('bush', -6.9, 5.6);
  place('bush', 6.9, 5.7, 90);
  place('bush', -5.7, -5.4);
  place('wildflowers', -4.6, 3.8);
  place('wildflowers', 4.8, -3.6, 80);
  place('wildflowers', 2.9, 4.2, 30);
  place('rock-cluster', -9.8, 8.8, 40);

  // The barn door: a warm disc on the ground and a light, both off until the barn opens.
  const door = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  door.rotation.x = -Math.PI / 2;
  door.position.set(0, 0.03, -4.4);
  scene.add(door);
  const glow = new THREE.PointLight(0xffd36b, 0, 7, 1.5);
  glow.position.set(0, 1.4, -4.4);
  scene.add(glow);
  return { door, glow };
}
