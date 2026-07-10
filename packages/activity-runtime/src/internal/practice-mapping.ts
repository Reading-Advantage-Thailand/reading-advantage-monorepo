import { buildPracticeSubmissionEnvelope } from "@reading-advantage/practice-core/contract";
import { z } from "zod";
import {
  ActivityContractError,
  activityEvidenceMetadataSchema,
  activityPracticeSubmissionEnvelopeSchema,
  normalizeActivityAnswer,
  type Activity,
  type ActivityPracticeSubmissionEnvelope,
} from "../core.js";
import { createVerificationDigest, serverVerifiedResultSchema } from "./verification.js";

const checkpointPracticeInputSchema = z
  .object({
    checkpointId: z.string().trim().min(1),
    submissionId: z.string().trim().min(1),
    attemptNumber: z.number().int().positive(),
    answer: z.unknown(),
    verifiedResult: serverVerifiedResultSchema,
    submittedAt: z.string().datetime({ offset: true }),
    hintsUsed: z.number().int().nonnegative(),
    revealsUsed: z.number().int().nonnegative(),
    interventionLevel: z.number().int().min(0).max(3),
    evidenceConfidence: z.number().finite().min(0).max(1),
    timingMs: z.number().finite().nonnegative(),
  })
  .strict();
type CheckpointPracticeInput = z.input<typeof checkpointPracticeInputSchema>;

const tutorialStepPracticeInputSchema = z
  .object({
    stepId: z.string().trim().min(1),
    submissionId: z.string().trim().min(1),
    attemptNumber: z.number().int().positive(),
    checkResults: z.array(z.object({ checkId: z.string().trim().min(1), passed: z.boolean() }).strict()).min(1),
    verifiedResult: serverVerifiedResultSchema,
    submittedAt: z.string().datetime({ offset: true }),
    hintsUsed: z.number().int().nonnegative(),
    revealsUsed: z.number().int().nonnegative(),
    interventionLevel: z.number().int().min(0).max(3),
    evidenceConfidence: z.number().finite().min(0).max(1),
    timingMs: z.number().finite().nonnegative(),
  })
  .strict();
type TutorialStepPracticeInput = z.input<typeof tutorialStepPracticeInputSchema>;

function evaluateActivityQuestion(question: Activity["checkpoints"][number]["question"], answer: unknown): boolean {
  const normalized = normalizeActivityAnswer(answer);
  if (question.kind === "free_text") return question.acceptedAnswers.map(normalizeActivityAnswer).includes(normalized);
  return normalized === normalizeActivityAnswer(question.correctOptionIds);
}

/**
 * Projects a server-verified checkpoint response into practice.v1.
 * @param activity Validated activity containing the checkpoint.
 * @param input Atomic server verification output and attempt context.
 * @returns Strict activity practice submission.
 * @throws ActivityContractError when verification and authored content diverge.
 */
export function mapVerifiedCheckpointAttempt(
  activity: Activity,
  input: CheckpointPracticeInput,
): ActivityPracticeSubmissionEnvelope {
  const parsedInput = checkpointPracticeInputSchema.parse(input);
  const checkpoint = activity.checkpoints.find((candidate) => candidate.checkpointId === parsedInput.checkpointId);
  if (!checkpoint) throw new ActivityContractError("RESOURCE_NOT_FOUND", `Checkpoint not found: ${parsedInput.checkpointId}`);
  if (checkpoint.evidence.behavior !== "assessed") {
    throw new ActivityContractError("RESOURCE_NOT_FOUND", `Checkpoint is not assessed: ${input.checkpointId}`);
  }
  const expectedCorrectness = evaluateActivityQuestion(checkpoint.question, parsedInput.answer);
  const expectedDigest = createVerificationDigest(activity.activityId, checkpoint.checkpointId, parsedInput.answer);
  if (
    parsedInput.verifiedResult.activityId !== activity.activityId
    || parsedInput.verifiedResult.subjectId !== checkpoint.checkpointId
    || parsedInput.verifiedResult.inputDigest !== expectedDigest
    || parsedInput.verifiedResult.isCorrect !== expectedCorrectness
  ) {
    throw new ActivityContractError("VERIFICATION_MISMATCH", `Checkpoint verification does not match ${checkpoint.checkpointId}`);
  }
  const submittedAt = new Date(parsedInput.submittedAt);
  const startedAt = new Date(submittedAt.getTime() - parsedInput.timingMs).toISOString();
  const metadata = activityEvidenceMetadataSchema.parse({
    activityId: activity.activityId,
    activityVersion: activity.activityVersion,
    graphVersion: activity.graphVersion,
    objectiveId: checkpoint.objectiveId,
    variantKey: checkpoint.variantKey,
    stepId: checkpoint.stepId,
    submissionId: parsedInput.submissionId,
    attemptNumber: parsedInput.attemptNumber,
    hintsUsed: parsedInput.hintsUsed,
    revealsUsed: parsedInput.revealsUsed,
    scaffoldLevel: 0,
    interventionLevel: parsedInput.interventionLevel,
    evidenceConfidence: parsedInput.evidenceConfidence,
    timing: { wallClockMs: parsedInput.timingMs, activeMs: parsedInput.timingMs },
  });
  return activityPracticeSubmissionEnvelopeSchema.parse(buildPracticeSubmissionEnvelope({
    activityId: activity.activityId,
    mode: activity.mode,
    attemptNumber: parsedInput.attemptNumber,
    submittedAt: parsedInput.submittedAt,
    answers: { [checkpoint.stepId]: parsedInput.answer },
    parts: [{
      partId: checkpoint.stepId,
      rawAnswer: parsedInput.answer,
      isCorrect: parsedInput.verifiedResult.isCorrect,
      score: (parsedInput.verifiedResult.score ?? (parsedInput.verifiedResult.isCorrect ? 1 : 0)) * checkpoint.evidence.weight,
      maxScore: checkpoint.evidence.weight,
      hintsUsed: parsedInput.hintsUsed,
      revealStepsSeen: parsedInput.revealsUsed,
      wallClockMs: parsedInput.timingMs,
      activeMs: parsedInput.timingMs,
      answeredAt: parsedInput.submittedAt,
    }],
    analytics: metadata,
    timing: {
      startedAt,
      submittedAt: parsedInput.submittedAt,
      wallClockMs: parsedInput.timingMs,
      activeMs: parsedInput.timingMs,
      idleMs: 0,
      pauseCount: 0,
      focusLossCount: 0,
      visibilityHiddenCount: 0,
      confidence: parsedInput.evidenceConfidence >= 0.8 ? "high" : parsedInput.evidenceConfidence >= 0.5 ? "medium" : "low",
    },
  }));
}

