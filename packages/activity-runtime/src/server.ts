import {
  createVerificationDigest,
  evaluateActivityQuestion,
  serverVerifiedResultSchema,
  type Activity,
  type ActivityEngagementContext,
  type ActivityEvent,
  type ServerVerifiedResult,
} from "./core.js";
import { z } from "zod";

/** Version of the framework-neutral server port contract. */
export const ACTIVITY_SERVER_PORT_VERSION = "activity-server.v1" as const;

/**
 * Verifies a checkpoint answer against trusted authored correctness data.
 * @param activity Validated activity containing the checkpoint.
 * @param checkpointId Stable checkpoint identifier.
 * @param answer Learner answer to evaluate.
 * @returns A server-authoritative correctness result.
 * @throws Error when the checkpoint does not exist.
 */
export function verifyCheckpointAnswer(activity: Activity, checkpointId: string, answer: unknown): ServerVerifiedResult {
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
export type VerifiedTutorialStepResult = {
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
export function verifyTutorialStepResult(
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
}
