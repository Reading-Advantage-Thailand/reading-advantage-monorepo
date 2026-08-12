/** Accessible loading, errors, instructions, prompts, HUD, feedback, navigation, and results. */
export {
  EducationalPrompt,
  GameErrorState,
  GameFeedback,
  GameHud,
  GameLoadingState,
  GameBriefingScreen,
  GameNavigationControls,
  GameProgress,
  GameResultPanel,
  InstructionsPanel,
  PresentationShell,
} from "./game-presentation.js";

/** Public presentation component props. */
export type {
  EducationalPromptProps,
  GameErrorStateProps,
  GameFeedbackProps,
  GameHudProps,
  GameLoadingStateProps,
  GameBriefingScreenProps,
  GameNavigationControlsProps,
  GameProgressProps,
  GameResultPanelProps,
  InstructionsPanelProps,
  PresentationShellProps,
} from "./game-presentation.js";

/** Public guided tutorial contract schemas and validator. */
export {
  gameTutorialActionConsequenceSchema,
  gameTutorialActionSchema,
  gameTutorialCommandSchema,
  gameTutorialDefinitionSchema,
  gameTutorialLabelsSchema,
  gameTutorialLifecyclePolicySchema,
  gameTutorialProgressSchema,
  gameTutorialStepSchema,
  gameTutorialStepTimingSchema,
  gameTutorialTargetKindSchema,
  gameTutorialTargetSchema,
  gameTutorialTextSchema,
  tutorialSemanticIdSchema,
  validateGameTutorialDefinition,
} from "./game-tutorial-contract.js";

/** Public deterministic tutorial runtime factory. */
export { createGameTutorialRuntime } from "./game-tutorial-runtime.js";

/** Public shared tutorial controller factory. */
export { createGameTutorialController } from "./game-tutorial-controller.js";

/** Public guided tutorial presentation component. */
export { GameTutorialScreen } from "./game-tutorial-screen.js";

/** Shared deterministic guided tutorial QC fixture factory. */
export { createGameTutorialQcFixture } from "../testing/game-tutorial-qc-fixtures.js";

/** Public guided tutorial presentation props. */
export type { GameTutorialScreenProps } from "./game-tutorial-screen.js";

/** Public deterministic tutorial runtime contracts. */
export type {
  CreateGameTutorialRuntimeOptions,
  GameTutorialClock,
  GameTutorialDiagnostic,
  GameTutorialEffects,
  GameTutorialResourceCounts,
  GameTutorialRuntime,
  GameTutorialRuntimeSnapshot,
} from "./game-tutorial-runtime.js";

/** Public shared tutorial controller contracts. */
export type {
  CreateGameTutorialControllerOptions,
  GameTutorialController,
  GameTutorialControllerSnapshot,
} from "./game-tutorial-controller.js";

/** Public guided tutorial contract and action-driver types. */
export type {
  GameTutorialAction,
  GameTutorialActionConsequence,
  GameTutorialActionDiagnostics,
  GameTutorialActionDriver,
  GameTutorialActionDriverContext,
  GameTutorialCommand,
  GameTutorialDefinition,
  GameTutorialLabels,
  GameTutorialLifecyclePolicy,
  GameTutorialProgress,
  GameTutorialStep,
  GameTutorialStepTiming,
  GameTutorialTarget,
  GameTutorialTargetKind,
} from "./game-tutorial-contract.js";

/** Public standardized briefing and lifecycle contract schemas. */
export {
  gameBriefingControlHintSchema,
  gameBriefingControlSchema,
  gameBriefingInstructionSchema,
  gameBriefingLabelsSchema,
  gameBriefingLearningPreviewSchema,
  gameBriefingSchema,
  gameBriefingStartPhaseSchema,
  gameBriefingTextSchema,
  gameLifecycleEventSchema,
  gameLifecyclePhaseSchema,
  gameLifecycleTransitionSchema,
  resolveGameBriefingStartPhase,
} from "./game-presentation.js";

/** Public standardized briefing and lifecycle contract types. */
export type {
  GameBriefing,
  GameBriefingControl,
  GameBriefingControlHint,
  GameBriefingInstruction,
  GameBriefingLabels,
  GameBriefingLearningPreview,
  GameBriefingStartPhase,
  GameLifecycleEvent,
  GameLifecyclePhase,
  GameLifecycleTransition,
} from "./game-presentation.js";