/**
 * Projects server-executed tutorial checks into practice.v1.
 * @param activity Validated activity containing the tutorial step.
 * @param input Atomic server check output and attempt context.
 * @returns Strict activity practice submission.
 * @throws ActivityContractError when verification and authored checks diverge.
 */
export function mapVerifiedTutorialStep(
  activity: Activity,
  input: TutorialStepPracticeInput,
): ActivityPracticeSubmissionEnvelope {
  const parsedInput = tutorialStepPracticeInputSchema.parse(input);
  const step = activity.tutorialSteps.find((candidate) => candidate.stepId === parsedInput.stepId);
  if (!step) throw new ActivityContractError("RESOURCE_NOT_FOUND", `Tutorial step not found: ${parsedInput.stepId}`);
  const authoredCheckIds = new Set(step.checks.map((check) => check.checkId));
  const suppliedCheckIds = new Set(parsedInput.checkResults.map((result) => result.checkId));
  const completeResults = authoredCheckIds.size === suppliedCheckIds.size
    && [...authoredCheckIds].every((checkId) => suppliedCheckIds.has(checkId));
  const expectedCorrectness = completeResults && parsedInput.checkResults.every((result) => result.passed);
  const expectedDigest = createVerificationDigest(activity.activityId, step.stepId, parsedInput.checkResults);
  if (
    parsedInput.verifiedResult.activityId !== activity.activityId
    || parsedInput.verifiedResult.subjectId !== step.stepId
    || parsedInput.verifiedResult.inputDigest !== expectedDigest
    || parsedInput.verifiedResult.isCorrect !== expectedCorrectness
  ) {
    throw new ActivityContractError("VERIFICATION_MISMATCH", `Tutorial verification does not match ${step.stepId}`);
  }
  const submittedAt = new Date(parsedInput.submittedAt);
  const startedAt = new Date(submittedAt.getTime() - parsedInput.timingMs).toISOString();
  const metadata = activityEvidenceMetadataSchema.parse({
    activityId: activity.activityId,
    activityVersion: activity.activityVersion,
    graphVersion: activity.graphVersion,
    objectiveId: step.objectiveId,
    variantKey: step.variantKey,
    stepId: step.stepId,
    submissionId: parsedInput.submissionId,
    attemptNumber: parsedInput.attemptNumber,
    hintsUsed: parsedInput.hintsUsed,
    revealsUsed: parsedInput.revealsUsed,
    scaffoldLevel: step.scaffoldLevel,
    interventionLevel: parsedInput.interventionLevel,
    evidenceConfidence: parsedInput.evidenceConfidence,
    timing: { wallClockMs: parsedInput.timingMs, activeMs: parsedInput.timingMs },
  });
  return activityPracticeSubmissionEnvelopeSchema.parse(buildPracticeSubmissionEnvelope({
    activityId: activity.activityId,
    mode: activity.mode,
    attemptNumber: parsedInput.attemptNumber,
    submittedAt: parsedInput.submittedAt,
    answers: { [step.stepId]: parsedInput.checkResults },
    parts: [{
      partId: step.stepId,
      rawAnswer: parsedInput.checkResults,
      isCorrect: parsedInput.verifiedResult.isCorrect,
      score: parsedInput.verifiedResult.score ?? (parsedInput.verifiedResult.isCorrect ? 1 : 0),
      maxScore: 1,
      hintsUsed: parsedInput.hintsUsed,
      revealStepsSeen: parsedInput.revealsUsed,
      wallClockMs: parsedInput.timingMs,
      activeMs: parsedInput.timingMs,
      answeredAt: parsedInput.submittedAt,
    }],
    analytics: metadata,
    timing: {
      startedAt,
      submittedAt: parsedInput.submittedAt,
      wallClockMs: parsedInput.timingMs,
      activeMs: parsedInput.timingMs,
      idleMs: 0,
      pauseCount: 0,
      focusLossCount: 0,
      visibilityHiddenCount: 0,
      confidence: parsedInput.evidenceConfidence >= 0.8 ? "high" : parsedInput.evidenceConfidence >= 0.5 ? "medium" : "low",
    },
  }));
}
