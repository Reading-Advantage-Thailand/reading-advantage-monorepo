/**
 * The games the selector shows. A playable game has its manifest (small, for the story rule) and
 * a lazy loader for its cartridge code, so each game downloads only when chosen. A game that is
 * not built yet shows as "coming soon".
 */
import { isCompatible, type Cartridge3DManifest, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Cartridge } from '@reading-advantage/advantage-play-kit-3d/factory';
import { manifest as monsterEncounters } from './monster-encounters/manifest.js';
import monsterEncountersStrings from './monster-encounters/strings.en.js';
import { manifest as rpgBattle } from './rpg-battle/manifest.js';
import rpgBattleStrings from './rpg-battle/strings.en.js';
import { manifest as paladinsTwinSoul } from './paladins-twin-soul/manifest.js';
import paladinsTwinSoulStrings from './paladins-twin-soul/strings.en.js';
import { manifest as villageGuardian } from './village-guardian/manifest.js';
import villageGuardianStrings from './village-guardian/strings.en.js';
import { manifest as archersRevenge } from './archers-revenge/manifest.js';
import archersRevengeStrings from './archers-revenge/strings.en.js';
import { manifest as astralMage } from './astral-mage/manifest.js';
import astralMageStrings from './astral-mage/strings.en.js';
import { manifest as spellweaversRun } from './spellweavers-run/manifest.js';
import spellweaversRunStrings from './spellweavers-run/strings.en.js';
import { manifest as runeMatch } from './rune-match/manifest.js';
import runeMatchStrings from './rune-match/strings.en.js';
import { manifest as labyrinth } from './labyrinth/manifest.js';
import labyrinthStrings from './labyrinth/strings.en.js';
import { manifest as potionRush } from './potion-rush/manifest.js';
import potionRushStrings from './potion-rush/strings.en.js';
import { manifest as dragonFlight } from './dragon-flight/manifest.js';
import dragonFlightStrings from './dragon-flight/strings.en.js';
import { manifest as dungeonLiberator } from './dungeon-liberator/manifest.js';
import dungeonLiberatorStrings from './dungeon-liberator/strings.en.js';
import { manifest as devourerSlime } from './devourer-slime/manifest.js';
import devourerSlimeStrings from './devourer-slime/strings.en.js';
import { manifest as heroVsZombie } from './hero-vs-zombie/manifest.js';
import heroVsZombieStrings from './hero-vs-zombie/strings.en.js';

export interface GameEntry {
  id: string;
  icon: string;
  /** Tile colors (top, bottom). */
  tint: [string, string];
  /** Catalog keys of the card text. */
  titleKey: string;
  pitchKey: string;
  manifest?: Cartridge3DManifest;
  load?: () => Promise<Cartridge>;
}

