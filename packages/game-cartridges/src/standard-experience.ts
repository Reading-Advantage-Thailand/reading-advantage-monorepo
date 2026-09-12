import {
  STANDARD_GAME_REQUIRED_CREDIT,
  validateStandardGameExperienceDefinition,
  type CreateTutorialActionDriverContext,
  type GameTutorialActionDriverContext,
  type GameTutorialActionDriverFrameContext,
  type StandardGameExperienceRuntime,
} from "@reading-advantage/advantage-play-kit/presentation";

/** Pointer and touch briefing action written in device terms. */
export const STANDARD_POINTER_TOUCH_ACTION =
  "Tap or click to perform the action shown in the game." as const;

/** Debrief credit shown by every cartridge that loads standard-pack pixel art. */
export const STANDARD_DEBRIEF_CREDIT = STANDARD_GAME_REQUIRED_CREDIT;

/** Configuration for a cartridge's standard guided experience. */
export interface CartridgeStandardExperienceOptions {
  /** Stable cartridge identifier. */
  readonly id: string;
  /** Product-facing game title. */
  readonly title: string;
  /** Short mechanic description. */
  readonly description: string;
  /** Educational content mode. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Learning objective shown before the game. */
  readonly objective: string;
  /** Primary mechanic instruction. */
  readonly mechanicInstruction: string;
  /** Keyboard controls shown in the briefing. */
  readonly keyboardKeys: readonly [string, ...string[]];
  /** Executes a safe action through the active cartridge mechanic. */
  readonly executeTutorialAction: (
    actionId: string,
    context: CreateTutorialActionDriverContext,
    execution: GameTutorialActionDriverContext,
  ) => void | Promise<void>;
  /**
   * Advances a demonstration by one frame for a mechanic that shows motion.
   * A cartridge whose action is one discrete choice omits this option.
   */
  readonly advanceTutorialAction?: (actionId: string, progress: number) => void;
  /** Optional debrief credit for art that this cartridge actually loads. */
  readonly requiredCredit?: string;
}

/**
 * Creates the standard briefing, safe tutorial, and learning debrief for a cartridge.
 * @param options Product text, controls, input mode, optional credit, and active mechanic bridge.
 * @returns A complete standard experience runtime for one cartridge instance.
 */
export function createCartridgeStandardExperience(
  options: CartridgeStandardExperienceOptions,
): StandardGameExperienceRuntime {
  const definition = validateStandardGameExperienceDefinition({
    briefing: {
      title: options.title,
      subtitle: options.description,
      objective: options.objective,
      instructions: [
        {
          title: "Learn the mechanic",
          description: options.mechanicInstruction,
        },
        {
          title: "Use the feedback",
          description: "Incorrect choices keep the current learning target active. Correct choices advance it.",
        },
      ],
      learningPreview: {
        heading: options.inputMode === "vocabulary" ? "Words to learn" : "Sentences to practice",
      },
      controls: [
        {
          mode: "keyboard",
          label: "Keyboard",
          action: options.mechanicInstruction,
          keys: [...options.keyboardKeys],
        },
        { mode: "pointer", label: "Click", action: STANDARD_POINTER_TOUCH_ACTION },
        { mode: "touch", label: "Tap", action: STANDARD_POINTER_TOUCH_ACTION },
      ],
      tip: "The guided tutorial is safe and does not save results or award XP.",
      labels: { startAction: "Play now" },
      startPhase: "tutorial",
    },
    tutorial: {
      schemaVersion: 1,
      id: `${options.id}-tutorial`,
      title: "Practice",
      seed: 29,
      labels: {
        progress: "Tutorial progress",
        pause: "Pause tutorial",
        resume: "Resume tutorial",
        advance: "Next tutorial step",
        replay: "Replay tutorial",
        skip: "Skip tutorial",
      },
      targets: [
        { id: "feedback:incorrect-choice", kind: "feedback" },
        { id: "mechanic:correct-choice", kind: "mechanic" },
      ],
      actions: [
        { id: "action:select-incorrect", deterministic: true, consequence: "incorrect" },
        { id: "action:select-correct", deterministic: true, consequence: "correct" },
      ],
      steps: [
        {
          id: "step:review-incorrect",
          title: "Wrong choice",
          explanation: "The target stays the same.",
          targetId: "feedback:incorrect-choice",
          actionId: "action:select-incorrect",
          timing: { leadInMs: 500, demonstrationMs: 300, lingerMs: 600 },
        },
        {
          id: "step:select-correct",
          title: "Correct choice",
          explanation: "The next target appears.",
          targetId: "mechanic:correct-choice",
          actionId: "action:select-correct",
          timing: { leadInMs: 500, demonstrationMs: 300, lingerMs: 600 },
        },
      ],
      lifecycle: {
        pause: "freeze-current-step",
        advance: "learner-controlled",
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
    },
    debrief: {
      outcome: "complete",
      requiredCredit: options.requiredCredit ?? STANDARD_DEBRIEF_CREDIT,
      replayEntry: "briefing",
      exitDestination: "catalog",
    },
  });

  const advanceTutorialAction = options.advanceTutorialAction;
  return Object.freeze({
    definition,
    createTutorialActionDriver: (context = {}) => ({
      execute: (execution: GameTutorialActionDriverContext) =>
        options.executeTutorialAction(execution.step.actionId, context, execution),
      ...(advanceTutorialAction === undefined ? {} : {
        advanceFrame: ({ step, progress }: GameTutorialActionDriverFrameContext) =>
          advanceTutorialAction(step.actionId, progress),
      }),
    }),
  });
}
