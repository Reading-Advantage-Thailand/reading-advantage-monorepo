/**
 * Model pack declarations, assembly, and budget checks (section 7 of docs/apk3d-cartridge.md).
 *
 * Pure code: no file access, no GLB parsing. `scripts/apk3d-models.ts` measures the runtime GLBs
 * and calls these functions; `tests/apk3d/model-pack.test.ts` and `tests/apk3d/budget.test.ts`
 * check them. A model sits in exactly one pack, so a binding is `{ pack, file }` with one answer.
 */
import { CARTRIDGE_3D_RUNTIME_API_VERSION } from './manifest.js';
import { MODEL_BUDGET, modelAssetFileSchema, modelPackSchema, runtimeEdition3DSchema, type EditionId, type ModelAssetFile, type ModelPack, type RuntimeEdition3D } from './model-asset.js';

export const MODEL_PACK_VERSION = '1.0.0';

/** The URL root of a pack: `packs/<id>/<version>` (a versioned URL, so HTTP caching is safe). */
export function modelPackRoot(id: string, version: string = MODEL_PACK_VERSION): string {
  return `packs/${id}/${version}`;
}

/**
 * The models of each pack, by Forge asset name. The `sunken-vault` pack is not listed here: the
 * generator reads its pieces from the scene (`scenes/sunken-vault.ts`). Order is the claim order:
 * a model listed twice stays in the first pack.
 */
export const MODEL_PACKS: Readonly<Record<string, readonly string[]>> = {
  heroes: ['knight', 'wizard', 'cleric', 'adventurer', 'ranger', 'paladin'],
  'dungeon-monsters': ['skeleton', 'giant-bat', 'mimic', 'dragon-fire'],
  folk: ['farmer', 'villager', 'innkeeper', 'guard', 'druid', 'orc-warrior', 'goblin-warrior', 'slime', 'bandit', 'zombie'],
  'potion-shop': [
    'counter', 'shelf', 'bottle', 'cauldron', 'fireplace', 'candle-cluster', 'workbench', 'crate', 'barrel', 'sack',
    'wood-floor', 'plaster-wall', 'plaster-wall-window', 'plaster-wall-door', 'round-table', 'stool', 'lantern', 'chandelier',
    'mushroom', 'apple', 'pumpkin', 'crystal-cluster', 'bread',
  ],
  'outdoor-props': [
    'oak-tree', 'pine-tree', 'ancient-oak', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster', 'tall-grass', 'dead-tree',
    'tree-stump', 'mushroom-cluster', 'campfire-out',
  ],
  'flight-land': ['grass-ground', 'forest-ground', 'dirt-ground', 'river-straight', 'cottage', 'barn', 'well', 'fence', 'farm-field', 'hay-bale'],
};

/** The pack that the generator fills from the vault scene. */
export const VAULT_PACK = 'sunken-vault';

/** Every pack id: the named packs and the vault pack. */
export const MODEL_PACK_IDS: readonly string[] = [...Object.keys(MODEL_PACKS), VAULT_PACK];

/** What one game loads: whole packs, single models, and one playable hero of the `heroes` pack. */
export interface GameModelLoad {
  /** Packs the game loads in full. */
  packs?: readonly string[];
  /** Models the game loads one by one, from whichever pack holds them. */
  models?: readonly string[];
  /** The game shows the hero the student picked; the largest hero counts toward the budget. */
  hero?: boolean;
}

