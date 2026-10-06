/**
 * A room of the Sunken Vault from the vault kit: an 11 m x 9 m floor, walls on three sides (the
 * camera looks in from the open south side), an arch with a portcullis in the north wall (the
 * exit), cells along the side walls, torches, and some bones and chains. The rules use the room
 * rectangle [-5.5, 5.5] x [-4.5, 4.5] and the gate at (0, -4.5).
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';


export const ROOM_MODELS = ['floor', 'floor-cracked', 'wall', 'wall-corner', 'arch', 'gate', 'pillar', 'cell-bars', 'hanging-cage', 'torch-sconce', 'bone-pile', 'chains', 'skeleton', 'villager', 'farmer', 'innkeeper', 'druid', 'guard'];

export interface Room {
  /** The portcullis (it rises when the gate opens). */
  portcullis: THREE.Object3D | null;
  /** The glow in the arch when the gate is open. */
  glow: THREE.PointLight;
}

export function buildRoom(stage: Stage3D): Room {
  const scene = stage.scene;
  scene.background = new THREE.Color('#0d1119');
  scene.fog = new THREE.Fog('#0d1119', 14, 30);
  scene.add(new THREE.HemisphereLight(0xa7b9e6, 0x2b2f3d, 1.35));
  stage.addSun(0xd0dcff, 1.0, [-4, 12, 7], [0, 0, 0], 8);

  const place = (name: string, x: number, z: number, yaw = 0, y = 0, scale = 1): THREE.Object3D | null => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return null;
    const obj = g.scene.clone();
    obj.position.set(x, y, z);
    obj.rotation.y = THREE.MathUtils.degToRad(yaw);
    obj.scale.setScalar(scale);
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = !/floor/.test(name);
        n.receiveShadow = true;
      }
    });
    scene.add(obj);
    return obj;
  };

  // The floor runs on past the open south side (the camera looks in from there), ending in rubble.
  for (const x of [-5, -3, -1, 1, 3, 5]) for (const z of [-4, -2, 0, 2, 4, 6, 8]) place((x * 7 + z * 3) % 5 === 0 ? 'floor-cracked' : 'floor', x, z);
  for (const [x, z, yaw] of [[-5.2, 8.6, 20], [-2.8, 9.0, 70], [-0.4, 8.7, 140], [2.2, 9.1, 10], [4.6, 8.8, 95]] as [number, number, number][]) {
    place('bone-pile', x, z, yaw);
    place('chains', x + 1.0, z + 0.3, yaw + 50);
  }
  for (const z of [6.8, 8.8]) {
    place('wall', -6.2, z, 90);
    place('wall', 6.2, z, -90);
  }
  // The north wall with the exit arch in the middle.
  for (const x of [-4.1, -2.1, 2.1, 4.1]) place('wall', x, -5.25);
  place('wall-corner', -6.1, -5.25);
  place('wall-corner', 6.1, -5.25, -90);
  place('arch', 0, -5.25);
  const portcullis = place('gate', 0, -5.2, 0, 0, 1.3);
  // Side walls, with cells.
  for (const z of [-3.2, -1.2, 0.8, 2.8, 4.8]) {
    place('wall', -6.2, z, 90);
    place('wall', 6.2, z, -90);
  }
  place('cell-bars', -5.95, -1.2, 90);
  place('cell-bars', 5.95, 0.8, -90);
  place('pillar', -3.1, -4.75);
  place('pillar', 3.1, -4.75);
  place('hanging-cage', -4.6, 3.6, 30);
  place('bone-pile', 4.9, 3.9, 40);
  place('bone-pile', -5.0, -3.9, -20);
  place('chains', 5.0, -3.8, 10);
  const torches: [number, number, number][] = [[-1.5, -5.0, 0], [1.5, -5.0, 0], [-5.95, 2.0, 90], [5.95, -2.2, -90]];
  const lights: THREE.PointLight[] = [];
  for (const [x, z, yaw] of torches) {
    place('torch-sconce', x, z, yaw, 0.3);
    const l = new THREE.PointLight(0xffa24a, 9, 8, 1.7);
    l.position.set(x + (yaw === 90 ? 0.4 : yaw === -90 ? -0.4 : 0), 1.6, z + (yaw === 0 ? 0.4 : 0));
    scene.add(l);
    lights.push(l);
  }
  stage.onFrame((_dt, t) => lights.forEach((l, i) => (l.intensity = 9 * (0.85 + 0.1 * Math.sin(t * 11 + i * 1.7) + 0.05 * Math.sin(t * 23 + i)))));
  const glow = new THREE.PointLight(0x9dffb0, 0, 6, 1.5);
  glow.position.set(0, 1.2, -4.6);
  scene.add(glow);
  // A dark ground beyond the room.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);
  return { portcullis, glow };
}
