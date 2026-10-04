/**
 * The Devourer Slime 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the story id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The clips the 2D view plays on the slime and on each guard kind (files of `primary-chibi-2d`). */
export const SLIME_CLIPS_2D = ['idle', 'walk', 'attack', 'spit', 'hit'] as const;
export const GUARD_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  guard: ['idle', 'walk', 'salute'],
  bandit: ['idle', 'walk', 'attack', 'hit'],
};

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  'background.devourer-slime',
  ...SLIME_CLIPS_2D.map((c) => `slime.${c}`),
  ...Object.entries(GUARD_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = ['bandit', 'boulder', 'bush', 'fern', 'guard', 'mushroom-cluster', 'oak-tree', 'pine-tree', 'rock-cluster', 'slime', 'tree-stump', 'wildflowers'];

export const manifest = validateCartridge3DManifest({
  id: 'devourer-slime',
  title: 'Devourer Slime',
  description: 'Eat the word bubbles of each sentence in order; grow with every right word and swallow the guards.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['folk',  'outdoor-props'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'devourerSlime.briefing',
});
