import { expect, test, type Locator, type Page } from "@playwright/test";
import type { InputActionId } from "@reading-advantage/advantage-play-kit";

import { completePublicBespokeCartridge } from "./public-cartridge-drivers";
import { verifyAuthenticatedMagicDefenseLifecycle } from "./authenticated-magic-defense-lifecycle";

const cartridges = [
  { id: "dragon-flight", title: "Dragon Flight" },
  { id: "astral-mage", title: "Astral Mage" },
  { id: "sorcerer-ziggurat", title: "The Sorcerer's Ziggurat" },
  { id: "dragon-rider", title: "Dragon Rider" },
  { id: "spellweavers-run", title: "Spellweaver's Run" },
  { id: "shadow-gate-dungeon", title: "Shadow Gate Dungeon" },
  { id: "labyrinth-goblin-king", title: "Labyrinth of the Goblin King" },
  { id: "griffin-riders-escape", title: "Griffin Rider's Escape" },
  defineKeyboardCartridge({
    id: "castle-defense",
    title: "Castle Defense",
    inputMode: "sentence",
    actions: ["move-left", "move-right", "move-up", "move-down", "confirm"] as const,
    keyboardBindings: {
      "move-left": "ArrowLeft",
      "move-right": "ArrowRight",
      "move-up": "ArrowUp",
      "move-down": "ArrowDown",
      confirm: "Space",
    },
  }),
  defineKeyboardCartridge({
    id: "magic-defense",
    title: "Magic Defense",
    inputMode: "vocabulary",
    actions: ["move-left", "confirm", "move-right"] as const,
    keyboardBindings: {
      "move-left": "KeyA",
      confirm: "KeyS",
      "move-right": "KeyD",
    },
  }),
  defineKeyboardCartridge({
    id: "rpg-battle",
    title: "RPG Battle",
    inputMode: "vocabulary",
    actions: ["move-left", "confirm", "move-right"] as const,
    keyboardBindings: {
      "move-left": "KeyJ",
      confirm: "KeyK",
      "move-right": "KeyL",
    },
  }),
  defineKeyboardCartridge({
    id: "wizard-vs-zombie",
    title: "Wizard vs Zombie",
    inputMode: "vocabulary",
    actions: ["move-left", "confirm", "move-right"] as const,
    keyboardBindings: {
      "move-left": "KeyZ",
      confirm: "KeyX",
      "move-right": "KeyC",
    },
  }),
  defineKeyboardCartridge({
    id: "enchanted-library",
    title: "Enchanted Library",
    inputMode: "vocabulary",
    actions: ["move-left", "confirm"] as const,
    keyboardBindings: {
      "move-left": "KeyA",
      confirm: "Space",
    },
  }),
  defineKeyboardCartridge({
    id: "rune-match",
    title: "Rune Match",
    inputMode: "vocabulary",
    actions: ["move-right", "confirm"] as const,
    keyboardBindings: {
      "move-right": "KeyD",
      confirm: "Enter",
    },
  }),
  defineKeyboardCartridge({
    id: "alchemists-synthesis",
    title: "Alchemist's Synthesis",
    inputMode: "vocabulary",
    actions: ["move-up", "confirm"] as const,
    keyboardBindings: {
      "move-up": "KeyW",
      confirm: "Space",
    },
  }),
  defineKeyboardCartridge({
    id: "potion-rush",
    title: "Potion Rush",
    inputMode: "sentence",
    actions: ["move-down", "confirm"] as const,
    keyboardBindings: {
      "move-down": "KeyS",
      confirm: "Enter",
    },
  }),
  defineKeyboardCartridge({
    id: "dungeon-liberator",
    title: "Dungeon Liberator",
    inputMode: "sentence",
    actions: ["move-left", "move-right", "move-up"] as const,
    keyboardBindings: {
      "move-left": "KeyA",
      "move-right": "KeyD",
      "move-up": "KeyW",
    },
  }),
  defineKeyboardCartridge({
    id: "rune-forge-chamber",
    title: "Rune Forge Chamber",
    inputMode: "sentence",
    actions: ["move-left", "move-up", "move-right", "confirm"] as const,
    keyboardBindings: {
      "move-left": "KeyJ",
      "move-up": "KeyI",
      "move-right": "KeyL",
      confirm: "Enter",
    },
  }),
  defineKeyboardCartridge({
    id: "village-guardian",
    title: "Village Guardian",
    inputMode: "sentence",
    actions: ["move-down", "move-left", "move-right"] as const,
    keyboardBindings: {
      "move-down": "KeyZ",
      "move-left": "KeyH",
      "move-right": "KeyK",
    },
  }),
  defineKeyboardCartridge({
    id: "abyssal-well",
    title: "The Abyssal Well",
    inputMode: "sentence",
    actions: ["move-left", "move-right", "confirm"] as const,
    keyboardBindings: {
      "move-left": "KeyO",
      "move-right": "KeyP",
      confirm: "KeyX",
    },
  }),
  defineKeyboardCartridge({
    id: "archers-revenge",
    title: "Archer's Revenge",
    inputMode: "vocabulary",
    actions: ["move-left", "confirm", "move-right"] as const,
    keyboardBindings: {
      "move-left": "KeyA",
      confirm: "Space",
      "move-right": "KeyD",
    },
  }),
  defineKeyboardCartridge({
    id: "storm-castle-tower",
    title: "Storm the Castle Tower",
    inputMode: "sentence",
    actions: ["move-up", "confirm", "move-right"] as const,
    keyboardBindings: {
      "move-up": "KeyW",
      confirm: "Space",
      "move-right": "KeyD",
    },
  }),
  defineKeyboardCartridge({
    id: "griffin-sky-joust",
    title: "Griffin Sky-Joust",
    inputMode: "sentence",
    actions: ["move-up", "confirm", "move-down"] as const,
    keyboardBindings: {
      "move-up": "KeyW",
      confirm: "Space",
      "move-down": "KeyS",
    },
  }),
  defineKeyboardCartridge({
    id: "realm-carver",
    title: "Realm Carver",
    inputMode: "sentence",
    actions: ["move-left", "move-up", "confirm", "move-right"] as const,
    keyboardBindings: {
      "move-left": "KeyA",
      "move-up": "KeyW",
      confirm: "Space",
      "move-right": "KeyD",
    },
  }),
  defineKeyboardCartridge({
    id: "paladins-twin-soul",
    title: "Paladin's Twin-Soul",
    inputMode: "vocabulary",
    actions: ["move-left", "move-right", "confirm"] as const,
    keyboardBindings: {
      "move-left": "KeyA",
      "move-right": "KeyD",
      confirm: "Space",
    },
  }),
  defineKeyboardCartridge({
    id: "devourer-slime",
    title: "Devourer Slime",
    inputMode: "sentence",
    actions: ["move-up", "move-down", "confirm"] as const,
    keyboardBindings: {
      "move-up": "KeyW",
      "move-down": "KeyS",
      confirm: "Space",
    },
  }),
  defineKeyboardCartridge({
    id: "haunted-library",
    title: "The Haunted Library",
    inputMode: "sentence",
    actions: ["move-left", "move-right", "move-up"] as const,
    keyboardBindings: {
      "move-left": "KeyA",
      "move-right": "KeyD",
      "move-up": "KeyW",
    },
  }),
  defineKeyboardCartridge({
    id: "gryphon-patrol",
    title: "Gryphon Patrol",
    inputMode: "sentence",
    actions: ["move-up", "move-left", "move-right", "move-down", "confirm"] as const,
    keyboardBindings: {
      "move-up": "KeyW",
      "move-left": "KeyA",
      "move-right": "KeyD",
      "move-down": "KeyS",
      confirm: "Space",
    },
  }),
] as const;

