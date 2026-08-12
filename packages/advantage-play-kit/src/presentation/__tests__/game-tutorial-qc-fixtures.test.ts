import "@testing-library/jest-dom/vitest";

import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDeterministicClock,
  createDeterministicInputSequence,
  RESPONSIVE_VIEWPORT_FIXTURES,
  WORST_CASE_TEXT_FIXTURES,
} from "../../testing/deterministic-fixtures.js";
import {
  gameTutorialDefinitionSchema,
  validateGameTutorialDefinition,
  type GameTutorialActionDriver,
  type GameTutorialDefinition,
} from "../index.js";
import { GameTutorialScreen } from "../game-tutorial-screen.js";
import * as testingFixtures from "../../testing/index.js";

afterEach(cleanup);

const worstCaseTutorial = {
  schemaVersion: 1,
  id: "qc:tutorial-fixture",
  title: `บทเรียนเกมภารกิจคำศัพท์ — ${WORST_CASE_TEXT_FIXTURES.englishLong}`,
  seed: 0x1a2b3c4d,
  labels: {
    progress: "ความคืบหน้าบทเรียน / Tutorial progress",
    pause: "หยุดบทเรียน / Pause tutorial",
    resume: "เล่นบทเรียนต่อ / Resume tutorial",
    advance: "ขั้นตอนถัดไป / Next tutorial step",
    replay: "เล่นบทเรียนซ้ำ / Replay tutorial",
    skip: "ข้ามบทเรียน / Skip tutorial",
  },
  targets: [
    { id: "control:answer-choice", kind: "control" },
    { id: "learning-item:long-content", kind: "learning-item" },
    { id: "feedback:incorrect-choice", kind: "feedback" },
  ],
  actions: [
    { id: "action:highlight-answer", deterministic: true, consequence: "neutral" },
    { id: "action:select-correct-answer", deterministic: true, consequence: "correct" },
    { id: "action:show-incorrect-feedback", deterministic: true, consequence: "incorrect" },
  ],
  steps: [
    {
      id: "step:notice-answer",
      title: "สังเกตตัวเลือกคำตอบ / Inspect every answer choice",
      explanation: `${WORST_CASE_TEXT_FIXTURES.thaiLong} ${WORST_CASE_TEXT_FIXTURES.englishLong}`,
      targetId: "control:answer-choice",
      actionId: "action:highlight-answer",
      timing: { leadInMs: 10, demonstrationMs: 20, lingerMs: 10 },
    },
    {
      id: "step:choose-learning-item",
      title: "Choose the matching learning item / เลือกคำตอบที่ตรงกัน",
      explanation: `${WORST_CASE_TEXT_FIXTURES.englishLong} — ${WORST_CASE_TEXT_FIXTURES.thaiLong}`,
      targetId: "learning-item:long-content",
      actionId: "action:select-correct-answer",
      timing: { leadInMs: 10, demonstrationMs: 20, lingerMs: 10 },
    },
    {
      id: "step:review-incorrect-feedback",
      title: "Review the safe incorrect demonstration / ตรวจสอบตัวอย่างคำตอบผิด",
      explanation: "The tutorial explains the consequence without changing the learner session.",
      targetId: "feedback:incorrect-choice",
      actionId: "action:show-incorrect-feedback",
      timing: { leadInMs: 10, demonstrationMs: 20, lingerMs: 10 },
    },
  ],
  lifecycle: {
    pause: "freeze-current-step",
    advance: "sequential",
    replay: "restart-with-same-seed",
    skip: { enabled: true, to: "countdown" },
    complete: { to: "playing" },
    productionEffects: {
      emitGameResults: false,
      persistProgress: false,
      awardAuthoritativeXp: false,
      writeLeaderboard: false,
      applyFailureConsequences: false,
    },
  },
} as const satisfies GameTutorialDefinition;

type TutorialResourceCounts = {
  readonly listeners: number;
  readonly inputHandlers: number;
  readonly phaserObjects: number;
};

