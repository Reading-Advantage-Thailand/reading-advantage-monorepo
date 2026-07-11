import {
  activityEventBatchSchema,
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
import { and, eq } from "drizzle-orm";
import type { TenantDB } from "../db-contract.js";
import { createDrizzleMasteryPersistence } from "../mastery/index.js";
import { projectActivitySubmissionToMastery } from "./activity-mastery-projection.js";

type ActivitySessionRow = typeof activitySessions.$inferSelect;

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
        if (!stored || JSON.stringify(stored.eventJson) !== JSON.stringify(result.event) || JSON.stringify(stored.submissionJson) !== JSON.stringify(result.submission)) {
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
    if (actor.schoolId) {
      const mastery = createDrizzleMasteryPersistence({ db: rawDb, tenant: { schoolId: actor.schoolId }, actorId: actor.learnerId });
      await projectActivitySubmissionToMastery(actor.schoolId, actor.learnerId, result.submission, mastery, new Date().toISOString());
    }
    return savedSession;
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
