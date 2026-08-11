import {
  validateGameTutorialDefinition,
  type GameTutorialActionDriver,
  type GameTutorialDefinition,
  type GameTutorialProgress,
} from "./game-tutorial-contract.js";
import type { GameLifecycleTransition } from "./game-briefing-contract.js";

/** Provides deterministic time operations for one tutorial run. */
export interface GameTutorialClock {
  /** Gets the current host-relative time. */
  readonly now: () => number;
  /** Schedules one tutorial callback. */
  readonly setTimeout: (callback: () => void | Promise<void>, delayMs: number) => number;
  /** Cancels one tutorial callback. */
  readonly clearTimeout: (handle: number) => void;
}

/** Lists tutorial-owned resource counts. */
export interface GameTutorialResourceCounts {
  /** The current listener count. */
  readonly listeners: number;
  /** The current input handler count. */
  readonly inputHandlers: number;
  /** The current Phaser object count. */
  readonly phaserObjects: number;
}

/** Describes current host-neutral tutorial state. */
export interface GameTutorialRuntimeSnapshot {
  /** The current lifecycle phase. */
  readonly phase: "tutorial" | "countdown" | "playing" | "exited" | "interrupted" | "destroyed";
  /** The local tutorial lifecycle status. */
  readonly status: "idle" | "running" | "paused" | "complete" | "skipped" | "exited" | "interrupted" | "destroyed";
  /** The active step identifier when tutorial playback is active. */
  readonly currentStepId?: string;
  /** The completed and total step counts. */
  readonly progress: GameTutorialProgress;
  /** The fixed run seed. */
  readonly seed: number;
  /** The runtime-owned resource counts. */
  readonly resources: GameTutorialResourceCounts;
}

/** Receives production-side effects that tutorial mode must suppress. */
export interface GameTutorialEffects {
  /** Receives production GameResults. */
  readonly emitGameResults: () => void;
  /** Receives production completion. */
  readonly complete: () => void;
  /** Receives production progress persistence. */
  readonly persistProgress: () => void;
  /** Receives an authoritative XP award. */
  readonly awardAuthoritativeXp: () => void;
  /** Receives a leaderboard write. */
  readonly writeLeaderboard: () => void;
  /** Receives a normal failure consequence. */
  readonly applyFailureConsequences: () => void;
}

/** Describes a tutorial-local diagnostic. */
export interface GameTutorialDiagnostic {
  /** The runtime event. */
  readonly event: "started" | "paused" | "resumed" | "demonstrated" | "advanced" | "replayed" | "skipped" | "completed" | "exited" | "interrupted" | "destroyed" | "cleaned";
  /** The active step identifier. */
  readonly stepId?: string;
  /** The cartridge diagnostic message. */
  readonly message?: string;
  /** The host-relative event time. */
  readonly at: number;
}

/** Defines the dependencies for one isolated tutorial run. */
export interface CreateGameTutorialRuntimeOptions {
  /** The cartridge tutorial definition. */
  readonly tutorial: GameTutorialDefinition;
  /** The cartridge-owned driver for the real mechanic. */
  readonly actionDriver: GameTutorialActionDriver & { readonly destroy?: () => void | Promise<void> };
  /** The deterministic clock. */
  readonly clock: GameTutorialClock;
  /** Production sinks that this runtime deliberately does not call. */
  readonly effects: GameTutorialEffects;
  /** Receives safe lifecycle transitions. */
  readonly onLifecycleTransition: (transition: GameLifecycleTransition) => void;
  /** Receives local, non-persistent diagnostics. */
  readonly onDiagnostic?: (diagnostic: GameTutorialDiagnostic) => void;
}

/** Controls one isolated tutorial run. */
export interface GameTutorialRuntime {
  /** Returns the current state. */
  readonly getSnapshot: () => GameTutorialRuntimeSnapshot;
  /** Starts tutorial playback. */
  readonly start: () => void | Promise<void>;
  /** Pauses the current timer. */
  readonly pause: () => void | Promise<void>;
  /** Resumes the current timer. */
  readonly resume: () => void | Promise<void>;
  /** Advances to the adjacent step. */
  readonly advance: () => void | Promise<void>;
  /** Cleans the current run and returns to idle tutorial state. */
  readonly replay: () => void | Promise<void>;
  /** Cleans the run and moves to the configured safe destination. */
  readonly skip: () => void | Promise<void>;
  /** Cleans the run for host exit. */
  readonly exit: () => void | Promise<void>;
  /** Cleans the run for host interruption. */
  readonly interrupt: () => void | Promise<void>;
  /** Cleans the run for disposal or remount. */
  readonly destroy: () => void | Promise<void>;
}

