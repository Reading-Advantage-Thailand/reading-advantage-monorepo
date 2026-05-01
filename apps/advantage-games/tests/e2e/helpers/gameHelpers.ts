import { expect, type Page } from "@playwright/test";

import {
  ABYSSAL_WELL_GAME_PATH,
  ABYSSAL_WELL_SAMPLE_SENTENCES,
  ARCHERS_REVENGE_GAME_PATH,
  ARCHERS_REVENGE_SAMPLE_VOCABULARY,
  CASTLE_DEFENSE_GAME_PATH,
  CASTLE_DEFENSE_SAMPLE_SENTENCES,
  DEVOURER_SLIME_GAME_PATH,
  DEVOURER_SLIME_SAMPLE_SENTENCES,
  DRAGON_FLIGHT_GAME_PATH,
  DRAGON_FLIGHT_SAMPLE_VOCABULARY,
  DRAGON_RIDER_GAME_PATH,
  DRAGON_RIDER_SAMPLE_VOCABULARY,
  DUNGEON_LIBERATOR_GAME_PATH,
  DUNGEON_LIBERATOR_SAMPLE_SENTENCES,
  ENCHANTED_LIBRARY_GAME_PATH,
  ENCHANTED_LIBRARY_SAMPLE_VOCABULARY,
  GRIFFIN_RIDERS_ESCAPE_GAME_PATH,
  GRIFFIN_RIDERS_ESCAPE_SAMPLE_SENTENCES,
  GRIFFIN_SKY_JOUST_GAME_PATH,
  GRIFFIN_SKY_JOUST_SAMPLE_SENTENCES,
  GRYPHON_PATROL_GAME_PATH,
  GRYPHON_PATROL_SAMPLE_SENTENCES,
  HAUNTED_LIBRARY_GAME_PATH,
  HAUNTED_LIBRARY_SAMPLE_SENTENCES,
  LABYRINTH_GOBLIN_KING_GAME_PATH,
  LABYRINTH_GOBLIN_KING_SAMPLE_SENTENCES,
  MAGIC_DEFENSE_GAME_PATH,
  MAGIC_DEFENSE_SAMPLE_VOCABULARY,
  PALADINS_TWIN_SOUL_GAME_PATH,
  PALADINS_TWIN_SOUL_SAMPLE_VOCABULARY,
  POTION_RUSH_GAME_PATH,
  POTION_RUSH_SAMPLE_SENTENCES,
  REALM_CARVER_GAME_PATH,
  REALM_CARVER_SAMPLE_SENTENCES,
  RUNE_FORGE_CHAMBER_GAME_PATH,
  RUNE_FORGE_CHAMBER_SAMPLE_SENTENCES,
  RPG_BATTLE_GAME_PATH,
  RPG_BATTLE_SAMPLE_VOCABULARY,
  RUNE_MATCH_GAME_PATH,
  RUNE_MATCH_SAMPLE_VOCABULARY,
  SHADOW_GATE_DUNGEON_GAME_PATH,
  SHADOW_GATE_DUNGEON_SAMPLE_SENTENCES,
  SPELLWEAVERS_RUN_GAME_PATH,
  SPELLWEAVERS_RUN_SAMPLE_SENTENCES,
  STORM_CASTLE_TOWER_GAME_PATH,
  STORM_CASTLE_TOWER_SAMPLE_SENTENCES,
  VILLAGE_GUARDIAN_GAME_PATH,
  VILLAGE_GUARDIAN_SAMPLE_SENTENCES,
  WIZARD_VS_ZOMBIE_GAME_PATH,
  WIZARD_VS_ZOMBIE_SAMPLE_VOCABULARY,
} from "../fixtures/gameFixtures";

type ApiResponse = {
  status: number;
  message: string;
  vocabulary?: unknown[];
  xpEarned?: number;
  activityId?: string;
};

