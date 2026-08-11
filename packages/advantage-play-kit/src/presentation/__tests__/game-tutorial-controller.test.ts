import "@testing-library/jest-dom/vitest";

import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  gameLifecycleTransitionSchema,
  validateGameTutorialDefinition,
  type GameTutorialActionDriver,
  type GameTutorialActionDriverContext,
  type GameTutorialDefinition,
} from "../index.js";
import type {
  GameTutorialClock,
  GameTutorialDiagnostic,
} from "../game-tutorial-runtime.js";
import { APKGameHost, type APKGameHostProps } from "../../react/apk-game-host.js";
import { createMockGameFactory } from "../../testing/test-kit.js";
import { createRuntimeCartridge, createRuntimeEdition } from "../../testing/fixtures.js";
import type { GameFactory, GameFactoryContext } from "../../runtime/types.js";

afterEach(cleanup);

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
    advance: "Next tutorial step",
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
      timing: { leadInMs: 10, demonstrationMs: 5, lingerMs: 5 },
    },
    {
      id: "step:choose-river",
      title: "Choose the matching word",
      explanation: "The English word river matches the Thai learning item.",
      targetId: "learning-item:river",
      actionId: "action:select-correct-answer",
      timing: { leadInMs: 10, demonstrationMs: 5, lingerMs: 5 },
    },
    {
      id: "step:review-feedback",
      title: "Review the feedback",
      explanation: "Incorrect feedback safely explains why the selected answer does not match.",
      targetId: "feedback:incorrect-choice",
      actionId: "action:show-incorrect-feedback",
      timing: { leadInMs: 10, demonstrationMs: 5, lingerMs: 5 },
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

type ManualClock = {
  readonly adapter: GameTutorialClock;
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

type ControllerSnapshot = {
  readonly mode: "tutorial";
  readonly phase: "tutorial" | "countdown" | "playing" | "exited" | "interrupted" | "destroyed";
  readonly status: "idle" | "running" | "paused" | "complete" | "skipped" | "exited" | "interrupted" | "destroyed";
  readonly currentStepId?: string;
  readonly currentStep?: GameTutorialDefinition["steps"][number];
  readonly currentTarget?: GameTutorialDefinition["targets"][number];
  readonly currentAction?: GameTutorialDefinition["actions"][number];
  readonly progress: { readonly completed: number; readonly total: number };
  readonly seed: number;
  readonly resources: TutorialResourceCounts;
};

type TutorialController = {
  readonly getSnapshot: () => ControllerSnapshot;
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

type ControllerOptions = {
  readonly tutorial: GameTutorialDefinition;
  readonly actionDriver: GameTutorialActionDriver & { readonly destroy: ReturnType<typeof vi.fn> };
  readonly clock: GameTutorialClock;
  readonly effects: GameTutorialEffects;
  readonly onLifecycleTransition: (transition: unknown) => void;
  readonly onDiagnostic?: (diagnostic: GameTutorialDiagnostic) => void;
  readonly onSnapshot?: (snapshot: ControllerSnapshot) => void;
};

type ControllerModule = {
  readonly createGameTutorialController?: (options: ControllerOptions) => TutorialController;
};

type MechanicRun = {
  readonly stepId: string;
  readonly targetId: string;
  readonly actionId: string;
  readonly consequence: "neutral" | "correct" | "incorrect";
  readonly seed: number;
};

type CartridgeMechanicDriver = GameTutorialActionDriver & {
  readonly execute: ReturnType<typeof vi.fn>;
  readonly destroy: ReturnType<typeof vi.fn>;
  readonly runs: MechanicRun[];
  readonly resources: () => TutorialResourceCounts;
  readonly maxResourceSets: () => number;
};

type ControllerHarness = {
  readonly tutorial: GameTutorialDefinition;
  readonly clock: ManualClock;
  readonly driver: CartridgeMechanicDriver;
  readonly effects: TutorialEffects;
  readonly transitions: ReturnType<typeof vi.fn>;
  readonly diagnostics: ReturnType<typeof vi.fn>;
  readonly snapshots: ReturnType<typeof vi.fn>;
  readonly controller: TutorialController;
};

/** Creates a deterministic clock that exposes pending tutorial work. */
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
      if (callbacksRun > 100) throw new Error("The tutorial clock exceeded 100 callbacks in one advance");
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
      if (batchesRun > 100) throw new Error("The tutorial clock did not settle");
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

/** Creates observable production sinks that tutorial mode must never call. */
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

/** Creates a cartridge-owned driver that records the real mechanic action boundary. */
function createCartridgeMechanicDriver(clock: ManualClock): CartridgeMechanicDriver {
  const runs: MechanicRun[] = [];
  let resources: TutorialResourceCounts = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  let maxResourceSets = 0;

  const execute = vi.fn((context: GameTutorialActionDriverContext) => {
    runs.push({
      stepId: context.step.id,
      targetId: context.step.targetId,
      actionId: context.step.actionId,
      consequence: context.tutorial.actions.find((action) => action.id === context.step.actionId)!.consequence,
      seed: context.seed,
    });
    resources = { listeners: 1, inputHandlers: 1, phaserObjects: 1 };
    maxResourceSets = Math.max(maxResourceSets, 1);
    context.diagnostics.report(`demonstrated:${context.step.actionId}@${clock.adapter.now()}`);
  });
  const destroy = vi.fn(() => {
    resources = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  });

  return {
    execute,
    destroy,
    runs,
    resources: () => ({ ...resources }),
    maxResourceSets: () => maxResourceSets,
  };
}

/** Loads the controller module without converting a missing Red implementation into a loader crash. */
async function loadControllerFactory(): Promise<NonNullable<ControllerModule["createGameTutorialController"]>> {
  let imported: ControllerModule | undefined;
  let importError: unknown;
  const controllerSpecifier = "../game-tutorial-controller.js";
  try {
    imported = await import(/* @vite-ignore */ controllerSpecifier) as ControllerModule;
  } catch (error) {
    importError = error;
  }

  expect(
    imported,
    `Tutorial controller implementation is required; module load failed: ${importError instanceof Error ? importError.message : String(importError)}`,
  ).toBeDefined();
  expect(imported?.createGameTutorialController, "Tutorial controller must export createGameTutorialController").toBeTypeOf("function");
  return imported!.createGameTutorialController!;
}

/** Creates an isolated controller harness around the cartridge mechanic driver. */
async function createHarness(seed = tutorialSeed): Promise<ControllerHarness> {
  const createController = await loadControllerFactory();
  const tutorial = validateGameTutorialDefinition({ ...rawTutorial, seed });
  const clock = createManualClock();
  const driver = createCartridgeMechanicDriver(clock);
  const effects = createTutorialEffects();
  const transitions = vi.fn((transition: unknown) => {
    expect(gameLifecycleTransitionSchema.safeParse(transition).success).toBe(true);
  });
  const diagnostics = vi.fn();
  const snapshots = vi.fn();
  const controller = createController({
    tutorial,
    actionDriver: driver,
    clock: clock.adapter,
    effects,
    onLifecycleTransition: transitions,
    onDiagnostic: diagnostics,
    onSnapshot: snapshots,
  });
  return { tutorial, clock, driver, effects, transitions, diagnostics, snapshots, controller };
}

/** Runs every tutorial step through the public controller commands. */
async function playAllSteps(harness: ControllerHarness): Promise<void> {
  await harness.controller.start();
  await harness.clock.runAll();
  for (let index = 0; index < harness.tutorial.steps.length; index += 1) {
    await harness.controller.advance();
    await harness.clock.runAll();
  }
}

/** Confirms that every production-owned sink remains untouched by tutorial playback. */
function expectNoProductionEffects(effects: TutorialEffects): void {
  expect(effects.emitGameResults, "tutorial GameResults emissions").not.toHaveBeenCalled();
  expect(effects.complete, "tutorial completion callbacks").not.toHaveBeenCalled();
  expect(effects.persistProgress, "tutorial persistence calls").not.toHaveBeenCalled();
  expect(effects.awardAuthoritativeXp, "tutorial authoritative XP mutations").not.toHaveBeenCalled();
  expect(effects.writeLeaderboard, "tutorial leaderboard writes").not.toHaveBeenCalled();
  expect(effects.applyFailureConsequences, "tutorial normal failure consequences").not.toHaveBeenCalled();
}

/** Creates a tutorial briefing that enters the controller before normal gameplay. */
const tutorialBriefing = {
  title: "Temple Word Quest",
  objective: "Match each Thai word with its English translation.",
  instructions: [{ title: "Choose", description: "Choose the matching translation." }],
  learningPreview: { heading: "Words to learn" },
  controls: [{ mode: "touch", label: "Tap", action: "Choose an answer" }],
  labels: { startAction: "Begin quest" },
  startPhase: "tutorial",
} as const;

const learningInput = [
  { term: "แม่น้ำ", translation: "river" },
  { term: "ภูเขา", translation: "mountain" },
] as const;

type TutorialHostProps = APKGameHostProps & {
  readonly tutorial: GameTutorialDefinition;
  readonly tutorialActionDriver: CartridgeMechanicDriver;
  readonly tutorialClock: GameTutorialClock;
  readonly onTutorialSnapshot: (snapshot: ControllerSnapshot) => void;
};

/** Mounts the host with the future tutorial-only props without weakening the production prop type. */
function renderTutorialHost(props: TutorialHostProps) {
  return render(createElement(APKGameHost, props as unknown as APKGameHostProps));
}

/** Creates one-canvas renderer instances and can inject one deterministic mount failure. */
function createTutorialHostFactory(options: { readonly failFirst?: boolean } = {}): {
  readonly factory: GameFactory;
  readonly base: ReturnType<typeof createMockGameFactory>;
  readonly attempts: () => number;
} {
  const base = createMockGameFactory();
  let attemptCount = 0;
  const factory: GameFactory = async (context: GameFactoryContext) => {
    attemptCount += 1;
    const canvas = document.createElement("canvas");
    context.container.append(canvas);
    if (options.failFirst && attemptCount === 1) throw new Error("Tutorial renderer unavailable");
    const instance = await base(context);
    return {
      ...instance,
      destroy: vi.fn(async () => {
        canvas.remove();
        await instance.destroy();
      }),
    };
  };
  return { factory, base, attempts: () => attemptCount };
}

/** Mounts the future host integration with a deterministic tutorial driver and clock. */
function mountTutorialHost(options: {
  readonly factory: GameFactory;
  readonly clock: ManualClock;
  readonly driver: CartridgeMechanicDriver;
  readonly snapshots: ReturnType<typeof vi.fn>;
  readonly transitions: ReturnType<typeof vi.fn>;
  readonly onComplete?: ReturnType<typeof vi.fn>;
}) {
  return renderTutorialHost({
    cartridge: createRuntimeCartridge(),
    input: learningInput,
    edition: createRuntimeEdition(),
    factory: options.factory,
    briefing: tutorialBriefing,
    tutorial: validateGameTutorialDefinition(rawTutorial),
    tutorialActionDriver: options.driver,
    tutorialClock: options.clock.adapter,
    onTutorialSnapshot: options.snapshots,
    onLifecycleTransition: options.transitions,
    onComplete: options.onComplete,
  });
}

describe("shared tutorial controller", () => {
  it("rejects an invalid tutorial before the cartridge driver can run", async () => {
    const createController = await loadControllerFactory();
    const clock = createManualClock();
    const driver = createCartridgeMechanicDriver(clock);

    expect(() => createController({
      tutorial: { ...rawTutorial, steps: [] } as never,
      actionDriver: driver,
      clock: clock.adapter,
      effects: createTutorialEffects(),
      onLifecycleTransition: vi.fn(),
    })).toThrow(/tutorial/i);
    expect(driver.execute, "an invalid tutorial must not execute a cartridge action").not.toHaveBeenCalled();
  });

  it("starts explicit tutorial mode and exposes the current step, progress, semantic target, and lifecycle diagnostics", async () => {
    const harness = await createHarness();

    await harness.controller.start();
    expect(harness.controller.getSnapshot()).toMatchObject({
      mode: "tutorial",
      phase: "tutorial",
      status: "running",
      currentStepId: "step:notice-answer",
      currentStep: { id: "step:notice-answer", targetId: "control:answer-choice" },
      currentTarget: { id: "control:answer-choice", kind: "control" },
      progress: { completed: 0, total: 3 },
      seed: tutorialSeed,
    });

    await harness.clock.runAll();
    expect(harness.driver.runs).toEqual([{
      stepId: "step:notice-answer",
      targetId: "control:answer-choice",
      actionId: "action:highlight-answer",
      consequence: "neutral",
      seed: tutorialSeed,
    }]);
    expect(harness.diagnostics.mock.calls.map(([diagnostic]) => diagnostic.event)).toEqual(
      expect.arrayContaining(["started", "demonstrated"]),
    );
    expect(harness.snapshots).toHaveBeenCalledWith(expect.objectContaining({ mode: "tutorial" }));
  });

  it("freezes the selected step on pause and resumes without changing its semantic target", async () => {
    const harness = await createHarness();

    await harness.controller.start();
    await harness.clock.advanceBy(9);
    await harness.controller.pause();
    await harness.clock.advanceBy(100);
    expect(harness.driver.runs).toHaveLength(0);
    expect(harness.controller.getSnapshot()).toMatchObject({
      mode: "tutorial",
      status: "paused",
      currentStepId: "step:notice-answer",
      currentTarget: { id: "control:answer-choice" },
      progress: { completed: 0, total: 3 },
    });

    await harness.controller.resume();
    await harness.clock.advanceBy(1);
    expect(harness.driver.runs).toHaveLength(1);
    expect(harness.diagnostics.mock.calls.map(([diagnostic]) => diagnostic.event)).toEqual(
      expect.arrayContaining(["paused", "resumed"]),
    );
  });

  it("advances only to the adjacent step and emits one safe completion transition", async () => {
    const harness = await createHarness();

    await harness.controller.start();
    expect(await harness.controller.advance(), "advance before demonstration must not jump").toBeUndefined();
    expect(harness.controller.getSnapshot().currentStepId).toBe("step:notice-answer");
    await harness.clock.runAll();
    await harness.controller.advance();
    expect(harness.controller.getSnapshot()).toMatchObject({
      phase: "tutorial",
      currentStepId: "step:choose-river",
      currentTarget: { id: "learning-item:river", kind: "learning-item" },
      progress: { completed: 1, total: 3 },
    });
    expect(harness.controller.getSnapshot().currentStepId).not.toBe("step:review-feedback");

    await harness.clock.runAll();
    await harness.controller.advance();
    await harness.clock.runAll();
    await harness.controller.advance();
    await harness.controller.advance();

    expect(harness.transitions).toHaveBeenCalledTimes(1);
    expect(harness.transitions).toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-complete",
      to: "playing",
    });
    expect(harness.controller.getSnapshot()).toMatchObject({
      mode: "tutorial",
      phase: "playing",
      status: "complete",
      progress: { completed: 3, total: 3 },
    });
  });

  it("replays with the same seed and the same cartridge action sequence", async () => {
    const harness = await createHarness();

    await playAllSteps(harness);
    const firstRun = harness.driver.runs.map(({ stepId, targetId, actionId, consequence, seed }) => ({
      stepId,
      targetId,
      actionId,
      consequence,
      seed,
    }));
    await harness.controller.replay();
    expect(harness.controller.getSnapshot()).toMatchObject({ mode: "tutorial", status: "idle", seed: tutorialSeed });
    await playAllSteps(harness);

    expect(harness.driver.runs.slice(firstRun.length)).toEqual(firstRun);
    expect(harness.driver.destroy).toHaveBeenCalledOnce();
    expect(harness.diagnostics.mock.calls.map(([diagnostic]) => diagnostic.event)).toContain("replayed");
  });

  it("skips only to a safe destination and never emits a results transition", async () => {
    const harness = await createHarness();

    await harness.controller.start();
    await harness.controller.skip();
    await harness.controller.skip();
    await harness.controller.advance();
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
    expect(harness.controller.getSnapshot()).toMatchObject({
      mode: "tutorial",
      phase: "countdown",
      status: "skipped",
      progress: { completed: 0, total: 3 },
    });
    expect(harness.driver.runs).toHaveLength(0);
    expectNoProductionEffects(harness.effects);
  });

  it("suppresses GameResults, completion, XP, persistence, leaderboard, and failure effects", async () => {
    const harness = await createHarness();

    await playAllSteps(harness);
    await harness.controller.advance();
    await harness.controller.skip();
    await harness.controller.pause();
    await harness.controller.resume();
    expectNoProductionEffects(harness.effects);
  });

  it("cleans one timer and one cartridge resource set on replay, exit, interruption, and destroy", async () => {
    const harness = await createHarness();

    await harness.controller.start();
    await harness.clock.advanceBy(10);
    expect(harness.driver.resources()).toEqual({ listeners: 1, inputHandlers: 1, phaserObjects: 1 });
    expect(harness.clock.pendingCount).toBeGreaterThan(0);
    await harness.controller.replay();
    expect(harness.clock.pendingCount).toBe(0);
    expect(harness.driver.resources()).toEqual({ listeners: 0, inputHandlers: 0, phaserObjects: 0 });
    expect(harness.driver.maxResourceSets()).toBe(1);

    for (const termination of ["exit", "interrupt", "destroy"] as const) {
      const terminated = await createHarness();
      await terminated.controller.start();
      await terminated.clock.advanceBy(10);
      await terminated.controller[termination]();
      expect(terminated.clock.pendingCount, `${termination} must clear tutorial timers`).toBe(0);
      expect(terminated.driver.resources(), `${termination} must clear cartridge resources`).toEqual({
        listeners: 0,
        inputHandlers: 0,
        phaserObjects: 0,
      });
    }
  });

  it("gives the cartridge driver tutorial mode and no DOM, Next, Tutor, socket, navigation, or production authority", async () => {
    const harness = await createHarness();

    await harness.controller.start();
    await harness.clock.runAll();
    const context = harness.driver.execute.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(context).toBeDefined();
    expect(context).toMatchObject({ mode: "tutorial", seed: tutorialSeed });
    expect(Object.keys(context).sort()).toEqual([
      "diagnostics",
      "mode",
      "seed",
      "step",
      "tutorial",
    ]);
    expect(context).not.toHaveProperty("complete");
    expect(context).not.toHaveProperty("emitGameResults");
    expect(context).not.toHaveProperty("persistProgress");
    expect(context).not.toHaveProperty("awardAuthoritativeXp");
    expect(context).not.toHaveProperty("writeLeaderboard");
    expect(context).not.toHaveProperty("navigate");
    expect(context).not.toHaveProperty("document");
    expect(context).not.toHaveProperty("window");
    expect(context).not.toHaveProperty("socket");
    expect(context).not.toHaveProperty("lesson");
    expect(context).not.toHaveProperty("session");
  });
});

describe("APKGameHost tutorial integration", () => {
  it("gates one tutorial canvas behind briefing Start and wires the cartridge action driver", async () => {
    const clock = createManualClock();
    const driver = createCartridgeMechanicDriver(clock);
    const hostFactory = createTutorialHostFactory();
    const snapshots = vi.fn();
    const transitions = vi.fn();
    const onComplete = vi.fn();

    mountTutorialHost({
      factory: hostFactory.factory,
      clock,
      driver,
      snapshots,
      transitions,
      onComplete,
    });
    expect(hostFactory.base.contexts).toHaveLength(0);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(0);

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await waitFor(() => expect(hostFactory.base.contexts).toHaveLength(1));
    await act(async () => {
      await clock.runAll();
    });

    expect(transitions).toHaveBeenCalledWith({ from: "briefing", event: "start", to: "tutorial" });
    expect(driver.runs[0]).toMatchObject({
      stepId: "step:notice-answer",
      targetId: "control:answer-choice",
      seed: tutorialSeed,
    });
    expect((driver.execute.mock.calls[0]?.[0] as GameTutorialActionDriverContext).mode).toBe("tutorial");
    expect(snapshots).toHaveBeenCalledWith(expect.objectContaining({
      mode: "tutorial",
      currentStepId: "step:notice-answer",
      currentTarget: { id: "control:answer-choice" },
      progress: { completed: 0, total: 3 },
    }));
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("routes pause, resume, advance, replay, and skip host controls through tutorial commands", async () => {
    const clock = createManualClock();
    const driver = createCartridgeMechanicDriver(clock);
    const hostFactory = createTutorialHostFactory();
    const snapshots = vi.fn();
    const transitions = vi.fn();

    mountTutorialHost({ factory: hostFactory.factory, clock, driver, snapshots, transitions });
    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await waitFor(() => expect(hostFactory.base.contexts).toHaveLength(1));
    await act(async () => {
      await clock.runAll();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pause tutorial" }));
    expect(snapshots).toHaveBeenLastCalledWith(expect.objectContaining({ status: "paused" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume tutorial" }));
    fireEvent.click(screen.getByRole("button", { name: "Next tutorial step" }));
    await act(async () => {
      await clock.runAll();
    });
    expect(snapshots).toHaveBeenLastCalledWith(expect.objectContaining({
      currentStepId: "step:choose-river",
      currentTarget: { id: "learning-item:river" },
      progress: { completed: 1, total: 3 },
    }));

    const firstRun = driver.runs[0];
    fireEvent.click(screen.getByRole("button", { name: "Replay tutorial" }));
    await waitFor(() => expect(snapshots).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "tutorial",
      status: "running",
      seed: tutorialSeed,
    })));
    await act(async () => {
      await clock.runAll();
    });
    expect(driver.runs.at(-1)).toEqual(firstRun);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));
    await waitFor(() => expect(transitions).toHaveBeenCalledWith(expect.objectContaining({
      from: "tutorial",
      event: "tutorial-skip",
      to: expect.not.stringMatching(/^results$/),
    })));
    expect(transitions.mock.calls.map(([transition]) => transition)).not.toContainEqual(expect.objectContaining({ to: "results" }));
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
    expect(driver.resources()).toEqual({ listeners: 0, inputHandlers: 0, phaserObjects: 0 });
  });

  it("recovers a tutorial mount error without a second canvas or stranded resource set", async () => {
    const clock = createManualClock();
    const driver = createCartridgeMechanicDriver(clock);
    const hostFactory = createTutorialHostFactory({ failFirst: true });
    const snapshots = vi.fn();
    const transitions = vi.fn();

    mountTutorialHost({ factory: hostFactory.factory, clock, driver, snapshots, transitions });
    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tutorial renderer unavailable");
    expect(hostFactory.attempts()).toBe(1);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(0);
    expect(driver.resources()).toEqual({ listeners: 0, inputHandlers: 0, phaserObjects: 0 });

    fireEvent.click(screen.getByRole("button", { name: "Return to briefing" }));
    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await waitFor(() => expect(hostFactory.base.contexts).toHaveLength(1));
    await act(async () => {
      await clock.runAll();
    });
    expect(hostFactory.attempts()).toBe(2);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
    expect(driver.runs).toHaveLength(1);
  });

  it("cleans the controller, Phaser canvas, and driver resources on host unmount", async () => {
    const clock = createManualClock();
    const driver = createCartridgeMechanicDriver(clock);
    const hostFactory = createTutorialHostFactory();
    const snapshots = vi.fn();
    const transitions = vi.fn();

    const mounted = mountTutorialHost({ factory: hostFactory.factory, clock, driver, snapshots, transitions });
    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await waitFor(() => expect(hostFactory.base.contexts).toHaveLength(1));
    await act(async () => {
      await clock.advanceBy(10);
    });
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
    expect(driver.resources()).toEqual({ listeners: 1, inputHandlers: 1, phaserObjects: 1 });

    mounted.unmount();
    await waitFor(() => expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(0));
    expect(clock.pendingCount).toBe(0);
    expect(driver.resources()).toEqual({ listeners: 0, inputHandlers: 0, phaserObjects: 0 });
  });
});
