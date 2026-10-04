/**
 * The Enchanted Library 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * vocabulary ids, the input id, and the level. The core also accepts the APK `VocabularyInput`,
 * so the APK port can switch this to 'vocabulary'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
/** The spirits of the hall: skeletons drawn see-through. */
export const SPIRIT_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  skeleton: ['idle', 'walk', 'hit'],
};

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). The hall and the books are drawn, not baked. */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...Object.entries(SPIRIT_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'candle-cluster', 'chandelier', 'cleric', 'knight', 'lantern', 'plaster-wall', 'plaster-wall-window', 'shelf', 'skeleton', 'wizard', 'wood-floor',
];

export const manifest = validateCartridge3DManifest({
  id: 'enchanted-library',
  title: 'Enchanted Library',
  description: 'Walk the enchanted hall, collect the book whose English word matches the Thai prompt, and raise your shield against spirits.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { vocabulary: 4 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'dungeon-monsters', 'potion-shop'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 6_000_000 },
  briefingKey: 'enchantedLibrary.briefing',
});