export const GAMES: GameEntry[] = [
  {
    id: 'monster-encounters',
    icon: '⚔️',
    tint: ['#8b5cf6', '#4c1d95'],
    titleKey: 'monsterEncounters.title',
    pitchKey: 'monsterEncounters.pitch',
    manifest: monsterEncounters,
    load: () => import('./monster-encounters/index.js').then((m) => m.cartridge),
  },
  {
    id: 'rune-match',
    icon: '🔮',
    tint: ['#a78bfa', '#4c1d95'],
    titleKey: 'runeMatch.title',
    pitchKey: 'runeMatch.pitch',
    manifest: runeMatch,
    load: () => import('./rune-match/index.js').then((m) => m.cartridge),
  },
  {
    id: 'labyrinth',
    icon: '🏰',
    tint: ['#f59e0b', '#78350f'],
    titleKey: 'labyrinth.title',
    pitchKey: 'labyrinth.pitch',
    manifest: labyrinth,
    load: () => import('./labyrinth/index.js').then((m) => m.cartridge),
  },
  {
    id: 'potion-rush',
    icon: '🧪',
    tint: ['#34d399', '#065f46'],
    titleKey: 'potionRush.title',
    pitchKey: 'potionRush.pitch',
    manifest: potionRush,
    load: () => import('./potion-rush/index.js').then((m) => m.cartridge),
  },
  {
    id: 'dragon-flight',
    icon: '🐉',
    tint: ['#fb923c', '#9a3412'],
    titleKey: 'dragonFlight.title',
    pitchKey: 'dragonFlight.pitch',
    manifest: dragonFlight,
    load: () => import('./dragon-flight/index.js').then((m) => m.cartridge),
  },
  {
    id: 'dungeon-liberator',
    icon: '🗝️',
    tint: ['#60a5fa', '#1e3a8a'],
    titleKey: 'dungeonLiberator.title',
    pitchKey: 'dungeonLiberator.pitch',
    manifest: dungeonLiberator,
    load: () => import('./dungeon-liberator/index.js').then((m) => m.cartridge),
  },
  {
    id: 'devourer-slime',
    icon: '🟢',
    tint: ['#a3e635', '#3f6212'],
    titleKey: 'devourerSlime.title',
    pitchKey: 'devourerSlime.pitch',
    manifest: devourerSlime,
    load: () => import('./devourer-slime/index.js').then((m) => m.cartridge),
  },
  {
    id: 'hero-vs-zombie',
    icon: '🧟',
    tint: ['#64748b', '#1e293b'],
    titleKey: 'heroVsZombie.title',
    pitchKey: 'heroVsZombie.pitch',
    manifest: heroVsZombie,
    load: () => import('./hero-vs-zombie/index.js').then((m) => m.cartridge),
  },
  {
    id: 'rpg-battle',
    icon: '🗡️',
    tint: ['#ef4444', '#7f1d1d'],
    titleKey: 'rpgBattle.title',
    pitchKey: 'rpgBattle.pitch',
    manifest: rpgBattle,
    load: () => import('./rpg-battle/index.js').then((m) => m.cartridge),
  },
  {
    id: 'paladins-twin-soul',
    icon: '👻',
    tint: ['#f59e0b', '#7c2d12'],
    titleKey: 'paladinsTwinSoul.title',
    pitchKey: 'paladinsTwinSoul.pitch',
    manifest: paladinsTwinSoul,
    load: () => import('./paladins-twin-soul/index.js').then((m) => m.cartridge),
  },
  {
    id: 'village-guardian',
    icon: '🛡️',
    tint: ['#86efac', '#166534'],
    titleKey: 'villageGuardian.title',
    pitchKey: 'villageGuardian.pitch',
    manifest: villageGuardian,
    load: () => import('./village-guardian/index.js').then((m) => m.cartridge),
  },
  {
    id: 'archers-revenge',
    icon: '🏹',
    tint: ['#22c55e', '#14532d'],
    titleKey: 'archersRevenge.title',
    pitchKey: 'archersRevenge.pitch',
    manifest: archersRevenge,
    load: () => import('./archers-revenge/index.js').then((m) => m.cartridge),
  },
  {
    id: 'astral-mage',
    icon: '🔮',
    tint: ['#c4b5fd', '#4c1d95'],
    titleKey: 'astralMage.title',
    pitchKey: 'astralMage.pitch',
    manifest: astralMage,
    load: () => import('./astral-mage/index.js').then((m) => m.cartridge),
  },
  {
    id: 'spellweavers-run',
    icon: '🪄',
    tint: ['#a78bfa', '#4c1d95'],
    titleKey: 'spellweaversRun.title',
    pitchKey: 'spellweaversRun.pitch',
    manifest: spellweaversRun,
    load: () => import('./spellweavers-run/index.js').then((m) => m.cartridge),
  },
];

/** The English catalogs of every game (the host merges them with its own). */
export const GAME_STRINGS = [monsterEncountersStrings, runeMatchStrings, labyrinthStrings, potionRushStrings, dragonFlightStrings, dungeonLiberatorStrings, devourerSlimeStrings, heroVsZombieStrings, rpgBattleStrings, paladinsTwinSoulStrings, villageGuardianStrings, archersRevengeStrings, astralMageStrings, spellweaversRunStrings];

export const playable = (g: GameEntry): boolean => !!g.load && !!g.manifest;

/** A playable game fits a story when the story has the game's level and enough items. */
export function fits(g: GameEntry, story: StoryInput | null): boolean {
  if (!playable(g)) return false;
  return !story || isCompatible(g.manifest!, story);
}

export const gameById = (id: string): GameEntry | undefined => GAMES.find((g) => g.id === id);
