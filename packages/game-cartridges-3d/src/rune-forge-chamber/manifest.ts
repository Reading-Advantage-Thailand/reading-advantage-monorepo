/**
 * The Rune Forge Chamber 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'story': the host passes the whole `StoryInput`, and the evidence needs the
 * sentence ids, the paragraphs, the story id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 *
 * `requiredAssetBindings` lists the 2D view's files of the `primary-chibi-2d` sprite pack (the key
 * of each binding is its file id); the forge floor and the anvil of the 2D view are drawn, not baked.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play (the smith) and the clips the 2D view plays on them. */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'attack', 'attack2', 'hit', 'victory'] as const;

/** The rune sprite of the 2D view (a glowing crystal of the pack). */
export const PROPS_2D = ['crystal-cluster'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...PROPS_2D.map((k) => `prop.${k}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'barrel', 'candle-cluster', 'cleric', 'crate', 'crystal-cluster', 'fireplace', 'knight', 'lantern', 'plaster-wall', 'plaster-wall-window', 'sack', 'shelf', 'wizard', 'wood-floor', 'workbench',
];

export const manifest = validateCartridge3DManifest({
  id: 'rune-forge-chamber',
  title: 'Rune Forge Chamber',
  description: 'Strike the orbiting word runes in the order of the sentence, and forge each blade.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'story',
  simulation: 'realtime',
  orientation: 'portrait',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'potion-shop'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'runeForgeChamber.briefing',
});
