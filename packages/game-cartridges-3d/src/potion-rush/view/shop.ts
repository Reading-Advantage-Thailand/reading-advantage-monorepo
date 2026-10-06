/**
 * The potion shop, placed from forge models: the counter with three customer spots, three
 * cauldrons in front of it, the enchanted conveyor across the front, the alchemist at the side,
 * a seating corner for customers who wait, and the room around it. The layout is narrow on
 * purpose: a portrait phone sees all three stations at once.
 */
import * as THREE from 'three';
import { Actor, type ActorBody, type GLTF, type Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { LAYOUT } from './layout.js';


/** Models the shop needs before the first frame (customers load later, one kind at a time). */
export const SHOP_MODELS = [
  'counter', 'shelf', 'bottle', 'cauldron', 'fireplace', 'candle-cluster', 'crate', 'barrel', 'sack', 'wood-floor',
  'plaster-wall', 'plaster-wall-window', 'plaster-wall-door', 'round-table', 'stool', 'lantern', 'chandelier',
  'mushroom', 'apple', 'pumpkin', 'crystal-cluster', 'bread',
];

type V3 = [number, number, number];

export { LAYOUT, beltX } from './layout.js';

export interface Shop {
  /** The alchemist, or null for a static bake (the 2D background has no characters). */
  alchemist: Actor | null;
  /** The brew material of each cauldron (its color and glow show the order's progress). */
  brews: THREE.MeshStandardMaterial[];
  /** The rune strip of the conveyor (its texture scrolls with the belt). */
  runes: THREE.Texture;
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

/** A canvas texture of glowing runes for the conveyor strip. */
function runeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2a1b4a';
  g.fillRect(0, 0, 256, 32);
  g.strokeStyle = '#9d7bff';
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const x = i * 32 + 16;
    g.beginPath();
    if (i % 3 === 0) g.arc(x, 16, 7, 0, Math.PI * 2);
    else if (i % 3 === 1) {
      g.moveTo(x - 7, 23);
      g.lineTo(x, 9);
      g.lineTo(x + 7, 23);
      g.closePath();
    } else {
      g.moveTo(x - 7, 16);
      g.lineTo(x + 7, 16);
      g.moveTo(x, 9);
      g.lineTo(x, 23);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** `hero` is the student's hero model ('knight', 'wizard', 'cleric'): the alchemist; '' for none. */
export function buildShop(stage: Stage3D, hero: string, body?: ActorBody): Shop {
  const scene = stage.scene;
  scene.background = new THREE.Color('#1c1426');
  scene.fog = new THREE.Fog('#1c1426', 12, 24);
  scene.add(new THREE.HemisphereLight(0xffe6c4, 0x3a2a30, 1.15));
  stage.addSun(0xfff0d8, 1.1, [-3, 8, 5], [0, 0, -1], 6);

  // Floor and walls.
  for (let x = -4; x <= 4; x += 2) for (let z = -4; z <= 2; z += 2) place(stage, 'wood-floor', [x, 0, z]);
  // Walls two pieces high (3 m), so a steep camera sees the shop, not the dark above it.
  const back = ['plaster-wall', 'plaster-wall-window', 'plaster-wall', 'plaster-wall-window', 'plaster-wall-door'];
  back.forEach((w, i) => {
    place(stage, w, [-4 + i * 2, 0, -3.6]);
    place(stage, i % 2 ? 'plaster-wall-window' : 'plaster-wall', [-4 + i * 2, 1.5, -3.6]);
  });
  for (const z of [-2.6, -0.6, 1.4]) {
    for (const y of [0, 1.5]) {
      place(stage, 'plaster-wall', [-5, y, z], 90);
      place(stage, 'plaster-wall', [5, y, z], -90);
    }
  }

  // Counters, shelves of bottles, and the fireplace along the back wall.
  for (const x of [-2.8, 2.6]) place(stage, 'counter', [x, 0, -3.0]);
  for (const x of [-1.2, 1.2]) {
    place(stage, 'shelf', [x, 0, -3.5]);
    for (const [dx, y] of [[-0.45, 0.52], [-0.1, 0.52], [0.3, 0.52], [-0.3, 1.02], [0.15, 1.02], [0.45, 1.02]] as [number, number][]) place(stage, 'bottle', [x + dx, y, -3.35]);
  }
  place(stage, 'fireplace', [0, 0, -3.55]);
  for (const x of [-2.8, 2.6]) place(stage, 'candle-cluster', [x, 0.75, -3.0]);

  // The seating corner and clutter.
  place(stage, 'round-table', [-3.6, 0, -1.6]);
  place(stage, 'stool', [-3.0, 0, -1.2]);
  place(stage, 'round-table', [3.6, 0, -0.9]);
  place(stage, 'barrel', [4.3, 0, 0.9]);
  place(stage, 'crate', [-4.3, 0, 0.8], 15);
  place(stage, 'sack', [-3.8, 0, 1.2], -20);
  place(stage, 'lantern', [-4.5, 0, -3.1]);
  place(stage, 'lantern', [4.5, 0, 1.6]);
  place(stage, 'chandelier', [0, 2.6, -2.2]);

  // Warm light from the fire, the chandelier, and the lanterns.
  const lights: [V3, number, number][] = [[[0, 0.8, -3.0], 0xff8a3c, 10], [[0, 2.4, -1.4], 0xffd9a0, 12], [[-4.5, 1.4, -3.0], 0xffb566, 6], [[4.5, 1.4, 1.6], 0xffb566, 6]];
  const flicker: THREE.PointLight[] = [];
  for (const [at, color, power] of lights) {
    const l = new THREE.PointLight(color, power, 8, 1.6);
    l.position.set(...at);
    scene.add(l);
    flicker.push(l);
  }
  stage.onFrame((_dt, t) => flicker.forEach((l, i) => (l.intensity = lights[i]![2] * (0.9 + 0.07 * Math.sin(t * 9 + i * 2) + 0.03 * Math.sin(t * 21 + i)))));

  // Cauldrons; each gets its own copy of the brew material (the teal, glowing body of the model).
  const brews = LAYOUT.cauldrons.map((at) => {
    const pot = place(stage, 'cauldron', at);
    let brew: THREE.MeshStandardMaterial | null = null;
    pot?.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (brew || !mat?.emissive || mat.emissiveIntensity <= 0 || !(mat.name === 'brew' || mat.emissive.g > mat.emissive.r * 1.5)) return;
      brew = mat.clone();
      mesh.material = brew;
    });
    return brew ?? new THREE.MeshStandardMaterial();
  });

  // The enchanted conveyor: two dark rails and a scrolling rune strip.
  const { from, to, z, y } = LAYOUT.belt;
  const length = from - to + 0.6;
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2e1c, roughness: 0.8 });
  for (const dz of [-0.24, 0.24]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.08), wood);
    rail.position.set((from + to) / 2, y - 0.02, z + dz);
    rail.castShadow = true;
    scene.add(rail);
  }
  for (const x of [to - 0.1, (from + to) / 2, from + 0.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, y, 0.5), wood);
    leg.position.set(x, y / 2 - 0.04, z);
    scene.add(leg);
  }
  const runes = runeTexture();
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.42), new THREE.MeshStandardMaterial({ map: runes, emissive: 0x6b4bd6, emissiveMap: runes, emissiveIntensity: 0.9, roughness: 0.6 }));
  strip.rotation.x = -Math.PI / 2;
  strip.position.set((from + to) / 2, y - 0.03, z);
  strip.receiveShadow = true;
  scene.add(strip);

  // The alchemist: the student's hero, facing the cauldrons.
  let alchemist: Actor | null = null;
  if (hero) {
    // The student's avatar when the game passes its body.
    const g = body ?? stage.loader.get(stage.loader.modelPath(hero)) ?? stage.loader.get(stage.loader.modelPath('wizard'))!;
    alchemist = stage.addActor(new Actor(hero, g, stage.timeline));
    alchemist.placeAt(LAYOUT.alchemist[0], 0, LAYOUT.alchemist[2], 70);
  }

  return { alchemist, brews, runes };
}
