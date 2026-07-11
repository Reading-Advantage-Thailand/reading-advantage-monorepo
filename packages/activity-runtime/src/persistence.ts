import { z } from "zod";
import {
  activityEventSchema,
  createInitialActivityState,
  reduceActivityEvent,
  type ActivityEvent,
  type ActivityState,
} from "./core.js";
import { activityActorSchema, type ActivityActor } from "./server.js";

/** Maximum number of state transitions accepted in one persistence request. */
export const MAX_ACTIVITY_EVENT_BATCH_SIZE = 100;

/** Stable activity persistence failure categories for transport adapters. */
export type ActivityPersistenceErrorCode =
  | "ACTIVITY_MISMATCH"
  | "STALE_DEVICE_SEQUENCE"
  | "INVALID_EVENT_TIME"
  | "INVALID_MEDIA_POSITION";

/** Error raised when a persistence batch violates a server-owned invariant. */
export class ActivityPersistenceError extends Error {
  /** Stable failure category suitable for API error mapping. */
  readonly code: ActivityPersistenceErrorCode;

  /**
   * Creates a persistence invariant error.
   * @param code Stable machine-readable failure category.
   * @param message Actionable human-readable explanation.
   */
  constructor(code: ActivityPersistenceErrorCode, message: string) {
    super(message);
    this.name = "ActivityPersistenceError";
    this.code = code;
  }
}

const sequencedActivityEventSchema = z.object({
  clientSequence: z.number().int().positive(),
  event: activityEventSchema,
}).strict();

/** Strict bounded event batch accepted from one client device. */
export const activityEventBatchSchema = z.object({
  batchId: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
  events: z.array(sequencedActivityEventSchema).min(1).max(MAX_ACTIVITY_EVENT_BATCH_SIZE),
}).strict().superRefine((batch, context) => {
  const sequences = batch.events.map(({ clientSequence }) => clientSequence);
  if (new Set(sequences).size !== sequences.length) {
    context.addIssue({ code: "custom", path: ["events"], message: "Client sequences must be unique within a batch" });
  }
  if (sequences.some((sequence, index) => index > 0 && sequence <= sequences[index - 1]!)) {
    context.addIssue({ code: "custom", path: ["events"], message: "Client sequences must be strictly increasing" });
  }
});

/** Validated input for one bounded client event batch. */
export type ActivityEventBatch = z.input<typeof activityEventBatchSchema>;

/** Server-owned validation policy for event time and media positions. */
export type ActivityPersistencePolicy = {
  now: string;
  maxPositionSeconds: number;
  maxFutureSkewMs?: number;
};

/** Durable projection and idempotency metadata for one learner activity session. */
export type ActivitySessionRecord = {
  sessionId: string;
  actor: ActivityActor;
  activityId: string;
  activityVersion: string;
  startedAt: string;
  updatedAt: string;
  lastEventSequence: number;
  state: ActivityState;
  processedBatchIds: string[];
  deviceHighWatermarks: Record<string, number>;
};

/** Input required to create a new server-owned session projection. */
export type CreateActivitySessionRecordInput = {
  sessionId: string;
  actor: ActivityActor;
  activityId: string;
  activityVersion: string;
  startedAt: string;
};

/** Teacher-readable activity session summary that keeps engagement separate from assessment. */
export type ActivitySessionSummary = Pick<ActivitySessionRecord, "sessionId" | "activityId"> & {
  completed: boolean;
  watchedRanges: ActivityState["watchedRanges"];
  checkpointAttempts: ActivityState["checkpointAttempts"];
  assessedCheckpointResults: ActivityState["assessedCheckpointResults"];
  assessedTutorialResults: ActivityState["assessedTutorialResults"];
  completedStepIds: string[];
  openedResourceIds: string[];
  unresolvedCheckpointIds: string[];
  support: ActivityState["support"];
};

/**
 * Creates an empty server-owned activity session projection.
 * @param input Authenticated identity and immutable activity identifiers.
 * @returns A validated empty session ready for atomic batches.
 */
export function createActivitySessionRecord(input: CreateActivitySessionRecordInput): ActivitySessionRecord {
  const actor = activityActorSchema.parse(input.actor);
  const startedAt = z.string().datetime({ offset: true }).parse(input.startedAt);
  return {
    sessionId: z.string().trim().min(1).parse(input.sessionId),
    actor,
    activityId: z.string().trim().min(1).parse(input.activityId),
    activityVersion: z.string().trim().min(1).parse(input.activityVersion),
    startedAt,
    updatedAt: startedAt,
    lastEventSequence: 0,
    state: createInitialActivityState(input.activityId),
    processedBatchIds: [],
    deviceHighWatermarks: {},
  };
}

