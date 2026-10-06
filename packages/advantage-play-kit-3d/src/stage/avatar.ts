/**
 * The student's avatar as a game body (docs/avatar-system.md, section 11; track
 * avatar_in_games_20261006). The host passes the launch avatar in the session options; the kit
 * loads its pack files and composes one avatar for each actor. A game that shows one hero calls
 * `playerBody`.
 *
 * Owner rule: the avatar is the student's identity, so a student with an avatar never appears as a
 * hero. A piece that does not load or fit is left off (the student keeps the base, the colors, and
 * every other piece). When the pack or the base does not load, the student appears as a neutral
 * grey figure. Only a session with no avatar shows the fixed hero.
 */
import * as THREE from 'three';
import { avatarModelOf, composeAvatar, loadoutErrors, type AvatarLoadout, type AvatarModel, type AvatarPiece, type ComposedAvatar, type LoadedGltf } from '../avatar/compose.js';
import { AVATAR_CLIP_ALIASES, DEFAULT_HAIR, fromServedVersion, pieceDyes, type AvatarCatalog, type AvatarCatalogItem } from '../avatar/launch.js';
import type { APKDiagnosticInput, LaunchAvatar } from '../contracts/index.js';
import type { GLTF, ModelLoader } from './loader.js';

/** A piece of the launch avatar that the body leaves off, and why. */
export interface DroppedPiece {
  readonly itemId: string;
  readonly reason: string;
}

/** A body that composes a new copy of the student's avatar for each actor. */
export interface AvatarBody {
  readonly kind: 'avatar';
  readonly avatar: LaunchAvatar;
  /** The pack version the files came from (the launch version, or the current one when that is not served); '' for the neutral figure. */
  readonly version: string;
  /** True when the pack did not load and the body is the neutral grey figure. */
  readonly neutral: boolean;
  /** The pieces of the launch avatar that the body leaves off. */
  readonly dropped: readonly DroppedPiece[];
  /** Clip names of the base, as the actor knows them (with the hero names of `AVATAR_CLIP_ALIASES`). */
  readonly aliases: Readonly<Record<string, string>>;
  /** The height of the dressed avatar in its rest pose, in meters (a hat counts). */
  readonly height: number;
  compose(): ComposedAvatar;
}

/** The body of a hero actor: a hero GLB, or the student's avatar. */
export type ActorBody = GLTF | AvatarBody;

export const isAvatarBody = (body: ActorBody): body is AvatarBody => (body as AvatarBody).kind === 'avatar';

const models = new WeakMap<GLTF, Promise<AvatarModel>>();

const heightOf = (root: THREE.Object3D): number => new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y || 1;

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** The height of a body in its rest pose, in meters (games scale a rider to its mount with it). */
export const bodyHeight = (body: ActorBody): number => (isAvatarBody(body) ? body.height : heightOf(body.scene));

/** The avatar model of a loaded GLB, read once (its tint mask loads once). */
function modelOf(gltf: GLTF): Promise<AvatarModel> {
  let m = models.get(gltf);
  if (!m) {
    m = avatarModelOf(gltf as unknown as LoadedGltf);
    models.set(gltf, m);
  }
  return m;
}

/**
 * The pieces that compose on `base`, in loadout order, and the composed avatar: a piece that
 * conflicts with an earlier one (`loadoutErrors`) or that the composer rejects is left off. Throws
 * when the base alone does not compose.
 */
function wearable(base: AvatarModel, loadout: AvatarLoadout, dropped: DroppedPiece[]): { pieces: AvatarPiece[]; composed: ComposedAvatar } {
  const free: AvatarPiece[] = [];
  for (const piece of loadout.pieces) {
    const errors = loadoutErrors([...free, piece]);
    if (errors.length > 0) dropped.push({ itemId: piece.id, reason: errors.join('; ') });
    else free.push(piece);
  }
  try {
    return { pieces: free, composed: composeAvatar(base, { ...loadout, pieces: free }) };
  } catch {
    // One piece does not fit (a missing bone or hair form): add the pieces one at a time.
  }
  const kept: AvatarPiece[] = [];
  let composed = composeAvatar(base, { ...loadout, pieces: [] });
  for (const piece of free) {
    try {
      composed = composeAvatar(base, { ...loadout, pieces: [...kept, piece] });
      kept.push(piece);
    } catch (error) {
      dropped.push({ itemId: piece.id, reason: reasonOf(error) });
    }
  }
  return { pieces: kept, composed };
}

