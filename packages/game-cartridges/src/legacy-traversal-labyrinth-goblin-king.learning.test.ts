import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCompletionLatch,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  type GameInput,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { describe, expect, it } from "vitest";

import { cartridgeLoaders, getCartridgeCatalogEntry } from "./catalog.js";
import {
  assertCartridgeBoundary,
  assertNonEmptyCartridgeScene,
  createPhase3InputController,
  PHASE3_RUNTIME_EDITION,
} from "./legacy-traversal-phase3-test-helpers.js";

type Evidence = {
  readonly artifact: string;
  readonly json_pointer: string;
  readonly claim_id: string;
};
type LearningFixture = {
  readonly evidence: Evidence;
  readonly targets: readonly string[];
  readonly wrong_candidate: string;
};
type TitleFixture = {
  readonly title_id: string;
  readonly input: unknown;
  readonly input_mode: "vocabulary" | "sentence";
  readonly learning: LearningFixture;
};
type FixtureDocument = { readonly titles: readonly TitleFixture[] };

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_PATH = resolve(
  REPO_ROOT,
  "measure/tracks/apk_legacy_traversal_cutover_20260727/phase3-red-fixtures.json",
);

function loadFixture(titleId: string): TitleFixture {
  const document = JSON.parse(
    readFileSync(FIXTURE_PATH, "utf8"),
  ) as FixtureDocument;
  const fixture = document.titles.find((title) => title.title_id === titleId);
  if (!fixture) throw new Error(`MISSING_PHASE3_FIXTURE: ${titleId}`);
  return fixture;
}

async function requireCartridge(
  fixture: TitleFixture,
  evidence: Evidence,
  behavior: string,
): Promise<RuntimeCartridge> {
  const missing = `MISSING_CARTRIDGE_BEHAVIOR: ${fixture.title_id}; evidence=${evidence.claim_id}; ${behavior}`;
  const entry = getCartridgeCatalogEntry(fixture.title_id);
  expect(entry, missing).toBeDefined();
  const loader = (
    cartridgeLoaders as unknown as Readonly<
      Record<string, () => Promise<RuntimeCartridge>>
    >
  )[fixture.title_id];
  expect(loader, `${missing}; the public loader is absent`).toBeTypeOf(
    "function",
  );
  const cartridge = await (loader as () => Promise<RuntimeCartridge>)();
  expect(cartridge, missing).toBeDefined();
  assertCartridgeBoundary(
    cartridge,
    fixture.title_id,
    fixture.input_mode,
    missing,
  );
  const config = cartridge.createGameConfig({
    input: fixture.input as GameInput,
    edition: PHASE3_RUNTIME_EDITION,
    complete: () => undefined,
    diagnostic: () => undefined,
    inputController: createPhase3InputController(),
    seed: 0,
  });
  assertNonEmptyCartridgeScene(config, missing);
  return cartridge;
}

describe("legacy traversal Phase 3 Labyrinth of the Goblin King learning contract", () => {
  it("requires ordered word-orb collection to advance educational targets and emit one result", async () => {
    const fixture = loadFixture("labyrinth-goblin-king");
    const progression = createLanguageTargetProgression(
      fixture.learning.targets,
    );
    expect(fixture.learning.targets.length).toBeGreaterThan(0);
    expect(new Set(fixture.learning.targets).size).toBe(
      fixture.learning.targets.length,
    );
    expect(fixture.learning.targets).not.toContain(
      fixture.learning.wrong_candidate,
    );
    expect(progression.match(fixture.learning.wrong_candidate)).toEqual({
      matched: false,
      progressed: false,
    });
    expect(progression.currentIndex).toBe(0);
    if (fixture.learning.targets.length > 1) {
      expect(progression.match(fixture.learning.targets[1])).toEqual({
        matched: false,
        progressed: false,
      });
      expect(progression.currentIndex).toBe(0);
    }
    for (const target of fixture.learning.targets) {
      expect(progression.match(target)).toEqual({
        matched: true,
        progressed: true,
      });
    }
    expect(progression.isComplete).toBe(true);
    expect(progression.completedCount).toBe(fixture.learning.targets.length);

    const accountant = createResultAccountant();
    accountant.recordAttempt({ correct: false });
    accountant.recordAttempt({ correct: true });
    accountant.addScore(10);
    expect(
      finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
    ).toMatchObject({
      correctAnswers: 1,
      totalAttempts: 2,
      accuracy: 0.5,
      score: 10,
    });
    let deliveries = 0;
    const latch = createCompletionLatch(() => {
      deliveries += 1;
    });
    expect(latch.complete({ title: fixture.title_id })).toBe(true);
    expect(latch.complete({ title: fixture.title_id })).toBe(false);
    await latch.drained();
    expect(deliveries).toBe(1);

    await requireCartridge(
      fixture,
      fixture.learning.evidence,
      "the cartridge must preserve ordered word-orb progress, exact result accounting, and one completion",
    );
  });
});
