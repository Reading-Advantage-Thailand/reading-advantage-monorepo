/**
 * The Hero vs. Zombie 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * vocabulary ids, the input id, and the level. The core also accepts the APK `VocabularyInput`,
 * so the APK port can switch this to 'vocabulary'.
 *
 * `requiredAssetBindings` lists the 2D view's files of the `primary-chibi-2d` sprite pack (the key
 * of each binding is its file id); the 3D view loads its models by path until model packs land.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays on them and on the zombies. */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'attack', 'hit', 'victory'] as const;
export const ZOMBIE_CLIPS_2D = ['idle', 'walk', 'rise', 'attack', 'death', 'hit'] as const;

/** Every 2D file the game uses: the baked churchyard, the heroes, the zombie. */
export const FILES_2D: readonly string[] = [
  'background.hero-vs-zombie',
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...ZOMBIE_CLIPS_2D.map((c) => `zombie.${c}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = ['bone-pile', 'boulder', 'bush', 'campfire-out', 'candle-cluster', 'cleric', 'dead-tree', 'dirt-ground', 'fence', 'knight', 'lantern', 'rock-cluster', 'sarcophagus', 'tall-grass', 'wizard', 'zombie'];

export const manifest = validateCartridge3DManifest({
  id: 'hero-vs-zombie',
  title: 'Hero vs. Zombie',
  description: 'Run to the orb with the meaning of your word, charge your Blast, and knock the churchyard zombies flat until dawn.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { vocabulary: 4 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes',  'folk',  'outdoor-props',  'flight-land',  'sunken-vault',  'potion-shop'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'heroVsZombie.briefing',
  // A class challenge sends its vocabulary items as the APK `VocabularyInput`, which the core accepts.
  // `read-to-select-audio` runs with the host's answer audio controller (the reading runs are unchanged).
  challenge: { version: '2026-10-06.1', inputMode: 'vocabulary', modalities: ['reading', 'read-to-select-audio'] },
});
