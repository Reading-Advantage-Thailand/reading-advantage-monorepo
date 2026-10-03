/**
 * The Labyrinth of the Goblin King 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'story': the evidence needs the story id and level. The core also accepts the
 * APK `SentenceInput`, so the APK port can switch this to 'sentence'. The 2D view draws the maze
 * from one baked background per maze (the 3D set, seen from the 2D camera).
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
export const GOBLIN_CLIPS_2D = ['idle', 'walk', 'taunt'] as const;
/** The maze ids of the core, and the 2D background of each. */
export const MAZE_IDS = ['labyrinth-1', 'labyrinth-2', 'labyrinth-3'] as const;
export const backgroundOf = (mazeId: string): string => `background.${mazeId}`;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  ...MAZE_IDS.map(backgroundOf),
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...GOBLIN_CLIPS_2D.map((c) => `goblin-warrior.${c}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = ['arch', 'cleric', 'floor', 'floor-cracked', 'gate', 'goblin-warrior', 'knight', 'pillar', 'torch-sconce', 'wall', 'wizard'];

export const manifest = validateCartridge3DManifest({
  id: 'labyrinth',
  title: 'Labyrinth of the Goblin King',
  description: 'Walk the stone maze, take the word orbs in sentence order, and keep away from the goblins.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'story',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes',  'folk',  'sunken-vault'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'labyrinth.briefing',
});
