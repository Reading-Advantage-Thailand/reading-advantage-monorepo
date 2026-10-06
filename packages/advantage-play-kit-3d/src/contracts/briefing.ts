/**
 * Exact copy of the APK game briefing contract (the schema the APK `game-briefing-screen.tsx`
 * shows). A game's `briefing.ts` builds a `GameBriefing` from catalog keys and it passes this
 * schema unchanged, so the briefing screen needs no change at port time.
 *
 * Source: ../reading-advantage-monorepo/packages/advantage-play-kit/src/presentation/game-briefing-contract.ts
 * Monorepo commit: fe6aedc2b. Copied verbatim below this header, without the lifecycle schemas
 * (`gameLifecycle*`), which the host does not use here.
 */
import { z } from "zod";

/**
 * Runtime schema for authored briefing text after the host resolves localization.
 *
 * Localization is deliberately a host boundary: APK validates resolved Unicode
 * strings and does not accept message keys, locale maps, or translation callbacks.
 */
export const gameBriefingTextSchema = z.string().trim().min(1);

/** Schema for one non-empty instruction shown in a game briefing. */
export const gameBriefingInstructionSchema = z.object({
  title: gameBriefingTextSchema,
  description: gameBriefingTextSchema,
}).strict();

/** Type of one validated game briefing instruction. */
export type GameBriefingInstruction = z.infer<typeof gameBriefingInstructionSchema>;

/** Schema for the learning-preview heading shown before gameplay. */
export const gameBriefingLearningPreviewSchema = z.object({
  heading: gameBriefingTextSchema,
}).strict();

/** Type of the validated learning-preview presentation metadata. */
export type GameBriefingLearningPreview = z.infer<typeof gameBriefingLearningPreviewSchema>;

/** Schema for one keyboard, pointer, or touch control hint. */
export const gameBriefingControlHintSchema = z.object({
  mode: z.enum(["keyboard", "pointer", "touch"]),
  label: gameBriefingTextSchema,
  action: gameBriefingTextSchema,
  keys: z.array(gameBriefingTextSchema).min(1).max(6).optional(),
}).strict();

/** Type of one validated game briefing control hint. */
export type GameBriefingControlHint = z.infer<typeof gameBriefingControlHintSchema>;

/** Alias for the control-hint schema used by the briefing controls collection. */
export const gameBriefingControlSchema = gameBriefingControlHintSchema;

/** Alias for one validated game briefing control. */
export type GameBriefingControl = GameBriefingControlHint;

/** Schema for optional localized heading and action overrides. */
export const gameBriefingLabelsSchema = z.object({
  eyebrow: gameBriefingTextSchema.optional(),
  objectiveHeading: gameBriefingTextSchema.optional(),
  instructionsHeading: gameBriefingTextSchema.optional(),
  learningPreviewHeading: gameBriefingTextSchema.optional(),
  controlsHeading: gameBriefingTextSchema.optional(),
  tipHeading: gameBriefingTextSchema.optional(),
  itemCountLabel: gameBriefingTextSchema.optional(),
  startAction: gameBriefingTextSchema.optional(),
}).strict();

/** Type of the partial validated label overrides accepted by a briefing. */
export type GameBriefingLabels = z.infer<typeof gameBriefingLabelsSchema>;

/** Schema for the first nonterminal phase reached by a briefing Start action. */
export const gameBriefingStartPhaseSchema = z.enum(["tutorial", "demo", "countdown", "playing"]);

/** Type of the configured first nonterminal briefing phase. */
export type GameBriefingStartPhase = z.infer<typeof gameBriefingStartPhaseSchema>;

/**
 * Runtime schema for the standard, serializable game briefing contract.
 *
 * Host presentation extensions, including React nodes and callbacks, are kept
 * outside this validated contract. The host may compose those props around this
 * data without making them part of the cartridge-facing briefing payload.
 */
export const gameBriefingSchema = z.object({
  title: gameBriefingTextSchema,
  objective: gameBriefingTextSchema,
  subtitle: gameBriefingTextSchema.optional(),
  instructions: z.array(gameBriefingInstructionSchema).min(1).max(12),
  learningPreview: gameBriefingLearningPreviewSchema,
  controls: z.array(gameBriefingControlHintSchema).min(1).max(12),
  tip: gameBriefingTextSchema.optional(),
  labels: gameBriefingLabelsSchema.optional(),
  startPhase: gameBriefingStartPhaseSchema.optional(),
}).strict();

/** Type of a validated, host-localized game briefing. */
export type GameBriefing = z.infer<typeof gameBriefingSchema>;

/**
 * Resolves the phase entered when a briefing Start action is activated.
 * @param briefing Briefing data whose optional phase has already been validated.
 * @returns The configured first nonterminal phase, or playing when omitted.
 */
export function resolveGameBriefingStartPhase(
  briefing: Pick<GameBriefing, "startPhase">,
): GameBriefingStartPhase {
  return briefing.startPhase ?? "playing";
}
