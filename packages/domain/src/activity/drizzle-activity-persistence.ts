import {
  activityEventBatchSchema,
  activityPracticeSubmissionEnvelopeSchema,
  appendActivityEventBatch,
  reduceAssessedActivityEvent,
  type ActivityEventBatch,
  type ActivityPersistencePolicy,
  type ActivitySessionRecord,
  type ActivityState,
  summarizeActivitySession,
  type ActivitySessionSummary,
} from "@reading-advantage/activity-runtime";
import type { ActivityActor } from "@reading-advantage/activity-runtime/server";
import type { ActivityAssessmentPersistenceResult, ActivityPersistencePort } from "@reading-advantage/activity-runtime/transport";
import { activitySessionEvents, activitySessions } from "@reading-advantage/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { TenantDB } from "../db-contract.js";
import { createDrizzleMasteryPersistence } from "../mastery/index.js";
import { projectActivitySubmissionToMastery } from "./activity-mastery-projection.js";

type ActivitySessionRow = typeof activitySessions.$inferSelect;

/** Reserved Mastery namespace for Codecamp's explicit platform tenant. */
export const CODECAMP_MASTERY_SCHOOL_ID = "c0deca00-0000-4000-8000-000000000001";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, canonicalize(nested)]));
  return value;
}

function semanticallyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function tenantKey(actor: ActivityActor): string {
  return actor.schoolId ?? actor.tenantKey;
}

function actorMatches(left: ActivityActor, right: ActivityActor): boolean {
  return left.learnerId === right.learnerId
    && left.schoolId === right.schoolId
    && (left.schoolId !== null || left.tenantKey === (right as Extract<ActivityActor, { schoolId: null }>).tenantKey);
}

function rowToRecord(row: ActivitySessionRow): ActivitySessionRecord {
  const actor: ActivityActor = row.schoolId
    ? { learnerId: row.learnerId, schoolId: row.schoolId }
    : { learnerId: row.learnerId, schoolId: null, tenantKey: row.tenantKey };
  return {
    sessionId: row.id,
    actor,
    activityId: row.activityId,
    activityVersion: row.activityVersion,
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastEventSequence: row.lastEventSequence,
    state: row.stateJson as ActivityState,
    processedBatchIds: row.processedBatchIdsJson,
    deviceHighWatermarks: row.deviceHighWatermarksJson,
  };
}

/** Drizzle adapter for tenant- and learner-owned activity session persistence. */
export class DrizzleActivityPersistence implements ActivityPersistencePort {
  private readonly tenantDb: TenantDB;
  private readonly retentionDays: number;

  /**
   * Creates the tenant-safe Drizzle persistence adapter.
   * @param tenantDb TenantDB used to obtain a greppable manually scoped raw database.
   * @param retentionDays Number of days a session is retained before cleanup eligibility.
   */
  constructor(tenantDb: TenantDB, retentionDays = 365) {
    this.tenantDb = tenantDb;
    this.retentionDays = retentionDays;
  }

  /**
   * Creates a durable learner-owned activity session.
   * @param record Validated empty session projection.
   * @returns The inserted session record.
   */
  async createSession(record: ActivitySessionRecord): Promise<ActivitySessionRecord> {
    const rawDb = this.tenantDb.unscoped("activity sessions use tenantKey + learnerId because Codecamp supports an explicit platform tenant");
    const retainUntil = new Date(Date.parse(record.startedAt) + this.retentionDays * 24 * 60 * 60 * 1000);
    const [inserted] = await rawDb.insert(activitySessions).values({
      id: record.sessionId,
      schoolId: record.actor.schoolId,
      tenantKey: tenantKey(record.actor),
      learnerId: record.actor.learnerId,
      activityId: record.activityId,
      activityVersion: record.activityVersion,
      stateJson: record.state as unknown as Record<string, unknown>,
      processedBatchIdsJson: record.processedBatchIds,
      deviceHighWatermarksJson: record.deviceHighWatermarks,
      lastEventSequence: record.lastEventSequence,
      completed: record.state.completed,
      startedAt: new Date(record.startedAt),
      updatedAt: new Date(record.updatedAt),
      retainUntil,
    }).returning();
    if (!inserted) throw new Error("Activity session insert did not return a row");
    return rowToRecord(inserted);
  }

