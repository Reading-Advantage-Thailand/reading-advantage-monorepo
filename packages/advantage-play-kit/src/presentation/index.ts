/** Accessible loading, errors, instructions, prompts, HUD, feedback, navigation, and results. */
export {
  EducationalPrompt,
  GameErrorState,
  GameFeedback,
  GameHud,
  GameLoadingState,
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
  GameNavigationControlsProps,
  GameProgressProps,
  GameResultPanelProps,
  InstructionsPanelProps,
  PresentationShellProps,
} from "./game-presentation.js";

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
