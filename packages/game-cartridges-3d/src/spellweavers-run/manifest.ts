/**
 * The Spellweaver's Run 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'story': the host passes the whole `StoryInput`, and the evidence needs the
 * sentence ids, the paragraphs, the story id, and the level. The core also accepts the APK
 * `SentenceInput`, so the APK port can switch this to 'sentence'.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play and the clips the 2D view plays (files of `primary-chibi-2d`). */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'run', 'hit', 'victory'] as const;
/** The props the 2D view places beside the road, and the arch of the portal. */
export const ROAD_PROPS_2D = ['arch', 'oak-tree', 'pine-tree', 'bush', 'fern', 'wildflowers', 'boulder', 'rock-cluster'] as const;

/** Every 2D file the game uses (`requiredAssetBindings`: binding key = file id). */
export const FILES_2D: readonly string[] = [
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...ROAD_PROPS_2D.map((p) => `prop.${p}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = [
  'ancient-oak', 'arch', 'boulder', 'bush', 'cleric', 'fern', 'forest-ground', 'gate', 'grass-ground', 'knight', 'oak-tree', 'pine-tree', 'rock-cluster', 'wildflowers', 'wizard',
];

export const manifest = validateCartridge3DManifest({
  id: 'spellweavers-run',
  title: "Spellweaver's Run",
  description: 'Run the spell road and pick the glowing orb with the next word of the sentence, in order, to cast the whole sentence.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'story',
  simulation: 'realtime',
  orientation: 'any',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes', 'outdoor-props', 'flight-land', 'sunken-vault'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'spellweaversRun.briefing',
});
