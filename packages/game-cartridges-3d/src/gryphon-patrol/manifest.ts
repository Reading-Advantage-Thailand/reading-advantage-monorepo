/**
 * The Gryphon Patrol 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'story': the host passes the whole `StoryInput`, and the evidence needs the
 * sentence ids, the paragraphs, the story id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play (the rider) and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'hit', 'victory'] as const;
/** The gryphon (the fire dragon, tinted) and the bats (word enemies) with their 2D clips. */
export const GRYPHON_CLIPS_2D = ['fly', 'hit', 'roar'] as const;
export const BAT_CLIPS_2D = ['fly', 'hit', 'death'] as const;
/** The props the 2D view places on the land far below. */
export const LAND_PROPS_2D = ['oak-tree', 'pine-tree', 'bush', 'boulder', 'rock-cluster', 'cottage', 'well', 'wildflowers', 'fern', 'hay-bale'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...GRYPHON_CLIPS_2D.map((c) => `dragon-fire.${c}`),
  ...BAT_CLIPS_2D.map((c) => `giant-bat.${c}`),
  ...LAND_PROPS_2D.map((p) => `prop.${p}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'ancient-oak', 'barn', 'boulder', 'bush', 'cleric', 'cottage', 'dragon-fire', 'fern', 'giant-bat', 'hay-bale', 'knight', 'oak-tree', 'pine-tree', 'rock-cluster', 'well', 'wildflowers', 'wizard',
];

export const manifest = validateCartridge3DManifest({
  id: 'gryphon-patrol',
  title: 'Gryphon Patrol',
  description: 'Fly the gryphon over the forest and shoot the bat that carries the next word of the sentence, then take the word, to finish the whole sentence.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'story',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'dungeon-monsters', 'outdoor-props', 'flight-land'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 6_000_000 },
  briefingKey: 'gryphonPatrol.briefing',
});
