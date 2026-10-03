/**
 * Loads web models (GLB with meshopt compression) and textures once per page: a second request
 * for the same file returns the same promise, so games that share a pack download it once.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MODEL_PACK_VERSION, editionModelIndex, modelEditionOf, modelPackRoot, modelPackSchema, type ModelIndex, type ModelPack, type RuntimeEdition3D } from '../contracts/index.js';

export type { GLTF };

/** Fetches and validates one pack manifest (`<base>packs/<id>/<version>/pack.json`). */
export async function fetchModelPack(base: string, id: string, version: string = MODEL_PACK_VERSION): Promise<ModelPack> {
  const res = await fetch(`${base}${modelPackRoot(id, version)}/pack.json`);
  if (!res.ok) throw new Error(`model pack "${id}": ${res.status} ${res.statusText}`);
  return modelPackSchema.parse(await res.json());
}

export class ModelLoader {
  private readonly gltf = new GLTFLoader();
  private readonly models = new Map<string, Promise<GLTF>>();
  private readonly ready = new Map<string, GLTF>();
  private readonly textures = new Map<string, Promise<THREE.Texture>>();
  private readonly packs = new Map<string, Promise<ModelPack>>();
  /** The bound editions, newest last: a name resolves in the newest edition that binds it. */
  private readonly indexes: ModelIndex[] = [];

  /** `base` is the site root that relative paths start from (for example './'). */
  constructor(private readonly base: string) {
    this.gltf.setMeshoptDecoder(MeshoptDecoder);
  }

  /**
   * Fetches the manifests of model packs (`packs/<id>/<version>/pack.json`), once each. A manifest
   * that fails to load rejects (and is retried on the next call): a game that names a pack needs it.
   */
  async fetchPacks(ids: readonly string[], version: string = MODEL_PACK_VERSION): Promise<Record<string, ModelPack>> {
    const entries = await Promise.all(
      ids.map(async (id) => {
        let p = this.packs.get(id);
        if (!p) {
          p = fetchModelPack(this.base, id, version);
          p.catch(() => this.packs.delete(id));
          this.packs.set(id, p);
        }
        return [id, await p] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  /** Binds a 3D edition: its bound keys resolve through `modelPath` and `presetPath`. */
  bind(edition: RuntimeEdition3D): void {
    this.indexes.push(editionModelIndex(edition));
  }

  /** Fetches the packs and binds every file of them under its own name (tools and the lobby; a game binds its edition). */
  async loadPacks(ids: readonly string[], version: string = MODEL_PACK_VERSION): Promise<void> {
    const packs = await this.fetchPacks(ids, version);
    this.bind(modelEditionOf(packs, Object.values(packs).flatMap((p) => Object.keys(p.files))));
  }

  /** The path of a model: from a bound edition, else the legacy `models/<name>.glb`. */
  modelPath(name: string): string {
    for (let i = this.indexes.length - 1; i >= 0; i--) {
      const path = this.indexes[i]!.path(name);
      if (path) return path;
    }
    return `models/${name}.glb`;
  }

  /** The path of a hero's preset texture: from a bound edition, else the legacy `models/<hero>/<preset>.webp`. */
  presetPath(hero: string, preset: string): string {
    for (let i = this.indexes.length - 1; i >= 0; i--) {
      const path = this.indexes[i]!.preset(hero, preset);
      if (path) return path;
    }
    return `models/${hero}/${preset}.webp`;
  }

  /** Loads `path` (relative to the base), once. */
  load(path: string): Promise<GLTF> {
    let p = this.models.get(path);
    if (!p) {
      p = this.gltf.loadAsync(this.base + path).then((g) => {
        this.ready.set(path, g);
        return g;
      });
      // A failed load may be retried later.
      p.catch(() => this.models.delete(path));
      this.models.set(path, p);
    }
    return p;
  }

  /** The model if it has finished loading. */
  get(path: string): GLTF | undefined {
    return this.ready.get(path);
  }

  /**
   * Loads every path; `progress` gets 0 to 1. A missing file is skipped (it leaves a gap in a set,
   * not an error) and is listed in the result.
   */
  async preload(paths: readonly string[], progress: (p: number) => void = () => undefined): Promise<{ missing: string[] }> {
    const missing: string[] = [];
    let done = 0;
    await Promise.all(
      paths.map(async (path) => {
        try {
          await this.load(path);
        } catch {
          missing.push(path);
        }
        progress(++done / Math.max(1, paths.length));
      }),
    );
    return { missing };
  }

  /** Loads a color texture made for a glTF material (no vertical flip, sRGB). */
  texture(path: string): Promise<THREE.Texture> {
    let p = this.textures.get(path);
    if (!p) {
      p = new THREE.TextureLoader().loadAsync(this.base + path).then((tex) => {
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      });
      p.catch(() => this.textures.delete(path));
      this.textures.set(path, p);
    }
    return p;
  }

  /** Frees the GPU memory of every loaded model and texture. */
  dispose(): void {
    for (const g of this.ready.values()) disposeObject(g.scene);
    for (const p of this.textures.values()) void p.then((t) => t.dispose()).catch(() => undefined);
    this.models.clear();
    this.ready.clear();
    this.textures.clear();
    this.packs.clear();
    this.indexes.length = 0;
  }
}

/** Frees the geometries, materials, and textures under `root`. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
      m.dispose();
    }
  });
}
