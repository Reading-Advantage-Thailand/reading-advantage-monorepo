import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as catalogModule from "../catalog";

type RunnerWaveBlueprint = {
  readonly id: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly mechanic: string;
  readonly contentFixture: readonly {
    readonly term: string;
    readonly translation: string;
  }[];
  readonly requiredAssetSlots: readonly string[];
  readonly controls: {
    readonly keyboard: readonly string[];
    readonly pointer: readonly string[];
    readonly touch: readonly string[];
  };
  readonly resultMapping: {
    readonly accuracy: string;
    readonly xp: string;
    readonly score: string;
    readonly correctAnswers: string;
    readonly totalAttempts: string;
  };
  readonly completionCondition: string;
  readonly diagnosticMetadata: readonly string[];
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
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function listFiles(root: string): readonly string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { encoding: "utf8", recursive: true })
    .map((relativePath) => resolve(root, relativePath))
    .filter((path) => statSync(path).isFile());
}

const expectedRunnerWaveBlueprints = [
  {
    id: "dragon-rider",
    inputMode: "vocabulary",
    mechanic: "two-lane-gate-traversal",
    contentFixture: [
      { term: "สวัสดี", translation: "Hello" },
      { term: "ขอบคุณ", translation: "Thank you" },
      { term: "หนังสือ", translation: "Book" },
      { term: "ดวงจันทร์", translation: "Moon" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, correctAnswers * 100 - incorrectAnswers * 20)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all vocabulary gates resolved and boss threshold evaluated",
    diagnosticMetadata: ["dragonCount", "bossPower", "elapsedMs"],
    sourceModule: "./cartridges/dragon-rider",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "spellweavers-run",
    inputMode: "sentence",
    mechanic: "three-lane-ordered-collector",
    contentFixture: [
      { term: "The cat sits on the mat", translation: "แมวนั่งบนเสื่อ" },
      { term: "We play games together", translation: "พวกเราเล่นเกมด้วยกัน" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, score)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all sentence words collected or mana depleted",
    diagnosticMetadata: ["combo", "mana", "sentencesCompleted", "elapsedMs"],
    sourceModule: "./cartridges/spellweavers-run",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "griffin-riders-escape",
    inputMode: "sentence",
    mechanic: "three-lane-perspective-gates",
    contentFixture: [
      { term: "The knight rides the griffin", translation: "อัศวินขี่กริฟฟิน" },
      { term: "Fly through the golden gates", translation: "บินผ่านประตูสีทอง" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, score)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all sentence gates cleared or lives depleted",
    diagnosticMetadata: ["combo", "lives", "elapsedMs"],
    sourceModule: "./cartridges/griffin-riders-escape",
    productionRoute: GENERIC_ARCADE_ROUTE,
  },
  {
    id: "storm-castle-tower",
    inputMode: "sentence",
    mechanic: "vertical-ordered-traversal",
    contentFixture: [
      { term: "The bird flies in the sky", translation: "นกบินบนท้องฟ้า" },
      { term: "The sun is shining bright", translation: "ดวงอาทิตย์ส่องแสงสว่าง" },
    ],
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
      accuracy: "correctAnswers / totalAttempts",
      xp: "floor(max(0, score) / 10)",
      score: "max(0, correctAnswers * 100 - incorrectAnswers * 20)",
      correctAnswers: "correctAnswers",
      totalAttempts: "totalAttempts",
    },
    completionCondition: "all sentence windows collected or lives depleted",
    diagnosticMetadata: ["lives", "targetIndex", "elapsedMs"],
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
    expect(catalogModule.cartridgeCatalog.slice(0, 9).map(({ id }) => id)).toEqual([
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

    const appRoot = resolve(REPOSITORY_ROOT, "apps/advantage-games/src/app");
    const copiedArcadePages = listFiles(appRoot).filter(
      (path) =>
        path.endsWith(`${sep}page.tsx`) &&
        expectedRunnerWaveBlueprints.some(({ id }) =>
          path.includes(`${sep}student${sep}arcade${sep}${id}${sep}`),
        ),
    );
    expect(copiedArcadePages).toEqual([]);

    const cartridgeSourceRoot = resolve(
      REPOSITORY_ROOT,
      "packages/game-cartridges/src/cartridges",
    );
    const providerImports = listFiles(cartridgeSourceRoot)
      .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return /(?:from\s+|import\s*\()["'](?:firebase|@google-cloud|@prisma|prisma|drizzle-orm|next\/)/i.test(
          source,
        )
          ? [path]
          : [];
      });
    expect(providerImports).toEqual([]);
  });

  it("continues to reject unknown IDs instead of routing to a copied host", () => {
    expect(catalogModule.getCartridgeCatalogEntry("runner-wave-preview")).toBeUndefined();
    expect(catalogModule.getCartridgeCatalogEntry("not-a-game")).toBeUndefined();
  });

  it("removes every W3 legacy page, component, state module, and per-game API", () => {
    const legacyPaths = [
      "apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider",
      "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/spellweavers-run",
      "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/griffin-riders-escape",
      "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/storm-castle-tower",
      "apps/advantage-games/src/components/games/vocabulary/dragon-rider",
      "apps/advantage-games/src/components/games/sentence/spellweavers-run",
      "apps/advantage-games/src/components/games/sentence/griffin-riders-escape",
      "apps/advantage-games/src/components/games/sentence/storm-castle-tower",
      "apps/advantage-games/src/lib/games/dragonRider.ts",
      "apps/advantage-games/src/lib/games/spellweaversRun.ts",
      "apps/advantage-games/src/lib/games/spellweaversRunConfig.ts",
      "apps/advantage-games/src/lib/games/griffinRidersEscape.ts",
      "apps/advantage-games/src/lib/games/griffinRidersEscapeConfig.ts",
      "apps/advantage-games/src/lib/games/stormCastleTower.ts",
      "apps/advantage-games/src/lib/games/stormCastleTowerConfig.ts",
      "apps/advantage-games/src/app/api/v1/games/dragon-rider",
      "apps/advantage-games/src/app/api/v1/games/spellweavers-run",
      "apps/advantage-games/src/app/api/v1/games/griffin-riders-escape",
      "apps/advantage-games/src/app/api/v1/games/storm-castle-tower",
    ];

    expect(
      legacyPaths.filter((path) => {
        const absolutePath = resolve(REPOSITORY_ROOT, path);
        if (!existsSync(absolutePath)) return false;
        return statSync(absolutePath).isFile() || listFiles(absolutePath).length > 0;
      }),
    ).toEqual([]);
  });
});
