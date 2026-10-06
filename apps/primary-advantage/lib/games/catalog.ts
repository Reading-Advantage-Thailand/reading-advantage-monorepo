import type { Cartridge3DManifest, ChallengeCapability } from "@reading-advantage/advantage-play-kit-3d/contracts";
import type { Cartridge } from "@reading-advantage/advantage-play-kit-3d/factory";
import { gameById, playable, type GameEntry } from "@reading-advantage/game-cartridges-3d";

/** A game with its manifest and its cartridge loader (the registry marks the others "coming soon"). */
export type PlayableGame = GameEntry & { manifest: Cartridge3DManifest; load: () => Promise<Cartridge> };

/**
 * The 2D catalog ids that the 3D games replaced under another name. Stored ids (quests, challenges,
 * completions) still use the old name until M2 of the legacy games removal; old links redirect.
 */
export const LEGACY_GAME_IDS: Readonly<Record<string, string>> = {
  "wizard-vs-zombie": "hero-vs-zombie",
  "labyrinth-goblin-king": "labyrinth",
};

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
