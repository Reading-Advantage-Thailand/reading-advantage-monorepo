/**
 * The Abyssal Well cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the input id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'. The simulation is a turn game.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'attack', 'attack2', 'hit', 'victory'] as const;
/** The creatures of the well and the clips the 2D view plays on each. */
export const CREATURE_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  'goblin-warrior': ['idle', 'walk', 'taunt'],
  skeleton: ['idle', 'walk', 'hit', 'death'],
  slime: ['idle', 'walk', 'hit', 'death'],
};

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). The well is drawn, not baked. */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...Object.entries(CREATURE_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'boulder', 'candle-cluster', 'cleric', 'crystal-cluster', 'dead-tree', 'dirt-ground', 'goblin-warrior', 'knight', 'lantern', 'mushroom-cluster', 'rock-cluster', 'skeleton', 'slime', 'well', 'wizard',
];

export const manifest = validateCartridge3DManifest({
  id: 'abyssal-well',
  title: 'Abyssal Well',
  description: 'Shoot the creatures that climb out of the well in the order of the sentence.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'turn',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'folk', 'dungeon-monsters', 'potion-shop', 'outdoor-props', 'flight-land'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'abyssalWell.briefing',
});
