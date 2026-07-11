import { z } from "zod";
import type { Activity } from "./core.js";
import {
  activityEventBatchSchema,
  createActivitySessionRecord,
  summarizeActivitySession,
  type ActivityEventBatch,
  type ActivityPersistencePolicy,
  type ActivitySessionRecord,
  type ActivitySessionSummary,
} from "./persistence.js";
import {
  activityActorSchema,
  assessCheckpointAttempt,
  assessTutorialStep,
  checkpointAssessmentInputSchema,
  tutorialAssessmentInputSchema,
  type ActivityActor,
  type ActivityRepository,
  type CheckpointAssessmentResult,
  type TutorialAssessmentResult,
  type TutorialCheckExecutor,
} from "./server.js";

/** Server-verified assessment accepted by durable session persistence. */
export type ActivityAssessmentPersistenceResult = CheckpointAssessmentResult | TutorialAssessmentResult;

/** Strict transport input for starting one authenticated activity session. */
export const startActivitySessionInputSchema = z.object({
  activityId: z.string().trim().min(1),
  activityVersion: z.string().trim().min(1),
}).strict();

/** Strict transport input for appending one bounded activity event batch. */
export const appendActivityEventsInputSchema = z.object({
  sessionId: z.string().trim().min(1),
  batch: activityEventBatchSchema,
}).strict();

/** Strict transport input for reading one owned activity session. */
export const getActivitySessionInputSchema = z.object({ sessionId: z.string().trim().min(1) }).strict();

/** Strict transport input for a server-assessed checkpoint attempt. */
export const assessActivityCheckpointInputSchema = z.object({
  sessionId: z.string().trim().min(1), attempt: checkpointAssessmentInputSchema,
}).strict();

/** Strict transport input for a server-assessed tutorial attempt. */
export const assessActivityTutorialInputSchema = z.object({
  sessionId: z.string().trim().min(1), attempt: tutorialAssessmentInputSchema,
}).strict();

/** Authenticated persistence port used by thin tRPC and HTTP adapters. */
export interface ActivityPersistencePort {
  /**
   * Creates a durable session for an authenticated actor.
   * @param record Validated initial session projection.
   * @returns The durably stored session.
   */
  createSession(record: ActivitySessionRecord): Promise<ActivitySessionRecord>;
  /**
   * Atomically appends a bounded idempotent event batch.
   * @param actor Authenticated tenant-scoped learner.
   * @param sessionId Server-issued session identifier.
   * @param batch Validated client event batch.
   * @param policy Server-owned event validation policy.
   * @returns Updated server-authoritative session.
   */
  appendBatch(actor: ActivityActor, sessionId: string, batch: ActivityEventBatch, policy: ActivityPersistencePolicy): Promise<ActivitySessionRecord>;
  /**
   * Loads a session only when it belongs to the authenticated actor.
   * @param actor Authenticated tenant-scoped learner.
   * @param sessionId Server-issued session identifier.
   * @returns Owned session or null.
   */
  getOwnedSession(actor: ActivityActor, sessionId: string): Promise<ActivitySessionRecord | null>;
  /**
   * Atomically persists a server-verified assessed event and practice submission.
   * @param actor Authenticated tenant-scoped learner.
   * @param sessionId Server-issued session identifier.
   * @param result Server-generated assessment event and practice.v1 envelope.
   * @returns Updated durable session projection.
   */
  recordAssessment(actor: ActivityActor, sessionId: string, result: ActivityAssessmentPersistenceResult): Promise<ActivitySessionRecord>;
}

/** Dependencies for framework-specific activity transport adapters. */
export type ActivityTransportDependencies = {
  activities: ActivityRepository;
  persistence: ActivityPersistencePort;
  createSessionId(): string;
  now(): string;
  executeTutorialCheck: TutorialCheckExecutor;
};

/** Assessment response with correctness and the updated teacher-readable session. */
export type ActivityTransportAssessmentResponse = {
  isCorrect: boolean;
  score: number;
  session: ActivitySessionSummary;
};

/** Framework-neutral handlers that keep authenticated identity out of request bodies. */
export type ActivityTransportHandlers = {
  start(actor: ActivityActor, input: unknown): Promise<ActivitySessionSummary>;
  append(actor: ActivityActor, input: unknown): Promise<ActivitySessionSummary>;
  get(actor: ActivityActor, input: unknown): Promise<ActivitySessionSummary | null>;
  assessCheckpoint(actor: ActivityActor, input: unknown): Promise<ActivityTransportAssessmentResponse>;
  assessTutorial(actor: ActivityActor, input: unknown): Promise<ActivityTransportAssessmentResponse>;
};

