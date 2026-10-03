/**
 * The enchanted hall from the potion shop kit: a wood-plank floor, a plaster back wall with
 * windows, shelves along the walls, candles, lanterns, and a chandelier, with a glowing rune
 * ring in the middle. The camera looks in from the front (+Z). The rules use the floor
 * [-5.6, 5.6] x [-3.8, 3.8]. The books are built here too: a pedestal, a cover, and pages.
 */
import * as THREE from 'three';
import type { Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import { HALL, HERO_START } from '../core/index.js';

/** Every model the hall names (scenery and the spirits); the heroes come from the session. */
export const HALL_MODELS = [
  'wood-floor', 'plaster-wall', 'plaster-wall-window', 'shelf', 'candle-cluster', 'chandelier', 'lantern', 'skeleton',
];

/** The cover colors of the books, by slot. */
export const BOOK_COLORS = [0x8b5cf6, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xef4444, 0x14b8a6] as const;

export interface Hall {
  /** The glowing ring on the floor; it pulses with the visit. */
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
}

export function buildHall(stage: Stage3D): Hall {
  const scene = stage.scene;
  scene.background = new THREE.Color('#171226');
  scene.fog = new THREE.Fog('#171226', 22, 44);
  scene.add(new THREE.HemisphereLight(0xe8dcff, 0x3a2c4a, 1.6));
  stage.addSun(0xffe9c8, 1.2, [-4, 12, 8], [0, 0, 0], 12);

  const place = (name: string, x: number, y: number, z: number, scale = 1, yaw = 0): THREE.Object3D | null => {
    const g = stage.loader.get(stage.loader.modelPath(name));
    if (!g) return null;
    const obj = g.scene.clone();
    obj.position.set(x, y, z);
    obj.rotation.y = THREE.MathUtils.degToRad(yaw);
    obj.scale.setScalar(scale);
    obj.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = name !== 'wood-floor';
        n.receiveShadow = true;
      }
    });
    scene.add(obj);
    return obj;
  };

  // Floor boards (2 m tiles) under everything, running on past the open near side.
  for (let x = -9; x <= 9; x += 2) for (let z = -5; z <= 9; z += 2) place('wood-floor', x, -0.08, z);
  // The plaster back wall (2x scale: 4 m wide, 3 m tall) with a window now and then.
  for (let i = -2; i <= 2; i++) place(i % 2 ? 'plaster-wall' : 'plaster-wall-window', i * 4, 0, HALL.minZ - 1.6, 2);
  // Shelves against the back wall and the side edges.
  for (const x of [-6.4, -3.4, 3.4, 6.4]) place('shelf', x, 0, HALL.minZ - 1.2, 1.6);
  for (const z of [-2.4, 0.4]) {
    place('shelf', HALL.minX - 1.1, 0, z, 1.5, 90);
    place('shelf', HALL.maxX + 1.1, 0, z, 1.5, -90);
  }
  for (const [x, z] of [[-4.8, -3.2], [4.8, -3.2], [-5.4, 3.4], [5.4, 3.4]] as const) place('candle-cluster', x, 0, z, 1.3, x * 40);
  place('lantern', -2, 0, HALL.minZ - 0.5, 0.9);
  place('lantern', 2, 0, HALL.minZ - 0.5, 0.9);
  place('chandelier', 0, 2.5, -0.5, 1.2);

  // The rune ring around the starting place.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.65, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HERO_START.x, 0.03, HERO_START.z);
  scene.add(ring);
  return { ring };
}

export interface BookView {
  group: THREE.Group;
  /** The glow under the book; it is gold for the helper's hint. */
  halo: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  dispose(): void;
}

/** One book on its pedestal: dark wood, a colored cover, and cream pages. Origin on the floor. */
export function buildBook(slot: number): BookView {
  const group = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ color: BOOK_COLORS[slot % BOOK_COLORS.length]!, roughness: 0.55, emissive: BOOK_COLORS[slot % BOOK_COLORS.length]!, emissiveIntensity: 0.25 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xfff1d0, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.8 });
  const geos = [new THREE.CylinderGeometry(0.26, 0.34, 0.5, 14), new THREE.BoxGeometry(0.62, 0.12, 0.46), new THREE.BoxGeometry(0.56, 0.1, 0.4)];
  const pedestal = new THREE.Mesh(geos[0]!, wood);
  pedestal.position.y = 0.25;
  const back = new THREE.Mesh(geos[1]!, cover);
  back.position.y = 0.62;
  const block = new THREE.Mesh(geos[2]!, pages);
  block.position.set(0.02, 0.69, 0);
  const lid = new THREE.Mesh(geos[1]!, cover);
  lid.position.y = 0.77;
  for (const m of [pedestal, back, block, lid]) {
    m.castShadow = true;
    group.add(m);
  }
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 24),
    new THREE.MeshBasicMaterial({ color: 0xc9b8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.04;
  group.add(halo);
  return {
    group,
    halo,
    dispose: () => {
      group.removeFromParent();
      for (const g of geos) g.dispose();
      halo.geometry.dispose();
      halo.material.dispose();
      cover.dispose();
      pages.dispose();
      wood.dispose();
    },
  };
}