export async function mockArchersRevengeApis(
  page: Page,
  vocabulary = ARCHERS_REVENGE_SAMPLE_VOCABULARY
) {
  await page.route("**/api/v1/games/archers-revenge/vocabulary", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("**/api/v1/games/archers-revenge/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function expectArchersRevengeStartScreen(page: Page) {
  await expect(page.getByText(/loading vocabulary/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /draw your bow/i })).toBeVisible();
}

export function getArchersRevengeUrl() {
  return ARCHERS_REVENGE_GAME_PATH;
}

export async function mockDragonFlightApis(
  page: Page,
  vocabulary = DRAGON_FLIGHT_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/dragon-flight/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/dragon-flight/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function expectDragonFlightStartScreen(page: Page) {
  await expect(page.getByRole("button", { name: /start game/i })).toBeVisible({ timeout: 15000 });
}

export function getDragonFlightUrl() {
  return DRAGON_FLIGHT_GAME_PATH;
}

export async function mockDragonRiderApis(
  page: Page,
  vocabulary = DRAGON_RIDER_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/dragon-rider/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/dragon-rider/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function expectDragonRiderStartScreen(page: Page) {
  await expect(page.getByRole("button", { name: /start adventure/i })).toBeVisible({ timeout: 15000 });
}

export function getDragonRiderUrl() {
  return DRAGON_RIDER_GAME_PATH;
}

export async function mockEnchantedLibraryApis(
  page: Page,
  vocabulary = ENCHANTED_LIBRARY_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/enchanted-library/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/enchanted-library/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/enchanted-library/ranking", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rankings: { easy: [], normal: [], hard: [], extreme: [] } }),
    });
  });
}

export async function expectEnchantedLibraryStartScreen(page: Page) {
  await expect(page.getByText(/Enchanted Library/i)).toBeVisible({ timeout: 15000 });
}

export function getEnchantedLibraryUrl() {
  return ENCHANTED_LIBRARY_GAME_PATH;
}

export async function mockMagicDefenseApis(
  page: Page,
  vocabulary = MAGIC_DEFENSE_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/magic-defense/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/magic-defense/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function expectMagicDefenseStartScreen(page: Page) {
  await expect(page.getByText(/Magic Defense/i)).toBeVisible({ timeout: 15000 });
}

export function getMagicDefenseUrl() {
  return MAGIC_DEFENSE_GAME_PATH;
}

export async function mockPaladinsTwinSoulApis(
  page: Page,
  vocabulary = PALADINS_TWIN_SOUL_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/paladins-twin-soul/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/paladins-twin-soul/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function expectPaladinsTwinSoulStartScreen(page: Page) {
  await expect(page.getByText(/Paladin/i)).toBeVisible({ timeout: 15000 });
}

export function getPaladinsTwinSoulUrl() {
  return PALADINS_TWIN_SOUL_GAME_PATH;
}

export async function mockRPGBattleApis(
  page: Page,
  vocabulary = RPG_BATTLE_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/rpg-battle/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/rpg-battle/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/rpg-battle/ranking", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rankings: { goblin: [], orc: [], dragon: [], demon: [] } }),
    });
  });
}

export async function expectRPGBattleStartScreen(page: Page) {
  await expect(page.getByText(/RPG Battle/i)).toBeVisible({ timeout: 15000 });
}

export function getRPGBattleUrl() {
  return RPG_BATTLE_GAME_PATH;
}

