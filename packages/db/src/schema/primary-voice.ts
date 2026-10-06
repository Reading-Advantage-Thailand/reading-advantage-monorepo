/**
 * Reedy voice practice for Primary Advantage (track primary_reedy_preview_20261003). A port of
 * the Tutor `ai_voice_sessions` and `active_ai_voice_sessions` tables with a monthly budget
 * instead of a class package. Additive; no audio or transcript is stored.
 */
import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, real, primaryKey, index } from "drizzle-orm/pg-core";
import { users, schools } from "./users.js";
import { articles } from "./content.js";

/** One voice practice session: reservation, connection, metering, and the private summary. */
export const primaryVoiceSessions = pgTable(
  "primary_voice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** The lesson article Reedy talks about; null for a session with no lesson context. */
    articleId: uuid("article_id").references(() => articles.id),
    /** The budget month of the session, "YYYY-MM" in Asia/Bangkok. */
    month: text("month").notNull(),
    /** PENDING (reserved, not connected), ACTIVE, ENDED, PROVIDER_FAILED. */
    status: text("status").default("PENDING").notNull(),
    providerCallId: text("provider_call_id"),
    reservedSeconds: integer("reserved_seconds").notNull(),
    consumedSeconds: integer("consumed_seconds").default(0).notNull(),
    startedAt: timestamp("started_at"),
    expiresAt: timestamp("expires_at").notNull(),
    endedAt: timestamp("ended_at"),
    /** USER_ENDED, QUOTA_REACHED, LEASE_EXPIRED, CONNECTION_TIMEOUT, CONNECTION_LOST, PROVIDER_FAILED, SERVICE_RECOVERY. */
    endReason: text("end_reason"),
    /** `{ summaryTh, strengths, improvements, practicedTopics }`, no transcript. */
    summary: jsonb("summary"),
    /** `{ fluency, grammar, vocabulary, pronunciation }` 0-5. */
    scores: jsonb("scores"),
    /** Model, token usage, measured USD, estimated THB, safety event counts (as Tutor). */
    providerUsage: jsonb("provider_usage"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("primary_voice_sessions_student_month_idx").on(t.studentUserId, t.month), index("primary_voice_sessions_school_idx").on(t.schoolId, t.createdAt)],
);

/** The one-active-session lock of a student; the row lives from reservation to the end of the session. */
export const primaryActiveVoiceSessions = pgTable("primary_active_voice_sessions", {
  studentUserId: text("student_user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  voiceSessionId: uuid("voice_session_id").notNull().unique().references(() => primaryVoiceSessions.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

/** The seconds and cost a student used in a budget month (FR-1, FR-7). */
export const primaryVoiceMonthlyUsage = pgTable(
  "primary_voice_monthly_usage",
  {
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    secondsUsed: integer("seconds_used").default(0).notNull(),
    sessionCount: integer("session_count").default(0).notNull(),
    costThb: real("cost_thb").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentUserId, t.month] }), index("primary_voice_monthly_usage_school_month_idx").on(t.schoolId, t.month)],
);

/** The per-school switch (FR-6); a school with no row is enabled. */
export const primaryVoiceSchoolSettings = pgTable("primary_voice_school_settings", {
  schoolId: uuid("school_id").primaryKey().references(() => schools.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
