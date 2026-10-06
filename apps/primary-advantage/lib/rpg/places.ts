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
