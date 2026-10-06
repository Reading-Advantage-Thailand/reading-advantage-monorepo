/**
 * The avatar composer (docs/avatar-system.md, section 8): the avatar base (skinned, with clips)
 * dressed in pieces from the avatar pack.
 *
 * - A piece is rigid: it rides one bone (two for a pair) at its resolved bone-local transform
 *   (`forgeEquip.attach`, from `src/equip.ts`). A pair keeps the +X half of the asset on each bone;
 *   the right one is mirrored (a negative scale, which three.js renders with flipped faces).
 * - Colors come through the tint masks: per color slot, a texel takes (option / default) times its
 *   color where the slot's mask channel is white. The base takes the student's tints; a piece takes
 *   its dyes.
 * - Hair: a hair style replaces the base hair (the swept style when none is chosen) and takes the
 *   base hair color. A head piece hides it, caps it (the style's capped model), tucks it (the
 *   tucked model: the cap alone), or keeps it full (`forgeEquip.hair`).
 *
 * Pure three.js: no fetch. `avatarModelOf` reads a loaded GLB; the caller loads and caches files.
 */
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { strongestHairForm, type HairForm } from './hair.js';
import { hairTint, tintScales, type TintChoice, type VariantTable } from './tint.js';

export { strongestHairForm, type HairForm } from './hair.js';

export { hairTint, tintScales, type TintChannel, type TintChoice, type VariantSlot, type VariantTable } from './tint.js';

export interface EquipAttachRecord {
  readonly bone: string;
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly half: '+x' | null;
}

/** The resolved equip block in a piece's GLB root extras (`forgeEquip`). */
export interface EquipRecord {
  readonly slot: string;
  readonly socket: string;
  readonly fitScale: number;
  readonly hides: readonly string[];
  readonly hair: HairForm;
  readonly displayOnly: readonly string[];
  readonly twoHanded: boolean;
  readonly attach: readonly EquipAttachRecord[];
}

/** A loaded GLB of the pack: the scene, its clips, its root extras, and its tint mask. */
export interface AvatarModel {
  readonly scene: THREE.Object3D;
  readonly animations: readonly THREE.AnimationClip[];
  readonly variants: VariantTable | null;
  readonly equip: EquipRecord | null;
  readonly tintMask: THREE.Texture | null;
}

/** A worn piece: its model, the capped and tucked models of a hair style, and the chosen dye options. */
export interface AvatarPiece {
  readonly id: string;
  readonly model: AvatarModel;
  readonly capped?: AvatarModel;
  readonly tucked?: AvatarModel;
  readonly dyes?: Readonly<Record<string, string>>;
}

export interface AvatarLoadout {
  /** The base colors: a preset name, or an option per slot (skin, hair, eyes, cloth). */
  readonly tints?: TintChoice;
  readonly pieces: readonly AvatarPiece[];
  /** The hair style used when the loadout has none (the base hair is the swept style). */
  readonly defaultHair?: AvatarPiece;
}

export interface ComposedAvatar {
  readonly root: THREE.Group;
  readonly model: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly actions: ReadonlyMap<string, THREE.AnimationAction>;
  /** What the head pieces did to the hair. */
  readonly hair: HairForm;
  /** The material copies of this avatar (for a flash or a fade). */
  readonly materials: readonly THREE.Material[];
}

/** The parts of a three.js GLTFLoader result that `avatarModelOf` reads. */
export interface LoadedGltf {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
  parser: {
    json: { extras?: Record<string, unknown>; images?: { name?: string }[] };
    textureLoader: unknown;
    loadImageSource(index: number, loader: unknown): Promise<THREE.Texture>;
  };
}

/**
 * Reads a loaded GLB into an avatar model and loads its tint mask. No material uses the mask, so
 * the GLB holds it as a named image only (no texture entry): it loads like a material texture of
 * GLTFLoader (not flipped, raw values).
 */
