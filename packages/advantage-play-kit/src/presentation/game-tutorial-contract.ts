import { z } from "zod";

/** Validates one resolved tutorial text value. */
export const gameTutorialTextSchema = z.string().trim().min(1);

/** Validates a serializable semantic identifier for a tutorial target or action. */
export const tutorialSemanticIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*:[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
    message: "Tutorial semantic ids must use a semantic namespace and kebab-case value",
  });

/** Validates the supported semantic target classes. */
export const gameTutorialTargetKindSchema = z.enum(["control", "mechanic", "learning-item", "feedback"]);

/** Type of a semantic target class. */
export type GameTutorialTargetKind = z.infer<typeof gameTutorialTargetKindSchema>;

/** Validates one cartridge-declared semantic tutorial target. */
export const gameTutorialTargetSchema = z.object({
  id: tutorialSemanticIdSchema,
  kind: gameTutorialTargetKindSchema,
}).strict();

/** Type of a validated semantic tutorial target. */
export type GameTutorialTarget = z.infer<typeof gameTutorialTargetSchema>;

/** Validates the educational consequence illustrated by a deterministic action. */
export const gameTutorialActionConsequenceSchema = z.enum(["neutral", "correct", "incorrect"]);

/** Type of a deterministic tutorial action consequence. */
export type GameTutorialActionConsequence = z.infer<typeof gameTutorialActionConsequenceSchema>;

/** Validates one deterministic cartridge action declaration. */
export const gameTutorialActionSchema = z.object({
  id: tutorialSemanticIdSchema,
  deterministic: z.literal(true),
  consequence: gameTutorialActionConsequenceSchema,
}).strict();

/** Type of a validated deterministic tutorial action. */
export type GameTutorialAction = z.infer<typeof gameTutorialActionSchema>;

/** Validates the bounded timing for one tutorial step. */
export const gameTutorialStepTimingSchema = z.object({
  leadInMs: z.number().int().min(0).max(120_000),
  demonstrationMs: z.number().int().min(0).max(120_000),
  lingerMs: z.number().int().min(0).max(120_000),
}).strict();

/** Type of a validated tutorial step timing value. */
export type GameTutorialStepTiming = z.infer<typeof gameTutorialStepTimingSchema>;

/** Validates one linear tutorial step. */
export const gameTutorialStepSchema = z.object({
  id: tutorialSemanticIdSchema,
  title: gameTutorialTextSchema,
  explanation: gameTutorialTextSchema,
  targetId: tutorialSemanticIdSchema,
  actionId: tutorialSemanticIdSchema,
  timing: gameTutorialStepTimingSchema,
}).strict();

/** Type of a validated linear tutorial step. */
export type GameTutorialStep = z.infer<typeof gameTutorialStepSchema>;

/** Validates the resolved labels for tutorial controls and progress. */
export const gameTutorialLabelsSchema = z.object({
  progress: gameTutorialTextSchema,
  pause: gameTutorialTextSchema,
  resume: gameTutorialTextSchema,
  advance: gameTutorialTextSchema,
  replay: gameTutorialTextSchema,
  skip: gameTutorialTextSchema,
}).strict();

/** Type of validated resolved tutorial labels. */
export type GameTutorialLabels = z.infer<typeof gameTutorialLabelsSchema>;

const tutorialDestinationSchema = z.enum(["countdown", "playing"]);

const tutorialSkipPolicySchema = z.union([
  z.object({ enabled: z.literal(true), to: tutorialDestinationSchema }).strict(),
  z.object({ enabled: z.literal(false) }).strict(),
]);

const tutorialProductionEffectsSchema = z.object({
  emitGameResults: z.literal(false),
  persistProgress: z.literal(false),
  awardAuthoritativeXp: z.literal(false),
  writeLeaderboard: z.literal(false),
  applyFailureConsequences: z.literal(false),
}).strict();

/** Validates the fixed safety policy that APK applies during tutorial playback. */
export const gameTutorialLifecyclePolicySchema = z.object({
  pause: z.literal("freeze-current-step"),
  advance: z.literal("sequential"),
  replay: z.literal("restart-with-same-seed"),
  skip: tutorialSkipPolicySchema,
  complete: z.object({ to: tutorialDestinationSchema }).strict(),
  productionEffects: tutorialProductionEffectsSchema,
}).strict();

/** Type of the validated tutorial safety policy. */
export type GameTutorialLifecyclePolicy = z.infer<typeof gameTutorialLifecyclePolicySchema>;

