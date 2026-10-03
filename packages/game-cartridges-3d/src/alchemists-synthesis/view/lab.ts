/**
 * The alchemy lab, placed from forge models: a wooden floor and plaster walls, shelves of
 * bottles and a fireplace on the back wall, the cauldron in the middle, four round pedestals
 * for the ingredient jars, and the alchemist at the side. The layout is narrow on purpose: a
 * portrait phone sees the cauldron and all four jars at once.
 */
import * as THREE from 'three';
import { Actor, type GLTF, type Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { LAYOUT } from './layout.js';

/** Models the lab needs before the first frame (the scenery and the six ingredients); the hero comes from the session. */
export const LAB_MODELS = [
  'wood-floor', 'plaster-wall', 'plaster-wall-window', 'shelf', 'bottle', 'fireplace', 'candle-cluster', 'cauldron', 'barrel', 'crate', 'sack',
  'lantern', 'counter', 'mushroom', 'apple', 'pumpkin', 'crystal-cluster', 'bread',
];

type V3 = [number, number, number];

export interface Lab {
  /** The alchemist, the student's hero. */
  alchemist: Actor;
  /** The brew material of the cauldron (its color and glow show the synthesis progress). */
  brew: THREE.MeshStandardMaterial;
  /** The cauldron object, for a little bounce when a jar pours. */
  cauldron: THREE.Object3D | null;
}

function place(stage: Stage3D, name: string, at: V3, yaw = 0, scale = 1): THREE.Object3D | null {
  const g: GLTF | undefined = stage.loader.get(stage.loader.modelPath(name));
  if (!g) return null;
  const obj = g.scene.clone();
  obj.position.set(...at);
  obj.rotation.y = THREE.MathUtils.degToRad(yaw);
  obj.scale.setScalar(scale);
  obj.traverse((n) => {
    if ((n as THREE.Mesh).isMesh) {
      n.castShadow = !/wood-floor/.test(name);
      n.receiveShadow = true;
    }
  });
  stage.scene.add(obj);
  return obj;
}

/** `hero` is the student's hero model ('knight', 'wizard', 'cleric'). */
export function buildLab(stage: Stage3D, hero: string): Lab {
  const scene = stage.scene;
  scene.background = new THREE.Color('#1c1426');
  scene.fog = new THREE.Fog('#1c1426', 14, 28);
  scene.add(new THREE.HemisphereLight(0xffe6c4, 0x3a2a30, 1.2));
  stage.addSun(0xfff0d8, 1.1, [-3, 9, 6], [0, 0, 0], 7);

  // Floor and walls (two pieces high, so a steep camera sees the lab and not the dark above it).
  for (let x = -4; x <= 4; x += 2) for (let z = -4; z <= 4; z += 2) place(stage, 'wood-floor', [x, 0, z]);
  const back = ['plaster-wall', 'plaster-wall-window', 'plaster-wall', 'plaster-wall-window', 'plaster-wall'];
  back.forEach((w, i) => {
    place(stage, w, [-4 + i * 2, 0, -3.6]);
    place(stage, i % 2 ? 'plaster-wall-window' : 'plaster-wall', [-4 + i * 2, 1.5, -3.6]);
  });
  for (const z of [-2.6, -0.6, 1.4, 3.4]) {
    for (const y of [0, 1.5]) {
      place(stage, 'plaster-wall', [-5, y, z], 90);
      place(stage, 'plaster-wall', [5, y, z], -90);
    }
  }

  // The back wall: shelves of bottles, a counter, and the fireplace.
  for (const x of [-2.4, 2.4]) {
    place(stage, 'shelf', [x, 0, -3.5]);
    for (const [dx, y] of [[-0.45, 0.52], [-0.1, 0.52], [0.3, 0.52], [-0.3, 1.02], [0.15, 1.02], [0.45, 1.02]] as [number, number][]) place(stage, 'bottle', [x + dx, y, -3.35]);
  }
  place(stage, 'fireplace', [0, 0, -3.55]);
  place(stage, 'counter', [-4.1, 0, -2.9], 90);
  place(stage, 'candle-cluster', [-4.1, 0.75, -2.9]);

  // Clutter at the sides.
  place(stage, 'barrel', [4.2, 0, -1.8]);
  place(stage, 'crate', [4.2, 0, 0.2], 15);
  place(stage, 'sack', [-4.2, 0, 0.6], -20);
  place(stage, 'lantern', [-4.5, 0, 2.6]);
  place(stage, 'lantern', [4.5, 0, 2.4]);

  // Warm light from the fire and the lanterns.
  const lights: [V3, number, number][] = [[[0, 0.8, -3.0], 0xff8a3c, 10], [[-4.5, 1.4, 2.6], 0xffb566, 6], [[4.5, 1.4, 2.4], 0xffb566, 6]];
  const flicker: THREE.PointLight[] = [];
  for (const [at, color, power] of lights) {
    const l = new THREE.PointLight(color, power, 8, 1.6);
    l.position.set(...at);
    scene.add(l);
    flicker.push(l);
  }
  stage.onFrame((_dt, t) => flicker.forEach((l, i) => (l.intensity = lights[i]![2] * (0.9 + 0.07 * Math.sin(t * 9 + i * 2) + 0.03 * Math.sin(t * 21 + i)))));

  // The four pedestals for the jars: round wooden stands, the ingredient on top.
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.8 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.7 });
  for (const [x, , z] of LAYOUT.jars) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, LAYOUT.pedestal - 0.06, 24), wood);
    stand.position.set(x, (LAYOUT.pedestal - 0.06) / 2, z);
    stand.castShadow = true;
    stand.receiveShadow = true;
    scene.add(stand);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.06, 24), rim);
    top.position.set(x, LAYOUT.pedestal - 0.03, z);
    top.castShadow = true;
    scene.add(top);
  }

  // The cauldron gets its own copy of the brew material (the teal, glowing body of the model).
  const pot = place(stage, 'cauldron', LAYOUT.cauldron, 0, 1.25);
  let brew: THREE.MeshStandardMaterial | null = null;
  pot?.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (brew || !mat?.emissive || mat.emissiveIntensity <= 0 || !(mat.name === 'brew' || mat.emissive.g > mat.emissive.r * 1.5)) return;
    brew = mat.clone();
    mesh.material = brew;
  });

  // The alchemist: the student's hero, facing the cauldron.
  const g = stage.loader.get(stage.loader.modelPath(hero)) ?? stage.loader.get(stage.loader.modelPath('wizard'))!;
  const alchemist = stage.addActor(new Actor(hero, g, stage.timeline));
  alchemist.placeAt(LAYOUT.alchemist[0], 0, LAYOUT.alchemist[2], 70);

  return { alchemist, brew: brew ?? new THREE.MeshStandardMaterial(), cauldron: pot };
}
