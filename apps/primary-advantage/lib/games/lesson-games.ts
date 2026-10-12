import { bossStrip } from "@/lib/rpg/places";

/** The vocabulary games of lesson task 10 (the legacy four; Member Question 2 default). */
export const LESSON_VOCABULARY_GAMES = ["rpg-battle", "rune-match", "dragon-rider", "enchanted-library"] as const;

/** The sentence games of lesson task 12 (Tutor's two playable sentence games). */
export const LESSON_SENTENCE_GAMES = ["castle-defense", "potion-rush"] as const;

/**
 * The stand-in picture of each lesson game: a Forge sprite strip from the skin kit, until Forge
 * ships one object render for each cartridge. Every strip is a Forge asset under `public/rpg`.
 */
export const LESSON_GAME_SPRITES: Readonly<Record<string, string>> = {
  "rpg-battle": bossStrip("goblin-king", "idle"),
  "rune-match": bossStrip("lich", "idle"),
  "dragon-rider": bossStrip("dragon-fire", "idle"),
  "enchanted-library": "/rpg/kit/npc/quest-giver-idle-strip.png",
  "castle-defense": bossStrip("iron-golem", "idle"),
  "potion-rush": "/rpg/kit/npc/shopkeeper-idle-strip.png",
};