/** Validates the progress value reported for a linear tutorial. */
export const gameTutorialProgressSchema = z.object({
  completed: z.number().int().min(0),
  total: z.number().int().min(1),
}).strict().superRefine((progress, context) => {
  if (progress.completed > progress.total) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["completed"],
      message: "Completed tutorial steps cannot exceed the total",
    });
  }
});

/** Type of a validated tutorial progress value. */
export type GameTutorialProgress = z.infer<typeof gameTutorialProgressSchema>;

/** Validates a command that only controls tutorial playback. */
export const gameTutorialCommandSchema = z.enum(["pause", "resume", "advance", "replay", "skip"]);

/** Type of a tutorial-local command. */
export type GameTutorialCommand = z.infer<typeof gameTutorialCommandSchema>;

/**
 * Validates a complete serializable tutorial definition.
 *
 * The step array defines order. Each declared target and action must have one
 * matching step, so declarations cannot create a hidden branch or unused path.
 */
export const gameTutorialDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  id: gameTutorialTextSchema,
  title: gameTutorialTextSchema,
  seed: z.number().int().min(0).max(4_294_967_295),
  labels: gameTutorialLabelsSchema,
  targets: z.array(gameTutorialTargetSchema).min(1),
  actions: z.array(gameTutorialActionSchema).min(1),
  steps: z.array(gameTutorialStepSchema).min(1),
  lifecycle: gameTutorialLifecyclePolicySchema,
}).strict().superRefine((tutorial, context) => {
  const requireUniqueIds = (
    entries: readonly { readonly id: string }[],
    field: "targets" | "actions" | "steps",
  ) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field, index, "id"],
          message: `Tutorial ${field} ids must be unique`,
        });
      }
      seen.add(entry.id);
    });
  };

  requireUniqueIds(tutorial.targets, "targets");
  requireUniqueIds(tutorial.actions, "actions");
  requireUniqueIds(tutorial.steps, "steps");

  const targetIds = new Set(tutorial.targets.map((target) => target.id));
  const actionIds = new Set(tutorial.actions.map((action) => action.id));
  const usedTargetIds = new Set<string>();
  const usedActionIds = new Set<string>();

  tutorial.steps.forEach((step, index) => {
    if (!targetIds.has(step.targetId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps", index, "targetId"],
        message: "Tutorial step targetId must reference a declared target",
      });
    }
    if (!actionIds.has(step.actionId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps", index, "actionId"],
        message: "Tutorial step actionId must reference a declared action",
      });
    }
    usedTargetIds.add(step.targetId);
    usedActionIds.add(step.actionId);
  });

  tutorial.targets.forEach((target, index) => {
    if (!usedTargetIds.has(target.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targets", index, "id"],
        message: "Each tutorial target must be used by a step",
      });
    }
  });
  tutorial.actions.forEach((action, index) => {
    if (!usedActionIds.has(action.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actions", index, "id"],
        message: "Each tutorial action must be used by a step",
      });
    }
  });
});

/** Type of a validated serializable tutorial definition. */
export type GameTutorialDefinition = z.infer<typeof gameTutorialDefinitionSchema>;

/**
 * Validates an untrusted tutorial definition.
 * @param tutorial The cartridge tutorial declaration to validate.
 * @returns The complete validated tutorial definition.
 * @throws When the tutorial has an invalid field, reference, declaration, or safety policy.
 */
export function validateGameTutorialDefinition(tutorial: unknown): GameTutorialDefinition {
  const parsed = gameTutorialDefinitionSchema.safeParse(tutorial);
  if (!parsed.success) {
    throw new Error(
      `Tutorial definition validation failed: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

/** Runtime diagnostics emitted while the cartridge demonstrates one tutorial action. */
export interface GameTutorialActionDiagnostics {
  /** Reports a tutorial-local diagnostic message. */
  readonly report: (message: string) => void;
}

/** Input supplied to a cartridge-owned tutorial action driver. */
export interface GameTutorialActionDriverContext {
  /** The validated tutorial declaration. */
  readonly tutorial: GameTutorialDefinition;
  /** The selected linear tutorial step. */
  readonly step: GameTutorialStep;
  /** The fixed deterministic seed for this tutorial run. */
  readonly seed: number;
  /** Identifies this isolated execution as tutorial playback. */
  readonly mode: "tutorial";
  /** Receives tutorial-local diagnostic messages. */
  readonly diagnostics: GameTutorialActionDiagnostics;
}

/** Executes one validated tutorial action through the cartridge's real mechanic. */
export interface GameTutorialActionDriver {
  /** Executes the selected action without completion, persistence, DOM, or navigation authority. */
  execute(context: GameTutorialActionDriverContext): void | Promise<void>;
}
