import { type Locator, type Page } from "@playwright/test";
import type { VocabularyInput } from "@reading-advantage/game-contracts";

import { PUBLIC_ARCADE_SENTENCE_FIXTURE } from "../../../src/lib/apk/public-sentence-fixture";
import { PUBLIC_ARCADE_VOCABULARY_FIXTURE } from "../../../src/lib/apk/public-vocabulary-fixture";
import {
  CASTLE_DEFENSE_KEYBOARD_BINDINGS,
  createCastleDefenseController,
} from "../../../../../packages/game-cartridges/src/castle-defense";
import {
  createMagicDefenseController,
  MAGIC_DEFENSE_CHOICE_Y_RATIO,
} from "../../../../../packages/game-cartridges/src/magic-defense";
import {
  createRpgBattleController,
} from "../../../../../packages/game-cartridges/src/rpg-battle";
import {
  createWizardVsZombieController,
} from "../../../../../packages/game-cartridges/src/wizard-vs-zombie";
import {
  createEnchantedLibraryController,
  ENCHANTED_LIBRARY_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/enchanted-library";
import {
  createRuneMatchController,
  RUNE_MATCH_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/rune-match";
import {
  ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS,
  createAlchemistsSynthesisController,
} from "../../../../../packages/game-cartridges/src/alchemists-synthesis";
import {
  createPotionRushController,
  POTION_RUSH_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/potion-rush";
import {
  createDungeonLiberatorController,
  DUNGEON_LIBERATOR_KEYBOARD_BINDINGS,
  getDungeonLiberatorDpadButtons,
} from "../../../../../packages/game-cartridges/src/dungeon-liberator";
import {
  createRuneForgeChamberController,
  RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/rune-forge-chamber";
import {
  createVillageGuardianController,
  VILLAGE_GUARDIAN_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/village-guardian";
import {
  ABYSSAL_WELL_KEYBOARD_BINDINGS,
  createAbyssalWellController,
} from "../../../../../packages/game-cartridges/src/abyssal-well";
import {
  ARCHERS_REVENGE_KEYBOARD_BINDINGS,
  createArchersRevengeController,
} from "../../../../../packages/game-cartridges/src/archers-revenge";
import {
  createStormCastleTowerController,
  STORM_CASTLE_TOWER_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/storm-castle-tower";
import {
  createGriffinSkyJoustController,
  GRIFFIN_SKY_JOUST_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/griffin-sky-joust";
import {
  createRealmCarverController,
  REALM_CARVER_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/realm-carver";
import {
  createPaladinsTwinSoulController,
  PALADINS_TWIN_SOUL_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/paladins-twin-soul";
import {
  createDevourerSlimeController,
  DEVOURER_SLIME_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/devourer-slime";
import {
  createHauntedLibraryController,
  HAUNTED_LIBRARY_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/haunted-library";
import {
  createGryphonPatrolController,
  GRYPHON_PATROL_KEYBOARD_BINDINGS,
} from "../../../../../packages/game-cartridges/src/gryphon-patrol";

const SEED = 29;
const FRAME_WAIT_MS = 20;
const PLANNER_TICK_MS = 20;
const MAX_STEPS = 700;
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

type PlannerSnapshot = {
  readonly phase: string;
  readonly targetIndex: number;
  readonly targetCount: number;
  readonly correctAction: string;
  readonly [key: string]: unknown;
};

type Planner = {
  readonly snapshot: () => PlannerSnapshot;
  readonly apply: (action: string) => void;
  readonly tick: (deltaMs: number) => void;
  readonly destroy: () => void;
};

type DriverStep = (page: Page, canvas: Locator, planner: Planner) => Promise<void>;

type BespokeDriver = {
  readonly planner: Planner;
  readonly step: DriverStep;
  readonly finishBrowserAfterPlannerTerminal?: (page: Page, canvas: Locator) => Promise<void>;
};

const noOpDelivery = () => undefined;

/** Wraps a transport-independent controller as a planner used beside the browser session. */
function createPlanner(
  snapshot: () => unknown,
  apply: (action: string) => void,
  tick: (deltaMs: number) => void,
  destroy: () => void,
): Planner {
  return {
    snapshot: () => snapshot() as PlannerSnapshot,
    apply,
    tick,
    destroy,
  };
}

/** Returns a typed field from a planner snapshot. */
function field<T>(snapshot: PlannerSnapshot, key: string): T {
  return snapshot[key] as T;
}

/** Waits for a rendered Phaser frame while advancing only the local planner. */
async function waitForFrame(page: Page, planner: Planner, deltaMs = PLANNER_TICK_MS): Promise<void> {
  await page.waitForTimeout(deltaMs);
  planner.tick(deltaMs);
}

/** Sends one real keyboard press through the canvas input boundary. */
async function sendKey(page: Page, key: string): Promise<void> {
  const browserKey = /^Key[A-Z]$/u.test(key) ? key.slice(3).toLocaleLowerCase() : key;
  await page.keyboard.press(browserKey);
  await page.waitForTimeout(FRAME_WAIT_MS);
}

/** Sends one semantic action and applies the same action to the local planner. */
async function sendAction(
  page: Page,
  planner: Planner,
  bindings: Readonly<Record<string, string>>,
  action: string,
): Promise<void> {
  const key = Object.entries(bindings).find(([, mappedAction]) => mappedAction === action)?.[0];
  if (!key) throw new Error(`No keyboard binding exists for planner action ${action}`);
  await sendKey(page, key);
  planner.apply(action);
  planner.tick(PLANNER_TICK_MS);
}

/** Clicks a logical Phaser canvas position through Playwright pointer input. */
async function clickLogicalCanvas(
  page: Page,
  canvas: Locator,
  x: number,
  y: number,
): Promise<void> {
  const box = await canvas.boundingBox();
  if (!box || !(await canvas.isVisible({ timeout: 0 }))) return;
  await page.mouse.click(
    box.x + box.width * x / CANVAS_WIDTH,
    box.y + box.height * y / CANVAS_HEIGHT,
  );
  await page.waitForTimeout(FRAME_WAIT_MS);
}

/** Reads the Enchanted Library player and highlighted book from a composited browser screenshot. */
async function readEnchantedLibraryVisualState(
  page: Page,
  canvas: Locator,
): Promise<{
  readonly player?: { readonly x: number; readonly y: number };
  readonly target?: { readonly x: number; readonly y: number };
  readonly width: number;
}> {
  if (!(await canvas.isVisible({ timeout: 0 }))) return { width: CANVAS_WIDTH };
  let screenshot: Buffer;
  try {
    screenshot = await canvas.screenshot({ timeout: 1_000 });
  } catch {
    return { width: CANVAS_WIDTH };
  }
  return page.evaluate(async (source) => {
    const image = document.createElement("img");
    image.src = source;
    await image.decode();
    const copy = document.createElement("canvas");
    copy.width = image.naturalWidth;
    copy.height = image.naturalHeight;
    const context = copy.getContext("2d", { willReadFrequently: true });
    if (!context) return { width: copy.width };
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
    const yellow = new Uint8Array(copy.width * copy.height);
    const target = { x: 0, y: 0, count: 0 };

    for (let y = 0; y < copy.height; y += 1) {
      for (let x = 0; x < copy.width; x += 1) {
        const pixelIndex = y * copy.width + x;
        const offset = pixelIndex * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        if (red > 225 && green > 165 && green < 235 && blue < 155) yellow[pixelIndex] = 1;
        if (red > 105 && red < 185 && green > 65 && green < 155 && blue > 205) {
          target.x += x;
          target.y += y;
          target.count += 1;
        }
      }
    }

    const queue = new Int32Array(copy.width * copy.height);
    const components: Array<{ x: number; y: number; width: number; height: number; count: number }> = [];
    for (let start = 0; start < yellow.length; start += 1) {
      if (yellow[start] !== 1) continue;
      let readIndex = 0;
      let writeIndex = 0;
      let count = 0;
      let xTotal = 0;
      let yTotal = 0;
      let minimumX = copy.width;
      let maximumX = 0;
      let minimumY = copy.height;
      let maximumY = 0;
      queue[writeIndex++] = start;
      yellow[start] = 2;
      while (readIndex < writeIndex) {
        const current = queue[readIndex++]!;
        const x = current % copy.width;
        const y = Math.floor(current / copy.width);
        count += 1;
        xTotal += x;
        yTotal += y;
        minimumX = Math.min(minimumX, x);
        maximumX = Math.max(maximumX, x);
        minimumY = Math.min(minimumY, y);
        maximumY = Math.max(maximumY, y);
        for (const neighbor of [current - 1, current + 1, current - copy.width, current + copy.width]) {
          if (neighbor < 0 || neighbor >= yellow.length || yellow[neighbor] !== 1) continue;
          const neighborX = neighbor % copy.width;
          if (Math.abs(neighborX - x) > 1) continue;
          yellow[neighbor] = 2;
          queue[writeIndex++] = neighbor;
        }
      }
      components.push({
        x: xTotal / count,
        y: yTotal / count,
        width: maximumX - minimumX + 1,
        height: maximumY - minimumY + 1,
        count,
      });
    }

    const player = components
      .filter((component) => component.count >= 8
        && component.width <= copy.width * 0.08
        && component.height <= copy.height * 0.14
        && component.count / (component.width * component.height) > 0.45)
      .sort((first, second) => second.count - first.count)[0];
    return {
      width: copy.width,
      ...(player ? { player: { x: player.x, y: player.y } } : {}),
      ...(target.count > 20 ? { target: { x: target.x / target.count, y: target.y / target.count } } : {}),
    };
  }, `data:image/png;base64,${screenshot.toString("base64")}`);
}

/** Reads the Dungeon Liberator player and nearest monster from a composited browser screenshot. */
async function readDungeonLiberatorVisualState(
  page: Page,
  canvas: Locator,
): Promise<{
  readonly player?: { readonly x: number; readonly y: number };
  readonly target?: { readonly x: number; readonly y: number };
  readonly width: number;
}> {
  if (!(await canvas.isVisible({ timeout: 0 }))) return { width: CANVAS_WIDTH };
  let screenshot: Buffer;
  try {
    screenshot = await canvas.screenshot({ timeout: 1_000 });
  } catch {
    return { width: CANVAS_WIDTH };
  }
  return page.evaluate(async (source) => {
    const image = document.createElement("img");
    image.src = source;
    await image.decode();
    const copy = document.createElement("canvas");
    copy.width = image.naturalWidth;
    copy.height = image.naturalHeight;
    const context = copy.getContext("2d", { willReadFrequently: true });
    if (!context) return { width: copy.width };
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
    const player = { x: 0, y: 0, count: 0 };
    const binSize = Math.max(20, copy.width * 0.08);
    const monsterBins = new Map<string, { x: number; y: number; count: number }>();
    for (let y = 0; y < copy.height; y += 1) {
      for (let x = 0; x < copy.width; x += 1) {
        const offset = (y * copy.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        if (red > 25 && red < 95 && green > 145 && green < 225 && blue > 215) {
          player.x += x;
          player.y += y;
          player.count += 1;
        }
        if (red > 205 && green < 105 && blue < 115) {
          const key = `${Math.floor(x / binSize)}:${Math.floor(y / binSize)}`;
          const group = monsterBins.get(key) ?? { x: 0, y: 0, count: 0 };
          group.x += x;
          group.y += y;
          group.count += 1;
          monsterBins.set(key, group);
        }
      }
    }
    const playerPoint = player.count > 10
      ? { x: player.x / player.count, y: player.y / player.count }
      : undefined;
    const minimumMonsterPixels = Math.max(10, copy.width * copy.height * 0.00015);
    const monsters = [...monsterBins.values()]
      .filter((group) => group.count >= minimumMonsterPixels)
      .map((group) => ({ x: group.x / group.count, y: group.y / group.count }));
    const target = playerPoint
      ? monsters.sort((first, second) =>
        Math.hypot(first.x - playerPoint.x, first.y - playerPoint.y)
        - Math.hypot(second.x - playerPoint.x, second.y - playerPoint.y))[0]
      : undefined;
    return {
      width: copy.width,
      ...(playerPoint ? { player: playerPoint } : {}),
      ...(target ? { target } : {}),
    };
  }, `data:image/png;base64,${screenshot.toString("base64")}`);
}

/** Returns a compact state string for bounded driver failures. */
function diagnostic(snapshot: PlannerSnapshot): string {
  return JSON.stringify({
    phase: snapshot.phase,
    targetIndex: snapshot.targetIndex,
    targetCount: snapshot.targetCount,
    correctAction: snapshot.correctAction,
    lastOutcome: snapshot.lastOutcome,
    lives: snapshot.lives,
    score: snapshot.score,
  });
}

/** Reports whether a title-specific phase is terminal rather than an active gameplay subphase. */
function isTerminalPhase(snapshot: PlannerSnapshot): boolean {
  return ["victory", "defeat", "complete", "completed", "destroyed"].includes(snapshot.phase)
    || snapshot.lastOutcome === "victory"
    || snapshot.lastOutcome === "defeat";
}

/** Creates a state-aware movement driver for controllers whose correct action is a keyboard action. */
function createKeyboardActionDriver(
  bindings: Readonly<Record<string, string>>,
): DriverStep {
  return async (page, _canvas, activePlanner) => {
    const snapshot = activePlanner.snapshot();
    await sendAction(page, activePlanner, bindings, snapshot.correctAction);
  };
}

/** Creates the bounded deterministic controller and real-input step for one public cartridge. */
function createDriver(
  id: string,
  vocabularyInput: Readonly<VocabularyInput> = PUBLIC_ARCADE_VOCABULARY_FIXTURE,
): BespokeDriver {
  switch (id) {
    case "castle-defense": {
      const controller = createCastleDefenseController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, SEED);
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.advance(deltaMs),
        () => controller.destroy(),
      );
      return { planner, step: createKeyboardActionDriver(CASTLE_DEFENSE_KEYBOARD_BINDINGS) };
    }
    case "magic-defense": {
      const controller = createMagicDefenseController(vocabularyInput, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const choices = field<readonly string[]>(snapshot, "answerChoices");
        const choiceIndex = choices.findIndex((choice) => choice === snapshot.correctAction);
        if (choiceIndex < 0) throw new Error(`Magic Defense correct answer is absent: ${diagnostic(snapshot)}`);
        const choiceWidth = Math.min(250, CANVAS_WIDTH * 0.27);
        const choiceGap = Math.min(24, CANVAS_WIDTH * 0.035);
        const choiceStart = (CANVAS_WIDTH - choiceWidth * 3 - choiceGap * 2) / 2;
        await clickLogicalCanvas(
          page,
          canvas,
          choiceStart + choiceIndex * (choiceWidth + choiceGap) + choiceWidth / 2,
          CANVAS_HEIGHT * MAGIC_DEFENSE_CHOICE_Y_RATIO + 28,
        );
        activePlanner.apply(snapshot.correctAction);
        activePlanner.tick(PLANNER_TICK_MS);
      };
      return { planner, step };
    }
    case "rpg-battle": {
      const controller = createRpgBattleController(PUBLIC_ARCADE_VOCABULARY_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const choices = field<readonly string[]>(snapshot, "answerChoices");
        const choiceIndex = choices.findIndex((choice) => choice === snapshot.correctAction);
        if (choiceIndex < 0) throw new Error(`RPG Battle correct answer is absent: ${diagnostic(snapshot)}`);
        const cardHeight = Math.min(52, CANVAS_HEIGHT * 0.095);
        const gap = Math.min(10, CANVAS_HEIGHT * 0.018);
        await clickLogicalCanvas(page, canvas, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.53 + choiceIndex * (cardHeight + gap) + cardHeight / 2);
        activePlanner.apply(snapshot.correctAction);
        activePlanner.tick(PLANNER_TICK_MS);
      };
      return { planner, step };
    }
    case "wizard-vs-zombie": {
      const controller = createWizardVsZombieController(PUBLIC_ARCADE_VOCABULARY_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const orbs = field<readonly { readonly isCorrect: boolean; readonly x: number; readonly y: number }[]>(snapshot, "orbs");
        const target = orbs.find((orb) => orb.isCorrect);
        if (!target) throw new Error(`Wizard vs Zombie target orb is absent: ${diagnostic(snapshot)}`);
        await clickLogicalCanvas(page, canvas, target.x, target.y);
        activePlanner.apply(snapshot.correctAction);
        activePlanner.tick(PLANNER_TICK_MS);
      };
      return { planner, step };
    }
    case "enchanted-library": {
      const controller = createEnchantedLibraryController(PUBLIC_ARCADE_VOCABULARY_FIXTURE, noOpDelivery, SEED);
      const planner = createPlanner(
        () => controller.snapshot(),
        () => undefined,
        () => undefined,
        () => controller.destroy(),
      );
      let stepCount = 0;
      const step: DriverStep = async (page, canvas) => {
        stepCount += 1;
        const visual = await readEnchantedLibraryVisualState(page, canvas);
        if (!visual.player || !visual.target) {
          await page.waitForTimeout(FRAME_WAIT_MS);
          return;
        }
        const horizontalDistance = visual.target.x - visual.player.x;
        const verticalDistance = visual.target.y - visual.player.y;
        const collisionThreshold = Math.max(8, visual.width * 0.04);
        if (Math.abs(horizontalDistance) <= collisionThreshold && Math.abs(verticalDistance) <= collisionThreshold) {
          await page.waitForTimeout(FRAME_WAIT_MS);
          return;
        }
        const action = Math.abs(horizontalDistance) >= Math.abs(verticalDistance)
          ? (horizontalDistance < 0 ? "move-left" : "move-right")
          : (verticalDistance < 0 ? "move-up" : "move-down");
        const key = Object.entries(ENCHANTED_LIBRARY_KEYBOARD_BINDINGS)
          .find(([, mappedAction]) => mappedAction === action)?.[0];
        if (!key) throw new Error(`Enchanted Library has no keyboard binding for ${action}`);
        const browserKey = /^Key[A-Z]$/u.test(key) ? key.slice(3).toLocaleLowerCase() : key;
        await page.keyboard.down(browserKey);
        await page.waitForTimeout(180);
        await page.keyboard.up(browserKey);
        await page.waitForTimeout(FRAME_WAIT_MS);
        if (stepCount % 10 === 0) await sendKey(page, "Space");
      };
      return { planner, step };
    }
    case "rune-match": {
      const controller = createRuneMatchController(PUBLIC_ARCADE_VOCABULARY_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.advanceTime(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const move = controller.findValidMove();
        if (!move) throw new Error(`Rune Match has no valid target move: ${diagnostic(activePlanner.snapshot())}`);
        for (const cell of move) {
          let snapshot = activePlanner.snapshot();
          while (field<{ readonly row: number; readonly col: number }>(snapshot, "cursor").row < cell.row) {
            await sendAction(page, activePlanner, RUNE_MATCH_KEYBOARD_BINDINGS, "move-down");
            snapshot = activePlanner.snapshot();
          }
          while (field<{ readonly row: number; readonly col: number }>(snapshot, "cursor").row > cell.row) {
            await sendAction(page, activePlanner, RUNE_MATCH_KEYBOARD_BINDINGS, "move-up");
            snapshot = activePlanner.snapshot();
          }
          while (field<{ readonly row: number; readonly col: number }>(snapshot, "cursor").col < cell.col) {
            await sendAction(page, activePlanner, RUNE_MATCH_KEYBOARD_BINDINGS, "move-right");
            snapshot = activePlanner.snapshot();
          }
          while (field<{ readonly row: number; readonly col: number }>(snapshot, "cursor").col > cell.col) {
            await sendAction(page, activePlanner, RUNE_MATCH_KEYBOARD_BINDINGS, "move-left");
            snapshot = activePlanner.snapshot();
          }
          await sendAction(page, activePlanner, RUNE_MATCH_KEYBOARD_BINDINGS, "confirm");
        }
      };
      return { planner, step };
    }
    case "alchemists-synthesis": {
      const controller = createAlchemistsSynthesisController(PUBLIC_ARCADE_VOCABULARY_FIXTURE, noOpDelivery, SEED);
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        let snapshot = activePlanner.snapshot();
        const options = field<readonly { readonly id: string }[]>(snapshot, "options");
        const correctIndex = options.findIndex((option) => option.id === snapshot.correctAction);
        if (correctIndex < 0) throw new Error(`Alchemist's Synthesis option is absent: ${diagnostic(snapshot)}`);
        while (field<number>(snapshot, "selectedIndex") !== correctIndex) {
          await sendAction(page, activePlanner, ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS, "move-right");
          snapshot = activePlanner.snapshot();
        }
        await sendAction(page, activePlanner, ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS, "confirm");
      };
      return { planner, step };
    }
    case "potion-rush": {
      const controller = createPotionRushController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs / 1000, CANVAS_WIDTH),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const selectedCauldronIndex = field<number>(snapshot, "selectedCauldronIndex");
        const activeCustomerIds = field<readonly (string | null)[]>(snapshot, "activeCustomerIds");
        const activeCauldronIndex = activeCustomerIds.findIndex((customerId) => customerId !== null);
        if (activeCauldronIndex >= 0 && activeCustomerIds[selectedCauldronIndex] === null) {
          await sendAction(page, activePlanner, POTION_RUSH_KEYBOARD_BINDINGS, "move-down");
          return;
        }
        const cauldrons = field<readonly { readonly state: string; readonly customerId: string | null }[]>(snapshot, "cauldrons");
        const cauldron = cauldrons[selectedCauldronIndex];
        if (!cauldron) throw new Error(`Potion Rush selected cauldron is absent: ${diagnostic(snapshot)}`);
        if (cauldron.state === "spoiled") {
          await sendAction(page, activePlanner, POTION_RUSH_KEYBOARD_BINDINGS, "cancel");
        } else if (cauldron.state === "completed" && cauldron.customerId) {
          await sendAction(page, activePlanner, POTION_RUSH_KEYBOARD_BINDINGS, "confirm");
        } else {
          const answer = field<string>(snapshot, "answer");
          const targetWord = answer.toLocaleLowerCase().replace(/[.,!?;:]+$/u, "");
          const ingredients = field<readonly { readonly id: string; readonly word: string }[]>(snapshot, "conveyor");
          const target = ingredients.find((ingredient) => ingredient.word.toLocaleLowerCase().replace(/[.,!?;:]+$/u, "") === targetWord);
          if (!target) throw new Error(`Potion Rush target ingredient is absent: ${diagnostic(snapshot)}`);
          if (field<string | undefined>(snapshot, "selectedIngredientId") !== target.id) {
            await sendAction(page, activePlanner, POTION_RUSH_KEYBOARD_BINDINGS, "move-right");
          } else {
            await sendAction(page, activePlanner, POTION_RUSH_KEYBOARD_BINDINGS, "confirm");
          }
        }
      };
      return { planner, step };
    }
    case "dungeon-liberator": {
      const controller = createDungeonLiberatorController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      let lastStepAt = Date.now();
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const now = Date.now();
        activePlanner.tick(Math.min(50, Math.max(0, now - lastStepAt)));
        lastStepAt = now;
        const snapshot = activePlanner.snapshot();
        const player = field<{ readonly x: number; readonly y: number }>(snapshot, "player");
        const prisoners = field<readonly { readonly orderIndex: number; readonly x: number; readonly y: number }[]>(snapshot, "prisoners");
        const portal = field<{ readonly x: number; readonly y: number }>(snapshot, "portal");
        const target = prisoners.find((prisoner) => prisoner.orderIndex === field<number>(snapshot, "wordIndex")) ?? portal;
        const monsters = field<readonly { readonly x: number; readonly y: number; readonly radius: number }[]>(snapshot, "monsters");
        const moves = [
          { action: "move-left", x: -24, y: 0 },
          { action: "move-right", x: 24, y: 0 },
          { action: "move-up", x: 0, y: -24 },
          { action: "move-down", x: 0, y: 24 },
        ] as const;
        const ranked = moves.map((move) => {
          const x = Math.max(24, Math.min(CANVAS_WIDTH - 24, player.x + move.x));
          const y = Math.max(24, Math.min(CANVAS_HEIGHT - 24, player.y + move.y));
          const targetDistance = Math.hypot(target.x - x, target.y - y);
          const monsterDistance = Math.min(...monsters.map((monster) => Math.hypot(monster.x - x, monster.y - y) - monster.radius), Number.POSITIVE_INFINITY);
          const dangerPenalty = Math.max(0, 180 - monsterDistance) * 30;
          return { action: move.action, score: targetDistance + dangerPenalty };
        }).sort((first, second) => first.score - second.score);
        const action = ranked[0]!.action;
        const button = getDungeonLiberatorDpadButtons(CANVAS_WIDTH, CANVAS_HEIGHT)
          .find((candidate) => candidate.action === action);
        if (!button) throw new Error(`Dungeon Liberator D-pad omits ${action}`);
        await clickLogicalCanvas(
          page,
          _canvas,
          button.x + button.width / 2,
          button.y + button.height / 2,
        );
        activePlanner.apply(action);
      };
      const finishBrowserAfterPlannerTerminal = async (page: Page, canvas: Locator): Promise<void> => {
        const visual = await readDungeonLiberatorVisualState(page, canvas);
        if (!visual.player || !visual.target) {
          await page.waitForTimeout(FRAME_WAIT_MS);
          return;
        }
        const horizontalDistance = visual.target.x - visual.player.x;
        const verticalDistance = visual.target.y - visual.player.y;
        const collisionThreshold = Math.max(8, visual.width * 0.035);
        if (Math.abs(horizontalDistance) <= collisionThreshold && Math.abs(verticalDistance) <= collisionThreshold) {
          await page.waitForTimeout(100);
          return;
        }
        const action = Math.abs(horizontalDistance) >= Math.abs(verticalDistance)
          ? (horizontalDistance < 0 ? "move-left" : "move-right")
          : (verticalDistance < 0 ? "move-up" : "move-down");
        const key = Object.entries(DUNGEON_LIBERATOR_KEYBOARD_BINDINGS)
          .find(([, mappedAction]) => mappedAction === action)?.[0];
        if (!key) throw new Error(`Dungeon Liberator has no keyboard binding for ${action}`);
        const browserKey = /^Key[A-Z]$/u.test(key) ? key.slice(3).toLocaleLowerCase() : key;
        await page.keyboard.down(browserKey);
        await page.waitForTimeout(200);
        await page.keyboard.up(browserKey);
        await page.waitForTimeout(FRAME_WAIT_MS);
      };
      return { planner, step, finishBrowserAfterPlannerTerminal };
    }
    case "rune-forge-chamber": {
      const controller = createRuneForgeChamberController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        let snapshot = activePlanner.snapshot();
        const runes = field<readonly { readonly id: string; readonly selected: boolean }[]>(snapshot, "runes");
        const targetId = field<string | undefined>(snapshot, "nextRuneId");
        if (!targetId) throw new Error(`Rune Forge Chamber has no target rune: ${diagnostic(snapshot)}`);
        for (let moveCount = 0; moveCount <= runes.length; moveCount += 1) {
          snapshot = activePlanner.snapshot();
          if (snapshot.correctAction === "confirm" && snapshot.cursorRuneId === targetId) break;
          await sendAction(page, activePlanner, RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS, "move-right");
        }
        await sendAction(page, activePlanner, RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS, snapshot.correctAction);
      };
      return { planner, step };
    }
    case "village-guardian": {
      const controller = createVillageGuardianController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      return { planner, step: createKeyboardActionDriver(VILLAGE_GUARDIAN_KEYBOARD_BINDINGS) };
    }
    case "abyssal-well": {
      const controller = createAbyssalWellController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.advance(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const enemies = field<readonly { readonly lane: number; readonly wordIndex: number }[]>(snapshot, "enemies");
        const target = enemies.find((enemy) => enemy.wordIndex === snapshot.targetIndex);
        if (!target) {
          await waitForFrame(page, activePlanner, 100);
          return;
        }
        const player = field<{ readonly lane: number }>(snapshot, "player");
        const clockwise = (target.lane - player.lane + 8) % 8;
        if (clockwise !== 0) {
          await sendAction(page, activePlanner, ABYSSAL_WELL_KEYBOARD_BINDINGS, clockwise <= 4 ? "move-right" : "move-left");
          return;
        }
        await sendAction(page, activePlanner, ABYSSAL_WELL_KEYBOARD_BINDINGS, snapshot.correctAction);
      };
      return { planner, step };
    }
    case "archers-revenge": {
      const controller = createArchersRevengeController(PUBLIC_ARCADE_VOCABULARY_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const target = field<{ readonly column: number }>(snapshot, "target");
        const aimColumn = field<number>(snapshot, "aimColumn");
        if (aimColumn !== target.column) {
          await sendAction(page, activePlanner, ARCHERS_REVENGE_KEYBOARD_BINDINGS, aimColumn < target.column ? "move-right" : "move-left");
          return;
        }
        await sendAction(page, activePlanner, ARCHERS_REVENGE_KEYBOARD_BINDINGS, snapshot.correctAction);
      };
      return { planner, step };
    }
    case "storm-castle-tower": {
      const controller = createStormCastleTowerController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, SEED);
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      return { planner, step: createKeyboardActionDriver(STORM_CASTLE_TOWER_KEYBOARD_BINDINGS) };
    }
    case "griffin-sky-joust": {
      const controller = createGriffinSkyJoustController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        () => undefined,
        () => undefined,
        () => controller.destroy(),
      );
      const flightPlan = "UUULUURL..........URU..R.LRLR.R.R..";
      let flightStep = 0;
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const input = flightPlan[flightStep % flightPlan.length];
        flightStep += 1;
        const action = input === "U"
          ? "move-up"
          : input === "L"
            ? "move-left"
            : input === "R"
              ? "move-right"
              : undefined;
        if (action) {
          await sendAction(page, activePlanner, GRIFFIN_SKY_JOUST_KEYBOARD_BINDINGS, action);
        } else {
          await waitForFrame(page, activePlanner);
        }
      };
      return { planner, step };
    }
    case "realm-carver": {
      const controller = createRealmCarverController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      let path: readonly string[] = [];
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        let snapshot = activePlanner.snapshot();
        if (path.length === 0) {
          const words = field<readonly { readonly position: { readonly x: number; readonly y: number } }[]>(snapshot, "words");
          const target = words[snapshot.targetIndex];
          if (!target) throw new Error(`Realm Carver target is absent: ${diagnostic(snapshot)}`);
          const gridSize = field<number>(snapshot, "gridSize");
          const left = (count: number) => Array.from({ length: count }, () => "move-left");
          const right = (count: number) => Array.from({ length: count }, () => "move-right");
          const down = (count: number) => Array.from({ length: count }, () => "move-down");
          const up = (count: number) => Array.from({ length: count }, () => "move-up");
          const player = field<{ readonly x: number; readonly y: number }>(snapshot, "player");
          const toTopLeft = [...left(player.x), ...up(player.y)];
          const leftEdge = Math.max(1, target.position.x - 1);
          const rightEdge = Math.min(gridSize - 2, target.position.x + 1);
          const topEdge = Math.max(1, target.position.y - 1);
          const bottomEdge = Math.min(gridSize - 2, target.position.y + 1);
          path = [
            ...toTopLeft,
            ...right(leftEdge),
            ...down(bottomEdge),
            ...right(rightEdge - leftEdge),
            ...up(bottomEdge - topEdge),
            ...right(gridSize - 1 - rightEdge),
            "confirm",
          ];
        }
        const action = path[0];
        if (!action) return;
        path = path.slice(1);
        await sendAction(page, activePlanner, REALM_CARVER_KEYBOARD_BINDINGS, action);
        snapshot = activePlanner.snapshot();
        if (snapshot.phase !== "playing") path = [];
      };
      return { planner, step };
    }
    case "paladins-twin-soul": {
      const controller = createPaladinsTwinSoulController(PUBLIC_ARCADE_VOCABULARY_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const player = field<{ readonly x: number }>(snapshot, "player");
        const enemies = field<readonly { readonly id: string; readonly x: number }[]>(snapshot, "enemies");
        const target = enemies.find((enemy) => enemy.id === snapshot.correctAction);
        const action = target && Math.abs(target.x - player.x) > 35
          ? (target.x > player.x ? "move-right" : "move-left")
          : "confirm";
        await sendAction(page, activePlanner, PALADINS_TWIN_SOUL_KEYBOARD_BINDINGS, action);
      };
      return { planner, step };
    }
    case "devourer-slime": {
      const controller = createDevourerSlimeController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0], PLANNER_TICK_MS),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      return { planner, step: createKeyboardActionDriver(DEVOURER_SLIME_KEYBOARD_BINDINGS) };
    }
    case "haunted-library": {
      const controller = createHauntedLibraryController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, { seed: SEED });
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const doors = field<readonly { readonly floor: number; readonly x: number; readonly isOpen: boolean }[]>(snapshot, "doors");
        const player = field<{ readonly floor: number; readonly x: number }>(snapshot, "player");
        const target = doors.find((door) => !door.isOpen && door.floor === player.floor) ?? doors.find((door) => !door.isOpen);
        if (!target) {
          await waitForFrame(page, activePlanner, 100);
          return;
        }
        if (target.floor !== player.floor) {
          const edgeAction = player.x <= 56 ? "move-left" : player.x >= 334 ? "move-right" : player.x < 195 ? "move-left" : "move-right";
          await sendAction(page, activePlanner, HAUNTED_LIBRARY_KEYBOARD_BINDINGS, edgeAction);
          if (Math.abs(player.x - (edgeAction === "move-left" ? 0 : 390)) <= 56) {
            await sendAction(page, activePlanner, HAUNTED_LIBRARY_KEYBOARD_BINDINGS, "move-up");
          }
          return;
        }
        const circular = Math.abs(target.x - player.x);
        if (circular > 72) {
          await sendAction(page, activePlanner, HAUNTED_LIBRARY_KEYBOARD_BINDINGS, target.x > player.x ? "move-right" : "move-left");
          return;
        }
        await sendAction(page, activePlanner, HAUNTED_LIBRARY_KEYBOARD_BINDINGS, snapshot.correctAction);
      };
      return { planner, step };
    }
    case "gryphon-patrol": {
      const controller = createGryphonPatrolController(PUBLIC_ARCADE_SENTENCE_FIXTURE, noOpDelivery, SEED);
      const planner = createPlanner(
        () => controller.snapshot(),
        (action) => controller.choose(action as Parameters<typeof controller.choose>[0]),
        (deltaMs) => controller.tick(deltaMs),
        () => controller.destroy(),
      );
      const step: DriverStep = async (page, _canvas, activePlanner) => {
        const snapshot = activePlanner.snapshot();
        const enemies = field<readonly { readonly isTarget: boolean; readonly isActive: boolean; readonly x: number; readonly y: number }[]>(snapshot, "enemies");
        const orbs = field<readonly { readonly targetId: string; readonly isActive: boolean; readonly x: number; readonly y: number }[]>(snapshot, "orbs");
        const player = field<{ readonly x: number; readonly y: number }>(snapshot, "player");
        const target = enemies.find((enemy) => enemy.isTarget && enemy.isActive);
        const orb = orbs.find((candidate) => candidate.isActive && candidate.targetId === snapshot.correctAction);
        const point = orb ?? target;
        if (point && Math.abs(point.x - player.x) > 45) {
          await sendAction(page, activePlanner, GRYPHON_PATROL_KEYBOARD_BINDINGS, point.x > player.x ? "move-right" : "move-left");
          return;
        }
        if (point && Math.abs(point.y - player.y) > 45) {
          await sendAction(page, activePlanner, GRYPHON_PATROL_KEYBOARD_BINDINGS, point.y > player.y ? "move-down" : "move-up");
          return;
        }
        await sendAction(page, activePlanner, GRYPHON_PATROL_KEYBOARD_BINDINGS, snapshot.correctAction);
      };
      const fallbackActions = [
        ...Array.from({ length: 13 }, () => "move-down" as const),
        ...Array.from({ length: 52 }, () => "move-right" as const),
        ...Array.from({ length: 13 }, () => "move-up" as const),
        ...Array.from({ length: 52 }, () => "move-right" as const),
        ...Array.from({ length: 7 }, () => "move-down" as const),
        ...Array.from({ length: 52 }, () => "move-right" as const),
        ...Array.from({ length: 7 }, () => "move-up" as const),
        ...Array.from({ length: 52 }, () => "move-right" as const),
      ];
      let fallbackStep = 0;
      const finishBrowserAfterPlannerTerminal = async (page: Page): Promise<void> => {
        const action = fallbackActions[fallbackStep % fallbackActions.length]!;
        fallbackStep += 1;
        const key = Object.entries(GRYPHON_PATROL_KEYBOARD_BINDINGS)
          .find(([, mappedAction]) => mappedAction === action)?.[0];
        if (!key) throw new Error(`Gryphon Patrol has no fallback binding for ${action}`);
        await sendKey(page, key);
      };
      return { planner, step, finishBrowserAfterPlannerTerminal };
    }
    default:
      throw new Error(`No bespoke public driver exists for ${id}`);
  }
}

