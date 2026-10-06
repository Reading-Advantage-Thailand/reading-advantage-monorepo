/**
 * The Paladin's Twin Soul cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the evidence needs the input id and level. The core also accepts the
 * APK `VocabularyInput`, so the APK port can switch this to 'sentence'. The 3D and 2D views use
 * the shared battle stage (the Sunken Vault, the heroes, and the monsters of Monster Encounters).
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The clips the 2D view plays on the party and on each monster kind of the run. */
export const HERO_CLIPS_2D = ['idle', 'run', 'attack', 'attack2', 'hit', 'victory'] as const;
export const ENEMY_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  skeleton: ['idle', 'rise', 'attack', 'hit', 'death'],
  mimic: ['idle', 'reveal', 'attack', 'hit', 'death'],
  'dragon-fire': ['idle', 'fly', 'roar', 'attack', 'hit', 'death'],
};

/** Every 2D file the game uses: the baked hall, the party, the monsters. */
export const FILES_2D: readonly string[] = [
  'background.monster-encounters',
  ...['knight', 'wizard', 'cleric'].flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...Object.entries(ENEMY_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the shared battle stage (vault, party, monsters). */
export const MODELS_3D: readonly string[] = ['altar', 'arch', 'barrel', 'bone-pile', 'brazier', 'candle-cluster', 'cauldron', 'cell-bars', 'chains', 'cleric', 'crate', 'crystal-cluster', 'door', 'dragon-fire', 'floor', 'floor-cracked', 'gate', 'giant-bat', 'gold-pile', 'hanging-cage', 'knight', 'mimic', 'moss-tuft', 'mushroom-cluster', 'pillar', 'rubble', 'sarcophagus', 'skeleton', 'stairs', 'torch-sconce', 'treasure-chest', 'walkway', 'wall', 'wall-corner', 'wizard'];

export const manifest = validateCartridge3DManifest({
  id: 'paladins-twin-soul',
  title: 'Paladin’s Twin Soul',
  description: 'Find the shade that holds the matching word and free the paladin’s twin soul.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'turn',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { vocabulary: 4 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'dungeon-monsters', 'sunken-vault', 'potion-shop', 'outdoor-props'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 6_000_000 },
  briefingKey: 'paladinsTwinSoul.briefing',
});
