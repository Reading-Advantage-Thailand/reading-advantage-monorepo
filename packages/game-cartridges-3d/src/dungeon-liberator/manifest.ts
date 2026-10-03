/**
 * The Dungeon Liberator 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'story': the host passes the whole `StoryInput`, and the evidence needs the
 * sentence ids, the paragraphs, the story id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
export const SKELETON_CLIPS_2D = ['idle', 'walk', 'rise', 'attack'] as const;
export const VILLAGER_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  villager: ['idle', 'walk', 'talk', 'wave'],
  farmer: ['idle', 'walk', 'talk', 'wave'],
  innkeeper: ['idle', 'walk', 'talk', 'wave'],
  druid: ['idle', 'walk', 'victory'],
  guard: ['idle', 'walk', 'salute'],
};

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  'background.dungeon-liberator',
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...SKELETON_CLIPS_2D.map((c) => `skeleton.${c}`),
  ...Object.entries(VILLAGER_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = ['arch', 'bone-pile', 'cell-bars', 'chains', 'cleric', 'druid', 'farmer', 'floor', 'floor-cracked', 'gate', 'guard', 'hanging-cage', 'innkeeper', 'knight', 'pillar', 'skeleton', 'torch-sconce', 'villager', 'wall', 'wall-corner', 'wizard'];

export const manifest = validateCartridge3DManifest({
  id: 'dungeon-liberator',
  title: 'Dungeon Liberator',
  description: 'Free the villagers of the Sunken Vault in the order of the sentence, then lead the line out through the gate.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'story',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes',  'folk',  'dungeon-monsters',  'sunken-vault'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'dungeonLiberator.briefing',
});