type KeyboardAction = Extract<
  InputActionId,
  "move-left" | "move-right" | "move-up" | "move-down" | "confirm"
>;

type KeyboardCartridgeDefinition<Actions extends readonly [KeyboardAction, ...KeyboardAction[]]> = {
  readonly id: string;
  readonly title: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly actions: Actions;
  readonly keyboardBindings: Readonly<{ [Action in Actions[number]]: string }>;
};

/**
 * Creates a typed public cartridge definition with a key for every configured semantic action.
 * @param definition Cartridge metadata, action cycle, and configured keyboard bindings.
 * @returns The validated data definition used by the public lifecycle matrix.
 */
function defineKeyboardCartridge<const Actions extends readonly [KeyboardAction, ...KeyboardAction[]]>(
  definition: KeyboardCartridgeDefinition<Actions>,
): KeyboardCartridgeDefinition<Actions> {
  return definition;
}

const authenticatedStudent = {
  username: process.env.APK_E2E_AUTH_USERNAME,
  password: process.env.APK_E2E_AUTH_PASSWORD,
};

// Focused controller suites prove victory; these real-time routes use browser defeat as their required terminal path.
const defeatTerminalAccepted = new Set([
  "enchanted-library",
  "dungeon-liberator",
  "village-guardian",
  "abyssal-well",
  "archers-revenge",
  "griffin-sky-joust",
  "realm-carver",
  "paladins-twin-soul",
  "devourer-slime",
  "haunted-library",
  "gryphon-patrol",
]);

