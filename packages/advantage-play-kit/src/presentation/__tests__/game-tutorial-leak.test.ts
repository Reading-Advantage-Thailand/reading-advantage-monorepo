import { describe, expect, it, vi } from "vitest";

import {
  createGameTutorialController,
  validateGameTutorialDefinition,
  type GameTutorialActionDriver,
  type GameTutorialController,
  type GameTutorialDefinition,
} from "../index.js";
import type { GameTutorialClock } from "../game-tutorial-runtime.js";

const tutorial = {
  schemaVersion: 1,
  id: "qc:leak-fixture",
  title: "Tutorial leak fixture",
  seed: 7,
  labels: {
    progress: "Tutorial progress",
    pause: "Pause tutorial",
    resume: "Resume tutorial",
    advance: "Next tutorial step",
    replay: "Replay tutorial",
    skip: "Skip tutorial",
  },
  targets: [{ id: "mechanic:target", kind: "mechanic" }],
  actions: [{ id: "action:demonstrate", deterministic: true, consequence: "neutral" }],
  steps: [{
    id: "step:demonstrate",
    title: "Demonstrate the mechanic",
    explanation: "The fixture runs the real action-driver boundary.",
    targetId: "mechanic:target",
    actionId: "action:demonstrate",
    timing: { leadInMs: 10, demonstrationMs: 20, lingerMs: 10 },
  }],
  lifecycle: {
    pause: "freeze-current-step",
    advance: "sequential",
    replay: "restart-with-same-seed",
    skip: { enabled: true, to: "playing" },
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

type LeakClock = GameTutorialClock & {
  readonly pendingCount: () => number;
  readonly advanceBy: (durationMs: number) => Promise<void>;
};

type LeakDriver = GameTutorialActionDriver & {
  readonly execute: ReturnType<typeof vi.fn>;
  readonly destroy: ReturnType<typeof vi.fn>;
  readonly resources: () => { readonly listeners: number; readonly inputHandlers: number; readonly phaserObjects: number };
};

type LeakEffects = {
  readonly emitGameResults: ReturnType<typeof vi.fn>;
  readonly complete: ReturnType<typeof vi.fn>;
  readonly persistProgress: ReturnType<typeof vi.fn>;
  readonly awardAuthoritativeXp: ReturnType<typeof vi.fn>;
  readonly writeLeaderboard: ReturnType<typeof vi.fn>;
  readonly applyFailureConsequences: ReturnType<typeof vi.fn>;
};

/** Creates a clock with inspectable queued callbacks for teardown assertions. */
function createLeakClock(): LeakClock {
  let now = 0;
  let nextHandle = 0;
  const timers = new Map<number, { readonly at: number; readonly callback: () => void | Promise<void> }>();
  const nextTimer = () => [...timers.entries()].sort(([, left], [, right]) => left.at - right.at)[0];
  const clock: LeakClock = {
    now: () => now,
    setTimeout: (callback, delayMs) => {
      const handle = ++nextHandle;
      timers.set(handle, { at: now + delayMs, callback });
      return handle;
    },
    clearTimeout: (handle) => {
      timers.delete(handle);
    },
    pendingCount: () => timers.size,
    advanceBy: async (durationMs) => {
      const end = now + durationMs;
      while (true) {
        const next = nextTimer();
        if (!next || next[1].at > end) break;
        now = next[1].at;
        timers.delete(next[0]);
        await next[1].callback();
      }
      now = end;
    },
  };
  return clock;
}

/** Creates a cartridge action driver that exposes resource ownership to QC. */
function createLeakDriver(): LeakDriver {
  let resources = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  const execute = vi.fn(() => {
    resources = { listeners: 1, inputHandlers: 1, phaserObjects: 1 };
  });
  const destroy = vi.fn(() => {
    resources = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  });
  return { execute, destroy, resources: () => resources };
}

/** Creates production sinks whose call counts remain zero during tutorial QC. */
function createLeakEffects(): LeakEffects {
  return {
    emitGameResults: vi.fn(),
    complete: vi.fn(),
    persistProgress: vi.fn(),
    awardAuthoritativeXp: vi.fn(),
    writeLeaderboard: vi.fn(),
    applyFailureConsequences: vi.fn(),
  };
}

/** Creates a controller harness for interruption, replay, and leak assertions. */
function createLeakHarness() {
  const clock = createLeakClock();
  const driver = createLeakDriver();
  const effects = createLeakEffects();
  const controller: GameTutorialController = createGameTutorialController({
    tutorial: validateGameTutorialDefinition(tutorial),
    actionDriver: driver,
    clock,
    effects,
    onLifecycleTransition: vi.fn(),
  });
  return { clock, driver, effects, controller };
}

/** Asserts the tutorial controller has released every runtime-owned resource. */
function expectNoLeaks(harness: ReturnType<typeof createLeakHarness>): void {
  expect(harness.clock.pendingCount(), "pending tutorial timers").toBe(0);
  expect(harness.driver.resources(), "cartridge resource counts").toEqual({
    listeners: 0,
    inputHandlers: 0,
    phaserObjects: 0,
  });
  expect(harness.controller.getSnapshot().resources, "controller resource counts").toEqual({
    listeners: 0,
    inputHandlers: 0,
    phaserObjects: 0,
  });
}

/** Asserts that tutorial-only terminal paths cannot create production results or progress. */
function expectNoProductionEffects(effects: LeakEffects): void {
  expect(effects.emitGameResults).not.toHaveBeenCalled();
  expect(effects.complete).not.toHaveBeenCalled();
  expect(effects.persistProgress).not.toHaveBeenCalled();
  expect(effects.awardAuthoritativeXp).not.toHaveBeenCalled();
  expect(effects.writeLeaderboard).not.toHaveBeenCalled();
  expect(effects.applyFailureConsequences).not.toHaveBeenCalled();
}

describe("guided tutorial QC cleanup boundary", () => {
  it.each(["replay", "exit", "interrupt", "destroy"] as const)("cleans timers and cartridge resources after %s", async (command) => {
    const harness = createLeakHarness();
    await harness.controller.start();
    await harness.clock.advanceBy(10);
    expect(harness.clock.pendingCount()).toBe(1);

    await harness.controller[command]();

    expectNoLeaks(harness);
    expectNoProductionEffects(harness.effects);
  });

  it("replays one isolated resource set with the same seed and one canvas boundary", async () => {
    const harness = createLeakHarness();
    await harness.controller.start();
    await harness.clock.advanceBy(10);
    await harness.controller.replay();
    expectNoLeaks(harness);
    expect(harness.controller.getSnapshot()).toMatchObject({ mode: "tutorial", status: "idle", seed: 7 });
    expect(harness.driver.destroy).toHaveBeenCalledOnce();
    expect(harness.driver.execute).toHaveBeenCalledOnce();
  });

  it("keeps interrupted tutorial output separate from normal completion and persistence", async () => {
    const harness = createLeakHarness();
    await harness.controller.start();
    await harness.clock.advanceBy(10);
    await harness.controller.interrupt();
    await harness.controller.advance();

    expect(harness.controller.getSnapshot()).toMatchObject({ phase: "interrupted", status: "interrupted" });
    expectNoLeaks(harness);
    expectNoProductionEffects(harness.effects);
  });
});
