/**
 * Every game's 3D edition binds every model its views name: the manifest lists the keys
 * (`requiredModelBindings`) and the packs (`packs`), and the host builds the edition from them.
 * A key no pack holds would fall back to the legacy `models/` path, so this test fails first.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { editionModelIndex, GAME_LOADS, modelEditionOf, MODEL_PACK_VERSION, modelPackSchema, unboundModelKeys, type ModelPack } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { manifest as devourerSlime } from '../../src/devourer-slime/manifest.js';
import { CLEARING_MODELS } from '../../src/devourer-slime/view/clearing.js';
import { manifest as dragonFlight } from '../../src/dragon-flight/manifest.js';
import { FLIGHT_MODELS } from '../../src/dragon-flight/view/land.js';
import { manifest as dungeonLiberator } from '../../src/dungeon-liberator/manifest.js';
import { ROOM_MODELS } from '../../src/dungeon-liberator/view/room.js';
import { manifest as heroVsZombie } from '../../src/hero-vs-zombie/manifest.js';
import { CHURCHYARD_MODELS } from '../../src/hero-vs-zombie/view/churchyard.js';
import { manifest as labyrinth } from '../../src/labyrinth/manifest.js';
import { MAZE_MODELS } from '../../src/labyrinth/view/maze.js';
import { manifest as paladinsTwinSoul } from '../../src/paladins-twin-soul/manifest.js';
import { manifest as rpgBattle } from '../../src/rpg-battle/manifest.js';
import { manifest as villageGuardian } from '../../src/village-guardian/manifest.js';
import { VILLAGE_MODELS } from '../../src/village-guardian/view/village.js';
import { manifest as monsterEncounters } from '../../src/monster-encounters/manifest.js';
import { manifest as runeMatch } from '../../src/rune-match/manifest.js';
import { manifest as potionRush } from '../../src/potion-rush/manifest.js';
import { SHOP_MODELS } from '../../src/potion-rush/view/shop.js';
import { HEROES } from '../../src/shared/battle/stage2d.js';
import { vaultModels } from '../../src/shared/battle/stage3d.js';
import { LOBBY_PACKS } from '../../src/lobby-packs.js';

const readPack = (id: string): ModelPack => modelPackSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'assets', 'packs', id, MODEL_PACK_VERSION, 'pack.json'), 'utf8')));
const packsOf = (ids: readonly string[]): Record<string, ModelPack> => Object.fromEntries(ids.map((id) => [id, readPack(id)]));

/** Each game: its manifest and every model its views name. */
const GAMES = {
  labyrinth: { manifest: labyrinth, named: MAZE_MODELS },
  'potion-rush': { manifest: potionRush, named: SHOP_MODELS },
  'dragon-flight': { manifest: dragonFlight, named: FLIGHT_MODELS },
  'dungeon-liberator': { manifest: dungeonLiberator, named: ROOM_MODELS },
  'devourer-slime': { manifest: devourerSlime, named: CLEARING_MODELS },
  'hero-vs-zombie': { manifest: heroVsZombie, named: CHURCHYARD_MODELS },
  'monster-encounters': { manifest: monsterEncounters, named: vaultModels() },
  'village-guardian': { manifest: villageGuardian, named: VILLAGE_MODELS },
  'rpg-battle': { manifest: rpgBattle, named: vaultModels() },
  'paladins-twin-soul': { manifest: paladinsTwinSoul, named: vaultModels() },
  'rune-match': { manifest: runeMatch, named: vaultModels() },
} as const;

describe('3D editions', () => {
  it.each(Object.entries(GAMES))('%s: the manifest lists every model the game names', (game, { manifest, named }) => {
    const load = GAME_LOADS[game]!;
    const wanted = new Set([...named, ...(load.models ?? []), ...(load.hero ? HEROES : [])]);
    expect([...wanted].filter((n) => !manifest.requiredModelBindings.includes(n))).toEqual([]);
  });

  it.each(Object.entries(GAMES))('%s: the edition binds every required model from the listed packs', (_game, { manifest }) => {
    const edition = modelEditionOf(packsOf(manifest.packs), manifest.requiredModelBindings);
    expect(unboundModelKeys(edition, manifest.requiredModelBindings)).toEqual([]);
    expect(Object.keys(edition.packs).every((id) => manifest.packs.includes(id))).toBe(true);
    const index = editionModelIndex(edition);
    expect(manifest.requiredModelBindings.filter((k) => !index.path(k))).toEqual([]);
  });

  it('the lobby packs hold the heroes and the brazier', () => {
    const edition = modelEditionOf(packsOf(LOBBY_PACKS), [...HEROES, 'brazier']);
    expect(editionModelIndex(edition).path('brazier')).toMatch(/^packs\/sunken-vault\/1\.0\.0\/brazier\.glb$/);
  });
});
