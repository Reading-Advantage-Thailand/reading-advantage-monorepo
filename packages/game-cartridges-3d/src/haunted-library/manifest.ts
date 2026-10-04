/**
 * The Haunted Library 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the story id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
/** The haunts of the library: ghosts are skeletons drawn see-through; bats fly. */
export const HAZARD_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  skeleton: ['idle', 'walk', 'hit'],
  'giant-bat': ['idle', 'fly', 'hit'],
};

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). The library is drawn, not baked. */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...Object.entries(HAZARD_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'candle-cluster', 'chandelier', 'cleric', 'door', 'giant-bat', 'knight', 'lantern', 'plaster-wall', 'plaster-wall-window', 'shelf',
  'skeleton', 'torch-sconce', 'wizard', 'wood-floor',
];

export const manifest = validateCartridge3DManifest({
  id: 'haunted-library',
  title: 'Haunted Library',
  description: 'Climb the four floors of the old library, open the doors in the order of the sentence, and keep away from ghosts and bats.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'dungeon-monsters', 'potion-shop', 'sunken-vault'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'hauntedLibrary.briefing',
});
