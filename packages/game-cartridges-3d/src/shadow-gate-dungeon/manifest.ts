/**
 * The Shadow Gate Dungeon 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the input id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
/** The shadow wears the skeleton sprite, tinted dark. */
export const SHADOW_CLIPS_2D = ['idle', 'walk', 'rise', 'attack'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). The room is the baked dungeon background. */
export const FILES_2D: readonly string[] = [
  'background.dungeon-liberator',
  'prop.crystal-cluster',
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...SHADOW_CLIPS_2D.map((c) => `skeleton.${c}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'arch', 'bone-pile', 'cell-bars', 'chains', 'cleric', 'crystal-cluster', 'floor', 'floor-cracked', 'gate', 'hanging-cage', 'knight', 'pillar',
  'skeleton', 'torch-sconce', 'wall', 'wall-corner', 'wizard',
];

export const manifest = validateCartridge3DManifest({
  id: 'shadow-gate-dungeon',
  title: 'Shadow Gate Dungeon',
  description: 'Collect word crystals in the order of the sentence, keep ahead of the shadow, and walk through the gate.',
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
  briefingKey: 'shadowGateDungeon.briefing',
});
