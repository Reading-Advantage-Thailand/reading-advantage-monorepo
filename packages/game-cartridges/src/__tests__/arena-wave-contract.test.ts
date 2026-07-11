import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import * as catalog from "../catalog";

const ids = [
  "archers-revenge",
  "paladins-twin-soul",
  "griffin-sky-joust",
  "gryphon-patrol",
  "realm-carver",
] as const;

describe("APK arena and target-action W4 contract", () => {
  it("freezes five public identities behind the generic arcade route", () => {
    expect(catalog.arenaWaveBlueprints.map((entry) => ({
      id: entry.id,
      inputMode: entry.inputMode,
      productionRoute: entry.productionRoute,
    }))).toEqual([
      { id: "archers-revenge", inputMode: "vocabulary", productionRoute: "/[locale]/student/arcade/[cartridgeId]" },
      { id: "paladins-twin-soul", inputMode: "vocabulary", productionRoute: "/[locale]/student/arcade/[cartridgeId]" },
      { id: "griffin-sky-joust", inputMode: "sentence", productionRoute: "/[locale]/student/arcade/[cartridgeId]" },
      { id: "gryphon-patrol", inputMode: "sentence", productionRoute: "/[locale]/student/arcade/[cartridgeId]" },
      { id: "realm-carver", inputMode: "sentence", productionRoute: "/[locale]/student/arcade/[cartridgeId]" },
    ]);
  });

  it("declares deterministic fixtures, equivalent input modes, slots, and result mapping", () => {
    for (const blueprint of catalog.arenaWaveBlueprints) {
      expect(blueprint.contentFixture.length).toBeGreaterThan(0);
      expect(blueprint.controls.keyboard.length).toBeGreaterThan(0);
      expect(blueprint.controls.pointer.length).toBeGreaterThan(0);
      expect(blueprint.controls.touch).toEqual(blueprint.controls.pointer);
      expect(blueprint.requiredAssetSlots).toEqual(expect.arrayContaining([
        "world.background", "player.hero", "target.correct", "target.incorrect", "ui.panel",
      ]));
      expect(blueprint.resultMapping).toEqual({
        score: "max(0, correctAnswers * 100 - incorrectAnswers * 20)",
        accuracy: "correctAnswers / totalAttempts",
        correctAnswers: "correctAnswers",
        totalAttempts: "totalAttempts",
        xp: "floor(max(0, score) / 10)",
      });
    }
  });

  it("publishes exactly one loader for every W4 ID", () => {
    expect(ids.every((id) => id in catalog.cartridgeLoaders)).toBe(true);
    expect(catalog.cartridgeCatalog.slice(-5).map(({ id }) => id)).toEqual(ids);
  });

  it("keeps every retired W4 legacy family deleted", () => {
    const root = resolve(import.meta.dirname, "../../../..");
    const candidates = ids.flatMap((id) => [
      `apps/advantage-games/src/app/api/v1/games/${id}`,
      `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/${id}`,
      `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/${id}`,
      `apps/advantage-games/src/components/games/vocabulary/${id}`,
      `apps/advantage-games/src/components/games/sentence/${id}`,
    ]);
    for (const candidate of candidates) {
      const path = resolve(root, candidate);
      expect(
        !existsSync(path) || readdirSync(path, { recursive: true, withFileTypes: true }).every((entry) => entry.isDirectory()),
      ).toBe(true);
    }
    for (const legacyName of ["archersRevenge", "paladinsTwinSoul", "griffinSkyJoust", "gryphonPatrol", "realmCarver"]) {
      expect(existsSync(resolve(root, `apps/advantage-games/src/lib/games/${legacyName}.ts`))).toBe(false);
      expect(existsSync(resolve(root, `apps/advantage-games/src/lib/games/${legacyName}Config.ts`))).toBe(false);
    }
    const e2eRoot = resolve(root, "apps/advantage-games/tests/e2e");
    const e2eFiles = readdirSync(e2eRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => resolve(entry.parentPath, entry.name));
    for (const file of e2eFiles) {
      const source = readFileSync(file, "utf8");
      for (const id of ids) {
        expect(source).not.toContain(`/api/v1/${["games", id].join("/")}`);
        expect(source).not.toMatch(new RegExp(`/student/games/(?:sentence|vocabulary)/${id}`));
      }
    }
  });
});
