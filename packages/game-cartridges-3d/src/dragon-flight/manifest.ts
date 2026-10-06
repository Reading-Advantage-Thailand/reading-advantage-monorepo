/**
 * The Dragon Flight 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * vocabulary ids, the input id, and the level. The core also accepts the APK `VocabularyInput`
 * (section 6 of the design), so the APK port can switch this to 'vocabulary'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The clips the 2D view plays on the dragons, and the land props it places (files of `primary-chibi-2d`). */
export const DRAGON_CLIPS_2D = ['fly', 'idle', 'attack', 'roar', 'death'] as const;
export const LAND_PROPS_2D = ['arch', 'oak-tree', 'pine-tree', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster', 'cottage', 'well', 'fence', 'hay-bale'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [...DRAGON_CLIPS_2D.map((c) => `dragon-fire.${c}`), ...LAND_PROPS_2D.map((p) => `prop.${p}`)];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = ['ancient-oak', 'arch', 'barn', 'boulder', 'bush', 'cleric', 'cottage', 'dragon-fire', 'farm-field', 'fence', 'fern', 'forest-ground', 'gate', 'grass-ground', 'hay-bale', 'knight', 'oak-tree', 'pine-tree', 'river-straight', 'rock-cluster', 'well', 'wildflowers', 'wizard'];

export const manifest = validateCartridge3DManifest({
  id: 'dragon-flight',
  title: 'Dragon Flight',
  description: 'Ride the fire dragon through the gate with the right meaning: every right gate adds a dragon to the flock for the boss.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { vocabulary: 4 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes',  'dungeon-monsters',  'outdoor-props',  'flight-land',  'sunken-vault'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'dragonFlight.briefing',
  // A class challenge sends its vocabulary items as the APK `VocabularyInput`, which the core accepts.
  challenge: { version: '2026-10-06.1', inputMode: 'vocabulary', modalities: ['reading'] },
});
