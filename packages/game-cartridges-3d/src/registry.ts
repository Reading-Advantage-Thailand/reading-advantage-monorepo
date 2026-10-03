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
import { manifest as hauntedLibrary } from './haunted-library/manifest.js';
import hauntedLibraryStrings from './haunted-library/strings.en.js';
import { manifest as shadowGateDungeon } from './shadow-gate-dungeon/manifest.js';
import shadowGateDungeonStrings from './shadow-gate-dungeon/strings.en.js';
import { manifest as realmCarver } from './realm-carver/manifest.js';
import realmCarverStrings from './realm-carver/strings.en.js';
import { manifest as alchemistsSynthesis } from './alchemists-synthesis/manifest.js';
import alchemistsSynthesisStrings from './alchemists-synthesis/strings.en.js';
import { manifest as enchantedLibrary } from './enchanted-library/manifest.js';
import enchantedLibraryStrings from './enchanted-library/strings.en.js';
import { manifest as gryphonPatrol } from './gryphon-patrol/manifest.js';
import gryphonPatrolStrings from './gryphon-patrol/strings.en.js';
import { manifest as magicDefense } from './magic-defense/manifest.js';
import magicDefenseStrings from './magic-defense/strings.en.js';
import { manifest as griffinSkyJoust } from './griffin-sky-joust/manifest.js';
import griffinSkyJoustStrings from './griffin-sky-joust/strings.en.js';
import { manifest as abyssalWell } from './abyssal-well/manifest.js';
import abyssalWellStrings from './abyssal-well/strings.en.js';
import { manifest as runeForgeChamber } from './rune-forge-chamber/manifest.js';
import runeForgeChamberStrings from './rune-forge-chamber/strings.en.js';
import { manifest as dragonRider } from './dragon-rider/manifest.js';
import dragonRiderStrings from './dragon-rider/strings.en.js';
import { manifest as griffinRidersEscape } from './griffin-riders-escape/manifest.js';
import griffinRidersEscapeStrings from './griffin-riders-escape/strings.en.js';
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
  {
    id: 'haunted-library',
    icon: '📚',
    tint: ['#4b3a73', '#1e1535'],
    titleKey: 'hauntedLibrary.title',
    pitchKey: 'hauntedLibrary.pitch',
    manifest: hauntedLibrary,
    load: () => import('./haunted-library/index.js').then((m) => m.cartridge),
  },
  {
    id: 'shadow-gate-dungeon',
    icon: '🔮',
    tint: ['#a78bfa', '#312e81'],
    titleKey: 'shadowGateDungeon.title',
    pitchKey: 'shadowGateDungeon.pitch',
    manifest: shadowGateDungeon,
    load: () => import('./shadow-gate-dungeon/index.js').then((m) => m.cartridge),
  },
  {
    id: 'realm-carver',
    icon: '🗺️',
    tint: ['#a78bfa', '#4c1d95'],
    titleKey: 'realmCarver.title',
    pitchKey: 'realmCarver.pitch',
    manifest: realmCarver,
    load: () => import('./realm-carver/index.js').then((m) => m.cartridge),
  },
  {
    id: 'alchemists-synthesis',
    icon: '🧪',
    tint: ['#ffb454', '#7c4a12'],
    titleKey: 'alchemistsSynthesis.title',
    pitchKey: 'alchemistsSynthesis.pitch',
    manifest: alchemistsSynthesis,
    load: () => import('./alchemists-synthesis/index.js').then((m) => m.cartridge),
  },
  {
    id: 'enchanted-library',
    icon: '📖',
    tint: ['#7c3aed', '#1e1535'],
    titleKey: 'enchantedLibrary.title',
    pitchKey: 'enchantedLibrary.pitch',
    manifest: enchantedLibrary,
    load: () => import('./enchanted-library/index.js').then((m) => m.cartridge),
  },
  {
    id: 'gryphon-patrol',
    icon: '🦅',
    tint: ['#f5b942', '#7c4a12'],
    titleKey: 'gryphonPatrol.title',
    pitchKey: 'gryphonPatrol.pitch',
    manifest: gryphonPatrol,
    load: () => import('./gryphon-patrol/index.js').then((m) => m.cartridge),
  },
  {
    id: 'magic-defense',
    icon: '🏰',
    tint: ['#a78bfa', '#312e81'],
    titleKey: 'magicDefense.title',
    pitchKey: 'magicDefense.pitch',
    manifest: magicDefense,
    load: () => import('./magic-defense/index.js').then((m) => m.cartridge),
  },
  {
    id: 'griffin-sky-joust',
    icon: '🦅',
    tint: ['#8fd0f5', '#1e4a7a'],
    titleKey: 'griffinSkyJoust.title',
    pitchKey: 'griffinSkyJoust.pitch',
    manifest: griffinSkyJoust,
    load: () => import('./griffin-sky-joust/index.js').then((m) => m.cartridge),
  },
  {
    id: 'abyssal-well',
    icon: '🕳️',
    tint: ['#1e3a5f', '#0b1a2e'],
    titleKey: 'abyssalWell.title',
    pitchKey: 'abyssalWell.pitch',
    manifest: abyssalWell,
    load: () => import('./abyssal-well/index.js').then((m) => m.cartridge),
  },
  {
    id: 'rune-forge-chamber',
    icon: '🔨',
    tint: ['#f97316', '#7c2d12'],
    titleKey: 'runeForgeChamber.title',
    pitchKey: 'runeForgeChamber.pitch',
    manifest: runeForgeChamber,
    load: () => import('./rune-forge-chamber/index.js').then((m) => m.cartridge),
  },
  {
    id: 'dragon-rider',
    icon: '🐲',
    tint: ['#a78bfa', '#4c1d95'],
    titleKey: 'dragonRider.title',
    pitchKey: 'dragonRider.pitch',
    manifest: dragonRider,
    load: () => import('./dragon-rider/index.js').then((m) => m.cartridge),
  },
  {
    id: 'griffin-riders-escape',
    icon: '🦅',
    tint: ['#f5b942', '#7c4a12'],
    titleKey: 'griffinRidersEscape.title',
    pitchKey: 'griffinRidersEscape.pitch',
    manifest: griffinRidersEscape,
    load: () => import('./griffin-riders-escape/index.js').then((m) => m.cartridge),
  },
];

/** The English catalogs of every game (the host merges them with its own). */
export const GAME_STRINGS = [monsterEncountersStrings, runeMatchStrings, labyrinthStrings, potionRushStrings, dragonFlightStrings, dungeonLiberatorStrings, devourerSlimeStrings, heroVsZombieStrings, rpgBattleStrings, paladinsTwinSoulStrings, villageGuardianStrings, archersRevengeStrings, astralMageStrings, spellweaversRunStrings, hauntedLibraryStrings, shadowGateDungeonStrings, realmCarverStrings, alchemistsSynthesisStrings, enchantedLibraryStrings, gryphonPatrolStrings, magicDefenseStrings, griffinSkyJoustStrings, abyssalWellStrings, runeForgeChamberStrings, dragonRiderStrings, griffinRidersEscapeStrings];

export const playable = (g: GameEntry): boolean => !!g.load && !!g.manifest;

/** A playable game fits a story when the story has the game's level and enough items. */
export function fits(g: GameEntry, story: StoryInput | null): boolean {
  if (!playable(g)) return false;
  return !story || isCompatible(g.manifest!, story);
}

export const gameById = (id: string): GameEntry | undefined => GAMES.find((g) => g.id === id);
