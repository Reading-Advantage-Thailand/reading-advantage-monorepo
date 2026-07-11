import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/** Durable learner-owned activity session and replay-safe projection metadata. */
export const activitySessions = pgTable(
  "activity_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id"),
    tenantKey: text("tenant_key").notNull(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityId: text("activity_id").notNull(),
    activityVersion: text("activity_version").notNull(),
    stateJson: jsonb("state_json").$type<Record<string, unknown>>().notNull(),
    processedBatchIdsJson: jsonb("processed_batch_ids_json").$type<string[]>().notNull(),
    deviceHighWatermarksJson: jsonb("device_high_watermarks_json").$type<Record<string, number>>().notNull(),
    lastEventSequence: integer("last_event_sequence").default(0).notNull(),
    completed: boolean("completed").default(false).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    retainUntil: timestamp("retain_until", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("activity_sessions_tenant_id_learner_unique").on(table.tenantKey, table.id, table.learnerId),
    check("activity_sessions_sequence_check", sql`${table.lastEventSequence} >= 0`),
    check(
      "activity_sessions_tenant_check",
      sql`(${table.schoolId} IS NOT NULL AND ${table.tenantKey} = ${table.schoolId}::text) OR (${table.schoolId} IS NULL AND length(${table.tenantKey}) > 0)`,
    ),
    index("activity_sessions_tenant_learner_updated_idx").on(table.tenantKey, table.learnerId, table.updatedAt),
    index("activity_sessions_retention_idx").on(table.retainUntil),
  ],
);

/** Immutable normalized event row belonging to one activity session. */
export const activitySessionEvents = pgTable(
  "activity_session_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull(),
    tenantKey: text("tenant_key").notNull(),
    learnerId: text("learner_id").notNull(),
    eventId: text("event_id").notNull(),
    batchId: text("batch_id").notNull(),
    deviceId: text("device_id").notNull(),
    clientSequence: integer("client_sequence").notNull(),
    serverSequence: integer("server_sequence").notNull(),
    eventKind: text("event_kind").notNull(),
    isAssessed: boolean("is_assessed").default(false).notNull(),
    submissionId: text("submission_id"),
    submissionJson: jsonb("submission_json").$type<Record<string, unknown>>(),
    eventJson: jsonb("event_json").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("activity_session_events_session_event_unique").on(table.sessionId, table.eventId),
    unique("activity_session_events_session_server_sequence_unique").on(table.sessionId, table.serverSequence),
    unique("activity_session_events_session_device_client_unique").on(table.sessionId, table.deviceId, table.clientSequence),
    unique("activity_session_events_session_submission_unique").on(table.sessionId, table.submissionId),
    check("activity_session_events_client_sequence_check", sql`${table.clientSequence} > 0`),
    check("activity_session_events_server_sequence_check", sql`${table.serverSequence} > 0`),
    check(
      "activity_session_events_assessment_check",
      sql`(${table.isAssessed} = false AND ${table.submissionId} IS NULL AND ${table.submissionJson} IS NULL) OR (${table.isAssessed} = true AND ${table.submissionId} IS NOT NULL AND ${table.submissionJson} IS NOT NULL)`,
    ),
    foreignKey({
      name: "activity_session_events_owner_fk",
      columns: [table.tenantKey, table.sessionId, table.learnerId],
      foreignColumns: [activitySessions.tenantKey, activitySessions.id, activitySessions.learnerId],
    }).onDelete("cascade"),
    index("activity_session_events_tenant_learner_occurred_idx").on(table.tenantKey, table.learnerId, table.occurredAt),
    index("activity_session_events_session_received_idx").on(table.sessionId, table.receivedAt),
  ],
);
