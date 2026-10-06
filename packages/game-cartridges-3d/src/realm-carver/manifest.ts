/**
 * The Realm Carver 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the input id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
/** The monsters of the wild. */
export const MONSTER_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  slime: ['idle', 'walk', 'attack', 'hit'],
  'goblin-warrior': ['idle', 'walk', 'taunt'],
  bandit: ['idle', 'walk', 'attack', 'hit'],
};

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). The ground is drawn, not baked. */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...Object.entries(MONSTER_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'bandit', 'boulder', 'bush', 'cleric', 'fence', 'forest-ground', 'goblin-warrior', 'grass-ground', 'knight', 'mushroom-cluster',
  'oak-tree', 'pine-tree', 'rock-cluster', 'slime', 'wildflowers', 'wizard',
];

export const manifest = validateCartridge3DManifest({
  id: 'realm-carver',
  title: 'Realm Carver',
  description: 'Carve the glowing words of each sentence out of the wild in order, and keep your path safe from the monsters.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'folk', 'outdoor-props', 'flight-land'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'realmCarver.briefing',
});
