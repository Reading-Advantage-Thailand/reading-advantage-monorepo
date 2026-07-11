import { describe, expect, it } from "vitest";

import * as catalogModule from "../catalog";

type RunnerWaveBlueprint = {
  readonly id: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly mechanic: string;
  readonly requiredAssetSlots: readonly string[];
  readonly controls: {
    readonly keyboard: readonly string[];
    readonly pointer: readonly string[];
    readonly touch: readonly string[];
  };
  readonly resultMapping: {
    readonly score: string;
    readonly accuracy: string;
    readonly durationMs: string;
    readonly completed: string;
    readonly metadata: readonly string[];
  };
  readonly sourceModule: string;
  readonly productionRoute: string;
};

const GENERIC_ARCADE_ROUTE = "/[locale]/student/arcade/[cartridgeId]";
const COMMON_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "feedback.correct",
  "feedback.incorrect",
  "ui.panel",
] as const;

const expectedRunnerWaveBlueprints = [
  {
    id: "dragon-rider",
    inputMode: "vocabulary",
    mechanic: "two-lane-gate-traversal",
    requiredAssetSlots: [
      ...COMMON_SLOTS,
      "target.gate",
      "ally.dragon",
      "enemy.boss",
    ],
    controls: {
      keyboard: ["ArrowLeft", "KeyA", "ArrowRight", "KeyD"],
      pointer: ["choose-left-gate", "choose-right-gate"],
      touch: ["choose-left-gate", "choose-right-gate"],
    },
    resultMapping: {
      score: "correctAnswers",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "dragonCount >= bossPower",
      metadata: ["dragonCount", "bossPower", "totalAttempts"],
    },
    sourceModule: "./cartridges/dragon-rider",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "spellweavers-run",
    inputMode: "sentence",
    mechanic: "three-lane-ordered-collector",
    requiredAssetSlots: [
      ...COMMON_SLOTS,
      "lane.marker",
      "target.word-orb",
      "zone.collection",
      "effect.mana",
    ],
    controls: {
      keyboard: ["ArrowLeft", "KeyA", "ArrowDown", "KeyS", "ArrowRight", "KeyD"],
      pointer: ["choose-left-lane", "choose-center-lane", "choose-right-lane"],
      touch: ["choose-left-lane", "choose-center-lane", "choose-right-lane"],
    },
    resultMapping: {
      score: "score",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "all sentence words collected",
      metadata: ["combo", "mana", "sentencesCompleted", "totalAttempts"],
    },
    sourceModule: "./cartridges/spellweavers-run",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "griffin-riders-escape",
    inputMode: "sentence",
    mechanic: "three-lane-perspective-gates",
    requiredAssetSlots: [
      ...COMMON_SLOTS,
      "lane.marker",
      "target.gate",
      "hazard.obstacle",
      "effect.wind",
    ],
    controls: {
      keyboard: ["ArrowLeft", "KeyA", "ArrowRight", "KeyD"],
      pointer: ["move-left", "move-right"],
      touch: ["move-left", "move-right", "swipe-left", "swipe-right"],
    },
    resultMapping: {
      score: "score",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "all sentence gates cleared",
      metadata: ["combo", "lives", "totalAttempts"],
    },
    sourceModule: "./cartridges/griffin-riders-escape",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "storm-castle-tower",
    inputMode: "sentence",
    mechanic: "vertical-ordered-traversal",
    requiredAssetSlots: [
      ...COMMON_SLOTS,
      "terrain.tower",
      "target.window",
      "hazard.oil",
      "hazard.rock",
    ],
    controls: {
      keyboard: [
        "ArrowUp",
        "KeyW",
        "ArrowDown",
        "KeyS",
        "ArrowLeft",
        "KeyA",
        "ArrowRight",
        "KeyD",
        "Space",
        "Enter",
      ],
      pointer: ["move-up", "move-down", "move-left", "move-right", "collect"],
      touch: ["move-up", "move-down", "move-left", "move-right", "collect"],
    },
    resultMapping: {
      score: "correctAnswers",
      accuracy: "correctAnswers / totalAttempts",
      durationMs: "elapsedMs",
      completed: "all sentence windows collected",
      metadata: ["lives", "targetIndex", "totalAttempts"],
    },
    sourceModule: "./cartridges/storm-castle-tower",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
] as const satisfies readonly RunnerWaveBlueprint[];

const catalogWithRunnerBlueprints = catalogModule as typeof catalogModule & {
  readonly runnerWaveBlueprints?: readonly RunnerWaveBlueprint[];
};

describe("APK runner traversal wave contract", () => {
  it("freezes the exact W3 blueprint identities, controls, slots, and results", () => {
    expect(catalogWithRunnerBlueprints.runnerWaveBlueprints).toEqual(
      expectedRunnerWaveBlueprints,
    );
  });

  it("publishes the four W3 IDs after the five accepted W2 cartridges", () => {
    expect(catalogModule.cartridgeCatalog.map(({ id }) => id)).toEqual([
      "dragon-flight",
      "dungeon-liberator",
      "magic-defense",
      "astral-mage",
      "sorcerer-ziggurat",
      ...expectedRunnerWaveBlueprints.map(({ id }) => id),
    ]);
  });

  it("keeps W3 cartridge source and hosting provider-neutral", () => {
    for (const blueprint of expectedRunnerWaveBlueprints) {
      expect(blueprint.sourceModule).toMatch(/^\.\/cartridges\/[a-z0-9-]+$/);
      expect(blueprint.sourceModule).not.toMatch(/firebase|prisma|drizzle|next\//i);
      expect(blueprint.productionRoute).toBe(GENERIC_ARCADE_ROUTE);
      expect(blueprint.productionRoute).not.toContain(blueprint.id);
    }
  });

  it("continues to reject unknown IDs instead of routing to a copied host", () => {
    expect(catalogModule.getCartridgeCatalogEntry("runner-wave-preview")).toBeUndefined();
    expect(catalogModule.getCartridgeCatalogEntry("not-a-game")).toBeUndefined();
  });
});