export async function avatarModelOf(gltf: LoadedGltf): Promise<AvatarModel> {
  const extras = gltf.parser.json.extras ?? {};
  const variants = (extras.forgeVariants as VariantTable | undefined) ?? null;
  const equip = (extras.forgeEquip as EquipRecord | undefined) ?? null;
  let tintMask: THREE.Texture | null = null;
  const index = variants?.mask ? (gltf.parser.json.images ?? []).findIndex((i) => i.name === variants.mask) : -1;
  if (index >= 0) {
    tintMask = await gltf.parser.loadImageSource(index, gltf.parser.textureLoader);
    tintMask.flipY = false;
    tintMask.colorSpace = THREE.NoColorSpace;
    tintMask.needsUpdate = true;
  }
  return { scene: gltf.scene, animations: gltf.animations, variants, equip, tintMask };
}

/** A Forge body or bone name as three.js names the node (GLTFLoader drops '.', ':', '/', '[', ']'). */
export const nodeName = (name: string): string => THREE.PropertyBinding.sanitizeNodeName(name);

/** The hair form a set of pieces gives (`strongestHairForm` of the head pieces). */
export function hairFormOf(pieces: readonly AvatarPiece[]): HairForm {
  return strongestHairForm(pieces.filter((p) => p.model.equip?.slot === 'head').map((p) => p.model.equip!.hair));
}

/** Problems with a loadout: two pieces in one slot, a two-handed weapon with an offhand piece, a missing equip block. */
export function loadoutErrors(pieces: readonly AvatarPiece[]): string[] {
  const errors: string[] = [];
  const bySlot = new Map<string, string>();
  for (const p of pieces) {
    const eq = p.model.equip;
    if (!eq) {
      errors.push(`${p.id}: no equip block`);
      continue;
    }
    const other = bySlot.get(eq.slot);
    if (other) errors.push(`${p.id}: slot '${eq.slot}' already holds ${other}`);
    else bySlot.set(eq.slot, p.id);
  }
  const twoHanded = pieces.find((p) => p.model.equip?.twoHanded);
  if (twoHanded && bySlot.has('offhand')) errors.push(`${twoHanded.id}: a two-handed weapon leaves no offhand (${bySlot.get('offhand')})`);
  return errors;
}

/** A copy of a geometry with only the triangles whose center has x >= 0 (the left piece of a pair). */
export function positiveHalf(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = geometry.clone();
  const pos = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const tri = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  const count = (index ? index.count : pos.count) / 3;
  const kept: number[] = [];
  for (let t = 0; t < count; t++) {
    const a = tri(t, 0);
    const b = tri(t, 1);
    const c = tri(t, 2);
    if (pos.getX(a) + pos.getX(b) + pos.getX(c) >= 0) kept.push(a, b, c);
  }
  out.setIndex(kept);
  return out;
}

/** Recolors a material through a tint mask: texel *= mix(1, scale, mask channel) per channel. */
function applyTint(material: THREE.MeshStandardMaterial, mask: THREE.Texture, scales: readonly (readonly [number, number, number])[]): void {
  const uniforms = {
    tintMask: { value: mask },
    tintScale: { value: scales.map((s) => new THREE.Vector3(...s)) },
  };
  material.userData.tint = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tintMask;\nuniform vec3 tintScale[4];')
      .replace(
        '#include <map_fragment>',
        [
          '#include <map_fragment>',
          '#ifdef USE_MAP',
          '  vec4 tintM = texture2D(tintMask, vMapUv);',
          '  diffuseColor.rgb *= mix(vec3(1.0), tintScale[0], tintM.r) * mix(vec3(1.0), tintScale[1], tintM.g)',
          '    * mix(vec3(1.0), tintScale[2], tintM.b) * mix(vec3(1.0), tintScale[3], tintM.a);',
          '#endif',
        ].join('\n'),
      );
  };
  material.customProgramCacheKey = () => 'forge-tint';
  material.needsUpdate = true;
}