const extendedLifecycleTimeout = new Set([
  "enchanted-library",
  "dungeon-liberator",
  "gryphon-patrol",
]);

/**
 * Starts the standard briefing and enters scored play after exercising or skipping the tutorial.
 * @param page Active public cartridge page.
 * @param title Product-facing cartridge title.
 * @param exerciseTutorial Whether to run both deterministic tutorial actions.
 * @returns The mounted Phaser canvas.
 */
async function enterScoredPlay(page: Page, title: string, exerciseTutorial = false): Promise<Locator> {
  const briefing = page.getByRole("dialog", { name: title });
  await expect(briefing).toBeVisible();
  await briefing.getByRole("button", { name: "Start guided tutorial" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Guided tutorial ready")).toBeVisible();
  await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1);
  await expect(page.getByRole("region", { name: `${title} guided tutorial` })).toBeVisible();
  await expect(page.getByText("Game complete")).toHaveCount(0);
  if (exerciseTutorial) {
    const advance = page.getByRole("button", { name: "Next tutorial step" });
    await page.waitForTimeout(1_500);
    await advance.click();
    await page.waitForTimeout(1_500);
    await advance.click();
  } else {
    await page.getByRole("button", { name: "Skip tutorial" }).click();
  }
  await expect(page.getByText("Game ready")).toBeVisible();
  await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(1);
  return page.locator("[data-apk-canvas-host] canvas");
}

/** Completes the active public cartridge through its real browser-input driver. */
async function completeActiveCartridge(
  page: Page,
  canvas: Locator,
  cartridge: (typeof cartridges)[number],
): Promise<void> {
  if (cartridge.id === "dragon-flight") {
    await canvas.click({ position: { x: 100, y: 100 } });
    await completeDragonFlight(page);
  } else if (cartridge.id === "astral-mage") {
    await completeAstralMage(page, canvas);
  } else if (cartridge.id === "sorcerer-ziggurat") {
    await canvas.click({ position: { x: 100, y: 100 } });
    await completeSorcererZiggurat(page);
  } else if ("actions" in cartridge) {
    await completePublicBespokeCartridge(page, canvas, cartridge.title, cartridge.id);
  } else {
    await canvas.click({ position: { x: 100, y: 100 } });
    await completeLegacyTraversal(page);
  }
}

/** Verifies the standard result surface and the required terminal outcome. */
async function expectStandardResult(page: Page, requireVictory: boolean): Promise<void> {
  await expect(page.getByText("Game complete")).toBeVisible();
  if (requireVictory) {
    await expect(page.getByText("Victory", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByText(/^(?:Victory|Try again|Complete)$/u)).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Game result" })).toBeVisible();
  await expect(page.getByText("Pixel art assets by ElvGames")).toBeVisible();
}

/**
 * Tries each Dragon Flight gate for every vocabulary target.
 * @param page Active Dragon Flight page.
 */
async function completeDragonFlight(page: Page): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
  }
}

/**
 * Tries each available Ziggurat direction for every sentence word.
 * @param page Active Ziggurat page.
 */
async function completeSorcererZiggurat(page: Page): Promise<void> {
  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowRight");
  }
}

/**
 * Sweeps every directional route until a restored traversal cartridge finishes.
 * @param page Active restored traversal cartridge page.
 */
async function completeLegacyTraversal(page: Page): Promise<void> {
  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
  }
}

/**
 * Clicks every procedural crystal position until both fixture sentences finish.
 * @param page Active Astral Mage page.
 * @param canvas Active Astral Mage Phaser canvas.
 */
async function completeAstralMage(page: Page, canvas: Locator): Promise<void> {
  const box = await canvas.boundingBox();
  expect(box, "Astral Mage canvas must have rendered dimensions").not.toBeNull();
  if (!box) return;
  const horizontalRadius = 0.29 * 540 / 960;
  for (const [crystalCount, sweeps] of [[6, 6], [7, 8]] as const) {
    for (let sweep = 0; sweep < sweeps; sweep += 1) {
      for (let index = 0; index < crystalCount; index += 1) {
        if (await page.getByText("Game complete").isVisible()) return;
        const angle = -Math.PI / 2 + index * (Math.PI * 2 / crystalCount);
        await canvas.click({
          position: {
            x: box.width * (0.5 + Math.cos(angle) * horizontalRadius),
            y: box.height * (0.51 + Math.sin(angle) * 0.29),
          },
        });
      }
    }
  }
}

