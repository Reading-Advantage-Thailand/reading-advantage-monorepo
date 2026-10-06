/**
 * The Village Guardian 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the input id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
/** The threats of the village: bandits wander, goblins creep. */
export const THREAT_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  bandit: ['idle', 'walk', 'attack', 'hit'],
  'goblin-warrior': ['idle', 'walk', 'taunt'],
};
export const VILLAGER_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  villager: ['idle', 'walk', 'talk', 'wave'],
  farmer: ['idle', 'walk', 'talk', 'wave'],
  innkeeper: ['idle', 'walk', 'talk', 'wave'],
  druid: ['idle', 'walk', 'victory'],
  guard: ['idle', 'walk', 'salute'],
};

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). The ground is drawn, not baked. */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...Object.entries(THREAT_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
  ...Object.entries(VILLAGER_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'ancient-oak', 'bandit', 'barn', 'bush', 'cleric', 'cottage', 'druid', 'farm-field', 'farmer', 'fence', 'goblin-warrior', 'grass-ground',
  'guard', 'hay-bale', 'innkeeper', 'knight', 'oak-tree', 'pine-tree', 'rock-cluster', 'villager', 'well', 'wildflowers', 'wizard',
];

export const manifest = validateCartridge3DManifest({
  id: 'village-guardian',
  title: 'Village Guardian',
  description: 'Call the villagers in the order of the sentence, keep them away from bandits and goblins, and lead them into the barn.',
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
  briefingKey: 'villageGuardian.briefing',
});