  /**
   * Atomically appends one replay-safe bounded event batch.
   * @param actor Authenticated tenant-scoped learner.
   * @param sessionId Server-issued session identifier.
   * @param input Untrusted device event batch.
   * @param policy Server-owned time and media bounds.
   * @returns Updated durable session projection.
   */
  async appendBatch(actor: ActivityActor, sessionId: string, input: ActivityEventBatch, policy: ActivityPersistencePolicy): Promise<ActivitySessionRecord> {
    const rawDb = this.tenantDb.unscoped("activity event append manually scopes tenantKey + learnerId and locks the owned session");
    const batch = activityEventBatchSchema.parse(input);
    return rawDb.transaction(async (tx) => {
      const [row] = await tx.select().from(activitySessions).where(and(
        eq(activitySessions.id, sessionId),
        eq(activitySessions.tenantKey, tenantKey(actor)),
        eq(activitySessions.learnerId, actor.learnerId),
      )).for("update");
      if (!row) throw new Error(`Activity session not found: ${sessionId}`);
      const current = rowToRecord(row);
      if (!actorMatches(current.actor, actor)) throw new Error(`Activity session not found: ${sessionId}`);
      const updated = appendActivityEventBatch(current, batch, policy);
      if (updated === current) return current;
      const previousIds = new Set(current.state.processedEventIds);
      const accepted = batch.events.filter(({ event }) => !previousIds.has(event.eventId));
      if (accepted.length > 0) {
        await tx.insert(activitySessionEvents).values(accepted.map(({ clientSequence, event }, index) => ({
          sessionId,
          tenantKey: tenantKey(actor),
          learnerId: actor.learnerId,
          eventId: event.eventId,
          batchId: batch.batchId,
          deviceId: batch.deviceId,
          clientSequence,
          serverSequence: current.lastEventSequence + index + 1,
          eventKind: event.kind,
          isAssessed: false,
          submissionId: null,
          submissionJson: null,
          eventJson: event as unknown as Record<string, unknown>,
          occurredAt: new Date(event.occurredAt),
        })));
      }
      const [saved] = await tx.update(activitySessions).set({
        stateJson: updated.state as unknown as Record<string, unknown>,
        processedBatchIdsJson: updated.processedBatchIds,
        deviceHighWatermarksJson: updated.deviceHighWatermarks,
        lastEventSequence: updated.lastEventSequence,
        completed: updated.state.completed,
        updatedAt: new Date(updated.updatedAt),
      }).where(and(
        eq(activitySessions.id, sessionId),
        eq(activitySessions.tenantKey, tenantKey(actor)),
        eq(activitySessions.learnerId, actor.learnerId),
      )).returning();
      if (!saved) throw new Error(`Activity session update failed: ${sessionId}`);
      return rowToRecord(saved);
    });
  }

