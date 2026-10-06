/**
 * The places of the Chibi Quest skin (docs/primary-rpg-skin.md §3): one Forge scene per page.
 * The backdrops are shipped under /rpg/backdrops as `<place>-p.webp` (1080x1920) and
 * `<place>-d.webp` (1920x1080).
 */
export const PLACES = [
  "guild-hall",
  "shrine",
  "treasure-vault",
  "armory",
  "boss-arena",
  "arena",
  "library",
  "clearing",
  "wizard-tower",
  "archive",
  "inn",
  "observatory",
  "gatehouse",
] as const;

/** A place of the skin. */
export type Place = (typeof PLACES)[number];

/**
 * The backdrop files of a place.
 * @param place The place.
 * @returns The phone and desktop WebP paths.
 */
export function backdropFiles(place: Place): { phone: string; desktop: string } {
  return { phone: `/rpg/backdrops/${place}-p.webp`, desktop: `/rpg/backdrops/${place}-d.webp` };
}

/** The Forge pictorials the chrome uses, by key. */
export const ART = {
  coin: "/rpg/kit/icons/coin.webp",
  purse: "/rpg/kit/icons/purse.webp",
  gem: "/rpg/kit/icons/gem.webp",
  chest: "/rpg/kit/icons/chest.webp",
  lockedChest: "/rpg/kit/icons/locked-chest.webp",
  scroll: "/rpg/kit/icons/scroll.webp",
  banner: "/rpg/kit/icons/banner.webp",
  campfire: "/rpg/kit/icons/campfire.webp",
  noticeBoard: "/rpg/kit/icons/notice-board.webp",
  shield: "/rpg/kit/relics/shield.webp",
  sharpBlade: "/rpg/kit/relics/sharp-blade.webp",
  rallyHorn: "/rpg/kit/relics/rally-horn.webp",
} as const;

/** The power-up relics. */
export const RELIC_ART = { shield: ART.shield, "sharp-blade": ART.sharpBlade, "rally-horn": ART.rallyHorn } as const;

/**
 * The icon of an avatar slot.
 * @param slot The slot id.
 * @returns The WebP path.
 */
export const slotArt = (slot: string): string => `/rpg/kit/icons/slot-${slot}.webp`;

/**
 * The front view of a boss by its Forge art key.
 * @param artKey The roster name (goblin-king, lich, dragon-fire, iron-golem).
 * @returns The WebP path.
 */
export const bossArt = (artKey: string): string => `/rpg/kit/boss/${artKey}-front.webp`;

/**
 * The Forge view of a catalog piece (the Forge build writes `/rpg/items/<id>.webp`); the item
 * icon falls back to the slot icon while the file is missing.
 * @param itemId The catalog id.
 * @returns The path under the public root.
 */
export const itemArt = (itemId: string): string => `/rpg/items/${itemId}.webp`;

/**
 * The Forge front view of a hero class in its starter look (`/rpg/kit/heroes/<classId>.webp`).
 * @param classId The hero class.
 * @returns The path under the public root.
 */
export const heroArt = (classId: string): string => `/rpg/kit/heroes/${classId}.webp`;

/** The Forge silhouette for a student who has not picked a hero yet (skin 1.1.0). */
export const NO_HERO_ART = "/rpg/kit/heroes/no-hero.webp";

/** The NPC sprite strips (8 frames at 128 px) and fronts. */
export const NPC_ART = {
  blacksmithIdle: "/rpg/kit/npc/blacksmith-idle-strip.png",
  blacksmithTalk: "/rpg/kit/npc/blacksmith-talk-strip.png",
  blacksmith: "/rpg/kit/npc/blacksmith-front.webp",
  questGiver: "/rpg/kit/npc/quest-giver-front.webp",
} as const;

/** The boss clips the Forge exports as 8-frame strips. */
export type BossClip = "idle" | "hit" | "death";

/**
 * The sprite strip of a boss clip (`/rpg/kit/boss/<artKey>-<clip>-strip.png`, 8 frames).
 * @param artKey The boss art key of the quest template.
 * @param clip The clip.
 * @returns The path under the public root.
 */
export const bossStrip = (artKey: string, clip: BossClip): string => `/rpg/kit/boss/${artKey}-${clip}-strip.png`;
