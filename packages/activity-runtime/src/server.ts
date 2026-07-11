import {
  activityEvidenceEventSchema,
  normalizeActivityAnswer,
  type Activity,
  type ActivityEvidenceEvent,
  type ActivityEngagementContext,
  type ActivityEvent,
  type ActivityPracticeSubmissionEnvelope,
} from "./core.js";
import { z } from "zod";
import { mapVerifiedCheckpointAttempt, mapVerifiedTutorialStep } from "./internal/practice-mapping.js";
import { createVerificationDigest, serverVerifiedResultSchema, type ServerVerifiedResult } from "./internal/verification.js";

/** Version of the framework-neutral server port contract. */
export const ACTIVITY_SERVER_PORT_VERSION = "activity-server.v1" as const;

function evaluateActivityQuestion(question: Activity["checkpoints"][number]["question"], answer: unknown): boolean {
  const normalized = normalizeActivityAnswer(answer);
  if (question.kind === "free_text") return question.acceptedAnswers.map(normalizeActivityAnswer).includes(normalized);
  return normalized === normalizeActivityAnswer(question.correctOptionIds);
}

/**
 * Verifies a checkpoint answer against trusted authored correctness data.
 * @param activity Validated activity containing the checkpoint.
 * @param checkpointId Stable checkpoint identifier.
 * @param answer Learner answer to evaluate.
 * @returns A server-authoritative correctness result.
 * @throws Error when the checkpoint does not exist.
 */
function verifyCheckpointAnswer(activity: Activity, checkpointId: string, answer: unknown): ServerVerifiedResult {
  const checkpoint = activity.checkpoints.find((candidate) => candidate.checkpointId === checkpointId);
  if (!checkpoint) throw new Error(`Checkpoint not found: ${checkpointId}`);
  const isCorrect = evaluateActivityQuestion(checkpoint.question, answer);
  return serverVerifiedResultSchema.parse({
    source: "server",
    activityId: activity.activityId,
    subjectId: checkpointId,
    inputDigest: createVerificationDigest(activity.activityId, checkpointId, answer),
    isCorrect,
    score: isCorrect ? 1 : 0,
  });
}

/** Server-owned deterministic check executor used by tutorial adapters. */
export type TutorialCheckExecutor = (
  check: Activity["tutorialSteps"][number]["checks"][number],
) => boolean;

/** Verified tutorial result plus the server-produced per-check details. */
type VerifiedTutorialStepResult = {
  checkResults: Array<{ checkId: string; passed: boolean }>;
  verifiedResult: ServerVerifiedResult;
};

/**
 * Verifies deterministic tutorial checks against the authored step manifest.
 * @param activity Validated activity containing the tutorial step.
 * @param stepId Stable tutorial step identifier.
 * @param executeCheck Server-owned deterministic executor for one authored check.
 * @returns Server-produced check details and their bound aggregate result.
 * @throws Error when the step does not exist.
 */
function verifyTutorialStepResult(
  activity: Activity,
  stepId: string,
  executeCheck: TutorialCheckExecutor,
): VerifiedTutorialStepResult {
  const step = activity.tutorialSteps.find((candidate) => candidate.stepId === stepId);
  if (!step) throw new Error(`Tutorial step not found: ${stepId}`);
  const checkResults = step.checks.map((check) => ({ checkId: check.checkId, passed: executeCheck(check) }));
  const isCorrect = checkResults.every((result) => result.passed);
  return {
    checkResults,
    verifiedResult: serverVerifiedResultSchema.parse({
      source: "server",
      activityId: activity.activityId,
      subjectId: stepId,
      inputDigest: createVerificationDigest(activity.activityId, stepId, checkResults),
      isCorrect,
      score: isCorrect ? 1 : 0,
    }),
  };
}

/** Strict client checkpoint attempt without any correctness constructor. */
export const checkpointAssessmentInputSchema = z
  .object({
    eventId: z.string().trim().min(1),
    checkpointId: z.string().trim().min(1),
    submissionId: z.string().trim().min(1),
    attemptNumber: z.number().int().positive(),
    answer: z.unknown(),
    submittedAt: z.string().datetime({ offset: true }),
    hintsUsed: z.number().int().nonnegative(),
    revealsUsed: z.number().int().nonnegative(),
    interventionLevel: z.number().int().min(0).max(3),
    evidenceConfidence: z.number().finite().min(0).max(1),
    timingMs: z.number().finite().nonnegative(),
  })
  .strict();