/** The model load of each game, taken from the model names in its view code. */
export const GAME_LOADS: Readonly<Record<string, GameModelLoad>> = {
  'monster-encounters': { packs: ['sunken-vault'], models: ['skeleton', 'giant-bat', 'mimic', 'dragon-fire'], hero: true },
  'rpg-battle': { packs: ['sunken-vault'], models: ['skeleton', 'giant-bat', 'mimic', 'dragon-fire'], hero: true },
  'paladins-twin-soul': { packs: ['sunken-vault'], models: ['skeleton', 'giant-bat', 'mimic', 'dragon-fire'], hero: true },
  'village-guardian': { models: ['ancient-oak', 'bandit', 'barn', 'bush', 'cottage', 'druid', 'farm-field', 'farmer', 'fence', 'goblin-warrior', 'grass-ground', 'guard', 'hay-bale', 'innkeeper', 'oak-tree', 'pine-tree', 'rock-cluster', 'villager', 'well', 'wildflowers'], hero: true },
  'archers-revenge': { packs: ['sunken-vault'], models: ['skeleton', 'giant-bat', 'mimic', 'dragon-fire'], hero: true },
  'astral-mage': { models: ['crystal-cluster', 'candle-cluster', 'lantern', 'dirt-ground', 'boulder', 'rock-cluster', 'dead-tree', 'pine-tree', 'mushroom-cluster'], hero: true },
  'spellweavers-run': { models: ['ancient-oak', 'arch', 'boulder', 'bush', 'fern', 'gate', 'oak-tree', 'pine-tree', 'rock-cluster', 'wildflowers'], hero: true },
  'haunted-library': { models: ['candle-cluster', 'chandelier', 'door', 'giant-bat', 'lantern', 'plaster-wall', 'plaster-wall-window', 'shelf', 'skeleton', 'torch-sconce', 'wood-floor'], hero: true },
  'shadow-gate-dungeon': { models: ['arch', 'bone-pile', 'cell-bars', 'chains', 'crystal-cluster', 'floor', 'floor-cracked', 'gate', 'hanging-cage', 'pillar', 'skeleton', 'torch-sconce', 'wall', 'wall-corner'], hero: true },
  'realm-carver': { models: ['bandit', 'boulder', 'bush', 'fence', 'forest-ground', 'goblin-warrior', 'grass-ground', 'mushroom-cluster', 'oak-tree', 'pine-tree', 'rock-cluster', 'slime', 'wildflowers'], hero: true },
  'alchemists-synthesis': { models: ['wood-floor', 'plaster-wall', 'plaster-wall-window', 'shelf', 'bottle', 'fireplace', 'candle-cluster', 'cauldron', 'barrel', 'crate', 'sack', 'lantern', 'counter', 'mushroom', 'apple', 'pumpkin', 'crystal-cluster', 'bread'], hero: true },
  'enchanted-library': { models: ['candle-cluster', 'chandelier', 'lantern', 'plaster-wall', 'plaster-wall-window', 'shelf', 'skeleton', 'wood-floor'], hero: true },
  'gryphon-patrol': { models: ['dragon-fire', 'giant-bat', 'oak-tree', 'pine-tree', 'ancient-oak', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster', 'cottage', 'barn', 'well', 'hay-bale'], hero: true },
  'magic-defense': { models: ['altar', 'arch', 'barrel', 'bone-pile', 'brazier', 'candle-cluster', 'cauldron', 'cell-bars', 'chains', 'crate', 'crystal-cluster', 'door', 'dragon-fire', 'floor', 'floor-cracked', 'gate', 'giant-bat', 'gold-pile', 'hanging-cage', 'mimic', 'moss-tuft', 'mushroom-cluster', 'pillar', 'rubble', 'sarcophagus', 'skeleton', 'stairs', 'torch-sconce', 'treasure-chest', 'walkway', 'wall', 'wall-corner'], hero: true },
  'griffin-sky-joust': { models: ['dragon-fire', 'giant-bat', 'oak-tree', 'pine-tree', 'rock-cluster', 'bush'], hero: true },
  'abyssal-well': { models: ['boulder', 'candle-cluster', 'crystal-cluster', 'dead-tree', 'dirt-ground', 'goblin-warrior', 'lantern', 'mushroom-cluster', 'rock-cluster', 'skeleton', 'slime', 'well'], hero: true },
  'rune-forge-chamber': { models: ['wood-floor', 'plaster-wall', 'plaster-wall-window', 'shelf', 'fireplace', 'workbench', 'crystal-cluster', 'candle-cluster', 'barrel', 'crate', 'sack', 'lantern'], hero: true },
  'dragon-rider': { models: ['dragon-fire', 'pine-tree', 'oak-tree', 'rock-cluster', 'boulder', 'bush'], hero: true },
  'griffin-riders-escape': { models: ['dragon-fire', 'giant-bat', 'oak-tree', 'pine-tree', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster', 'cottage', 'well', 'hay-bale'], hero: true },
  'castle-defense': { models: ['altar', 'arch', 'barrel', 'bone-pile', 'brazier', 'candle-cluster', 'cauldron', 'cell-bars', 'chains', 'crate', 'crystal-cluster', 'door', 'dragon-fire', 'floor', 'floor-cracked', 'gate', 'giant-bat', 'gold-pile', 'hanging-cage', 'mimic', 'moss-tuft', 'mushroom-cluster', 'pillar', 'rubble', 'sarcophagus', 'skeleton', 'stairs', 'torch-sconce', 'treasure-chest', 'walkway', 'wall', 'wall-corner'], hero: true },
  'potion-rush': { packs: ['potion-shop'], models: ['farmer', 'villager', 'innkeeper', 'guard', 'druid', 'orc-warrior', 'goblin-warrior', 'skeleton'], hero: true },
  'dragon-flight': {
    models: ['ancient-oak', 'barn', 'boulder', 'bush', 'cottage', 'dragon-fire', 'farm-field', 'fence', 'fern', 'hay-bale', 'oak-tree', 'pine-tree', 'rock-cluster', 'well', 'wildflowers', 'grass-ground', 'forest-ground', 'river-straight', 'arch', 'gate'],
    hero: true,
  },
  'dungeon-liberator': {
    models: ['arch', 'bone-pile', 'cell-bars', 'chains', 'floor', 'floor-cracked', 'gate', 'hanging-cage', 'pillar', 'torch-sconce', 'wall', 'wall-corner', 'skeleton', 'druid', 'farmer', 'guard', 'innkeeper', 'villager'],
    hero: true,
  },
  'devourer-slime': { models: ['slime', 'guard', 'bandit', 'boulder', 'bush', 'fern', 'mushroom-cluster', 'oak-tree', 'pine-tree', 'rock-cluster', 'tree-stump', 'wildflowers'] },
  'hero-vs-zombie': {
    models: ['zombie', 'bone-pile', 'boulder', 'bush', 'campfire-out', 'candle-cluster', 'dead-tree', 'dirt-ground', 'fence', 'lantern', 'rock-cluster', 'sarcophagus', 'tall-grass'],
    hero: true,
  },
  labyrinth: { models: ['arch', 'floor', 'floor-cracked', 'gate', 'pillar', 'torch-sconce', 'wall', 'goblin-warrior'], hero: true },
  'rune-match': { packs: ['sunken-vault'], models: ['skeleton', 'giant-bat', 'mimic', 'dragon-fire'], hero: true },
};

/** What the generator measures in one runtime GLB. */
export interface MeasuredModel {
  /** Forge asset name, also the file stem. */
  name: string;
  byteSize: number;
  triangles: number;
  textureSize: number;
  skinned: boolean;
  clips: readonly string[];
  presets: readonly string[];
  forgeCommit: string;
}

/** One entry of a pack manifest from one measured model. */
export function modelFileEntry(m: MeasuredModel): ModelAssetFile {
  return modelAssetFileSchema.parse({
    id: m.name,
    path: `${m.name}.glb`,
    kind: 'model',
    format: 'glb',
    byteSize: m.byteSize,
    triangles: m.triangles,
    textureSize: m.textureSize,
    skinned: m.skinned,
    clips: [...m.clips],
    presets: [...m.presets],
    provenance: {
      source: `advantage-forge/assets/${m.name}.ts`,
      license: 'AGPL-3.0-or-later',
      forgeCommit: m.forgeCommit,
      tool: 'scripts/apk3d-models.ts',
    },
  });
}

/**
 * A validated pack manifest. Files sort by id, so the same input gives the same bytes: the
 * manifest has no timestamp and no hash.
 */
export function assembleModelPack(id: string, models: readonly MeasuredModel[], version: string = MODEL_PACK_VERSION): ModelPack {
  const files: Record<string, ModelAssetFile> = {};
  for (const m of [...models].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    if (files[m.name]) throw new Error(`pack "${id}": model "${m.name}" is listed twice`);
    files[m.name] = modelFileEntry(m);
  }
  const byteSize = Object.values(files).reduce((sum, f) => sum + f.byteSize, 0);
  return modelPackSchema.parse({ id, version, root: modelPackRoot(id, version), files, byteSize });
}

/** Serialized manifest text (stable key order, trailing newline). */
export function modelPackJson(pack: ModelPack): string {
  return `${JSON.stringify(pack, null, 1)}\n`;
}

/** The budget failures of one file: a skinned character or a set piece (section 7.3). */
export function fileBudgetErrors(file: ModelAssetFile, edition: 'standard' | 'lite' = 'standard'): string[] {
  const errors: string[] = [];
  const at = `${file.id}`;
  if (file.skinned) {
    const limit = MODEL_BUDGET.character;
    if (file.byteSize > limit.bytes) errors.push(`${at}: ${file.byteSize} bytes exceed the character limit of ${limit.bytes}`);
    const tris = edition === 'lite' ? MODEL_BUDGET.lite.triangles : limit.triangles;
    if (file.triangles > tris) errors.push(`${at}: ${file.triangles} triangles exceed the ${edition} limit of ${tris}`);
    const tex = edition === 'lite' ? MODEL_BUDGET.lite.textureSize : limit.textureSize;
    if (file.textureSize > tex) errors.push(`${at}: texture ${file.textureSize} px exceeds the ${edition} limit of ${tex}`);
  } else {
    if (file.byteSize > MODEL_BUDGET.setPiece.bytes) errors.push(`${at}: ${file.byteSize} bytes exceed the set piece limit of ${MODEL_BUDGET.setPiece.bytes}`);
    if (file.textureSize > MODEL_BUDGET.character.textureSize) errors.push(`${at}: texture ${file.textureSize} px exceeds ${MODEL_BUDGET.character.textureSize}`);
  }
  return errors;
}

/** The budget failures of every file of a pack. */
export function packBudgetErrors(pack: ModelPack, edition: 'standard' | 'lite' = 'standard'): string[] {
  return Object.values(pack.files).flatMap((f) => fileBudgetErrors(f, edition).map((e) => `${pack.id}/${e}`));
}

/** The files one game loads: its whole packs, its named models, and the largest hero. */
export function gameLoadFiles(load: GameModelLoad, packs: Readonly<Record<string, ModelPack>>): { files: ModelAssetFile[]; missing: string[] } {
  const byName = new Map<string, ModelAssetFile>();
  for (const pack of Object.values(packs)) for (const file of Object.values(pack.files)) byName.set(file.id, file);
  const files = new Map<string, ModelAssetFile>();
  const missing: string[] = [];
  for (const id of load.packs ?? []) {
    const pack = packs[id];
    if (!pack) missing.push(`pack ${id}`);
    else for (const file of Object.values(pack.files)) files.set(file.id, file);
  }
  for (const name of load.models ?? []) {
    const file = byName.get(name);
    if (file) files.set(name, file);
    else missing.push(`model ${name}`);
  }
  if (load.hero) {
    const heroes = Object.values(packs.heroes?.files ?? {});
    if (!heroes.length) missing.push('pack heroes');
    else files.set('hero', heroes.reduce((a, b) => (b.byteSize > a.byteSize ? b : a)));
  }
  return { files: [...files.values()], missing };
}

/** The failures of one game: a missing pack or model, or a byte total over the game limit. */
export function gameBudgetErrors(game: string, load: GameModelLoad, packs: Readonly<Record<string, ModelPack>>): string[] {
  const { files, missing } = gameLoadFiles(load, packs);
  if (missing.length) return [`${game}: unknown ${missing.join(', ')}`];
  const total = files.reduce((sum, f) => sum + f.byteSize, 0);
  return total > MODEL_BUDGET.totalBytes ? [`${game}: models total ${total} bytes, over the limit of ${MODEL_BUDGET.totalBytes}`] : [];
}

/** Where a game finds a model: the URL path of a file, by Forge asset name. */
export interface ModelIndex {
  /** `packs/<id>/<version>/<file>` for a model of a loaded pack, else undefined. */
  path(name: string): string | undefined;
  /** The preset texture of a hero (`packs/heroes/<version>/knight/royal.webp`), else undefined. */
  preset(hero: string, preset: string): string | undefined;
}

/** An index over loaded packs. A model in two packs is an error: a binding has one answer. */
export function buildModelIndex(packs: Iterable<ModelPack>): ModelIndex {
  const owner = new Map<string, { root: string; file: ModelAssetFile }>();
  for (const pack of packs)
    for (const file of Object.values(pack.files)) {
      const prior = owner.get(file.id);
      if (prior && prior.root !== pack.root) throw new Error(`model "${file.id}" is in two packs: ${prior.root} and ${pack.root}`);
      owner.set(file.id, { root: pack.root, file });
    }
  return {
    path: (name) => {
      const hit = owner.get(name);
      return hit && `${hit.root}/${hit.file.path}`;
    },
    preset: (hero, preset) => {
      const hit = owner.get(hero);
      return hit && hit.file.presets.includes(preset) ? `${hit.root}/${hero}/${preset}.webp` : undefined;
    },
  };
}

/**
 * The 3D edition of a game: each required key (a model name, as the 2D edition uses a file id)
 * bound to the file of that name in one of the packs. An unknown key is an error, so a manifest
 * that lists a model no pack holds fails when the host builds the edition. Only the packs that
 * hold a bound file go into the edition.
 */
export function modelEditionOf(
  packs: Readonly<Record<string, ModelPack>>,
  keys: readonly string[],
  options: { id?: EditionId; title?: string } = {},
): RuntimeEdition3D {
  const owner = new Map<string, string>();
  for (const pack of Object.values(packs)) for (const file of Object.values(pack.files)) owner.set(file.id, pack.id);
  const bindings: RuntimeEdition3D['bindings'] = {};
  const used: Record<string, ModelPack> = {};
  for (const key of keys) {
    const packId = owner.get(key);
    if (!packId) throw new Error(`unknown model binding "${key}": no loaded pack holds it`);
    bindings[key] = { pack: packId, file: key };
    used[packId] = packs[packId]!;
  }
  return runtimeEdition3DSchema.parse({
    id: options.id ?? 'standard',
    title: options.title ?? 'Primary Chibi',
    runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
    packs: used,
    bindings,
    tuning: { speed: 1, intensity: 1 },
  });
}

/** The index of an edition: only its bound keys resolve. */
export function editionModelIndex(edition: RuntimeEdition3D): ModelIndex {
  const entry = (key: string): { root: string; file: ModelAssetFile } | undefined => {
    const binding = edition.bindings[key];
    const pack = binding && edition.packs[binding.pack];
    const file = pack && binding && pack.files[binding.file];
    return pack && file ? { root: pack.root, file } : undefined;
  };
  return {
    path: (key) => {
      const hit = entry(key);
      return hit && `${hit.root}/${hit.file.path}`;
    },
    preset: (hero, preset) => {
      const hit = entry(hero);
      return hit && hit.file.presets.includes(preset) ? `${hit.root}/${hero}/${preset}.webp` : undefined;
    },
  };
}

/** The keys a manifest must bind that the edition does not. */
export function unboundModelKeys(edition: RuntimeEdition3D, required: readonly string[]): string[] {
  return required.filter((key) => !edition.bindings[key]);
}