/** Own copies of the materials under `node`, recolored when the model has a tint mask. */
function ownMaterials(node: THREE.Object3D, model: AvatarModel, choice: TintChoice | undefined, out: THREE.Material[]): void {
  const scales = model.variants && model.tintMask && choice !== undefined ? tintScales(model.variants, choice) : null;
  node.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false; // skinned bounds do not follow the animation
    const copy = (m: THREE.Material) => {
      const c = m.clone();
      if (scales && c instanceof THREE.MeshStandardMaterial && c.map) applyTint(c, model.tintMask!, scales);
      out.push(c);
      return c;
    };
    o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material);
  });
}

/** The piece's scene for one attach: display-only bodies left out, the +X half for a pair. */
function pieceCopy(model: AvatarModel, half: '+x' | null): THREE.Object3D {
  const copy = model.scene.clone(true);
  const drop: THREE.Object3D[] = [];
  copy.traverse((o) => {
    if (model.equip?.displayOnly.some((n) => nodeName(n) === o.name)) drop.push(o);
    else if (half && o instanceof THREE.Mesh) o.geometry = positiveHalf(o.geometry);
  });
  for (const o of drop) o.removeFromParent();
  return copy;
}

/** The base dressed in a loadout. Throws on a loadout error (see `loadoutErrors`). */
export function composeAvatar(base: AvatarModel, loadout: AvatarLoadout): ComposedAvatar {
  const errors = loadoutErrors(loadout.pieces);
  if (errors.length > 0) throw new Error(`avatar loadout: ${errors.join('; ')}`);
  const materials: THREE.Material[] = [];
  const model = skeletonClone(base.scene);
  ownMaterials(model, base, loadout.tints, materials);

  const hair = hairFormOf(loadout.pieces);
  const style = loadout.pieces.find((p) => p.model.equip?.slot === 'hair') ?? loadout.defaultHair;
  const hidden = new Set(loadout.pieces.flatMap((p) => p.model.equip?.hides ?? []).map(nodeName));
  // A hair style (chosen or the default) replaces the base hair; with no style, the base keeps it.
  if (style) hidden.add(nodeName('hair'));
  model.traverse((o) => {
    if (o instanceof THREE.Mesh && hidden.has(o.name)) o.visible = false;
  });

  const bones = new Map<string, THREE.Object3D>();
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.set(o.name, o);
  });
  const wear = (piece: AvatarPiece, source: AvatarModel) => {
    const eq = piece.model.equip!;
    for (const a of eq.attach) {
      const bone = bones.get(nodeName(a.bone));
      if (!bone) throw new Error(`${piece.id}: the base has no bone '${a.bone}'`);
      const holder = new THREE.Group();
      holder.name = `${piece.id}@${a.bone}`;
      holder.position.set(...a.position);
      holder.quaternion.set(...a.quaternion);
      holder.scale.set(...a.scale);
      const copy = pieceCopy(source, a.half);
      // The piece's own colors: its dyes (the variant table of its full model also covers the capped one).
      ownMaterials(copy, { ...source, variants: source.variants ?? piece.model.variants, tintMask: source.tintMask ?? piece.model.tintMask }, piece.dyes ?? {}, materials);
      holder.add(copy);
      bone.add(holder);
    }
  };
  for (const piece of loadout.pieces) {
    if (piece.model.equip?.slot === 'hair') continue;
    wear(piece, piece.model);
  }
  if (style && hair !== 'hidden') {
    const source = hair === 'tucked' ? style.tucked : hair === 'capped' ? style.capped : style.model;
    if (!source) throw new Error(`${style.id}: no ${hair} model for the head piece`);
    // The style takes the student's hair color (the base tint), not a dye of its own.
    const color = hairTint(base.variants, loadout.tints);
    const dyes = color && style.model.variants?.slots.hair?.options[color] ? { ...style.dyes, hair: color } : (style.dyes ?? {});
    wear({ ...style, dyes }, source);
  }

  const root = new THREE.Group();
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const clip of base.animations) actions.set(clip.name, mixer.clipAction(clip));
  return { root, model, mixer, actions, hair, materials };
}
