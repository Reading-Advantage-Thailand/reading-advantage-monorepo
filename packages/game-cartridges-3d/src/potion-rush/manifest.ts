/**
 * The Potion Rush 3D cartridge manifest (section 2.1 of docs/apk3d-cartridge.md).
 *
 * `inputMode` is 'practice': the host passes the whole `PracticeInput`, and the evidence needs the
 * sentence ids, the paragraphs, the story id, and the level. The core also accepts the APK
 * `SentenceInput` (section 5.2 of the design), so the APK port can switch this to 'sentence'.
 *
 * `requiredAssetBindings` lists the 2D view's files of the `primary-chibi-2d` sprite pack (the key
 * of each binding is its file id); the 3D view loads its models by path until model packs land.
 */
import { APK3D_CAPABILITIES, CARTRIDGE_3D_RUNTIME_API_VERSION, validateCartridge3DManifest } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The heroes a student may play (the alchemist) and the clips the 2D view plays on them. */
export const HEROES_2D = ['knight', 'wizard', 'cleric'] as const;
export const HERO_CLIPS_2D = ['idle', 'walk', 'attack2', 'victory'] as const;

/** Each customer's clips in the 2D pack: walk in, wait, react to the mood, thank. */
export const CUSTOMER_CLIPS_2D: Readonly<Record<string, readonly string[]>> = {
  farmer: ['idle', 'walk', 'talk', 'wave'],
  villager: ['idle', 'walk', 'talk', 'wave'],
  innkeeper: ['idle', 'walk', 'talk', 'wave'],
  guard: ['idle', 'walk', 'salute'],
  druid: ['idle', 'walk', 'victory'],
  'orc-warrior': ['idle', 'walk', 'roar'],
  'goblin-warrior': ['idle', 'walk', 'taunt'],
  skeleton: ['idle', 'walk'],
};

export const INGREDIENTS_2D = ['bottle', 'mushroom', 'apple', 'pumpkin', 'crystal-cluster', 'bread'] as const;

/** Every 2D file the game uses: the baked shop, the heroes, the customers, the ingredients. */
export const FILES_2D: readonly string[] = [
  'background.potion-rush',
  ...HEROES_2D.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
  ...Object.entries(CUSTOMER_CLIPS_2D).flatMap(([kind, clips]) => clips.map((c) => `${kind}.${c}`)),
  ...INGREDIENTS_2D.map((k) => `prop.${k}`),
];

/** The models the 3D view loads, by Forge asset name: the keys of `RuntimeEdition3D.bindings` (docs/apk3d-cartridge.md section 7). */
export const MODELS_3D: readonly string[] = ['apple', 'barrel', 'bottle', 'bread', 'candle-cluster', 'cauldron', 'chandelier', 'cleric', 'counter', 'crate', 'crystal-cluster', 'druid', 'farmer', 'fireplace', 'goblin-warrior', 'guard', 'innkeeper', 'knight', 'lantern', 'mushroom', 'orc-warrior', 'plaster-wall', 'plaster-wall-door', 'plaster-wall-window', 'pumpkin', 'round-table', 'sack', 'shelf', 'skeleton', 'stool', 'villager', 'wizard', 'wood-floor'];

export const manifest = validateCartridge3DManifest({
  id: 'potion-rush',
  title: 'Potion Rush',
  description: 'Brew every sentence the customers order: drag the words into the cauldrons in order, then serve.',
  runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
  renderers: ['three', 'phaser'],
  inputMode: 'practice',
  simulation: 'realtime',
  orientation: 'portrait',
  levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
  needs: { sentences: 3 },
  requiredAssetBindings: [...FILES_2D],
  requiredModelBindings: [...MODELS_3D],
  packs: ['heroes',  'folk',  'potion-shop',  'dungeon-monsters'],
  capabilities: [...APK3D_CAPABILITIES],
  device: {},
  budget: { firstLoadBytes: 4_000_000, totalBytes: 8_000_000 },
  briefingKey: 'potionRush.briefing',
});
