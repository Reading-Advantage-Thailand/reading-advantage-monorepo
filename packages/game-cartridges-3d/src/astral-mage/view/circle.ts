/**
 * The spell circle from the dungeon and outdoor kits: a night floor of dirt tiles with a glowing
 * rune ring, boulders and candles around the edge, a few dead trees and pines far back, and a
 * sky of fixed stars. The camera looks in from behind the mage. The rules use the floor
 * [-5, 5] x [-4, 1] for the crystals and the mage at (0, 3.2).
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';

/** Every model the circle names (scenery and the crystals); the heroes come from the session. */
export const CIRCLE_MODELS = [
  'dirt-ground', 'crystal-cluster', 'candle-cluster', 'lantern', 'boulder', 'rock-cluster', 'dead-tree', 'pine-tree', 'mushroom-cluster',
];

export interface Circle {
  /** The glowing ring on the floor; it pulses with the casting. */
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
}

export function buildCircle(stage: Stage3D): Circle {
  const scene = stage.scene;
  scene.background = new THREE.Color('#0b1030');
  scene.fog = new THREE.Fog('#0b1030', 16, 40);
  scene.add(new THREE.HemisphereLight(0x8da2ff, 0x2a2140, 1.25));
  stage.addSun(0xb8c6ff, 1.1, [-4, 10, 6], [0, 0, 0], 12);

  const place = (name: string, x: number, z: number, yaw = 0, scale = 1): THREE.Object3D | null => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return null;
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
    return obj;
  };

  // Dirt tiles (2 m) under everything, running on past the open near side.
  for (let x = -13; x <= 13; x += 2) for (let z = -11; z <= 13; z += 2) place('dirt-ground', x, z);

  // Boulders and stone heaps around the far half of the floor.
  for (const [x, z, yaw] of [[-6.4, -4.6, 20], [-3.2, -5.4, 80], [0.4, -5.8, 140], [3.6, -5.3, 200], [6.5, -4.4, 260]] as const) place('boulder', x, z, yaw);
  place('rock-cluster', -7.6, -1.2, 40);
  place('rock-cluster', 7.7, -0.4, 200);
  // Candles and lanterns light the near edge and the sides.
  for (const [x, z] of [[-6.2, 1.8], [6.2, 1.6], [-5.6, -3.6], [5.7, -3.4]] as const) place('candle-cluster', x, z, x * 31);
  place('lantern', -2.4, 4.4, 15);
  place('lantern', 2.4, 4.4, -15);
  place('mushroom-cluster', -6.8, 3.4, 30);
  place('mushroom-cluster', 6.9, 3.0, 110);
  // Trees far back and to the sides.
  place('dead-tree', -9.4, -8, 10);
  place('dead-tree', 8.8, -9, 120);
  place('pine-tree', -12, -3, 60);
  place('pine-tree', 11.6, -2, 200);
  place('pine-tree', 3.8, -11.5, 20);

  // The rune ring: a flat glowing ring around the floor's middle.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.4, 4.6, 64),
    new THREE.MeshBasicMaterial({ color: 0x8f7bff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.03, -1.5);
  ring.scale.set(1.1, 0.75, 1);
  scene.add(ring);

  // Stars: fixed points on a far dome (no randomness).
  const stars: number[] = [];
  for (let i = 0; i < 160; i++) {
    const a = i * 2.399963;
    const u = ((i * 0.6180339) % 1) * 0.8 + 0.12;
    const r = 60;
    stars.push(Math.cos(a) * Math.sqrt(1 - u * u) * r, u * r * 0.7 + 8, -Math.abs(Math.sin(a)) * Math.sqrt(1 - u * u) * r - 10);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true, fog: false })));
  return { ring };
}
