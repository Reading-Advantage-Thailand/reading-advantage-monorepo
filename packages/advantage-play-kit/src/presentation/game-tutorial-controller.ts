import {
  createGameTutorialRuntime,
  type CreateGameTutorialRuntimeOptions,
  type GameTutorialRuntime,
  type GameTutorialRuntimeSnapshot,
} from "./game-tutorial-runtime.js";
import {
  validateGameTutorialDefinition,
  type GameTutorialAction,
  type GameTutorialStep,
  type GameTutorialTarget,
} from "./game-tutorial-contract.js";

/** Describes the tutorial state exposed to a host. */
export interface GameTutorialControllerSnapshot extends GameTutorialRuntimeSnapshot {
  /** Identifies this isolated execution as tutorial playback. */
  readonly mode: "tutorial";
  /** The active tutorial step when playback is in the tutorial phase. */
  readonly currentStep?: GameTutorialStep;
  /** The semantic target for the active tutorial step. */
  readonly currentTarget?: GameTutorialTarget;
  /** The cartridge action for the active tutorial step. */
  readonly currentAction?: GameTutorialAction;
}

/** Defines dependencies for the shared tutorial controller. */
export interface CreateGameTutorialControllerOptions extends CreateGameTutorialRuntimeOptions {
  /** Receives host-neutral tutorial snapshots. */
  readonly onSnapshot?: (snapshot: GameTutorialControllerSnapshot) => void;
}

/** Controls tutorial playback and exposes semantic state to a host. */
export interface GameTutorialController extends GameTutorialRuntime {
  /** Returns the current semantic tutorial state. */
  readonly getSnapshot: () => GameTutorialControllerSnapshot;
}

/**
 * Creates a host-neutral controller for one cartridge tutorial.
 * @param options The validated tutorial dependencies and host callbacks.
 * @returns A controller with safe tutorial commands and semantic snapshots.
 */
export function createGameTutorialController(
  options: CreateGameTutorialControllerOptions,
): GameTutorialController {
  const tutorial = validateGameTutorialDefinition(options.tutorial);
  const runtime = createGameTutorialRuntime({ ...options, tutorial });

  const getSnapshot = (): GameTutorialControllerSnapshot => {
    const snapshot = runtime.getSnapshot();
    const currentStep = snapshot.currentStepId === undefined
      ? undefined
      : tutorial.steps.find((step) => step.id === snapshot.currentStepId);
    const currentTarget = currentStep === undefined
      ? undefined
      : tutorial.targets.find((target) => target.id === currentStep.targetId);
    const currentAction = currentStep === undefined
      ? undefined
      : tutorial.actions.find((action) => action.id === currentStep.actionId);
    return {
      ...snapshot,
      mode: "tutorial",
      ...(currentStep === undefined ? {} : { currentStep }),
      ...(currentTarget === undefined ? {} : { currentTarget }),
      ...(currentAction === undefined ? {} : { currentAction }),
    };
  };

  const publish = (): void => options.onSnapshot?.(getSnapshot());
  const command = (action: () => void | Promise<void>): (() => void | Promise<void>) => () => {
    const result = action();
    if (result instanceof Promise) return result.then(publish);
    publish();
  };

  return {
    getSnapshot,
    start: command(runtime.start),
    pause: command(runtime.pause),
    resume: command(runtime.resume),
    advance: command(runtime.advance),
    replay: command(runtime.replay),
    skip: command(runtime.skip),
    exit: command(runtime.exit),
    interrupt: command(runtime.interrupt),
    destroy: command(runtime.destroy),
  };
}