/**
 * Completes one bespoke cartridge through bounded planner-guided browser input.
 * @param page Active cartridge page.
 * @param canvas Mounted Phaser canvas.
 * @param title Product-facing cartridge title.
 * @param id Stable cartridge identifier.
 * @param vocabularyInput Optional vocabulary deck that mirrors authenticated browser content.
 * @returns A promise resolved after the browser reaches its result screen.
 */
export async function completePublicBespokeCartridge(
  page: Page,
  canvas: Locator,
  title: string,
  id: string,
  vocabularyInput?: Readonly<VocabularyInput>,
): Promise<void> {
  const driver = createDriver(id, vocabularyInput);
  try {
    const completion = page.getByText("Game complete", { exact: true });
    for (let stepIndex = 0; stepIndex < MAX_STEPS; stepIndex += 1) {
      if (await completion.isVisible({ timeout: 0 })) return;
      const snapshot = driver.planner.snapshot();
      if (isTerminalPhase(snapshot)) {
        if (await completion.isVisible({ timeout: 3000 })) return;
        if (driver.finishBrowserAfterPlannerTerminal) {
          for (let fallbackStep = 0; fallbackStep < 400; fallbackStep += 1) {
            await driver.finishBrowserAfterPlannerTerminal(page, canvas);
            if (await completion.isVisible({ timeout: 0 })) return;
          }
        }
        throw new Error(`${title} planner reached a terminal state before the browser: ${diagnostic(snapshot)}`);
      } else {
        await driver.step(page, canvas, driver.planner);
      }
      if (await completion.isVisible({ timeout: 0 })) return;
    }
    throw new Error(`${title} bounded real-input driver exhausted after ${MAX_STEPS} steps: ${diagnostic(driver.planner.snapshot())}`);
  } finally {
    driver.planner.destroy();
  }
}