export async function mockRuneMatchApis(
  page: Page,
  vocabulary = RUNE_MATCH_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/rune-match/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("/api/v1/games/rune-match/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function expectRuneMatchStartScreen(page: Page) {
  await expect(page.getByText(/Rune Match/i)).toBeVisible({ timeout: 15000 });
}

export function getRuneMatchUrl() {
  return RUNE_MATCH_GAME_PATH;
}

// WIZARD_VS_ZOMBIE
export async function mockWizardVsZombieApis(
  page: Page,
  vocabulary = WIZARD_VS_ZOMBIE_SAMPLE_VOCABULARY
) {
  await page.route("/api/v1/games/wizard-vs-zombie/vocabulary", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Vocabulary retrieved successfully",
      vocabulary,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/wizard-vs-zombie/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectWizardVsZombieStartScreen(page: Page) {
  await expect(page.getByText(/Wizard/i)).toBeVisible({ timeout: 15000 });
}
export function getWizardVsZombieUrl() {
  return WIZARD_VS_ZOMBIE_GAME_PATH;
}

// ABYSSAL_WELL (Sentence Game)
export async function mockAbyssalWellApis(
  page: Page,
  sentences = ABYSSAL_WELL_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/abyssal-well/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/abyssal-well/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectAbyssalWellStartScreen(page: Page) {
  await expect(page.getByText(/Abyssal/i)).toBeVisible({ timeout: 15000 });
}
export function getAbyssalWellUrl() {
  return ABYSSAL_WELL_GAME_PATH;
}

// CASTLE_DEFENSE (Sentence Game)
export async function mockCastleDefenseApis(
  page: Page,
  sentences = CASTLE_DEFENSE_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/castle-defense/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/castle-defense/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectCastleDefenseStartScreen(page: Page) {
  await expect(page.getByText(/Castle/i)).toBeVisible({ timeout: 15000 });
}
export function getCastleDefenseUrl() {
  return CASTLE_DEFENSE_GAME_PATH;
}

// DEVOURER_SLIME (Sentence Game)
export async function mockDevourerSlimeApis(
  page: Page,
  sentences = DEVOURER_SLIME_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/devourer-slime/sentences**", async (route) => {
    const response = {
      status: 200,
      message: "Sentences retrieved successfully",
      sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/devourer-slime/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectDevourerSlimeStartScreen(page: Page) {
  await expect(page.getByText(/Devourer|Slime/i)).toBeVisible({ timeout: 15000 });
}
export function getDevourerSlimeUrl() {
  return DEVOURER_SLIME_GAME_PATH;
}

// DUNGEON_LIBERATOR (Sentence Game)
export async function mockDungeonLiberatorApis(
  page: Page,
  sentences = DUNGEON_LIBERATOR_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/dungeon-liberator/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/dungeon-liberator/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectDungeonLiberatorStartScreen(page: Page) {
  await expect(page.getByText(/Dungeon|Liberator/i)).toBeVisible({ timeout: 15000 });
}
export function getDungeonLiberatorUrl() {
  return DUNGEON_LIBERATOR_GAME_PATH;
}

// GRIFFIN_RIDERS_ESCAPE (Sentence Game)
export async function mockGriffinRidersEscapeApis(
  page: Page,
  sentences = GRIFFIN_RIDERS_ESCAPE_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/griffin-riders-escape/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/griffin-riders-escape/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectGriffinRidersEscapeStartScreen(page: Page) {
  await expect(page.getByText(/Griffin|Rider/i)).toBeVisible({ timeout: 15000 });
}
export function getGriffinRidersEscapeUrl() {
  return GRIFFIN_RIDERS_ESCAPE_GAME_PATH;
}

// GRIFFIN_SKY_JOUST (Sentence Game)
export async function mockGriffinSkyJoustApis(
  page: Page,
  sentences = GRIFFIN_SKY_JOUST_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/griffin-sky-joust/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/griffin-sky-joust/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectGriffinSkyJoustStartScreen(page: Page) {
  await expect(page.getByText(/Griffin|Joust/i)).toBeVisible({ timeout: 15000 });
}
export function getGriffinSkyJoustUrl() {
  return GRIFFIN_SKY_JOUST_GAME_PATH;
}

// GRYPHON_PATROL (Sentence Game)
export async function mockGryphonPatrolApis(
  page: Page,
  sentences = GRYPHON_PATROL_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/gryphon-patrol/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/gryphon-patrol/ranking", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rankings: { easy: [], normal: [], hard: [], extreme: [] } }),
    });
  });
  await page.route("/api/v1/games/gryphon-patrol/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectGryphonPatrolStartScreen(page: Page) {
  await expect(page.getByText(/Gryphon|Patrol/i)).toBeVisible({ timeout: 15000 });
}
export function getGryphonPatrolUrl() {
  return GRYPHON_PATROL_GAME_PATH;
}

// HAUNTED_LIBRARY (Sentence Game)
export async function mockHauntedLibraryApis(
  page: Page,
  sentences = HAUNTED_LIBRARY_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/haunted-library/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/haunted-library/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectHauntedLibraryStartScreen(page: Page) {
  await expect(page.getByText(/Haunted|Library/i)).toBeVisible({ timeout: 15000 });
}
export function getHauntedLibraryUrl() {
  return HAUNTED_LIBRARY_GAME_PATH;
}

// LABYRINTH_GOBLIN_KING (Sentence Game)
export async function mockLabyrinthGoblinKingApis(
  page: Page,
  sentences = LABYRINTH_GOBLIN_KING_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/labyrinth-goblin-king/sentences**", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Sentences retrieved successfully",
      vocabulary: sentences,
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/labyrinth-goblin-king/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectLabyrinthGoblinKingStartScreen(page: Page) {
  await expect(page.getByText(/Labyrinth|Goblin/i)).toBeVisible({ timeout: 15000 });
}
export function getLabyrinthGoblinKingUrl() {
  return LABYRINTH_GOBLIN_KING_GAME_PATH;
}

// POTION_RUSH (Sentence Game)
export async function mockPotionRushApis(
  page: Page,
  sentences = POTION_RUSH_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/potion-rush/sentences**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sentences,
        message: "Sentences retrieved successfully",
        status: 200,
      }),
    });
  });
  await page.route("/api/v1/games/potion-rush/ranking", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rankings: { easy: [], normal: [], hard: [], extreme: [] } }),
    });
  });
  await page.route("/api/v1/games/potion-rush/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectPotionRushStartScreen(page: Page) {
  await expect(page.getByRole("heading", { name: /potion rush/i }).first()).toBeVisible({ timeout: 15000 });
}
export function getPotionRushUrl() {
  return POTION_RUSH_GAME_PATH;
}

