import type { RpgCosmeticId } from "@reading-advantage/game-contracts";

import type { RpgRewardAssetUrls } from "./rpg-reward-panel.js";
import { STANDARD_GAME_REQUIRED_CREDIT } from "./standard-game-experience.js";

const RPG_REWARD_ASSET_ROOT = "/assets/apk/standard-pack-qc";

/** Public filenames for the three reviewed ElvGames staff icons. */
export const RPG_REWARD_ASSET_PATHS: Readonly<Record<RpgCosmeticId, string>> = Object.freeze({
  "apprentice-wand": `${RPG_REWARD_ASSET_ROOT}/rpg-apprentice-wand.png`,
  "graveyard-staff": `${RPG_REWARD_ASSET_ROOT}/rpg-graveyard-staff.png`,
  "echo-staff": `${RPG_REWARD_ASSET_ROOT}/rpg-echo-staff.png`,
} satisfies Readonly<Record<RpgCosmeticId, string>>);

/** Credit required when a host displays the reviewed reward icons. */
export const RPG_REWARD_REQUIRED_CREDIT: typeof STANDARD_GAME_REQUIRED_CREDIT = STANDARD_GAME_REQUIRED_CREDIT;

/**
 * Resolves reviewed reward icon URLs for a host base path.
 * @param basePath Optional host path prefix, such as `/reading`.
 * @returns The three host-ready reward icon URLs.
 */
export function resolveRpgRewardAssetUrls(basePath = ""): RpgRewardAssetUrls {
  const prefix = basePath === "/" ? "" : basePath.replace(/\/$/, "");
  return Object.freeze({
    "apprentice-wand": `${prefix}${RPG_REWARD_ASSET_PATHS["apprentice-wand"]}`,
    "graveyard-staff": `${prefix}${RPG_REWARD_ASSET_PATHS["graveyard-staff"]}`,
    "echo-staff": `${prefix}${RPG_REWARD_ASSET_PATHS["echo-staff"]}`,
  });
}