/** Client checkpoint attempt accepted by the atomic server assessment operation. */
export type CheckpointAssessmentInput = z.input<typeof checkpointAssessmentInputSchema>;

/** Strict tutorial attempt without caller-supplied check outcomes or correctness. */
export const tutorialAssessmentInputSchema = z
  .object({
    eventId: z.string().trim().min(1),
    stepId: z.string().trim().min(1),
    submissionId: z.string().trim().min(1),
    attemptNumber: z.number().int().positive(),
    submittedAt: z.string().datetime({ offset: true }),
    hintsUsed: z.number().int().nonnegative(),
    revealsUsed: z.number().int().nonnegative(),
    interventionLevel: z.number().int().min(0).max(3),
    evidenceConfidence: z.number().finite().min(0).max(1),
    timingMs: z.number().finite().nonnegative(),
  })
  .strict();

/** Client tutorial attempt accepted without caller-supplied check outcomes. */
export type TutorialAssessmentInput = z.input<typeof tutorialAssessmentInputSchema>;

/** Atomic checkpoint assessment output that can be serialized and replayed. */
export type CheckpointAssessmentResult = {
  submission: ActivityPracticeSubmissionEnvelope;
  event: Extract<ActivityEvidenceEvent, { kind: "checkpoint_answered" }>;
};

/** Atomic tutorial assessment output that can be serialized and replayed. */
export type TutorialAssessmentResult = {
  submission: ActivityPracticeSubmissionEnvelope;
  event: Extract<ActivityEvidenceEvent, { kind: "tutorial_step_completed" }>;
};

/**
 * Verifies and maps one checkpoint attempt atomically on the server.
 * @param activity Validated activity containing trusted correctness data.
 * @param input Client attempt context without any correctness field.
 * @returns Practice submission and bound server-generated persistence event.
 */
export function assessCheckpointAttempt(activity: Activity, input: CheckpointAssessmentInput): CheckpointAssessmentResult {
  const parsedInput = checkpointAssessmentInputSchema.parse(input);
  const { eventId, ...attemptInput } = parsedInput;
  const verification = verifyCheckpointAnswer(activity, parsedInput.checkpointId, parsedInput.answer);
  const submission = mapVerifiedCheckpointAttempt(activity, { ...attemptInput, verifiedResult: verification });
  const event = activityEvidenceEventSchema.parse({
    ...submission.analytics,
    eventId,
    kind: "checkpoint_answered",
    occurredAt: parsedInput.submittedAt,
    payload: { checkpointId: parsedInput.checkpointId, answer: parsedInput.answer, verifiedResult: verification },
  });
  if (event.kind !== "checkpoint_answered") throw new Error("Checkpoint assessment produced an unexpected event kind");
  return { submission, event };
}

/**
 * Executes authored tutorial checks and maps the result atomically on the server.
 * @param activity Validated activity containing deterministic tutorial checks.
 * @param input Client attempt context without check outcomes or correctness.
 * @param executeCheck Server-owned deterministic check executor.
 * @returns Practice submission and bound server-generated persistence event.
 */
export function assessTutorialStep(
  activity: Activity,
  input: TutorialAssessmentInput,
  executeCheck: TutorialCheckExecutor,
): TutorialAssessmentResult {
  const parsedInput = tutorialAssessmentInputSchema.parse(input);
  const { eventId, ...attemptInput } = parsedInput;
  const verified = verifyTutorialStepResult(activity, parsedInput.stepId, executeCheck);
  const submission = mapVerifiedTutorialStep(activity, {
    ...attemptInput,
    checkResults: verified.checkResults,
    verifiedResult: verified.verifiedResult,
  });
  const event = activityEvidenceEventSchema.parse({
    ...submission.analytics,
    eventId,
    kind: "tutorial_step_completed",
    occurredAt: parsedInput.submittedAt,
    payload: { stepId: parsedInput.stepId, checkResults: verified.checkResults, verifiedResult: verified.verifiedResult },
  });
  if (event.kind !== "tutorial_step_completed") throw new Error("Tutorial assessment produced an unexpected event kind");
  return { submission, event };
}

