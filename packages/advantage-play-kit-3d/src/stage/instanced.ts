/**
 * A set built from many copies of a few models (floors, walls, pillars, trees): one instanced
 * mesh per model part, so a whole map is a few draw calls. Pieces inside a cutaway box are
 * hidden, so walls never block the camera's view of the action.
 */
import * as THREE from 'three';
import type { GLTF } from './loader.js';

export interface Placement {
  asset: string;
  at: readonly [number, number, number];
  /** Degrees about +Y. */
  yaw?: number;
  scale?: number;
}

/** A box on the ground [minX, minZ, maxX, maxZ]. */
export type CutBox = readonly [number, number, number, number];

export class InstancedSet {
  readonly group = new THREE.Group();
  private readonly parts: { mesh: THREE.InstancedMesh; origins: THREE.Vector3[]; matrices: THREE.Matrix4[] }[] = [];
  private readonly byAsset = new Map<string, Placement[]>();

  /**
   * `models(asset)` returns the loaded model or undefined (a missing model leaves a gap).
   * Assets in `flat` receive shadows but do not cast them (floors).
   */
  constructor(placements: readonly Placement[], models: (asset: string) => GLTF | undefined, flat: ReadonlySet<string> = new Set()) {
    for (const p of placements) this.byAsset.set(p.asset, [...(this.byAsset.get(p.asset) ?? []), p]);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (const [asset, list] of this.byAsset) {
      const g = models(asset);
      if (!g) continue;
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const mesh = new THREE.InstancedMesh(node.geometry, node.material, list.length);
        const origins: THREE.Vector3[] = [];
        const matrices: THREE.Matrix4[] = [];
        list.forEach((p, i) => {
          q.setFromAxisAngle(up, THREE.MathUtils.degToRad(p.yaw ?? 0));
          s.setScalar(p.scale ?? 1);
          const at = new THREE.Vector3(...p.at);
          m.compose(at, q, s).multiply(node.matrixWorld);
          mesh.setMatrixAt(i, m);
          origins.push(at);
          matrices.push(m.clone());
        });
        mesh.castShadow = !flat.has(asset);
        mesh.receiveShadow = true;
        mesh.frustumCulled = false; // the instances span the whole map
        this.group.add(mesh);
        this.parts.push({ mesh, origins, matrices });
      });
    }
  }

  /** The placements of one asset (to put lights at torches, for example). */
  placementsOf(asset: string): readonly Placement[] {
    return this.byAsset.get(asset) ?? [];
  }

  /** Shows every piece except those whose origin is inside one of the boxes. */
  cutaway(boxes: readonly CutBox[]): void {
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const { mesh, origins, matrices } of this.parts) {
      origins.forEach((o, i) => {
        const cut = boxes.some(([x0, z0, x1, z1]) => o.x >= x0 && o.x <= x1 && o.z >= z0 && o.z <= z1);
        mesh.setMatrixAt(i, cut ? hidden : matrices[i]!);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const { mesh } of this.parts) mesh.dispose();
    this.group.removeFromParent();
  }
}
