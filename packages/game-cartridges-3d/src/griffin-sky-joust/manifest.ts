/**
 * The Griffin Sky-Joust 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the input id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play (the rider on the griffin) and the clips the 2D view plays. */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'hit', 'victory'] as const;
/** The griffin (a fire dragon in flight), the riders (giant bats), the ground props, and their clips in 2D. */
export const GRIFFIN_CLIPS_2D = ['fly', 'hit'] as const;
export const RIDER_CLIPS_2D = ['fly', 'hit', 'death'] as const;
export const GROUND_PROPS_2D = ['oak-tree', 'pine-tree', 'rock-cluster', 'bush'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...GRIFFIN_CLIPS_2D.map((c) => `dragon-fire.${c}`),
  ...RIDER_CLIPS_2D.map((c) => `giant-bat.${c}`),
  ...GROUND_PROPS_2D.map((p) => `prop.${p}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = ['bush', 'cleric', 'dragon-fire', 'giant-bat', 'knight', 'oak-tree', 'pine-tree', 'rock-cluster', 'wizard'];

export const manifest = validateCartridge3DManifest({
  id: 'griffin-sky-joust',
  title: 'Griffin Sky-Joust',
  description: 'Fly a griffin and strike from above the rider that carries the next word of the sentence, in order.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'dungeon-monsters', 'outdoor-props'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'griffinSkyJoust.briefing',
});
