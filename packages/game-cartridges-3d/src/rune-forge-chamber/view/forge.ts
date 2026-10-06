/**
 * The rune forge, placed from forge models: a stone-grey plaster room with a wooden floor, the
 * fireplace as the furnace on the back wall, shelves, barrels and crates at the sides, the
 * anvil (a workbench with a hammer) in the middle of the rune orbit, a blade lying on it, and the
 * smith at the side. The layout is narrow on purpose: a portrait phone sees the whole orbit.
 */
import * as THREE from 'three';
import { Actor, type ActorBody, type GLTF, type Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { LAYOUT } from './layout.js';

/** Models the forge needs before the first frame (the scenery and the rune); the hero comes from the session. */
export const FORGE_MODELS = [
  'wood-floor', 'plaster-wall', 'plaster-wall-window', 'shelf', 'fireplace', 'workbench', 'crystal-cluster', 'candle-cluster', 'barrel', 'crate', 'sack', 'lantern',
];

type V3 = [number, number, number];

export interface Forge {
  /** The smith, the student's hero. */
  smith: Actor;
  /** The blade on the anvil; its length and heat show the sentence progress. */
  blade: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  /** The anvil object, for a little bounce when a rune strikes. */
  anvil: THREE.Object3D | null;
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
export function buildForge(stage: Stage3D, hero: string, body?: ActorBody): Forge {
  const scene = stage.scene;
  scene.background = new THREE.Color('#1a1520');
  scene.fog = new THREE.Fog('#1a1520', 14, 28);
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x34262c, 1.15));
  stage.addSun(0xffe8cc, 1.0, [-3, 9, 6], [0, 0, 0], 7);

  // Floor and walls (two pieces high, so a steep camera sees the forge and not the dark above it).
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

  // The back wall: the furnace in the middle, shelves at both sides.
  place(stage, 'fireplace', [0, 0, -3.55], 0, 1.15);
  place(stage, 'shelf', [-2.5, 0, -3.5]);
  place(stage, 'shelf', [2.5, 0, -3.5]);
  place(stage, 'candle-cluster', [-2.5, 1.0, -3.4]);

  // Clutter at the sides.
  place(stage, 'barrel', [4.2, 0, -1.9]);
  place(stage, 'barrel', [4.3, 0, -0.9], 40);
  place(stage, 'crate', [4.2, 0, 0.5], 15);
  place(stage, 'sack', [-4.2, 0, -1.6], -20);
  place(stage, 'crate', [-4.3, 0, -0.5], -10);
  place(stage, 'lantern', [-4.5, 0, 2.8]);
  place(stage, 'lantern', [4.5, 0, 2.6]);

  // Warm light from the furnace and the lanterns, and a hot light over the anvil.
  const lights: [V3, number, number][] = [[[0, 0.8, -3.0], 0xff8a3c, 10], [[-4.5, 1.4, 2.8], 0xffb566, 6], [[4.5, 1.4, 2.6], 0xffb566, 6]];
  const flicker: THREE.PointLight[] = [];
  for (const [at, color, power] of lights) {
    const l = new THREE.PointLight(color, power, 8, 1.6);
    l.position.set(...at);
    scene.add(l);
    flicker.push(l);
  }
  stage.onFrame((_dt, t) => flicker.forEach((l, i) => (l.intensity = lights[i]![2] * (0.9 + 0.07 * Math.sin(t * 9 + i * 2) + 0.03 * Math.sin(t * 21 + i)))));

  // The anvil, and the blade on it (a flat bar that grows from the left end).
  const anvil = place(stage, 'workbench', LAYOUT.anvil, 0, 1.25);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.05, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x8a96a8, metalness: 0.7, roughness: 0.35, emissive: 0xff8a3c, emissiveIntensity: 0 }),
  );
  blade.position.set(LAYOUT.anvil[0], LAYOUT.anvilTop + 0.04, LAYOUT.anvil[2]);
  blade.castShadow = true;
  scene.add(blade);

  // The smith: the student's hero (or avatar, `body`), facing the anvil.
  const g = body ?? stage.loader.get(stage.loader.modelPath(hero)) ?? stage.loader.get(stage.loader.modelPath('wizard'))!;
  const smith = stage.addActor(new Actor(hero, g, stage.timeline));
  smith.placeAt(LAYOUT.smith[0], 0, LAYOUT.smith[2], 60);

  return { smith, blade, anvil };
}
