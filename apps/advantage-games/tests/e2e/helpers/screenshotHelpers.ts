import fs from "node:fs/promises";
import path from "node:path";

import type { Page } from "@playwright/test";

import {
  ABYSSAL_WELL_SCREENSHOT_DIR,
  ABYSSAL_WELL_SCREENSHOT_FILE,
  ARCHERS_REVENGE_SCREENSHOT_DIR,
  ARCHERS_REVENGE_SCREENSHOT_FILE,
  CASTLE_DEFENSE_SCREENSHOT_DIR,
  CASTLE_DEFENSE_SCREENSHOT_FILE,
  DEVOURER_SLIME_SCREENSHOT_DIR,
  DEVOURER_SLIME_SCREENSHOT_FILE,
  DRAGON_FLIGHT_SCREENSHOT_DIR,
  DRAGON_FLIGHT_SCREENSHOT_FILE,
  DRAGON_RIDER_SCREENSHOT_DIR,
  DRAGON_RIDER_SCREENSHOT_FILE,
  DUNGEON_LIBERATOR_SCREENSHOT_DIR,
  DUNGEON_LIBERATOR_SCREENSHOT_FILE,
  ENCHANTED_LIBRARY_SCREENSHOT_DIR,
  ENCHANTED_LIBRARY_SCREENSHOT_FILE,
  GRIFFIN_RIDERS_ESCAPE_SCREENSHOT_DIR,
  GRIFFIN_RIDERS_ESCAPE_SCREENSHOT_FILE,
  GRIFFIN_SKY_JOUST_SCREENSHOT_DIR,
  GRIFFIN_SKY_JOUST_SCREENSHOT_FILE,
  GRYPHON_PATROL_SCREENSHOT_DIR,
  GRYPHON_PATROL_SCREENSHOT_FILE,
  HAUNTED_LIBRARY_SCREENSHOT_DIR,
  HAUNTED_LIBRARY_SCREENSHOT_FILE,
  LABYRINTH_GOBLIN_KING_SCREENSHOT_DIR,
  LABYRINTH_GOBLIN_KING_SCREENSHOT_FILE,
  MAGIC_DEFENSE_SCREENSHOT_DIR,
  MAGIC_DEFENSE_SCREENSHOT_FILE,
  PALADINS_TWIN_SOUL_SCREENSHOT_DIR,
  PALADINS_TWIN_SOUL_SCREENSHOT_FILE,
  POTION_RUSH_SCREENSHOT_DIR,
  POTION_RUSH_SCREENSHOT_FILE,
  REALM_CARVER_SCREENSHOT_DIR,
  REALM_CARVER_SCREENSHOT_FILE,
  RUNE_FORGE_CHAMBER_SCREENSHOT_DIR,
  RUNE_FORGE_CHAMBER_SCREENSHOT_FILE,
  RPG_BATTLE_SCREENSHOT_DIR,
  RPG_BATTLE_SCREENSHOT_FILE,
  RUNE_MATCH_SCREENSHOT_DIR,
  RUNE_MATCH_SCREENSHOT_FILE,
  SHADOW_GATE_DUNGEON_SCREENSHOT_DIR,
  SHADOW_GATE_DUNGEON_SCREENSHOT_FILE,
  SPELLWEAVERS_RUN_SCREENSHOT_DIR,
  SPELLWEAVERS_RUN_SCREENSHOT_FILE,
  STORM_CASTLE_TOWER_SCREENSHOT_DIR,
  STORM_CASTLE_TOWER_SCREENSHOT_FILE,
  VILLAGE_GUARDIAN_SCREENSHOT_DIR,
  VILLAGE_GUARDIAN_SCREENSHOT_FILE,
  WIZARD_VS_ZOMBIE_SCREENSHOT_DIR,
  WIZARD_VS_ZOMBIE_SCREENSHOT_FILE,
} from "../fixtures/gameFixtures";

export async function captureArchersRevengeScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), ARCHERS_REVENGE_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, ARCHERS_REVENGE_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function captureDragonFlightScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), DRAGON_FLIGHT_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, DRAGON_FLIGHT_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function captureDragonRiderScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), DRAGON_RIDER_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, DRAGON_RIDER_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function captureEnchantedLibraryScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), ENCHANTED_LIBRARY_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, ENCHANTED_LIBRARY_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function captureMagicDefenseScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), MAGIC_DEFENSE_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, MAGIC_DEFENSE_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function capturePaladinsTwinSoulScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), PALADINS_TWIN_SOUL_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, PALADINS_TWIN_SOUL_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function captureRPGBattleScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), RPG_BATTLE_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, RPG_BATTLE_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function captureRuneMatchScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), RUNE_MATCH_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, RUNE_MATCH_SCREENSHOT_FILE);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return screenshotPath;
}

export async function captureWizardVsZombieScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), WIZARD_VS_ZOMBIE_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, WIZARD_VS_ZOMBIE_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureAbyssalWellScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), ABYSSAL_WELL_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, ABYSSAL_WELL_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureCastleDefenseScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), CASTLE_DEFENSE_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, CASTLE_DEFENSE_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureDevourerSlimeScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), DEVOURER_SLIME_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, DEVOURER_SLIME_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureDungeonLiberatorScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), DUNGEON_LIBERATOR_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, DUNGEON_LIBERATOR_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureGriffinRidersEscapeScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), GRIFFIN_RIDERS_ESCAPE_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, GRIFFIN_RIDERS_ESCAPE_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureGriffinSkyJoustScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), GRIFFIN_SKY_JOUST_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, GRIFFIN_SKY_JOUST_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureGryphonPatrolScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), GRYPHON_PATROL_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, GRYPHON_PATROL_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureHauntedLibraryScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), HAUNTED_LIBRARY_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, HAUNTED_LIBRARY_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureLabyrinthGoblinKingScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), LABYRINTH_GOBLIN_KING_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, LABYRINTH_GOBLIN_KING_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function capturePotionRushScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), POTION_RUSH_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, POTION_RUSH_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureRealmCarverScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), REALM_CARVER_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, REALM_CARVER_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureRuneForgeChamberScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), RUNE_FORGE_CHAMBER_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, RUNE_FORGE_CHAMBER_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureShadowGateDungeonScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), SHADOW_GATE_DUNGEON_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, SHADOW_GATE_DUNGEON_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureSpellweaversRunScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), SPELLWEAVERS_RUN_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, SPELLWEAVERS_RUN_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureStormCastleTowerScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), STORM_CASTLE_TOWER_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, STORM_CASTLE_TOWER_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function captureVillageGuardianScreenshot(page: Page) {
  const screenshotDir = path.join(process.cwd(), VILLAGE_GUARDIAN_SCREENSHOT_DIR);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, VILLAGE_GUARDIAN_SCREENSHOT_FILE);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}
