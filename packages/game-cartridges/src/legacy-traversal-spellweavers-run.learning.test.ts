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
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import { describe, expect, it } from "vitest";

import { cartridgeLoaders, getCartridgeCatalogEntry } from "./catalog.js";

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
  expect(cartridge.manifest.id, `${missing}; manifest id is absent`).toBe(
    fixture.title_id,
  );
  expect(cartridge.manifest.inputMode, `${missing}; input mode is absent`).toBe(
    fixture.input_mode,
  );
  const config = cartridge.createGameConfig({
    input: fixture.input as GameInput,
    edition: {} as RuntimeEdition,
    complete: () => undefined,
    diagnostic: () => undefined,
    inputController: {
      snapshot: () => ({
        keys: [],
        pointer: {
          down: false,
          cancelled: false,
          id: null,
          kind: null,
          startX: 0,
          startY: 0,
          x: 0,
          y: 0,
        },
        destroyed: false,
      }),
      cancelActiveGesture: () => undefined,
      destroy: () => undefined,
    },
  });
  expect(
    config,
    `${missing}; createGameConfig returned a no-op config`,
  ).toEqual(expect.objectContaining({ scene: expect.anything() }));
  return cartridge;
}

describe("legacy traversal Phase 3 Spellweaver's Run learning contract", () => {
  it("requires ordered orb collection to advance educational targets and emit one result", async () => {
    const fixture = loadFixture("spellweavers-run");
    const progression = createLanguageTargetProgression(
      fixture.learning.targets,
    );
    expect(progression.match(fixture.learning.wrong_candidate)).toEqual({
      matched: false,
      progressed: false,
    });
    expect(progression.currentIndex).toBe(0);
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
      "the cartridge must preserve ordered orb progress, exact result accounting, and one completion",
    );
  });
});
