/**
 * The Sorcerer's Ziggurat 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the input id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). The ziggurat is drawn, not baked. */
export const FILES_2D: readonly string[] = HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`));

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'altar', 'brazier', 'candle-cluster', 'cleric', 'crystal-cluster', 'floor', 'floor-cracked', 'knight', 'pillar', 'wizard',
];

export const manifest = validateCartridge3DManifest({
  id: 'sorcerer-ziggurat',
  title: "Sorcerer's Ziggurat",
  description: 'Climb the ziggurat one rune cube at a time, in the order of each sentence, and light the crystal at the top.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'turn',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'potion-shop', 'sunken-vault'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 3_000_000, totalBytes: 6_000_000 },
  briefingKey: 'sorcererZiggurat.briefing',
});