type TutorialFixtureHarness = {
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly input: ReturnType<typeof createDeterministicInputSequence>;
  readonly targetIds: readonly string[];
  readonly actionIds: readonly string[];
  readonly driver: GameTutorialActionDriver & {
    readonly execute: ReturnType<typeof vi.fn>;
    readonly destroy: ReturnType<typeof vi.fn>;
    readonly resources: () => TutorialResourceCounts;
  };
};

type SharedTutorialQcFixtureModule = {
  readonly createGameTutorialQcFixture?: (options: {
    readonly tutorial: GameTutorialDefinition;
    readonly inputModes: readonly ["keyboard", "pointer", "touch"];
  }) => {
    readonly tutorial: GameTutorialDefinition;
    readonly controller: {
      readonly getSnapshot: () => {
        readonly currentStep?: GameTutorialDefinition["steps"][number];
        readonly currentTarget?: GameTutorialDefinition["targets"][number];
        readonly currentAction?: GameTutorialDefinition["actions"][number];
        readonly mode: "tutorial";
        readonly phase: "tutorial";
        readonly status: "idle" | "running" | "paused";
        readonly progress: { readonly completed: number; readonly total: number };
        readonly seed: number;
        readonly resources: { readonly listeners: number; readonly inputHandlers: number; readonly phaserObjects: number };
      };
      readonly start: () => void | Promise<void>;
      readonly pause: () => void | Promise<void>;
      readonly resume: () => void | Promise<void>;
      readonly advance: () => void | Promise<void>;
      readonly replay: () => void | Promise<void>;
      readonly skip: () => void | Promise<void>;
    };
    readonly clock: {
      readonly now: () => number;
      readonly runAll: () => Promise<void>;
      readonly pendingCount: () => number;
    };
    readonly input: { readonly next: () => { readonly modality: "keyboard" | "pointer" | "touch" } | undefined };
    readonly targetIds: readonly string[];
    readonly actionIds: readonly string[];
    readonly driver: {
      readonly executed: readonly string[];
      readonly resources: () => TutorialResourceCounts;
    };
    readonly canvasCount: () => number;
  };
};

/** Creates one deterministic QC fixture for the shared tutorial controller boundary. */
function createTutorialQcFixture(): TutorialFixtureHarness {
  const clock = createDeterministicClock();
  const input = createDeterministicInputSequence([
    { modality: "keyboard", code: "ArrowRight", phase: "down" },
    { modality: "pointer", phase: "down", x: 0, y: 0 },
    { modality: "touch", phase: "down" },
  ]);
  let resources: TutorialResourceCounts = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  const execute = vi.fn(() => {
    resources = { listeners: 1, inputHandlers: 1, phaserObjects: 1 };
  });
  const destroy = vi.fn(() => {
    resources = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  });

  return {
    clock,
    input,
    targetIds: worstCaseTutorial.targets.map((target) => target.id),
    actionIds: worstCaseTutorial.actions.map((action) => action.id),
    driver: { execute, destroy, resources: () => resources },
  };
}

/** Loads the shared QC fixture factory that the Green implementation must publish. */
function loadSharedQcFixtureFactory(): NonNullable<SharedTutorialQcFixtureModule["createGameTutorialQcFixture"]> {
  const imported = testingFixtures as unknown as SharedTutorialQcFixtureModule;
  expect(imported.createGameTutorialQcFixture, "QC fixture module must export createGameTutorialQcFixture").toBeTypeOf("function");
  return imported.createGameTutorialQcFixture!;
}

