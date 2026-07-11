import {
  activityEventBatchSchema,
  appendActivityEventBatch,
  type ActivityEventBatch,
  type ActivityPersistencePolicy,
  type ActivitySessionRecord,
  type ActivityState,
} from "@reading-advantage/activity-runtime";
import type { ActivityActor } from "@reading-advantage/activity-runtime/server";
import type { ActivityPersistencePort } from "@reading-advantage/activity-runtime/transport";
import { activitySessionEvents, activitySessions } from "@reading-advantage/db";
import { and, eq } from "drizzle-orm";
import type { TenantDB } from "../db-contract.js";

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
}