/**
 * Loads the pack files of a launch avatar (the catalog, the base, every worn piece with its capped
 * and tucked forms). A piece that does not load or fit is left off and listed in `dropped`; when the
 * default hair style does not load, the base keeps its own hair. Throws only when the catalog or the
 * base does not load or compose.
 */
export async function loadAvatarBody(loader: ModelLoader, avatar: LaunchAvatar): Promise<AvatarBody> {
  const { value: catalog, version } = await fromServedVersion(avatar.catalogVersion, async (v) => (await loader.json(`${loader.avatarRoot}/${v}/catalog.json`)) as AvatarCatalog);
  const root = `${loader.avatarRoot}/${version}/`;
  const items = new Map(catalog.items.map((i) => [i.id, i]));
  const model = async (file: string) => modelOf(await loader.load(root + file));
  const pieceOf = async (id: string, dye: string | null): Promise<AvatarPiece> => {
    const item: AvatarCatalogItem | undefined = items.get(id);
    if (!item) throw new Error(`no piece '${id}' in avatar pack ${version}`);
    const [full, capped, tucked] = await Promise.all([model(item.files.model), item.files.capped ? model(item.files.capped) : null, item.files.tucked ? model(item.files.tucked) : null]);
    return { id, model: full, ...(capped ? { capped } : {}), ...(tucked ? { tucked } : {}), dyes: pieceDyes(item.dyes, dye) };
  };
  const [base, loaded, defaultHair] = await Promise.all([
    model(catalog.base.file),
    Promise.allSettled(avatar.pieces.map((p) => pieceOf(p.itemId, p.dye))),
    pieceOf(DEFAULT_HAIR, null).catch(() => undefined),
  ]);
  const dropped: DroppedPiece[] = [];
  const pieces: AvatarPiece[] = [];
  loaded.forEach((result, i) => {
    if (result.status === 'fulfilled') pieces.push(result.value);
    else dropped.push({ itemId: avatar.pieces[i]!.itemId, reason: reasonOf(result.reason) });
  });
  const hair = defaultHair ? { defaultHair } : {};
  // Compose once now: a piece that does not fit is left off before the game starts.
  const worn = wearable(base, { tints: avatar.tints, pieces, ...hair }, dropped);
  const loadout: AvatarLoadout = { tints: avatar.tints, pieces: worn.pieces, ...hair };
  const clips = new Set(base.animations.map((c) => c.name));
  const aliases = Object.fromEntries(Object.entries(AVATAR_CLIP_ALIASES).filter(([from, to]) => !clips.has(from) && clips.has(to)));
  const height = heightOf(worn.composed.root);
  return { kind: 'avatar', avatar, version, neutral: false, dropped, aliases, height, compose: () => composeAvatar(base, loadout) };
}

/** The height of the neutral figure, in meters (the avatar base is about 1 m). */
const NEUTRAL_HEIGHT = 1;

/** A clip that moves and turns the figure node (`figure`) through keyframes: [time, y, x lean degrees]. */
function figureClip(name: string, keys: readonly (readonly [number, number, number])[]): THREE.AnimationClip {
  const times = keys.map((k) => k[0]);
  const position = keys.flatMap((k) => [0, k[1], 0]);
  const quaternion = keys.flatMap((k) => new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(k[2]), 0, 0)).toArray());
  return new THREE.AnimationClip(name, times[times.length - 1]!, [
    new THREE.VectorKeyframeTrack('figure.position', times, position),
    new THREE.QuaternionKeyframeTrack('figure.quaternion', times, quaternion),
  ]);
}

