import {
  createGameTutorialController,
  validateGameTutorialDefinition,
  type GameTutorialActionDriver,
  type GameTutorialDefinition,
} from "../presentation/index.js";
import type { GameTutorialClock } from "../presentation/game-tutorial-runtime.js";
import type { DeterministicInputDescriptor } from "./deterministic-fixtures.js";

/** Input modalities that the tutorial QC preview can exercise. */
export type GameTutorialQcInputMode = "keyboard" | "pointer" | "touch";

/** A deterministic input sequence for a tutorial QC fixture. */
export interface GameTutorialQcInputSequence {
  /** Returns the next configured input modality. */
  readonly next: () => { readonly modality: GameTutorialQcInputMode } | undefined;
  /** Resets the sequence to its first input. */
  readonly reset: () => void;
}

/** A deterministic clock with controlled queued tutorial callbacks. */
export interface GameTutorialQcClock extends GameTutorialClock {
  /** Runs all callbacks that are pending when each callback completes. */
  readonly runAll: () => Promise<void>;
  /** Returns the pending callback count. */
  readonly pendingCount: () => number;
}

/** Resource counts that the QC driver exposes for teardown inspection. */
export interface GameTutorialQcResources {
  /** The active listener count. */
  readonly listeners: number;
  /** The active input handler count. */
  readonly inputHandlers: number;
  /** The active Phaser object count. */
  readonly phaserObjects: number;
}

/** A shared, deterministic fixture for tutorial controller and preview tests. */
export interface GameTutorialQcFixture {
  /** The validated tutorial definition. */
  readonly tutorial: GameTutorialDefinition;
  /** The isolated shared tutorial controller. */
  readonly controller: ReturnType<typeof createGameTutorialController>;
  /** The deterministic tutorial clock. */
  readonly clock: GameTutorialQcClock;
  /** The selected QC input sequence. */
  readonly input: GameTutorialQcInputSequence;
  /** The declared semantic target identifiers. */
  readonly targetIds: readonly string[];
  /** The declared deterministic action identifiers. */
  readonly actionIds: readonly string[];
  /** The real-mechanic driver boundary and its diagnostics. */
  readonly driver: GameTutorialActionDriver & {
    readonly executed: readonly string[];
    readonly resources: () => GameTutorialQcResources;
  };
  /** Returns the single isolated canvas boundary count. */
  readonly canvasCount: () => 1;
}

/** Creates a deterministic clock for tutorial QC playback. */
function createTutorialQcClock(): GameTutorialQcClock {
  let now = 0;
  let nextHandle = 0;
  const timers = new Map<number, { readonly at: number; readonly callback: () => void | Promise<void> }>();
  const nextTimer = () => [...timers.entries()].sort(([, left], [, right]) => left.at - right.at)[0];
  return {
    now: () => now,
    setTimeout: (callback, delayMs) => {
      const handle = ++nextHandle;
      timers.set(handle, { at: now + delayMs, callback });
      return handle;
    },
    clearTimeout: (handle) => timers.delete(handle),
    pendingCount: () => timers.size,
    runAll: async () => {
      while (true) {
        const next = nextTimer();
        if (!next) return;
        timers.delete(next[0]);
        now = next[1].at;
        await next[1].callback();
      }
    },
  };
}

/** Creates a controller fixture that executes the cartridge driver boundary only. */
export function createGameTutorialQcFixture(options: {
  /** The tutorial definition to validate and preview. */
  readonly tutorial: GameTutorialDefinition;
  /** The input modalities that the preview exposes. */
  readonly inputModes: readonly [GameTutorialQcInputMode, GameTutorialQcInputMode, GameTutorialQcInputMode];
}): GameTutorialQcFixture {
  const tutorial = validateGameTutorialDefinition(options.tutorial);
  const clock = createTutorialQcClock();
  const descriptors: readonly DeterministicInputDescriptor[] = options.inputModes.map((modality) => ({ modality })) as readonly DeterministicInputDescriptor[];
  let inputIndex = 0;
  let resources: GameTutorialQcResources = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
  const executed: string[] = [];
  const driver: GameTutorialActionDriver & { readonly executed: readonly string[]; readonly resources: () => GameTutorialQcResources; readonly destroy: () => void } = {
    execute: ({ step }) => {
      executed.push(step.actionId);
      resources = { listeners: 1, inputHandlers: 1, phaserObjects: 1 };
    },
    destroy: () => {
      resources = { listeners: 0, inputHandlers: 0, phaserObjects: 0 };
    },
    executed,
    resources: () => resources,
  };
  const controller = createGameTutorialController({
    tutorial,
    actionDriver: driver,
    clock,
    effects: {
      emitGameResults: () => undefined,
      complete: () => undefined,
      persistProgress: () => undefined,
      awardAuthoritativeXp: () => undefined,
      writeLeaderboard: () => undefined,
      applyFailureConsequences: () => undefined,
    },
    onLifecycleTransition: () => undefined,
  });
  return {
    tutorial,
    controller,
    clock,
    input: {
      next: () => descriptors[inputIndex++],
      reset: () => { inputIndex = 0; },
    },
    targetIds: tutorial.targets.map((target) => target.id),
    actionIds: tutorial.actions.map((action) => action.id),
    driver,
    canvasCount: () => 1,
  };
}