test.describe("public APK standard lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  for (const cartridge of cartridges) {
    test(`${cartridge.title} supports briefing, tutorial, real input, results, and clean replay`, async ({ page }) => {
      test.setTimeout(extendedLifecycleTimeout.has(cartridge.id) ? 300_000 : 180_000);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/en/student/arcade/${cartridge.id}`);

      await expect(page.getByText("Preview mode")).toBeVisible();
      await expect(page.getByText(/built-in sample content.*does not save progress/i)).toBeVisible();
      const isBespoke = "actions" in cartridge;
      const canvas = await enterScoredPlay(page, cartridge.title, isBespoke);
      await expect(canvas).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await completeActiveCartridge(page, canvas, cartridge);
      const requireVictory = isBespoke && !defeatTerminalAccepted.has(cartridge.id);
      await expectStandardResult(page, requireVictory);

      await page.getByRole("button", { name: "Play again" }).click();
      await expect(page.getByRole("dialog", { name: cartridge.title })).toBeVisible();
      await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(0);

      if (isBespoke) {
        await page.setViewportSize({ width: 1440, height: 900 });
        const wideCanvas = await enterScoredPlay(page, cartridge.title);
        await expect(wideCanvas).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
        await completeActiveCartridge(page, wideCanvas, cartridge);
        await expectStandardResult(page, requireVictory);
        await page.getByRole("button", { name: "Play again" }).click();
        await expect(page.getByRole("dialog", { name: cartridge.title })).toBeVisible();
        await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(0);
      }
    });
  }

  test("authenticated cartridge routes fail closed without a student session", async ({ page }) => {
    await page.goto("/en/student/games/apk/dragon-flight");

    await expect(page.getByText("Student content", { exact: true })).toBeVisible();
    await expect(page.getByText("Authentication required", { exact: true })).toBeVisible();
    await expect(page.getByText("Preview mode")).toHaveCount(0);
    await expect(page.locator("[data-apk-canvas-host] canvas")).toHaveCount(0);
  });

  test("authenticated Magic Defense loads student content, saves Replay, and exits", async ({ page }) => {
    test.setTimeout(180_000);
    test.skip(
      process.env.APK_E2E_AUTHENTICATED_LIFECYCLE !== "true"
        || !authenticatedStudent.username
        || !authenticatedStudent.password,
      "Set APK_E2E_AUTHENTICATED_LIFECYCLE and both APK_E2E_AUTH credentials for the isolated local database flow.",
    );

    const loginResponse = await page.context().request.post("/api/auth/login", {
      data: authenticatedStudent,
    });
    expect(loginResponse.ok()).toBe(true);

    await verifyAuthenticatedMagicDefenseLifecycle(page, {
      gamePath: "/th/student/games/apk/magic-defense",
      catalogPath: "/th/student/games",
    });
  });

  test("authenticated sentence cartridges persist student-owned content", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(
      !authenticatedStudent.username || !authenticatedStudent.password,
      "Set APK_E2E_AUTH_USERNAME and APK_E2E_AUTH_PASSWORD for the real database flow.",
    );

    const loginResponse = await page.context().request.post("/api/auth/login", {
      data: authenticatedStudent,
    });
    expect(loginResponse.ok()).toBe(true);

    const contentResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/v1/apk/content?mode=sentence"),
    );
    await page.goto("/en/student/games/apk/castle-defense");
    const contentResponse = await contentResponsePromise;
    expect(contentResponse.ok()).toBe(true);
    expect(await contentResponse.json()).toMatchObject({
      mode: "sentence",
      source: "student-flashcards",
      content: expect.arrayContaining([
        expect.objectContaining({ term: "The dragon crosses the bridge" }),
        expect.objectContaining({ term: "A lantern glows in the forest" }),
      ]),
    });

    const canvas = await enterScoredPlay(page, "Castle Defense");
    const completionResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/v1/apk/complete") && response.request().method() === "POST",
    );
    await completePublicBespokeCartridge(page, canvas, "Castle Defense", "castle-defense");

    await expect(page.getByText("Game complete")).toBeVisible();
    const completionResponse = await completionResponsePromise;
    expect(completionResponse.ok()).toBe(true);
    expect(await completionResponse.json()).toMatchObject({
      duplicate: false,
      status: 200,
      activityId: expect.stringMatching(/^game:castle-defense:/),
      xpEarned: expect.any(Number),
    });
  });
});