/** The clips of the neutral figure, by the hero clip names the games play. */
const NEUTRAL_CLIPS = [
  figureClip('idle', [[0, 0, 0], [1.2, 0.012, 0], [2.4, 0, 0]]),
  figureClip('walk', [[0, 0, 0], [0.25, 0.05, 6], [0.5, 0, 0], [0.75, 0.05, 6], [1, 0, 0]]),
  figureClip('run', [[0, 0, 8], [0.18, 0.08, 12], [0.36, 0, 8], [0.54, 0.08, 12], [0.72, 0, 8]]),
  figureClip('attack', [[0, 0, 0], [0.15, 0.03, 18], [0.5, 0, 0]]),
  figureClip('attack2', [[0, 0, 0], [0.12, 0.1, -6], [0.3, 0.02, 22], [0.6, 0, 0]]),
  figureClip('hit', [[0, 0, 0], [0.1, 0, -16], [0.4, 0, 0]]),
  figureClip('victory', [[0, 0, 0], [0.2, 0.18, 0], [0.4, 0, 0], [0.6, 0.18, 0], [0.8, 0, 0]]),
  figureClip('death', [[0, 0, 0], [0.5, 0.02, -80], [0.8, 0, -86]]),
];

/** A new neutral grey figure: no face, no hair, no clothes, the size of the avatar base. */
function neutralFigure(): ComposedAvatar {
  const material = new THREE.MeshStandardMaterial({ color: 0x9aa1ac, roughness: 0.85, metalness: 0 });
  const figure = new THREE.Group();
  figure.name = 'figure';
  const part = (geometry: THREE.BufferGeometry, x: number, y: number, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    figure.add(mesh);
  };
  part(new THREE.SphereGeometry(0.21, 24, 16), 0, 0.78);
  part(new THREE.CapsuleGeometry(0.15, 0.16, 6, 16), 0, 0.38);
  for (const side of [-1, 1]) {
    part(new THREE.CapsuleGeometry(0.055, 0.2, 4, 10), side * 0.075, 0.16);
    part(new THREE.CapsuleGeometry(0.045, 0.18, 4, 10), side * 0.2, 0.4);
  }
  const model = new THREE.Group();
  model.add(figure);
  const root = new THREE.Group();
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map(NEUTRAL_CLIPS.map((clip) => [clip.name, mixer.clipAction(clip)] as const));
  return { root, model, mixer, actions, hair: 'full', materials: [material] };
}

/**
 * The neutral grey figure of a student whose avatar did not load. It stands in for the avatar (it
 * takes no hero look and no hero color) and plays the hero clip names with simple motion.
 */
export function neutralAvatarBody(avatar: LaunchAvatar, dropped: readonly DroppedPiece[] = []): AvatarBody {
  const aliases = Object.fromEntries(Object.entries(AVATAR_CLIP_ALIASES).filter(([from]) => !NEUTRAL_CLIPS.some((c) => c.name === from)));
  return { kind: 'avatar', avatar, version: '', neutral: true, dropped, aliases, height: NEUTRAL_HEIGHT, compose: neutralFigure };
}

/**
 * The body of the player's hero: the student's avatar when the session has one (without the pieces
 * that do not load, or the neutral figure when the pack does not load), else the fixed hero `hero`
 * (loaded through the edition). A missing piece or avatar sends a `warning` diagnostic; the game
 * never stops for it.
 */
export async function playerBody(
  loader: ModelLoader,
  avatar: LaunchAvatar | undefined,
  hero: string,
  diagnostic: (event: APKDiagnosticInput) => void,
): Promise<ActorBody> {
  if (!avatar) return loader.load(loader.modelPath(hero));
  const about = { classId: avatar.classId, catalogVersion: avatar.catalogVersion };
  try {
    const body = await loadAvatarBody(loader, avatar);
    if (body.dropped.length > 0) {
      diagnostic({
        level: 'warning',
        code: 'apk3d/avatar-partial',
        message: `The avatar shows without ${body.dropped.length === 1 ? 'one piece' : `${body.dropped.length} pieces`} that did not load.`,
        details: { ...about, dropped: body.dropped.map((d) => `${d.itemId}: ${d.reason}`).join(' | ') },
      });
    }
    return body;
  } catch (error) {
    diagnostic({
      level: 'warning',
      code: 'apk3d/avatar-fallback',
      message: 'The avatar did not load; the game shows a neutral figure in its place.',
      details: { ...about, reason: reasonOf(error) },
    });
    return neutralAvatarBody(avatar);
  }
}
