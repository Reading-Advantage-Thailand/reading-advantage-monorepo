import type { Cartridge3DManifest, ChallengeCapability } from "@reading-advantage/advantage-play-kit-3d/contracts";
import type { Cartridge } from "@reading-advantage/advantage-play-kit-3d/factory";
import { GAMES, gameById, playable, type GameEntry } from "@reading-advantage/game-cartridges-3d";

/** A game with its manifest and its cartridge loader (the registry marks the others "coming soon"). */
export type PlayableGame = GameEntry & { manifest: Cartridge3DManifest; load: () => Promise<Cartridge> };

/**
 * The 2D catalog ids that the 3D games replaced under another name. Old links redirect, and rows
 * stored before 2026-10-06 (challenges, completions) still carry the old name.
 */
export const LEGACY_GAME_IDS: Readonly<Record<string, string>> = {
  "wizard-vs-zombie": "hero-vs-zombie",
  "labyrinth-goblin-king": "labyrinth",
};

/** The ids of the old game URLs `/student/games/<group>/<id>`, by group. Each id is also a 3D game id. */
export const OLD_GAME_PATHS: Readonly<Record<"vocabulary" | "sentences", readonly string[]>> = {
  vocabulary: ["dragon-rider", "enchanted-library", "rpg-battle", "rune-match"],
  sentences: ["potion-rush"],
};

/**
 * Maps an old game URL to the 3D game route with the same name.
 * @param group The path group of the old URL, `vocabulary` or `sentences`.
 * @param id The game id of the old URL.
 * @returns The route without the locale, or undefined when the old list has no such game.
 */
export function oldGameTarget(group: string, id: string): string | undefined {
  const ids: readonly string[] | undefined = Object.hasOwn(OLD_GAME_PATHS, group) ? OLD_GAME_PATHS[group as keyof typeof OLD_GAME_PATHS] : undefined;
  return ids?.includes(id) ? `/student/games/apk/${id}` : undefined;
}

/**
 * Finds the playable 3D game for a game id or a legacy 2D catalog id.
 * @param id The game id from a route, a quest template, or a challenge.
 * @returns The game, or undefined when no playable game has that id.
 */
export function gameFor(id: string): PlayableGame | undefined {
  const game = gameById(LEGACY_GAME_IDS[id] ?? id);
  return game && playable(game) ? (game as PlayableGame) : undefined;
}

/**
 * The class challenge capability a game declares in its manifest.
 * @param gameId The game id or a legacy id.
 * @returns The capability, or undefined when the game runs no class challenge.
 */
export const challengeCapabilityOf = (gameId: string): ChallengeCapability | undefined => gameFor(gameId)?.manifest.challenge;

/** The translation language of the saved items: the page language, or Thai on an English page. */
export const practiceLocaleOf = (locale: string): string => (["th", "cn", "tw", "vi"].includes(locale) ? locale : "th");

/** The playable games, in registry order. */
export const playableGames = (): PlayableGame[] => GAMES.filter((g): g is PlayableGame => playable(g));

/** True for a game that plays sentences more than words (the catalog's "sentence games" group). */
export const isSentenceGame = (game: PlayableGame): boolean =>
  game.manifest.inputMode === "sentence" || game.manifest.needs.sentences > game.manifest.needs.vocabulary;

/**
 * The games that run a class challenge, for the teacher and student challenge panels.
 * @returns Game id to its title and challenge version.
 */
export const challengeGames = (): Record<string, { title: string; version: string }> =>
  Object.fromEntries(playableGames().flatMap((g) => (g.manifest.challenge ? [[g.id, { title: g.manifest.title, version: g.manifest.challenge.version }]] : [])));