/** Creates a deterministic, host-neutral tutorial runner for a real cartridge mechanic. */
export function createGameTutorialRuntime(options: CreateGameTutorialRuntimeOptions): GameTutorialRuntime {
  const tutorial = validateGameTutorialDefinition(options.tutorial);
  const { actionDriver, clock, onDiagnostic, onLifecycleTransition } = options;
  // Tutorial execution has no production authority. This reference makes that boundary explicit.
  void options.effects;

  let phase: GameTutorialRuntimeSnapshot["phase"] = "tutorial";
  let status: GameTutorialRuntimeSnapshot["status"] = "idle";
  let currentStepIndex = 0;
  let completed = 0;
  let timer: number | undefined;
  let deadline: number | undefined;
  let pausedRemainingMs: number | undefined;
  let currentStepDemonstrated = false;
  let driverDestroyed = false;

  const report = (event: GameTutorialDiagnostic["event"], message?: string): void => {
    const step = tutorial.steps[currentStepIndex];
    onDiagnostic?.({ event, ...(step ? { stepId: step.id } : {}), ...(message ? { message } : {}), at: clock.now() });
  };

  const cancelTimer = (): void => {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = undefined;
    deadline = undefined;
  };

  const releaseDriver = async (): Promise<void> => {
    if (driverDestroyed) return;
    driverDestroyed = true;
    await actionDriver.destroy?.();
  };

  const clean = async (): Promise<void> => {
    cancelTimer();
    await releaseDriver();
    report("cleaned");
  };

  const schedule = (delayMs: number): void => {
    deadline = clock.now() + delayMs;
    timer = clock.setTimeout(async () => {
      timer = undefined;
      deadline = undefined;
      if (status !== "running" || phase !== "tutorial") return;
      const step = tutorial.steps[currentStepIndex];
      if (!step) return;
      if (currentStepDemonstrated) return;
      await actionDriver.execute({
        tutorial,
        step,
        seed: tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: (message) => report("demonstrated", message) },
      });
      currentStepDemonstrated = true;
      report("demonstrated");
      schedule(step.timing.demonstrationMs + step.timing.lingerMs);
    }, delayMs);
  };

  const start = (): void => {
    if (status !== "idle") return;
    const step = tutorial.steps[currentStepIndex];
    if (!step) return;
    phase = "tutorial";
    status = "running";
    currentStepDemonstrated = false;
    driverDestroyed = false;
    schedule(step.timing.leadInMs);
    report("started");
  };

  const pause = (): void => {
    if (status !== "running" || phase !== "tutorial") return;
    pausedRemainingMs = deadline === undefined ? undefined : Math.max(0, deadline - clock.now());
    cancelTimer();
    status = "paused";
    report("paused");
  };

  const resume = (): void => {
    if (status !== "paused" || phase !== "tutorial") return;
    const remaining = pausedRemainingMs;
    pausedRemainingMs = undefined;
    status = "running";
    if (remaining !== undefined) schedule(remaining);
    report("resumed");
  };

  const advance = (): void => {
    if (status !== "running" || phase !== "tutorial" || !currentStepDemonstrated) return;
    cancelTimer();
    completed += 1;
    if (completed === tutorial.steps.length) {
      const destination = tutorial.lifecycle.complete.to;
      phase = destination;
      status = "complete";
      onLifecycleTransition({ from: "tutorial", event: "tutorial-complete", to: destination });
      report("completed");
      return;
    }
    currentStepIndex += 1;
    currentStepDemonstrated = false;
    const nextStep = tutorial.steps[currentStepIndex];
    if (!nextStep) return;
    schedule(nextStep.timing.leadInMs);
    report("advanced");
  };

  const replay = async (): Promise<void> => {
    if (phase === "destroyed") return;
    await clean();
    phase = "tutorial";
    status = "idle";
    currentStepIndex = 0;
    completed = 0;
    currentStepDemonstrated = false;
    driverDestroyed = false;
    report("replayed");
  };

  const skip = async (): Promise<void> => {
    if (phase !== "tutorial" || status === "complete" || status === "skipped" || !tutorial.lifecycle.skip.enabled) return;
    await clean();
    const destination = tutorial.lifecycle.skip.to;
    phase = destination;
    status = "skipped";
    onLifecycleTransition({ from: "tutorial", event: "tutorial-skip", to: destination });
    report("skipped");
  };

  const terminate = async (nextPhase: "exited" | "interrupted" | "destroyed", event: "exited" | "interrupted" | "destroyed"): Promise<void> => {
    if (phase === "destroyed") return;
    await clean();
    phase = nextPhase;
    status = event;
    report(event);
  };

  return {
    getSnapshot: () => ({
      phase,
      status,
      ...(phase === "tutorial" ? { currentStepId: tutorial.steps[currentStepIndex]?.id } : {}),
      progress: { completed, total: tutorial.steps.length },
      seed: tutorial.seed,
      resources: { listeners: 0, inputHandlers: 0, phaserObjects: 0 },
    }),
    start,
    pause,
    resume,
    advance,
    replay,
    skip,
    exit: () => terminate("exited", "exited"),
    interrupt: () => terminate("interrupted", "interrupted"),
    destroy: () => terminate("destroyed", "destroyed"),
  };
}