describe("guided tutorial QC fixtures", () => {
  it("validates deterministic clock, input, semantic target, and action fixtures", () => {
    const fixture = createTutorialQcFixture();
    const tutorial = validateGameTutorialDefinition(worstCaseTutorial);

    expect(fixture.clock.now()).toBe(0);
    fixture.clock.advance(40);
    expect(fixture.clock.now()).toBe(40);
    expect(fixture.input.next()).toEqual({ modality: "keyboard", code: "ArrowRight", phase: "down" });
    expect(fixture.input.next()).toEqual({ modality: "pointer", phase: "down", x: 0, y: 0 });
    expect(tutorial.targets.map((target) => target.id)).toEqual(fixture.targetIds);
    expect(tutorial.actions.map((action) => action.id)).toEqual(fixture.actionIds);
    expect(gameTutorialDefinitionSchema.safeParse(tutorial).success).toBe(true);
  });

  it("keeps worst-case Thai and English tutorial content complete at the QC boundary", () => {
    const tutorial = validateGameTutorialDefinition(worstCaseTutorial);
    const serialized = JSON.stringify(tutorial);

    expect(serialized).toContain(WORST_CASE_TEXT_FIXTURES.thaiLong);
    expect(serialized).toContain(WORST_CASE_TEXT_FIXTURES.englishLong);
    expect(tutorial.steps).toHaveLength(3);
    expect(tutorial.steps.every((step) => step.title.trim().length > 0 && step.explanation.trim().length > 0)).toBe(true);
  });

  it.each(RESPONSIVE_VIEWPORT_FIXTURES.map((fixture) => [fixture.id, fixture.width, fixture.height, fixture.expectedProfile] as const))(
    "provides a named no-obstruction viewport fixture for %s",
    (id, width, height, expectedProfile) => {
      expect(`${id}:${width}x${height}`).toMatch(/^[a-z-]+:[0-9]+x[0-9]+$/u);
      expect(width * height, "QC viewport area must be positive").toBeGreaterThan(0);
      expect(["compact", "wide"]).toContain(expectedProfile);
    },
  );

  it("accepts keyboard, pointer, and touch replay input without physical selectors or coordinates in the tutorial manifest", () => {
    const fixture = createTutorialQcFixture();
    const inputs = [fixture.input.next(), fixture.input.next(), fixture.input.next()];

    expect(inputs).toHaveLength(3);
    expect(inputs.map((input) => input?.modality)).toEqual(["keyboard", "pointer", "touch"]);
    expect(worstCaseTutorial.steps.flatMap((step) => Object.keys(step))).not.toContain("selector");
    expect(worstCaseTutorial.steps.flatMap((step) => Object.keys(step))).not.toContain("coordinates");
  });

  it("exposes a driver resource fixture that starts active and ends empty after interruption", () => {
    const fixture = createTutorialQcFixture();

    fixture.driver.execute({} as never);
    expect(fixture.driver.resources()).toEqual({ listeners: 1, inputHandlers: 1, phaserObjects: 1 });
    fixture.driver.destroy();
    expect(fixture.driver.resources()).toEqual({ listeners: 0, inputHandlers: 0, phaserObjects: 0 });
    expect(fixture.driver.destroy).toHaveBeenCalledOnce();
  });

  it("publishes one shared fixture harness for the controller, all input modalities, targets, and actions", async () => {
    const createFixture = loadSharedQcFixtureFactory();
    const fixture = createFixture({
      tutorial: validateGameTutorialDefinition(worstCaseTutorial),
      inputModes: ["keyboard", "pointer", "touch"],
    });

    expect(fixture.clock.now()).toBe(0);
    expect(fixture.targetIds).toEqual(worstCaseTutorial.targets.map((target) => target.id));
    expect(fixture.actionIds).toEqual(worstCaseTutorial.actions.map((action) => action.id));
    expect([fixture.input.next()?.modality, fixture.input.next()?.modality, fixture.input.next()?.modality]).toEqual([
      "keyboard",
      "pointer",
      "touch",
    ]);

    await fixture.controller.start();
    await fixture.clock.runAll();
    const snapshot = fixture.controller.getSnapshot();
    render(
      createElement(GameTutorialScreen, {
        tutorial: fixture.tutorial,
        snapshot,
        controller: fixture.controller,
        targetLabel: "The semantic tutorial target",
        actionLabel: "The deterministic cartridge action",
        layoutProfile: "compact",
        reducedMotion: true,
      }),
    );
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Highlighted tutorial target" })).toBeInTheDocument();
    expect(fixture.driver.executed.length).toBeGreaterThan(0);
    expect(fixture.canvasCount()).toBe(1);
  });

});