/** Tenant-scoped identity for school and explicit platform-level Codecamp actors. */
export const activityActorSchema = z.union([
  z.object({ learnerId: z.string().trim().min(1), schoolId: z.string().trim().min(1) }).strict(),
  z.object({ learnerId: z.string().trim().min(1), schoolId: z.null(), tenantKey: z.string().trim().min(1) }).strict(),
]);

/** Authenticated actor that always carries a school or explicit platform tenant key. */
export type ActivityActor = z.infer<typeof activityActorSchema>;

/** Stored activity session summary returned by a persistence adapter. */
export type ActivitySessionSnapshot = {
  sessionId: string;
  actor: ActivityActor;
  activityId: string;
  activityVersion: string;
  lastEventSequence: number;
  completed: boolean;
  updatedAt: string;
};

/** Framework-neutral activity content repository port. */
export interface ActivityRepository {
  /**
   * Loads one versioned activity.
   * @param activityId Stable activity identifier.
   * @param activityVersion Requested authored version.
   * @returns Activity content, or null when not found.
   */
  getActivity(activityId: string, activityVersion: string): Promise<Activity | null>;
}

/** Framework-neutral durable activity session port. */
export interface ActivitySessionStore {
  /**
   * Appends an idempotent bounded event batch for an authenticated actor.
   * @param actor Tenant-scoped authenticated learner.
   * @param sessionId Server-issued activity session identifier.
   * @param events Ordered client event batch.
   * @returns The server-authoritative session snapshot.
   */
  appendEvents(actor: ActivityActor, sessionId: string, events: ActivityEvent[]): Promise<ActivitySessionSnapshot>;

  /**
   * Loads a session only when it belongs to the authenticated tenant and learner.
   * @param actor Tenant-scoped authenticated learner.
   * @param sessionId Server-issued activity session identifier.
   * @returns Owned session, or null when absent or inaccessible.
   */
  getSession(actor: ActivityActor, sessionId: string): Promise<ActivitySessionSnapshot | null>;
}

/** Framework-neutral mastery evidence sink consumed by server adapters. */
export interface ActivityEvidenceSink {
  /**
   * Records context-only engagement without treating it as correctness.
   * @param actor Tenant-scoped authenticated learner.
   * @param context Normalized activity engagement context.
   * @returns Completion when the context is durably recorded.
   */
  recordEngagement(actor: ActivityActor, context: ActivityEngagementContext): Promise<void>;

  /**
   * Records one server-verified assessed practice submission.
   * @param actor Tenant-scoped authenticated learner.
   * @param submission Server-produced practice.v1 assessment envelope.
   * @returns Completion when evidence is durably recorded.
   */
  recordAssessment(actor: ActivityActor, submission: ActivityPracticeSubmissionEnvelope): Promise<void>;
}

/**
 * Verifies, maps, and records one checkpoint assessment atomically at the service boundary.
 * @param actor Authenticated tenant-scoped learner.
 * @param activity Validated activity containing trusted correctness data.
 * @param input Client checkpoint attempt without correctness.
 * @param sink Mastery evidence sink.
 * @returns Server-generated submission and persistence event.
 */
export async function assessAndRecordCheckpoint(
  actor: ActivityActor,
  activity: Activity,
  input: CheckpointAssessmentInput,
  sink: ActivityEvidenceSink,
): Promise<CheckpointAssessmentResult> {
  const result = assessCheckpointAttempt(activity, input);
  await sink.recordAssessment(actor, result.submission);
  return result;
}

/**
 * Executes, maps, and records one tutorial assessment atomically at the service boundary.
 * @param actor Authenticated tenant-scoped learner.
 * @param activity Validated activity containing authored deterministic checks.
 * @param input Client tutorial attempt without correctness.
 * @param executeCheck Server-owned deterministic check executor.
 * @param sink Mastery evidence sink.
 * @returns Server-generated submission and persistence event.
 */
export async function assessAndRecordTutorialStep(
  actor: ActivityActor,
  activity: Activity,
  input: TutorialAssessmentInput,
  executeCheck: TutorialCheckExecutor,
  sink: ActivityEvidenceSink,
): Promise<TutorialAssessmentResult> {
  const result = assessTutorialStep(activity, input, executeCheck);
  await sink.recordAssessment(actor, result.submission);
  return result;
}