  /**
   * Atomically persists one server-verified assessed event and practice submission.
   * @param actor Authenticated tenant-scoped learner.
   * @param sessionId Server-issued session identifier.
   * @param result Server-generated assessment event and practice.v1 envelope.
   * @returns Updated durable session projection.
   */
  async recordAssessment(actor: ActivityActor, sessionId: string, result: ActivityAssessmentPersistenceResult): Promise<ActivitySessionRecord> {
    const rawDb = this.tenantDb.unscoped("activity assessment append manually scopes tenantKey + learnerId and locks the owned session");
    const savedSession = await rawDb.transaction(async (tx) => {
      const [row] = await tx.select().from(activitySessions).where(and(
        eq(activitySessions.id, sessionId), eq(activitySessions.tenantKey, tenantKey(actor)), eq(activitySessions.learnerId, actor.learnerId),
      )).for("update");
      if (!row) throw new Error(`Activity session not found: ${sessionId}`);
      const current = rowToRecord(row);
      if (current.state.processedAssessedEventIds.includes(result.event.eventId)) {
        const [stored] = await tx.select({ eventJson: activitySessionEvents.eventJson, submissionJson: activitySessionEvents.submissionJson }).from(activitySessionEvents).where(and(
          eq(activitySessionEvents.sessionId, sessionId), eq(activitySessionEvents.eventId, result.event.eventId),
        )).limit(1);
        if (!stored || !semanticallyEqual(stored.eventJson, result.event) || !semanticallyEqual(stored.submissionJson, result.submission)) {
          throw new Error(`Activity assessment idempotency conflict: ${result.event.eventId}`);
        }
        return current;
      }
      const prior = result.event.kind === "checkpoint_answered"
        ? current.state.assessedCheckpointResults[result.event.payload.checkpointId]
        : current.state.assessedTutorialResults[result.event.payload.stepId];
      const expectedAttempt = (prior?.attemptNumber ?? 0) + 1;
      if (result.event.attemptNumber !== expectedAttempt) {
        throw new Error(`Activity assessment attempt must be ${expectedAttempt}`);
      }
      const state = reduceAssessedActivityEvent(current.state, result.event);
      const serverSequence = current.lastEventSequence + 1;
      await tx.insert(activitySessionEvents).values({
        sessionId, tenantKey: tenantKey(actor), learnerId: actor.learnerId,
        eventId: result.event.eventId, batchId: `assessment:${result.event.submissionId}`,
        deviceId: `server:${result.event.kind}:${result.event.stepId}`, clientSequence: result.event.attemptNumber,
        serverSequence, eventKind: result.event.kind, isAssessed: true,
        submissionId: result.event.submissionId,
        submissionJson: result.submission as unknown as Record<string, unknown>,
        masteryProjectionStatus: "pending", masteryProjectionAttempts: 0,
        eventJson: result.event as unknown as Record<string, unknown>,
        occurredAt: new Date(result.event.occurredAt),
      });
      const [saved] = await tx.update(activitySessions).set({
        stateJson: state as unknown as Record<string, unknown>, lastEventSequence: serverSequence,
        updatedAt: new Date(),
      }).where(and(
        eq(activitySessions.id, sessionId), eq(activitySessions.tenantKey, tenantKey(actor)), eq(activitySessions.learnerId, actor.learnerId),
      )).returning();
      if (!saved) throw new Error(`Activity assessment update failed: ${sessionId}`);
      return rowToRecord(saved);
    });
    await this.projectAssessment(actor, sessionId, result.event.eventId, result.submission);
    return savedSession;
  }

