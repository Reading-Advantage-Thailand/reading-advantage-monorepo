/**
 * The Dragon Rider 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * vocabulary ids, the input id, and the level. The core also accepts the APK `VocabularyInput`.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play (the rider on the dragon) and the clips the 2D view plays. */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'hit', 'victory'] as const;
/** The dragons (the rider's, the flock, the dark one), the gate arch, and the highland props in 2D. */
export const DRAGON_CLIPS_2D = ['fly', 'idle', 'attack', 'roar', 'death'] as const;
export const LAND_PROPS_2D = ['arch', 'pine-tree', 'oak-tree', 'rock-cluster', 'boulder', 'bush'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...DRAGON_CLIPS_2D.map((c) => `dragon-fire.${c}`),
  ...LAND_PROPS_2D.map((p) => `prop.${p}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings`. */
export const MODELS_3D: readonly string[] = ['boulder', 'bush', 'cleric', 'dragon-fire', 'knight', 'oak-tree', 'pine-tree', 'rock-cluster', 'wizard'];

export const manifest = validateCartridge3DManifest({
  id: 'dragon-rider',
  title: 'Dragon Rider',
  description: 'Ride a dragon between two gates: fly through the one with the right meaning to grow the flock, then face the dark dragon.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { vocabulary: 4 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'dungeon-monsters', 'outdoor-props'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'dragonRider.briefing',
  // A class challenge sends its vocabulary items as the APK `VocabularyInput`, which the core accepts.
  challenge: { version: '2026-10-06.1', inputMode: 'vocabulary', modalities: ['reading'] },
});
