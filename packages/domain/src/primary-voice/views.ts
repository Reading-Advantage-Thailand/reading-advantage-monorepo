/**
 * Reedy usage views for teachers and admins (FR-13, FR-14, FR-15). A port of the Tutor
 * `voiceOperations.ts` summary plus the Primary class and school roll-ups. No transcript or
 * summary text leaves this module; teachers see counts only.
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { classroomStudents, primaryVoiceMonthlyUsage, primaryVoiceSessions, schools, users } from "@reading-advantage/db/schema";
import { AuthError, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { managedClass } from "../primary-books/class-books.js";
import { DEFAULT_VOICE_CONFIG, type VoiceConfig } from "./config.js";
import { voiceMonthKey } from "./time.js";
import type { VoiceScores } from "./contracts.js";

const UNSCOPED_REASON = "voice usage views join sessions and usage rows to class members and schools with an explicit school filter";

/** One session row as the operations summary reads it (the Tutor shape). */
export interface VoiceOperationRow {
  voiceSessionId: string;
  createdAt: Date;
  startedAt: Date | null;
  status: string;
  endReason: string | null;
  consumedSeconds: number;
  summary: unknown;
  providerUsage: unknown;
}

function usageCost(providerUsage: unknown, key: "measuredRealtimeCostUsd" | "measuredTranscriptionCostUsd"): number | null {
  if (!providerUsage || typeof providerUsage !== "object" || Array.isArray(providerUsage)) return null;
  const value = (providerUsage as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function measuredCosts(providerUsage: unknown) {
  const realtime = usageCost(providerUsage, "measuredRealtimeCostUsd");
  const transcription = usageCost(providerUsage, "measuredTranscriptionCostUsd");
  return { realtime, transcription, total: realtime === null ? null : realtime + (transcription ?? 0) };
}

/**
 * Counts the safety events a session recorded (the strict guard), without any content.
 * @param providerUsage The session's provider usage JSON.
 * @returns The number of guarded turns.
 */
export function safetyEventCount(providerUsage: unknown): number {
  if (!providerUsage || typeof providerUsage !== "object" || Array.isArray(providerUsage)) return 0;
  const events = (providerUsage as Record<string, unknown>).safetyEvents;
  if (!events || typeof events !== "object" || Array.isArray(events)) return 0;
  return Object.values(events as Record<string, unknown>).reduce<number>((sum, n) => sum + (typeof n === "number" && Number.isFinite(n) ? n : 0), 0);
}

/**
 * Summarizes voice sessions for operations: starts, failures, disconnects, summary failures, and
 * measured cost (ported from Tutor `summarizeVoiceOperations`).
 * @param rows The sessions, newest first.
 * @returns The counts, rates, costs, and the 50 most recent sessions.
 */
export function summarizeVoiceOperations(rows: VoiceOperationRow[]) {
  const started = rows.filter((row) => row.startedAt !== null);
  const finished = started.filter((row) => row.status === "ENDED");
  const failedStarts = rows.filter((row) => row.status === "PROVIDER_FAILED" || (["LEASE_EXPIRED", "CONNECTION_TIMEOUT"].includes(row.endReason || "") && !row.startedAt));
  const disconnected = finished.filter((row) => row.endReason === "CONNECTION_LOST");
  const summaryFailures = finished.filter((row) => !row.summary);
  // A session counts as measured once its Realtime usage is complete. Sessions
  // recorded before transcription metering have no transcription amount.
  const measured = finished.map((row) => measuredCosts(row.providerUsage)).filter((cost) => cost.realtime !== null);
  const totalRealtimeUsd = measured.reduce((sum, cost) => sum + (cost.realtime ?? 0), 0);
  const totalTranscriptionUsd = measured.reduce((sum, cost) => sum + (cost.transcription ?? 0), 0);
  const totalMeasuredUsd = totalRealtimeUsd + totalTranscriptionUsd;
  return {
    attempts: rows.length,
    started: started.length,
    failedStarts: failedStarts.length,
    failedStartRate: rows.length ? failedStarts.length / rows.length : 0,
    disconnected: disconnected.length,
    disconnectRate: finished.length ? disconnected.length / finished.length : 0,
    summaryFailures: summaryFailures.length,
    summaryFailureRate: finished.length ? summaryFailures.length / finished.length : 0,
    finished: finished.length,
    measuredCostSessions: measured.length,
    missingCostSessions: finished.length - measured.length,
    missingTranscriptionCostSessions: measured.filter((cost) => cost.transcription === null).length,
    totalMeasuredCostUsd: totalMeasuredUsd,
    totalMeasuredRealtimeCostUsd: totalRealtimeUsd,
    totalMeasuredTranscriptionCostUsd: totalTranscriptionUsd,
    averageMeasuredCostUsd: measured.length ? totalMeasuredUsd / measured.length : null,
    averageMeasuredRealtimeCostUsd: measured.length ? totalRealtimeUsd / measured.length : null,
    recentSessions: rows.slice(0, 50).map((row) => {
      const cost = measuredCosts(row.providerUsage);
      return {
        sessionId: row.voiceSessionId,
        createdAt: row.createdAt,
        status: row.status,
        endReason: row.endReason,
        consumedSeconds: row.consumedSeconds,
        summaryAvailable: Boolean(row.summary),
        measuredRealtimeCostUsd: cost.realtime,
        measuredTranscriptionCostUsd: cost.transcription,
        measuredCostUsd: cost.total,
      };
    }),
  };
}

/** One student's Reedy use in the month (FR-13). */
export interface ClassVoiceStudent {
  userId: string;
  name: string;
  secondsUsed: number;
  sessionCount: number;
  lastUseAt: Date | null;
  averageScores: VoiceScores | null;
  safetyEvents: number;
}

/** The class roll-up of the month (FR-13). */
export interface ClassVoiceUsage {
  classroomId: string;
  month: string;
  budgetSeconds: number;
  totalSeconds: number;
  totalSessions: number;
  studentCount: number;
  studentsWithUse: number;
  safetyEvents: number;
  students: ClassVoiceStudent[];
}

const SCORE_KEYS = ["fluency", "grammar", "vocabulary", "pronunciation"] as const;

function averageScores(rows: unknown[]): VoiceScores | null {
  const valid = rows.filter((s): s is Record<string, number> => !!s && typeof s === "object" && SCORE_KEYS.every((k) => typeof (s as Record<string, unknown>)[k] === "number"));
  if (!valid.length) return null;
  const avg = (k: (typeof SCORE_KEYS)[number]) => Math.round((valid.reduce((sum, s) => sum + s[k]!, 0) / valid.length) * 10) / 10;
  return { fluency: avg("fluency"), grammar: avg("grammar"), vocabulary: avg("vocabulary"), pronunciation: avg("pronunciation") };
}

/**
 * The Reedy use of a class this month: minutes, sessions, last use, and average scores per
 * student, plus the students with no use. Teachers see safety event counts only (FR-15).
 * @param ctx The database, the teacher (or school admin), the class, the clock, the config.
 * @returns The class roll-up with one row per enrolled student, heaviest users first.
 * @throws {AuthError} FORBIDDEN when the user does not teach the class.
 */
export async function getClassVoiceUsage(ctx: { db: DB; user: UserContext; classroomId: string; now?: Date; config?: VoiceConfig }): Promise<ClassVoiceUsage> {
  const cls = await managedClass({ db: ctx.db, user: ctx.user }, ctx.classroomId);
  const config = ctx.config ?? DEFAULT_VOICE_CONFIG;
  const month = voiceMonthKey(ctx.now ?? new Date());
  const raw = createTenantDB(ctx.db, { schoolId: cls.schoolId }).unscoped(UNSCOPED_REASON);
  const members = await raw
    .select({ userId: users.id, name: users.name, username: users.username })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .where(eq(classroomStudents.classroomId, cls.id));
  const ids = members.map((m) => m.userId);
  const usage = ids.length
    ? await raw
        .select({ userId: primaryVoiceMonthlyUsage.studentUserId, secondsUsed: primaryVoiceMonthlyUsage.secondsUsed, sessionCount: primaryVoiceMonthlyUsage.sessionCount })
        .from(primaryVoiceMonthlyUsage)
        .where(and(eq(primaryVoiceMonthlyUsage.schoolId, cls.schoolId), eq(primaryVoiceMonthlyUsage.month, month), inArray(primaryVoiceMonthlyUsage.studentUserId, ids)))
    : [];
  const sessions = ids.length
    ? await raw
        .select({ userId: primaryVoiceSessions.studentUserId, endedAt: primaryVoiceSessions.endedAt, scores: primaryVoiceSessions.scores, providerUsage: primaryVoiceSessions.providerUsage })
        .from(primaryVoiceSessions)
        .where(and(eq(primaryVoiceSessions.schoolId, cls.schoolId), eq(primaryVoiceSessions.month, month), eq(primaryVoiceSessions.status, "ENDED"), inArray(primaryVoiceSessions.studentUserId, ids)))
    : [];
  const students = members
    .map((m): ClassVoiceStudent => {
      const use = usage.find((u) => u.userId === m.userId);
      const own = sessions.filter((s) => s.userId === m.userId);
      const last = own.reduce<Date | null>((latest, s) => (s.endedAt && (!latest || s.endedAt > latest) ? s.endedAt : latest), null);
      return {
        userId: m.userId,
        name: m.name ?? m.username,
        secondsUsed: use?.secondsUsed ?? 0,
        sessionCount: use?.sessionCount ?? 0,
        lastUseAt: last,
        averageScores: averageScores(own.map((s) => s.scores)),
        safetyEvents: own.reduce((sum, s) => sum + safetyEventCount(s.providerUsage), 0),
      };
    })
    .sort((a, b) => b.secondsUsed - a.secondsUsed || a.name.localeCompare(b.name));
  return {
    classroomId: cls.id,
    month,
    budgetSeconds: config.monthBudgetSeconds,
    totalSeconds: students.reduce((sum, s) => sum + s.secondsUsed, 0),
    totalSessions: students.reduce((sum, s) => sum + s.sessionCount, 0),
    studentCount: students.length,
    studentsWithUse: students.filter((s) => s.sessionCount > 0).length,
    safetyEvents: students.reduce((sum, s) => sum + s.safetyEvents, 0),
    students,
  };
}

/** One school-month row of the cost view (FR-14). */
export interface SchoolVoiceMonth {
  schoolId: string;
  schoolName: string;
  month: string;
  secondsUsed: number;
  sessionCount: number;
  costThb: number;
  attempts: number;
  failedStarts: number;
  disconnected: number;
  summaryFailures: number;
  safetyEvents: number;
}

/** The admin cost view (FR-14): school-months plus the operations summary of recent sessions. */
export interface SchoolVoiceCosts {
  months: SchoolVoiceMonth[];
  operations: ReturnType<typeof summarizeVoiceOperations>;
}

/**
 * Lists cost and failure counts by school and month. An ADMIN sees the own school; SYSTEM sees
 * every school. Teachers and students are refused.
 * @param ctx The database, the user, how many months back (default 3), the clock.
 * @returns The school-month rows (newest month first) and the operations summary of the newest 500 sessions in scope.
 * @throws {AuthError} FORBIDDEN for a user who is not ADMIN or SYSTEM.
 */
export async function getSchoolVoiceCosts(ctx: { db: DB; user: UserContext; months?: number; now?: Date }): Promise<SchoolVoiceCosts> {
  if (ctx.user.role !== "ADMIN" && ctx.user.role !== "SYSTEM") throw new AuthError("Only school admins see Reedy costs", "FORBIDDEN");
  if (ctx.user.role === "ADMIN" && !ctx.user.schoolId) throw new AuthError("No school", "FORBIDDEN");
  const now = ctx.now ?? new Date();
  const span = Math.max(1, Math.min(12, ctx.months ?? 3));
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (span - 1), 1) - 7 * 3_600_000);
  const firstMonth = voiceMonthKey(since);
  const raw = createTenantDB(ctx.db, { schoolId: ctx.user.schoolId }).unscoped(UNSCOPED_REASON);
  const schoolFilter = ctx.user.role === "ADMIN" ? eq(primaryVoiceMonthlyUsage.schoolId, ctx.user.schoolId!) : undefined;
  const usageRows = await raw
    .select({
      schoolId: primaryVoiceMonthlyUsage.schoolId,
      schoolName: schools.name,
      month: primaryVoiceMonthlyUsage.month,
      secondsUsed: sql<number>`coalesce(sum(${primaryVoiceMonthlyUsage.secondsUsed}), 0)`.mapWith(Number),
      sessionCount: sql<number>`coalesce(sum(${primaryVoiceMonthlyUsage.sessionCount}), 0)`.mapWith(Number),
      costThb: sql<number>`coalesce(sum(${primaryVoiceMonthlyUsage.costThb}), 0)`.mapWith(Number),
    })
    .from(primaryVoiceMonthlyUsage)
    .innerJoin(schools, eq(schools.id, primaryVoiceMonthlyUsage.schoolId))
    .where(and(gte(primaryVoiceMonthlyUsage.month, firstMonth), schoolFilter))
    .groupBy(primaryVoiceMonthlyUsage.schoolId, schools.name, primaryVoiceMonthlyUsage.month);
  const sessionFilter = ctx.user.role === "ADMIN" ? eq(primaryVoiceSessions.schoolId, ctx.user.schoolId!) : undefined;
  const sessionRows = await raw
    .select({
      id: primaryVoiceSessions.id,
      schoolId: primaryVoiceSessions.schoolId,
      month: primaryVoiceSessions.month,
      createdAt: primaryVoiceSessions.createdAt,
      startedAt: primaryVoiceSessions.startedAt,
      status: primaryVoiceSessions.status,
      endReason: primaryVoiceSessions.endReason,
      consumedSeconds: primaryVoiceSessions.consumedSeconds,
      hasSummary: sql<boolean>`(${primaryVoiceSessions.summary} is not null)`,
      providerUsage: primaryVoiceSessions.providerUsage,
    })
    .from(primaryVoiceSessions)
    .where(and(gte(primaryVoiceSessions.month, firstMonth), sessionFilter))
    .orderBy(desc(primaryVoiceSessions.createdAt))
    .limit(500);
  const months = new Map<string, SchoolVoiceMonth>();
  for (const u of usageRows) {
    months.set(`${u.schoolId}/${u.month}`, { schoolId: u.schoolId, schoolName: u.schoolName, month: u.month, secondsUsed: u.secondsUsed, sessionCount: u.sessionCount, costThb: Math.round(u.costThb * 100) / 100, attempts: 0, failedStarts: 0, disconnected: 0, summaryFailures: 0, safetyEvents: 0 });
  }
  const ops: VoiceOperationRow[] = [];
  for (const s of sessionRows) {
    const row: VoiceOperationRow = { voiceSessionId: s.id, createdAt: s.createdAt, startedAt: s.startedAt, status: s.status, endReason: s.endReason, consumedSeconds: s.consumedSeconds, summary: s.hasSummary ? true : null, providerUsage: s.providerUsage };
    ops.push(row);
    const key = `${s.schoolId}/${s.month}`;
    const bucket = months.get(key) ?? { schoolId: s.schoolId, schoolName: "", month: s.month, secondsUsed: 0, sessionCount: 0, costThb: 0, attempts: 0, failedStarts: 0, disconnected: 0, summaryFailures: 0, safetyEvents: 0 };
    const one = summarizeVoiceOperations([row]);
    bucket.attempts += 1;
    bucket.failedStarts += one.failedStarts;
    bucket.disconnected += one.disconnected;
    bucket.summaryFailures += one.summaryFailures;
    bucket.safetyEvents += safetyEventCount(s.providerUsage);
    months.set(key, bucket);
  }
  return {
    months: [...months.values()].sort((a, b) => b.month.localeCompare(a.month) || a.schoolName.localeCompare(b.schoolName)),
    operations: summarizeVoiceOperations(ops),
  };
}
