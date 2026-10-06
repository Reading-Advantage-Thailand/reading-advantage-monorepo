/**
 * The well from the village, dungeon, and outdoor kits: a night clearing of dirt tiles with a
 * round dark pit, a stone ring at the rim, a village well in the middle, eight faint lane lines,
 * boulders and glowing crystals around, candles and lanterns by the archer's circle, and a sky
 * of fixed stars. The camera looks down from behind the archer. The rules' lanes run from the
 * bottom radius to the rim radius of `../core/geometry.ts`.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { ARCHER_RADIUS, BOTTOM_RADIUS, CREATURES, LANES, RIM_RADIUS, laneAngle } from '../core/index.js';

/** Every model the well scene names (scenery and creatures); the heroes come from the session. */
export const WELL_MODELS: readonly string[] = [
  'dirt-ground', 'well', 'boulder', 'rock-cluster', 'crystal-cluster', 'candle-cluster', 'lantern', 'dead-tree', 'mushroom-cluster', ...CREATURES,
];

export interface WellScene {
  /** The glowing ring at the rim; it pulses. */
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
}

export function buildWell(stage: Stage3D): WellScene {
  const scene = stage.scene;
  scene.background = new THREE.Color('#090d1c');
  scene.fog = new THREE.Fog('#090d1c', 18, 46);
  scene.add(new THREE.HemisphereLight(0x8da2ff, 0x2a2140, 1.2));
  stage.addSun(0xb8c6ff, 1.0, [-4, 12, 7], [0, 0, 0], 13);

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

  // Dirt tiles (2 m) under everything.
  for (let x = -15; x <= 15; x += 2) for (let z = -13; z <= 15; z += 2) place('dirt-ground', x, z);

  // The pit: a dark disc, a stone ring, and the lane lines.
  const pit = new THREE.Mesh(new THREE.CircleGeometry(RIM_RADIUS + 0.35, 64), new THREE.MeshBasicMaterial({ color: 0x05060d }));
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = 0.04;
  scene.add(pit);
  const stone = new THREE.Mesh(new THREE.TorusGeometry(RIM_RADIUS + 0.45, 0.28, 10, 72), new THREE.MeshStandardMaterial({ color: 0x6d6a78, roughness: 0.9 }));
  stone.rotation.x = Math.PI / 2;
  stone.position.y = 0.12;
  stone.receiveShadow = true;
  scene.add(stone);
  for (let lane = 0; lane < LANES; lane++) {
    const len = RIM_RADIUS - BOTTOM_RADIUS;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, len), new THREE.MeshBasicMaterial({ color: 0x3a4e86, transparent: true, opacity: 0.7 }));
    const a = laneAngle(lane);
    const mid = BOTTOM_RADIUS + len / 2;
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = a;
    line.position.set(Math.sin(a) * mid, 0.06, Math.cos(a) * mid);
    scene.add(line);
  }
  place('well', 0, 0, 0, 1.1);

  // Scenery: boulders and crystals around the far half, candles and lanterns by the archer's circle.
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * 0.95 + (k / 6) * Math.PI * 1.9;
    place(k % 2 === 0 ? 'boulder' : 'rock-cluster', Math.sin(a) * 8.6, -Math.abs(Math.cos(a)) * 8.6 - 0.5, k * 53);
  }
  for (const [x, z, yaw] of [[-7.2, -2.6, 40], [7.2, -3, 200], [-4.2, -7.2, 120], [4.5, -7.4, 300]] as const) place('crystal-cluster', x, z, yaw);
  for (let k = 0; k < 6; k++) {
    const a = laneAngle(0) + ((k - 2.5) / 5) * Math.PI * 0.8;
    place(k % 2 === 0 ? 'candle-cluster' : 'lantern', Math.sin(a) * (ARCHER_RADIUS + 1.7), Math.cos(a) * (ARCHER_RADIUS + 1.7), k * 40);
  }
  place('mushroom-cluster', -8, 3, 30);
  place('mushroom-cluster', 8.4, 2.4, 110);
  place('dead-tree', -11, -6, 10);
  place('dead-tree', 10.6, -8, 120);
  place('dead-tree', 2, -12, 60);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(RIM_RADIUS + 0.7, RIM_RADIUS + 0.85, 72),
    new THREE.MeshBasicMaterial({ color: 0x6fb2ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
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
