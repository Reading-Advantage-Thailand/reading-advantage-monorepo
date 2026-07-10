import {
  normalizeActivityAnswer,
  serverVerifiedResultSchema,
  type Activity,
  type ActivityEngagementContext,
  type ActivityEvent,
  type ServerVerifiedResult,
} from "./core.js";

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
  const normalized = normalizeActivityAnswer(answer);
  const expected = checkpoint.question.kind === "free_text"
    ? checkpoint.question.acceptedAnswers.map(normalizeActivityAnswer)
    : [normalizeActivityAnswer(checkpoint.question.correctOptionIds)];
  return serverVerifiedResultSchema.parse({ source: "server", isCorrect: expected.includes(normalized) });
}

/**
 * Verifies deterministic tutorial checks against the authored step manifest.
 * @param activity Validated activity containing the tutorial step.
 * @param stepId Stable tutorial step identifier.
 * @param results Structured local checker results.
 * @returns A server-authoritative aggregate result.
 * @throws Error when the step does not exist or results omit authored checks.
 */
export function verifyTutorialStepResult(
  activity: Activity,
  stepId: string,
  results: Array<{ checkId: string; passed: boolean }>,
): ServerVerifiedResult {
  const step = activity.tutorialSteps.find((candidate) => candidate.stepId === stepId);
  if (!step) throw new Error(`Tutorial step not found: ${stepId}`);
  const byId = new Map(results.map((result) => [result.checkId, result]));
  if (step.checks.some((check) => !byId.has(check.checkId))) throw new Error(`Tutorial results omit an authored check for step: ${stepId}`);
  const isCorrect = step.checks.every((check) => byId.get(check.checkId)?.passed === true);
  return serverVerifiedResultSchema.parse({ source: "server", isCorrect, score: isCorrect ? 1 : 0 });
}

/** Tenant-scoped identity supplied by an application auth adapter. */
export type ActivityActor = { learnerId: string; schoolId: string };

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
