import { describe, expect, it, vi } from "vitest";

import {
  gameLifecycleTransitionSchema,
  validateGameTutorialDefinition,
  type GameTutorialActionDriver,
  type GameTutorialDefinition,
} from "../index.js";
import { createDeterministicRandom } from "../../testing/test-kit.js";

const tutorialSeed = 0x1a2b3c4d;

const rawTutorial = {
  schemaVersion: 1,
  id: "temple-word-quest-tutorial",
  title: "Temple Word Quest tutorial",
  seed: tutorialSeed,
  labels: {
    progress: "Tutorial progress",
    pause: "Pause tutorial",
    resume: "Resume tutorial",
    advance: "Next step",
    replay: "Replay tutorial",
    skip: "Skip tutorial",
  },
  targets: [
    { id: "control:answer-choice", kind: "control" },
    { id: "learning-item:river", kind: "learning-item" },
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
      title: "Find the answer controls",
      explanation: "Notice the answer choices before making a selection.",
      targetId: "control:answer-choice",
      actionId: "action:highlight-answer",
      timing: { leadInMs: 25, demonstrationMs: 50, lingerMs: 25 },
    },
    {
      id: "step:choose-river",
      title: "Choose the matching word",
      explanation: "The English word river matches the Thai learning item.",
      targetId: "learning-item:river",
      actionId: "action:select-correct-answer",
      timing: { leadInMs: 10, demonstrationMs: 40, lingerMs: 10 },
    },
    {
      id: "step:review-feedback",
      title: "Review the feedback",
      explanation: "Incorrect feedback safely explains why the selected answer does not match.",
      targetId: "feedback:incorrect-choice",
      actionId: "action:show-incorrect-feedback",
      timing: { leadInMs: 5, demonstrationMs: 30, lingerMs: 5 },
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
} as const;

type TutorialResourceCounts = {
  readonly listeners: number;
  readonly inputHandlers: number;
  readonly phaserObjects: number;
};

type TutorialRuntimeSnapshot = {
  readonly phase: "tutorial" | "countdown" | "playing" | "exited" | "interrupted" | "destroyed";
  readonly status: "idle" | "running" | "paused" | "complete" | "skipped" | "exited" | "interrupted" | "destroyed";
  readonly currentStepId?: string;
  readonly progress: { readonly completed: number; readonly total: number };
  readonly seed: number;
  readonly resources: TutorialResourceCounts;
};

type ManualClock = {
  readonly adapter: {
    now(): number;
    setTimeout(callback: () => void | Promise<void>, delayMs: number): number;
    clearTimeout(handle: number): void;
  };
  readonly advanceBy: (durationMs: number) => Promise<void>;
  readonly runAll: () => Promise<void>;
  readonly pendingCount: number;
};

type TutorialEffects = {
  readonly emitGameResults: ReturnType<typeof vi.fn>;
  readonly complete: ReturnType<typeof vi.fn>;
  readonly persistProgress: ReturnType<typeof vi.fn>;
  readonly awardAuthoritativeXp: ReturnType<typeof vi.fn>;
  readonly writeLeaderboard: ReturnType<typeof vi.fn>;
  readonly applyFailureConsequences: ReturnType<typeof vi.fn>;
};

type TutorialRuntime = {
  readonly getSnapshot: () => TutorialRuntimeSnapshot;
  readonly start: () => void | Promise<void>;
  readonly pause: () => void | Promise<void>;
  readonly resume: () => void | Promise<void>;
  readonly advance: () => void | Promise<void>;
  readonly replay: () => void | Promise<void>;
  readonly skip: () => void | Promise<void>;
  readonly exit: () => void | Promise<void>;
  readonly interrupt: () => void | Promise<void>;
  readonly destroy: () => void | Promise<void>;
};

type TutorialRuntimeFactory = (options: {
  readonly tutorial: GameTutorialDefinition;
  readonly actionDriver: GameTutorialActionDriver & { readonly destroy: ReturnType<typeof vi.fn> };
  readonly clock: ManualClock["adapter"];
  readonly effects: TutorialEffects;
  readonly onLifecycleTransition: (transition: unknown) => void;
}) => TutorialRuntime;

type TutorialRuntimeModule = {
  readonly createGameTutorialRuntime?: TutorialRuntimeFactory;
};

type MechanicRun = {
  readonly stepId: string;
  readonly targetId: string;
  readonly actionId: string;
  readonly consequence: "neutral" | "correct" | "incorrect";
  readonly seed: number;
  readonly sample: number;
  readonly at: number;
};

type CartridgeMechanicDriver = GameTutorialActionDriver & {
  readonly destroy: ReturnType<typeof vi.fn>;
  readonly executed: MechanicRun[];
  readonly correctDemonstrations: string[];
  readonly incorrectDemonstrations: string[];
  readonly diagnostics: string[];
  readonly resources: () => TutorialResourceCounts;
  readonly maxActiveResources: () => number;
};

type TutorialHarness = {
  readonly tutorial: GameTutorialDefinition;
  readonly clock: ManualClock;
  readonly driver: CartridgeMechanicDriver;
  readonly effects: TutorialEffects;
  readonly transitions: ReturnType<typeof vi.fn>;
  readonly runtime: TutorialRuntime;
};

/** Creates a deterministic clock whose queued work can be inspected and advanced. */
function createManualClock(): ManualClock {
  let now = 0;
  let nextHandle = 0;
  const timers = new Map<number, { readonly at: number; readonly callback: () => void | Promise<void> }>();
  const setTimeout = vi.fn((callback: () => void | Promise<void>, delayMs: number) => {
    const handle = ++nextHandle;
    timers.set(handle, { at: now + delayMs, callback });
    return handle;
  });
  const clearTimeout = vi.fn((handle: number) => {
    timers.delete(handle);
  });

  const nextTimer = (): [number, { readonly at: number; readonly callback: () => void | Promise<void> }] | undefined => {
    const ordered = [...timers.entries()].sort(([, left], [, right]) => left.at - right.at);
    return ordered[0];
  };

  const advanceBy = async (durationMs: number): Promise<void> => {
    const target = now + durationMs;
    let callbacksRun = 0;
    while (true) {
      const next = nextTimer();
      if (!next || next[1].at > target) break;
      now = next[1].at;
      timers.delete(next[0]);
      await next[1].callback();
      await Promise.resolve();
      callbacksRun += 1;
      if (callbacksRun > 100) {
        throw new Error("The tutorial clock exceeded 100 callbacks in one advance");
      }
    }
    now = target;
  };

  const runAll = async (): Promise<void> => {
    let batchesRun = 0;
    while (timers.size > 0) {
      const next = nextTimer();
      if (!next) break;
      await advanceBy(Math.max(0, next[1].at - now));
      batchesRun += 1;
      if (batchesRun > 100) {
        throw new Error("The tutorial clock did not settle");
      }
    }
  };

  return {
    adapter: { now: () => now, setTimeout, clearTimeout },
    advanceBy,
    runAll,
    get pendingCount() {
      return timers.size;
    },
  };
}

/** Creates effect sinks that expose every production-side effect a tutorial must suppress. */
function createTutorialEffects(): TutorialEffects {
  return {
    emitGameResults: vi.fn(),
    complete: vi.fn(),
    persistProgress: vi.fn(),
    awardAuthoritativeXp: vi.fn(),
    writeLeaderboard: vi.fn(),
    applyFailureConsequences: vi.fn(),
  };
}

/** Produces a stable integer for the deterministic cartridge mechanic fixture. */
function stableStepHash(stepId: string): number {
  let hash = 0;
  for (const character of stepId) {
    hash = Math.imul(hash, 31) + character.codePointAt(0)!;
  }
  return hash >>> 0;
}

/** Converts cartridge records to run-relative observations without changing the records. */
function toRelativeMechanicRuns(runs: readonly MechanicRun[]): Array<Omit<MechanicRun, "at"> & {
  readonly relativeAt: number;
  readonly deltaMs: number;
}> {
  const firstAt = runs[0]?.at ?? 0;
  return runs.map((run, index) => ({
    stepId: run.stepId,
    targetId: run.targetId,
    actionId: run.actionId,
    consequence: run.consequence,
    seed: run.seed,
    sample: run.sample,
    relativeAt: run.at - firstAt,
    deltaMs: index === 0 ? 0 : run.at - runs[index - 1]!.at,
  }));
}

/** Creates the cartridge-owned driver that applies tutorial actions to a real mechanic model. */
function createCartridgeMechanicDriver(clock: ManualClock): CartridgeMechanicDriver {
  const executed: MechanicRun[] = [];
  const correctDemonstrations: string[] = [];
  const incorrectDemonstrations: string[] = [];
  const diagnostics: string[] = [];
  let resources: TutorialResourceCounts = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  let maxActiveResources = 0;

  const destroy = vi.fn(() => {
    resources = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  });

  const execute = vi.fn((context: Parameters<NonNullable<GameTutorialActionDriver["execute"]>>[0]) => {
    expect(context.mode).toBe("tutorial");
    expect(context.seed).toBe(context.tutorial.seed);
    expect(context).not.toHaveProperty("complete");
    expect(context).not.toHaveProperty("persistProgress");
    expect(context).not.toHaveProperty("awardAuthoritativeXp");
    expect(context).not.toHaveProperty("writeLeaderboard");
    expect(context).not.toHaveProperty("navigate");

    const action = context.tutorial.actions.find((candidate) => candidate.id === context.step.actionId);
    if (!action) throw new Error(`No action declaration for ${context.step.actionId}`);

    resources = { listeners: 1, inputHandlers: 1, phaserObjects: 1 };
    maxActiveResources = Math.max(
      maxActiveResources,
      resources.listeners + resources.inputHandlers + resources.phaserObjects,
    );
    context.diagnostics.report(`demonstrated:${action.id}`);
    diagnostics.push(`demonstrated:${action.id}`);
    const random = createDeterministicRandom((context.seed ^ stableStepHash(context.step.id)) >>> 0);
    const sample = Math.floor(random() * 1_000_000);
    const run: MechanicRun = {
      stepId: context.step.id,
      targetId: context.step.targetId,
      actionId: action.id,
      consequence: action.consequence,
      seed: context.seed,
      sample,
      at: clock.adapter.now(),
    };
    executed.push(run);
    if (action.consequence === "correct") correctDemonstrations.push(context.step.id);
    if (action.consequence === "incorrect") incorrectDemonstrations.push(context.step.id);
  });

  return {
    execute,
    destroy,
    executed,
    correctDemonstrations,
    incorrectDemonstrations,
    diagnostics,
    resources: () => ({ ...resources }),
    maxActiveResources: () => maxActiveResources,
  };
}

/** Loads the future runtime module without turning a missing implementation into a loader crash. */
async function loadRuntimeModule(): Promise<TutorialRuntimeModule> {
  let imported: TutorialRuntimeModule | undefined;
  let importError: unknown;
  const runtimeSpecifier = "../game-tutorial-runtime.js";
  try {
    imported = await import(/* @vite-ignore */ runtimeSpecifier) as TutorialRuntimeModule;
  } catch (error) {
    importError = error;
  }

  expect(
    imported,
    `Tutorial runtime implementation is required; module load failed: ${importError instanceof Error ? importError.message : String(importError)}`,
  ).toBeDefined();
  expect(imported?.createGameTutorialRuntime, "Tutorial runtime must export createGameTutorialRuntime").toBeTypeOf("function");
  return imported!;
}

/** Creates one isolated runtime harness around the cartridge mechanic driver. */
async function createHarness(
  seed = tutorialSeed,
  shared?: { readonly clock: ManualClock; readonly driver: CartridgeMechanicDriver },
): Promise<TutorialHarness> {
  const runtimeModule = await loadRuntimeModule();
  const tutorial = validateGameTutorialDefinition({ ...rawTutorial, seed });
  const clock = shared?.clock ?? createManualClock();
  const driver = shared?.driver ?? createCartridgeMechanicDriver(clock);
  const effects = createTutorialEffects();
  const transitions = vi.fn((transition: unknown) => {
    expect(gameLifecycleTransitionSchema.safeParse(transition).success).toBe(true);
  });
  const runtime = runtimeModule.createGameTutorialRuntime!({
    tutorial,
    actionDriver: driver,
    clock: clock.adapter,
    effects,
    onLifecycleTransition: transitions,
  });
  return { tutorial, clock, driver, effects, transitions, runtime };
}

/** Runs a tutorial through every declared step using the public runtime commands. */
async function playAllSteps(harness: TutorialHarness): Promise<void> {
  await harness.runtime.start();
  await harness.clock.runAll();
  for (let index = 0; index < harness.tutorial.steps.length; index += 1) {
    await harness.runtime.advance();
    await harness.clock.runAll();
  }
}

/** Confirms that tutorial playback produced no production-owned outcome or failure effect. */
function expectNoProductionEffects(effects: TutorialEffects): void {
  expect(effects.emitGameResults, "tutorial GameResults emissions").not.toHaveBeenCalled();
  expect(effects.complete, "tutorial completion callbacks").not.toHaveBeenCalled();
  expect(effects.persistProgress, "tutorial persistence calls").not.toHaveBeenCalled();
  expect(effects.awardAuthoritativeXp, "tutorial authoritative XP mutations").not.toHaveBeenCalled();
  expect(effects.writeLeaderboard, "tutorial leaderboard writes").not.toHaveBeenCalled();
  expect(effects.applyFailureConsequences, "tutorial normal failure consequences").not.toHaveBeenCalled();
}

/** Confirms that all runtime-owned and cartridge-owned resources have been released. */
function expectCleanResources(harness: TutorialHarness): void {
  expect(harness.clock.pendingCount, "tutorial pending timer count after cleanup").toBe(0);
  expect(harness.driver.resources(), "tutorial cartridge resources after cleanup").toEqual({
    listeners: 0,
    inputHandlers: 0,
    phaserObjects: 0,
  });
  expect(harness.runtime.getSnapshot().resources, "tutorial runtime resources after cleanup").toEqual({
    listeners: 0,
    inputHandlers: 0,
    phaserObjects: 0,
  });
}

describe("guided gameplay tutorial runtime", () => {
  it.each([
    ["empty steps", { ...rawTutorial, steps: [] }],
    [
      "duplicate steps",
      { ...rawTutorial, steps: [...rawTutorial.steps, rawTutorial.steps[0]] },
    ],
    [
      "unreachable target declaration",
      { ...rawTutorial, targets: [...rawTutorial.targets, { id: "mechanic:unreachable", kind: "mechanic" }] },
    ],
    [
      "unreachable action declaration",
      {
        ...rawTutorial,
        actions: [...rawTutorial.actions, { id: "action:unreachable", deterministic: true, consequence: "neutral" }],
      },
    ],
    [
      "missing step target reference",
      {
        ...rawTutorial,
        steps: [{ ...rawTutorial.steps[0], targetId: "mechanic:missing" }, ...rawTutorial.steps.slice(1)],
      },
    ],
  ])("rejects %s before a driver can run", async (_label, invalidTutorial) => {
    const runtimeModule = await loadRuntimeModule();
    const clock = createManualClock();
    const driver = createCartridgeMechanicDriver(clock);

    expect(() => runtimeModule.createGameTutorialRuntime!({
      tutorial: invalidTutorial as never,
      actionDriver: driver,
      clock: clock.adapter,
      effects: createTutorialEffects(),
      onLifecycleTransition: vi.fn(),
    })).toThrow(/tutorial/i);
    expect(driver.execute, "invalid tutorial must not execute a cartridge action").not.toHaveBeenCalled();
  });

  it("plays the exact ordered step and consequence sequence through the cartridge mechanic", async () => {
    const harness = await createHarness();

    await playAllSteps(harness);

    expect(harness.driver.executed.map(({ stepId, targetId, actionId, consequence }) => ({
      stepId,
      targetId,
      actionId,
      consequence,
    }))).toEqual([
      {
        stepId: "step:notice-answer",
        targetId: "control:answer-choice",
        actionId: "action:highlight-answer",
        consequence: "neutral",
      },
      {
        stepId: "step:choose-river",
        targetId: "learning-item:river",
        actionId: "action:select-correct-answer",
        consequence: "correct",
      },
      {
        stepId: "step:review-feedback",
        targetId: "feedback:incorrect-choice",
        actionId: "action:show-incorrect-feedback",
        consequence: "incorrect",
      },
    ]);
    expect(harness.driver.correctDemonstrations).toEqual(["step:choose-river"]);
    expect(harness.driver.incorrectDemonstrations).toEqual(["step:review-feedback"]);
    expect(harness.driver.diagnostics).toEqual([
      "demonstrated:action:highlight-answer",
      "demonstrated:action:select-correct-answer",
      "demonstrated:action:show-incorrect-feedback",
    ]);
    expect(harness.runtime.getSnapshot()).toMatchObject({
      phase: "playing",
      progress: { completed: 3, total: 3 },
      seed: tutorialSeed,
    });
    expect(harness.transitions.mock.calls.map(([transition]) => transition)).toEqual([
      { from: "tutorial", event: "tutorial-complete", to: "playing" },
    ]);
    expectNoProductionEffects(harness.effects);
  });

  it("uses the same seeded playback output on replay and a different output for a different seed", async () => {
    const harness = await createHarness();

    await playAllSteps(harness);
    const firstRunRecords = harness.driver.executed.map((run) => ({ ...run }));
    const firstRun = toRelativeMechanicRuns(firstRunRecords);
    expect(firstRun, "the first seeded playback must execute at least one action").toHaveLength(3);

    await harness.runtime.replay();
    expect(harness.driver.destroy, "replay must tear down the previous mechanic run").toHaveBeenCalledOnce();
    await playAllSteps(harness);
    const replayRunRecords = harness.driver.executed.slice(firstRunRecords.length);
    expect(harness.driver.executed.slice(0, firstRunRecords.length)).toEqual(firstRunRecords);
    const replayRun = toRelativeMechanicRuns(replayRunRecords);
    expect(replayRun).toEqual(firstRun);
    expect(harness.runtime.getSnapshot().seed).toBe(tutorialSeed);

    const differentSeedHarness = await createHarness(tutorialSeed + 1);
    await playAllSteps(differentSeedHarness);
    expect(differentSeedHarness.driver.executed.map(({ sample }) => sample)).not.toEqual(
      firstRun.map(({ sample }) => sample),
    );
    expectNoProductionEffects(harness.effects);
    expectNoProductionEffects(differentSeedHarness.effects);
  });

  it("freezes the current step while paused and resumes the remaining deterministic timing", async () => {
    const harness = await createHarness();

    await harness.runtime.start();
    expect(harness.clock.pendingCount, "start must schedule the current step").toBeGreaterThan(0);
    await harness.clock.advanceBy(24);
    expect(harness.driver.executed, "lead-in time must precede the demonstration").toHaveLength(0);

    await harness.runtime.pause();
    const pausedSnapshot = harness.runtime.getSnapshot();
    expect(pausedSnapshot).toMatchObject({
      phase: "tutorial",
      status: "paused",
      currentStepId: "step:notice-answer",
      progress: { completed: 0, total: 3 },
    });

    await harness.runtime.pause();
    await harness.clock.advanceBy(500);
    expect(harness.driver.executed, "paused tutorial time must not run the cartridge action").toHaveLength(0);
    expect(harness.runtime.getSnapshot()).toMatchObject({
      status: "paused",
      currentStepId: "step:notice-answer",
      progress: { completed: 0, total: 3 },
    });

    await harness.runtime.resume();
    await harness.runtime.resume();
    await harness.clock.advanceBy(1);
    expect(harness.driver.executed.map(({ stepId, at }) => ({ stepId, at }))).toEqual([
      { stepId: "step:notice-answer", at: 525 },
    ]);
  });

  it("advances only to the adjacent step and completes exactly once", async () => {
    const harness = await createHarness();

    await harness.runtime.start();
    await harness.clock.advanceBy(25);
    await harness.clock.advanceBy(75);
    await harness.runtime.advance();
    expect(harness.runtime.getSnapshot()).toMatchObject({
      phase: "tutorial",
      currentStepId: "step:choose-river",
      progress: { completed: 1, total: 3 },
    });

    await harness.clock.advanceBy(10);
    await harness.clock.advanceBy(50);
    await harness.runtime.advance();
    expect(harness.runtime.getSnapshot()).toMatchObject({
      phase: "tutorial",
      currentStepId: "step:review-feedback",
      progress: { completed: 2, total: 3 },
    });

    await harness.clock.advanceBy(5);
    await harness.clock.advanceBy(35);
    await harness.runtime.advance();
    await harness.runtime.advance();
    expect(harness.driver.executed.map(({ stepId, at }) => ({ stepId, at }))).toEqual([
      { stepId: "step:notice-answer", at: 25 },
      { stepId: "step:choose-river", at: 110 },
      { stepId: "step:review-feedback", at: 165 },
    ]);
    expect(harness.transitions).toHaveBeenCalledTimes(1);
    expect(harness.transitions).toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-complete",
      to: "playing",
    });
    expect(harness.runtime.getSnapshot()).toMatchObject({
      phase: "playing",
      progress: { completed: 3, total: 3 },
    });
    expectNoProductionEffects(harness.effects);
  });

  it("skips only to the configured safe destination and ignores repeated terminal commands", async () => {
    const harness = await createHarness();

    await harness.runtime.start();
    await harness.runtime.skip();
    await harness.runtime.skip();
    await harness.runtime.advance();
    await harness.runtime.resume();
    await harness.clock.runAll();

    expect(harness.transitions).toHaveBeenCalledTimes(1);
    expect(harness.transitions).toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-skip",
      to: "countdown",
    });
    expect(harness.transitions.mock.calls.map(([transition]) => transition)).not.toContainEqual({
      from: "tutorial",
      event: "tutorial-skip",
      to: "results",
    });
    expect(harness.runtime.getSnapshot()).toMatchObject({
      phase: "countdown",
      status: "skipped",
      progress: { completed: 0, total: 3 },
    });
    expect(harness.driver.executed).toHaveLength(0);
    expectNoProductionEffects(harness.effects);
  });

  it("suppresses every production effect for neutral, correct, incorrect, skip, and completion paths", async () => {
    const completeHarness = await createHarness();
    await playAllSteps(completeHarness);
    await completeHarness.runtime.advance();
    await completeHarness.runtime.skip();
    await completeHarness.runtime.pause();
    await completeHarness.runtime.resume();
    expectNoProductionEffects(completeHarness.effects);

    const skipHarness = await createHarness();
    await skipHarness.runtime.start();
    await skipHarness.runtime.skip();
    await skipHarness.runtime.skip();
    await skipHarness.clock.runAll();
    expectNoProductionEffects(skipHarness.effects);
    expect(skipHarness.driver.executed).toHaveLength(0);
  });

  it("cleans timers, listeners, input handlers, and Phaser objects after replay without overlapping runs", async () => {
    const harness = await createHarness();

    await harness.runtime.start();
    await harness.clock.advanceBy(25);
    expect(harness.driver.resources()).toEqual({ listeners: 1, inputHandlers: 1, phaserObjects: 1 });
    expect(harness.clock.pendingCount).toBeGreaterThan(0);

    await harness.runtime.replay();
    expect(harness.driver.destroy).toHaveBeenCalledOnce();
    expectCleanResources(harness);

    await harness.runtime.start();
    await harness.clock.advanceBy(25);
    expect(harness.driver.resources()).toEqual({ listeners: 1, inputHandlers: 1, phaserObjects: 1 });
    expect(harness.driver.maxActiveResources()).toBe(3);
    await harness.runtime.exit();
    expectCleanResources(harness);
    expect(harness.driver.destroy).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["exit", async (harness: TutorialHarness) => harness.runtime.exit()],
    ["interruption", async (harness: TutorialHarness) => harness.runtime.interrupt()],
  ])("cleans all resources after %s", async (_label, terminate) => {
    const harness = await createHarness();

    await harness.runtime.start();
    await harness.clock.advanceBy(25);
    expect(harness.driver.resources().phaserObjects, "the active run must own a Phaser object").toBe(1);
    await terminate(harness);

    expectCleanResources(harness);
    expect(harness.driver.destroy).toHaveBeenCalledOnce();
    expect(harness.runtime.getSnapshot().phase).toBe(_label === "exit" ? "exited" : "interrupted");
    expectNoProductionEffects(harness.effects);
  });

  it("cleans the first mount before remounting and preserves one active resource set", async () => {
    const first = await createHarness();

    await first.runtime.start();
    await first.clock.advanceBy(25);
    expect(first.driver.resources()).toEqual({ listeners: 1, inputHandlers: 1, phaserObjects: 1 });
    await first.runtime.destroy();
    expectCleanResources(first);

    const remount = await createHarness(tutorialSeed, { clock: first.clock, driver: first.driver });
    await remount.runtime.start();
    await remount.clock.advanceBy(25);
    expect(remount.driver.resources()).toEqual({ listeners: 1, inputHandlers: 1, phaserObjects: 1 });
    expect(remount.driver.maxActiveResources()).toBe(3);
    await remount.runtime.destroy();
    expectCleanResources(remount);
    expect(remount.driver.destroy).toHaveBeenCalledTimes(2);
    expectNoProductionEffects(remount.effects);
  });
});