function maximumMediaPosition(activity: Activity): number {
  return Math.max(0, ...activity.resources
    .filter((resource): resource is Extract<Activity["resources"][number], { kind: "video" }> => resource.kind === "video")
    .flatMap((resource) => resource.segments.map((segment) => segment.endSeconds)));
}

/**
 * Creates thin framework-neutral activity handlers for tRPC or HTTP routes.
 * @param dependencies Authored activity repository, persistence port, and server clocks.
 * @returns Authenticated start, append, and owned-session handlers.
 */
export function createActivityTransportHandlers(dependencies: ActivityTransportDependencies): ActivityTransportHandlers {
  return {
    async start(actorInput, input) {
      const actor = activityActorSchema.parse(actorInput);
      const parsed = startActivitySessionInputSchema.parse(input);
      const activity = await dependencies.activities.getActivity(parsed.activityId, parsed.activityVersion);
      if (!activity) throw new Error(`Activity not found: ${parsed.activityId}@${parsed.activityVersion}`);
      const session = createActivitySessionRecord({
        sessionId: dependencies.createSessionId(), actor,
        activityId: activity.activityId, activityVersion: activity.activityVersion,
        startedAt: dependencies.now(),
      });
      return summarizeActivitySession(await dependencies.persistence.createSession(session), activity.checkpoints.map(({ checkpointId }) => checkpointId));
    },
    async append(actorInput, input) {
      const actor = activityActorSchema.parse(actorInput);
      const parsed = appendActivityEventsInputSchema.parse(input);
      const session = await dependencies.persistence.getOwnedSession(actor, parsed.sessionId);
      if (!session) return Promise.reject(new Error(`Activity session not found: ${parsed.sessionId}`));
      const activity = await dependencies.activities.getActivity(session.activityId, session.activityVersion);
      if (!activity) throw new Error(`Activity not found: ${session.activityId}@${session.activityVersion}`);
      const updated = await dependencies.persistence.appendBatch(actor, session.sessionId, parsed.batch, {
        now: dependencies.now(), maxPositionSeconds: maximumMediaPosition(activity),
      });
      return summarizeActivitySession(updated, activity.checkpoints.map(({ checkpointId }) => checkpointId));
    },
    async get(actorInput, input) {
      const actor = activityActorSchema.parse(actorInput);
      const parsed = getActivitySessionInputSchema.parse(input);
      const session = await dependencies.persistence.getOwnedSession(actor, parsed.sessionId);
      if (!session) return null;
      const activity = await dependencies.activities.getActivity(session.activityId, session.activityVersion);
      return summarizeActivitySession(session, activity?.checkpoints.map(({ checkpointId }) => checkpointId) ?? []);
    },
    async assessCheckpoint(actorInput, input) {
      const actor = activityActorSchema.parse(actorInput);
      const parsed = assessActivityCheckpointInputSchema.parse(input);
      const session = await dependencies.persistence.getOwnedSession(actor, parsed.sessionId);
      if (!session) throw new Error(`Activity session not found: ${parsed.sessionId}`);
      const activity = await dependencies.activities.getActivity(session.activityId, session.activityVersion);
      if (!activity) throw new Error(`Activity not found: ${session.activityId}@${session.activityVersion}`);
      const result = assessCheckpointAttempt(activity, parsed.attempt);
      const updated = await dependencies.persistence.recordAssessment(actor, session.sessionId, result);
      return { isCorrect: result.event.payload.verifiedResult.isCorrect, score: result.event.payload.verifiedResult.score ?? 0, session: summarizeActivitySession(updated, activity.checkpoints.map(({ checkpointId }) => checkpointId)) };
    },
    async assessTutorial(actorInput, input) {
      const actor = activityActorSchema.parse(actorInput);
      const parsed = assessActivityTutorialInputSchema.parse(input);
      const session = await dependencies.persistence.getOwnedSession(actor, parsed.sessionId);
      if (!session) throw new Error(`Activity session not found: ${parsed.sessionId}`);
      const activity = await dependencies.activities.getActivity(session.activityId, session.activityVersion);
      if (!activity) throw new Error(`Activity not found: ${session.activityId}@${session.activityVersion}`);
      const result = assessTutorialStep(activity, parsed.attempt, dependencies.executeTutorialCheck);
      const updated = await dependencies.persistence.recordAssessment(actor, session.sessionId, result);
      return { isCorrect: result.event.payload.verifiedResult.isCorrect, score: result.event.payload.verifiedResult.score ?? 0, session: summarizeActivitySession(updated, activity.checkpoints.map(({ checkpointId }) => checkpointId)) };
    },
  };
}