  /**
   * Projects one durable assessed outbox row into Mastery and records its receipt.
   * @param actor Authenticated school or Codecamp platform learner.
   * @param sessionId Owning activity session identifier.
   * @param eventId Assessed outbox event identifier.
   * @param submission Server-verified practice.v1 envelope.
   * @returns Completion after projected or failed outbox state is durable.
   */
  async projectAssessment(actor: ActivityActor, sessionId: string, eventId: string, submission: ActivityAssessmentPersistenceResult["submission"]): Promise<void> {
    const rawDb = this.tenantDb.unscoped("activity mastery outbox projection scopes the exact session event and canonical mastery tenant");
    const schoolId = actor.schoolId ?? CODECAMP_MASTERY_SCHOOL_ID;
    const mastery = createDrizzleMasteryPersistence({ db: rawDb, tenant: { schoolId }, actorId: actor.learnerId, sourceTenantKey: tenantKey(actor) });
    try {
      const receipt = await projectActivitySubmissionToMastery(schoolId, actor.learnerId, submission, mastery, new Date().toISOString());
      await rawDb.update(activitySessionEvents).set({ masteryProjectionStatus: "projected", masteryProjectionError: null, masteryCommitId: receipt.commitId, masteryProjectedAt: new Date(), masteryProjectionAttempts: sql`${activitySessionEvents.masteryProjectionAttempts} + 1` }).where(and(eq(activitySessionEvents.sessionId, sessionId), eq(activitySessionEvents.eventId, eventId)));
    } catch (error) {
      await rawDb.update(activitySessionEvents).set({ masteryProjectionStatus: "failed", masteryProjectionError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown mastery projection failure", masteryProjectionAttempts: sql`${activitySessionEvents.masteryProjectionAttempts} + 1` }).where(and(eq(activitySessionEvents.sessionId, sessionId), eq(activitySessionEvents.eventId, eventId)));
      throw error;
    }
  }

  /**
   * Loads an activity session only for its authenticated owner.
   * @param actor Authenticated tenant-scoped learner.
   * @param sessionId Server-issued session identifier.
   * @returns Owned session or null.
   */
  async getOwnedSession(actor: ActivityActor, sessionId: string): Promise<ActivitySessionRecord | null> {
    const rawDb = this.tenantDb.unscoped("activity session read manually scopes tenantKey + learnerId");
    const [row] = await rawDb.select().from(activitySessions).where(and(
      eq(activitySessions.id, sessionId),
      eq(activitySessions.tenantKey, tenantKey(actor)),
      eq(activitySessions.learnerId, actor.learnerId),
    )).limit(1);
    return row ? rowToRecord(row) : null;
  }

  /**
   * Loads a teacher-readable learner session within the teacher's school.
   * @param schoolId Authenticated teacher school identifier.
   * @param learnerId Learner whose session is being inspected.
   * @param sessionId Server-issued session identifier.
   * @param checkpointIds Authored checkpoint identifiers for unresolved reporting.
   * @returns Scoped teacher summary or null.
   */
  async getTeacherSummary(schoolId: string, learnerId: string, sessionId: string, checkpointIds: string[] = []): Promise<ActivitySessionSummary | null> {
    const rawDb = this.tenantDb.unscoped("activity teacher summary manually scopes school tenantKey + learnerId");
    const [row] = await rawDb.select().from(activitySessions).where(and(
      eq(activitySessions.id, sessionId), eq(activitySessions.tenantKey, schoolId),
      eq(activitySessions.schoolId, schoolId), eq(activitySessions.learnerId, learnerId),
    )).limit(1);
    return row ? summarizeActivitySession(rowToRecord(row), checkpointIds) : null;
  }
}

/**
 * Retries pending or failed assessed activity outbox rows through canonical Mastery.
 * @param tenantDb Database boundary used for explicitly scoped outbox recovery.
 * @param limit Maximum rows processed in one worker invocation.
 * @returns Counts of projected and failed rows.
 */
export async function retryPendingActivityMasteryProjections(tenantDb: TenantDB, limit = 25): Promise<{ projected: number; failed: number }> {
  const rawDb = tenantDb.unscoped("activity mastery retry worker reads only pending or failed assessed outbox rows");
  const rows = await rawDb.select().from(activitySessionEvents).where(and(eq(activitySessionEvents.isAssessed, true), inArray(activitySessionEvents.masteryProjectionStatus, ["pending", "failed"]))).limit(limit);
  const adapter = new DrizzleActivityPersistence(tenantDb);
  let projected = 0;
  let failed = 0;
  for (const row of rows) {
    const actor: ActivityActor = row.tenantKey === "codecamp" ? { learnerId: row.learnerId, schoolId: null, tenantKey: "codecamp" } : { learnerId: row.learnerId, schoolId: row.tenantKey };
    try {
      const submission = activityPracticeSubmissionEnvelopeSchema.parse(row.submissionJson);
      await adapter.projectAssessment(actor, row.sessionId, row.eventId, submission);
      projected += 1;
    } catch {
      failed += 1;
    }
  }
  return { projected, failed };
}