// REALM_CARVER (Sentence Game)
export async function mockRealmCarverApis(
  page: Page,
  sentences = REALM_CARVER_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/realm-carver/sentences**", async (route) => {
    const response = {
      status: 200,
      sentences: [{ text: "The cat sat on the mat", id: "1" }],
      message: "Sentences retrieved successfully",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/realm-carver/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectRealmCarverStartScreen(page: Page) {
  await expect(page.getByRole("heading", { name: /realm carver/i }).first()).toBeVisible({ timeout: 15000 });
}
export function getRealmCarverUrl() {
  return REALM_CARVER_GAME_PATH;
}

// RUNE_FORGE_CHAMBER (Sentence Game)
export async function mockRuneForgeChamberApis(
  page: Page,
  sentences = RUNE_FORGE_CHAMBER_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/rune-forge-chamber/sentences**", async (route) => {
    const response = {
      status: 200,
      sentences: sentences,
      message: "Sentences retrieved successfully",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/rune-forge-chamber/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectRuneForgeChamberStartScreen(page: Page) {
  await expect(page.getByRole("heading", { name: /rune forge chamber/i }).first()).toBeVisible({ timeout: 15000 });
}
export function getRuneForgeChamberUrl() {
  return RUNE_FORGE_CHAMBER_GAME_PATH;
}

// SHADOW_GATE_DUNGEON (Sentence Game)
export async function mockShadowGateDungeonApis(
  page: Page,
  sentences = SHADOW_GATE_DUNGEON_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/shadow-gate-dungeon/sentences**", async (route) => {
    const response = {
      status: 200,
      sentences: sentences,
      message: "Sentences retrieved successfully",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/shadow-gate-dungeon/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectShadowGateDungeonStartScreen(page: Page) {
  await expect(page.getByRole("heading", { name: /shadow gate dungeon/i }).first()).toBeVisible({ timeout: 15000 });
}
export function getShadowGateDungeonUrl() {
  return SHADOW_GATE_DUNGEON_GAME_PATH;
}

// SPELLWEAVERS_RUN (Sentence Game)
export async function mockSpellweaversRunApis(
  page: Page,
  sentences = SPELLWEAVERS_RUN_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/spellweavers-run/sentences**", async (route) => {
    const response = {
      status: 200,
      sentences: sentences,
      message: "Sentences retrieved successfully",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/spellweavers-run/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectSpellweaversRunStartScreen(page: Page) {
  await expect(page.getByRole("heading", { name: /spellweaver/i }).first()).toBeVisible({ timeout: 15000 });
}
export function getSpellweaversRunUrl() {
  return SPELLWEAVERS_RUN_GAME_PATH;
}

// STORM_CASTLE_TOWER (Sentence Game)
export async function mockStormCastleTowerApis(
  page: Page,
  sentences = STORM_CASTLE_TOWER_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/storm-castle-tower/sentences**", async (route) => {
    const response = {
      status: 200,
      sentences: sentences,
      message: "Sentences retrieved successfully",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/storm-castle-tower/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectStormCastleTowerStartScreen(page: Page) {
  await expect(page.getByRole("heading", { name: /storm the castle tower/i }).first()).toBeVisible({ timeout: 15000 });
}
export function getStormCastleTowerUrl() {
  return STORM_CASTLE_TOWER_GAME_PATH;
}

// VILLAGE_GUARDIAN (Sentence Game)
export async function mockVillageGuardianApis(
  page: Page,
  sentences = VILLAGE_GUARDIAN_SAMPLE_SENTENCES
) {
  await page.route("**/api/v1/games/village-guardian/sentences**", async (route) => {
    const response = {
      status: 200,
      sentences: sentences,
      message: "Sentences retrieved successfully",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.route("/api/v1/games/village-guardian/complete", async (route) => {
    const response: ApiResponse = {
      status: 200,
      message: "Game completed successfully",
      xpEarned: 0,
      activityId: "mock-activity-playwright",
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}
export async function expectVillageGuardianStartScreen(page: Page) {
  await expect(page.getByRole("heading", { name: /village guardian/i }).first()).toBeVisible({ timeout: 15000 });
}
export function getVillageGuardianUrl() {
  return VILLAGE_GUARDIAN_GAME_PATH;
}