function assertEventPolicy(session: ActivitySessionRecord, event: ActivityEvent, policy: ActivityPersistencePolicy): void {
  if (event.activityId !== session.activityId || event.activityVersion !== session.activityVersion) {
    throw new ActivityPersistenceError("ACTIVITY_MISMATCH", `Event activity ${event.activityId}@${event.activityVersion} does not match session activity ${session.activityId}@${session.activityVersion}`);
  }
  const occurredAt = Date.parse(event.occurredAt);
  const now = Date.parse(z.string().datetime({ offset: true }).parse(policy.now));
  if (occurredAt > now + (policy.maxFutureSkewMs ?? 5 * 60_000)) {
    throw new ActivityPersistenceError("INVALID_EVENT_TIME", `Event ${event.eventId} occurred too far in the future`);
  }
  const positions = event.kind === "watched_range"
    ? [event.startSeconds, event.endSeconds]
    : event.kind === "playback_seeked" || event.kind === "playback_started" || event.kind === "playback_paused"
      ? [event.positionSeconds]
      : [];
  if (positions.some((position) => position > policy.maxPositionSeconds)) {
    throw new ActivityPersistenceError("INVALID_MEDIA_POSITION", `Event ${event.eventId} is outside the authored media duration`);
  }
}

/**
 * Applies a device batch atomically with batch/event idempotency and sequence checks.
 * @param session Current durable session projection.
 * @param input Untrusted bounded device batch.
 * @param policy Server-owned current time and authored media duration.
 * @returns A new durable projection, or the same object for a duplicate batch.
 * @throws ActivityPersistenceError when activity, ordering, time, or position invariants fail.
 */
export function appendActivityEventBatch(
  session: ActivitySessionRecord,
  input: ActivityEventBatch,
  policy: ActivityPersistencePolicy,
): ActivitySessionRecord {
  const batch = activityEventBatchSchema.parse(input);
  if (session.processedBatchIds.includes(batch.batchId)) return session;
  const highWatermark = session.deviceHighWatermarks[batch.deviceId] ?? 0;
  const newEvents = batch.events.filter(({ event }) => !session.state.processedEventIds.includes(event.eventId));
  if (newEvents.some(({ clientSequence }) => clientSequence <= highWatermark)) {
    throw new ActivityPersistenceError("STALE_DEVICE_SEQUENCE", `Batch ${batch.batchId} contains a stale sequence for device ${batch.deviceId}`);
  }
  for (const { event } of newEvents) assertEventPolicy(session, event, policy);

  const state = newEvents.reduce((current, { event }) => reduceActivityEvent(current, event), session.state);
  const maximumSequence = Math.max(highWatermark, ...batch.events.map(({ clientSequence }) => clientSequence));
  return {
    ...session,
    updatedAt: policy.now,
    lastEventSequence: session.lastEventSequence + newEvents.length,
    state,
    processedBatchIds: [...session.processedBatchIds, batch.batchId],
    deviceHighWatermarks: { ...session.deviceHighWatermarks, [batch.deviceId]: maximumSequence },
  };
}

/**
 * Produces a teacher-readable summary without treating engagement as correctness.
 * @param session Server-authoritative activity session projection.
 * @param requiredCheckpointIds Optional authored checkpoints used to compute unresolved work.
 * @returns A safe summary scoped to the already-authorized session.
 */
export function summarizeActivitySession(
  session: ActivitySessionRecord,
  requiredCheckpointIds: string[] = [],
): ActivitySessionSummary {
  return {
    sessionId: session.sessionId,
    activityId: session.activityId,
    completed: session.state.completed,
    watchedRanges: session.state.watchedRanges.map((range) => ({ ...range })),
    checkpointAttempts: { ...session.state.checkpointAttempts },
    assessedCheckpointResults: { ...session.state.assessedCheckpointResults },
    assessedTutorialResults: { ...session.state.assessedTutorialResults },
    completedStepIds: [...session.state.completedStepIds],
    openedResourceIds: [...session.state.openedResourceIds],
    unresolvedCheckpointIds: requiredCheckpointIds.filter((checkpointId) => !session.state.assessedCheckpointResults[checkpointId]?.isCorrect),
    support: { ...session.state.support },
  };
}
