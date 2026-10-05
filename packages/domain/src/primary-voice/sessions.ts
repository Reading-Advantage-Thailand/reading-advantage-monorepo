import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { articles, primaryActiveVoiceSessions, primaryAvatarProfile, primaryVoiceMonthlyUsage, primaryVoiceSchoolSettings, primaryVoiceSessions } from "@reading-advantage/db/schema";
import { AuthError, type SessionAuthStrength, type UserContext } from "@reading-advantage/auth";
import { emptyRealtimeUsage, realtimeCostUsd, transcriptionCostUsd, RATE_CARD_VERSION } from "@reading-advantage/ai/voice";
import { createTenantDB } from "../db-contract.js";
import { DEFAULT_VOICE_CONFIG, type VoiceConfig } from "./config.js";
import {
  startVoiceSessionInputSchema,
  voiceScoresSchema,
  voiceSummarySchema,
  type StartVoiceSessionInput,
  type StartVoiceSessionOutput,
  type VoiceBlock,
  type VoiceEntitlement,
  type VoiceSessionRecord,
} from "./contracts.js";
import { buildReedyInstructions } from "./instructions.js";
import type { VoiceProvider, VoiceSummaryEvaluator } from "./provider.js";
import { createVoiceRuntime, normalizeProviderSummary, type ProviderSummary, type VoiceRuntime } from "./runtime.js";
import { consumedVoiceSeconds, voiceMonthKey } from "./time.js";

/** The error codes of the voice use-cases, with the HTTP status a route maps them to. */
export type VoiceErrorCode = "VOICE_DISABLED" | "AUTH_STRENGTH" | "AVATAR_REQUIRED" | "QUOTA_EXHAUSTED" | "SESSION_ALREADY_ACTIVE" | "VOICE_PROVIDER_UNAVAILABLE" | "NOT_FOUND" | "FORBIDDEN";

/** A voice use-case refusal. */
export class VoiceError extends Error {
  constructor(
    public readonly code: VoiceErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "VoiceError";
  }
}

const BLOCK_ERRORS: Record<VoiceBlock, [VoiceErrorCode, number, string]> = {
  DISABLED: ["VOICE_DISABLED", 503, "Reedy is switched off"],
  SCHOOL_DISABLED: ["VOICE_DISABLED", 503, "Reedy is switched off for this school"],
  AUTH_STRENGTH: ["AUTH_STRENGTH", 403, "Sign in with your password to talk to Reedy"],
  NO_AVATAR: ["AVATAR_REQUIRED", 409, "Make your avatar first"],
  SESSION_ACTIVE: ["SESSION_ALREADY_ACTIVE", 409, "Another Reedy session is already active"],
  QUOTA_EXHAUSTED: ["QUOTA_EXHAUSTED", 409, "The Reedy minutes of this month are used up"],
};

/** The one runtime of the process. */
export const defaultVoiceRuntime: VoiceRuntime = createVoiceRuntime();

/** The common parameters of the voice use-cases. */
export interface VoiceCtx {
  db: DB;
  user: UserContext;
  /** The strength of the current sign-in (FR-5); `full` is required to start. */
  authStrength?: SessionAuthStrength;
  config?: VoiceConfig;
  now?: Date;
  runtime?: VoiceRuntime;
}

const UNSCOPED_REASON = "voice rows are read and written with an explicit school_id and the student's own user id";

type SessionRow = typeof primaryVoiceSessions.$inferSelect;

/**
 * The school of a student; staff and users with no school are refused.
 * @param user The signed-in user.
 * @returns The school id.
 * @throws {AuthError} FORBIDDEN for a non-student or a user with no school.
 */
function studentSchool(user: UserContext): string {
  if (user.role !== "STUDENT") throw new AuthError("Only students talk to Reedy", "FORBIDDEN");
  if (!user.schoolId) throw new AuthError("Reedy needs a school", "FORBIDDEN");
  return user.schoolId;
}

/**
 * Maps a session row to the record the screens show.
 * @param row The row.
 * @returns The record.
 */
export function toVoiceSessionRecord(row: SessionRow): VoiceSessionRecord {
  const summary = voiceSummarySchema.safeParse(row.summary);
  const scores = voiceScoresSchema.safeParse(row.scores);
  return {
    sessionId: row.id,
    articleId: row.articleId,
    status: row.status,
    consumedSeconds: row.consumedSeconds,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    endReason: row.endReason,
    summary: summary.success ? summary.data : null,
    scores: scores.success ? scores.data : null,
  };
}

/**
 * Releases the lock of a student when its lease ran out: the session ends as LEASE_EXPIRED.
 * @param db The database.
 * @param studentUserId The student.
 * @param now The clock.
 * @returns The live lock with its session, or null.
 */
async function activeLock(db: DB, studentUserId: string, now: Date) {
  const rows = await db
    .select({ voiceSessionId: primaryActiveVoiceSessions.voiceSessionId, expiresAt: primaryActiveVoiceSessions.expiresAt, session: primaryVoiceSessions })
    .from(primaryActiveVoiceSessions)
    .innerJoin(primaryVoiceSessions, eq(primaryVoiceSessions.id, primaryActiveVoiceSessions.voiceSessionId))
    .where(eq(primaryActiveVoiceSessions.studentUserId, studentUserId))
    .limit(1);
  const lock = rows[0];
  if (!lock) return null;
  if (lock.expiresAt > now) return lock;
  await db
    .update(primaryVoiceSessions)
    .set({ status: "ENDED", consumedSeconds: consumedVoiceSeconds(lock.session.startedAt, now, lock.session.reservedSeconds), endedAt: now, endReason: "LEASE_EXPIRED" })
    .where(eq(primaryVoiceSessions.id, lock.voiceSessionId));
  await db.delete(primaryActiveVoiceSessions).where(eq(primaryActiveVoiceSessions.studentUserId, studentUserId));
  return null;
}

/**
 * What the student may do this month (FR-1 to FR-6, FR-10b): the switches, the sign-in strength,
 * the avatar, the one-active-session lock, and the budget. An expired lease is released here.
 * @param ctx The database, the student, the sign-in strength, the config, and the clock.
 * @returns The entitlement with `blockedBy` set when a session cannot start.
 * @throws {AuthError} FORBIDDEN for a non-student.
 */
export async function getVoiceEntitlement(ctx: VoiceCtx): Promise<VoiceEntitlement> {
  const schoolId = studentSchool(ctx.user);
  const config = ctx.config ?? DEFAULT_VOICE_CONFIG;
  const now = ctx.now ?? new Date();
  const month = voiceMonthKey(now);
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const [schoolRow] = await raw.select({ enabled: primaryVoiceSchoolSettings.enabled }).from(primaryVoiceSchoolSettings).where(eq(primaryVoiceSchoolSettings.schoolId, schoolId)).limit(1);
  const lock = await activeLock(raw, ctx.user.id, now);
  const [usage] = await raw
    .select({ secondsUsed: primaryVoiceMonthlyUsage.secondsUsed })
    .from(primaryVoiceMonthlyUsage)
    .where(and(eq(primaryVoiceMonthlyUsage.studentUserId, ctx.user.id), eq(primaryVoiceMonthlyUsage.month, month)))
    .limit(1);
  const [avatar] = await raw
    .select({ userId: primaryAvatarProfile.userId })
    .from(primaryAvatarProfile)
    .where(and(eq(primaryAvatarProfile.schoolId, schoolId), eq(primaryAvatarProfile.userId, ctx.user.id)))
    .limit(1);
  const usedSeconds = usage?.secondsUsed ?? 0;
  const reserved = lock?.session.month === month ? lock.session.reservedSeconds : 0;
  const remainingSeconds = Math.max(0, config.monthBudgetSeconds - usedSeconds - reserved);
  const enabled = config.enabled && (schoolRow?.enabled ?? true);
  const blockedBy: VoiceBlock | null = !config.enabled
    ? "DISABLED"
    : !enabled
      ? "SCHOOL_DISABLED"
      : (ctx.authStrength ?? "full") !== "full"
        ? "AUTH_STRENGTH"
        : !avatar
          ? "NO_AVATAR"
          : lock
            ? "SESSION_ACTIVE"
            : remainingSeconds <= 0
              ? "QUOTA_EXHAUSTED"
              : null;
  return {
    enabled,
    month,
    budgetSeconds: config.monthBudgetSeconds,
    usedSeconds,
    remainingSeconds,
    sessionCapSeconds: config.sessionCapSeconds,
    activeSession: lock ? { sessionId: lock.voiceSessionId, expiresAt: lock.expiresAt.toISOString(), articleId: lock.session.articleId } : null,
    blockedBy,
  };
}

/**
 * Starts a session (FR-2, FR-3): reserves the smaller of the session cap and the month's
 * remaining seconds, takes the lock, opens the provider call with the lesson as context, and
 * attaches the strict guard. A provider failure releases the reservation.
 * @param ctx The database, the student, the sign-in strength, the config, the clock, and the runtime.
 * @param ctx.provider The voice provider.
 * @param ctx.input The lesson and the WebRTC offer.
 * @returns The provider answer and the reservation.
 * @throws {VoiceError} With the block reason, SESSION_ALREADY_ACTIVE on a lock race, or VOICE_PROVIDER_UNAVAILABLE.
 */
export async function startVoiceSession(ctx: VoiceCtx & { provider: VoiceProvider; input: StartVoiceSessionInput }): Promise<StartVoiceSessionOutput> {
  const input = startVoiceSessionInputSchema.parse(ctx.input);
  const config = ctx.config ?? DEFAULT_VOICE_CONFIG;
  const now = ctx.now ?? new Date();
  const runtime = ctx.runtime ?? defaultVoiceRuntime;
  const entitlement = await getVoiceEntitlement(ctx);
  if (entitlement.blockedBy) {
    const [code, status, message] = BLOCK_ERRORS[entitlement.blockedBy];
    throw new VoiceError(code, status, message);
  }
  const schoolId = ctx.user.schoolId!;
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const reservedSeconds = Math.min(config.sessionCapSeconds, entitlement.remainingSeconds);
  const pendingExpiresAt = new Date(now.getTime() + config.pendingLeaseSeconds * 1000);
  let sessionId: string;
  try {
    sessionId = await raw.transaction(
      async (tx) => {
        const [session] = await tx
          .insert(primaryVoiceSessions)
          .values({ schoolId, studentUserId: ctx.user.id, articleId: input.articleId, month: entitlement.month, status: "PENDING", reservedSeconds, expiresAt: pendingExpiresAt, createdAt: now })
          .returning({ id: primaryVoiceSessions.id });
        if (!session) throw new Error("The session was not reserved");
        await tx.insert(primaryActiveVoiceSessions).values({ studentUserId: ctx.user.id, schoolId, voiceSessionId: session.id, expiresAt: pendingExpiresAt });
        return session.id;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505" || code === "40001") throw new VoiceError("SESSION_ALREADY_ACTIVE", 409, "Another Reedy session is already active");
    throw error;
  }
  try {
    const [article] = input.articleId
      ? await raw.select({ title: articles.title, passage: articles.passage, summary: articles.summary }).from(articles).where(eq(articles.id, input.articleId)).limit(1)
      : [];
    const [avatar] = await raw.select({ classPreset: primaryAvatarProfile.classPreset }).from(primaryAvatarProfile).where(and(eq(primaryAvatarProfile.schoolId, schoolId), eq(primaryAvatarProfile.userId, ctx.user.id))).limit(1);
    const lesson = article ?? { title: "English lesson", passage: null, summary: null };
    const instructions = buildReedyInstructions(lesson, ctx.user.cefrLevel || "A1", avatar?.classPreset);
    const call = await ctx.provider.createCall({ sdp: input.sdp, instructions, model: config.model, transcriptionModel: config.transcriptionModel }).catch((error) => {
      throw new VoiceError("VOICE_PROVIDER_UNAVAILABLE", 503, error instanceof Error ? error.message : "Voice provider is temporarily unavailable");
    });
    await raw.update(primaryVoiceSessions).set({ status: "ACTIVE", providerCallId: call.providerCallId, providerUsage: { model: call.model } }).where(eq(primaryVoiceSessions.id, sessionId));
    runtime.attach(sessionId, ctx.provider, call.providerCallId, lesson.title);
    runtime.scheduleExpiry(sessionId, pendingExpiresAt, () => finalizeVoiceSession({ db: ctx.db, sessionId, reason: "QUOTA_REACHED", provider: ctx.provider, config, runtime }).then(() => undefined));
    return { sessionId, answerSdp: call.answerSdp, expiresAt: pendingExpiresAt.toISOString(), reservedSeconds, remainingSeconds: entitlement.remainingSeconds - reservedSeconds };
  } catch (error) {
    try {
      await raw.update(primaryVoiceSessions).set({ status: "PROVIDER_FAILED", endedAt: now, endReason: "PROVIDER_FAILED", consumedSeconds: 0 }).where(eq(primaryVoiceSessions.id, sessionId));
      await raw.delete(primaryActiveVoiceSessions).where(eq(primaryActiveVoiceSessions.voiceSessionId, sessionId));
    } catch {
      /* the lease releases the lock within 45 s */
    }
    throw error;
  }
}

/**
 * Records that the browser connected: the clock of the reservation starts now (FR-3).
 * @param ctx The database, the student, the clock, the config, and the runtime.
 * @param ctx.sessionId The session.
 * @param ctx.provider The provider, for the expiry finalization.
 * @returns The session and when it ends.
 * @throws {VoiceError} NOT_FOUND or FORBIDDEN.
 */
export async function markVoiceSessionConnected(ctx: VoiceCtx & { sessionId: string; provider: VoiceProvider }): Promise<{ sessionId: string; expiresAt: string }> {
  const schoolId = studentSchool(ctx.user);
  const now = ctx.now ?? new Date();
  const config = ctx.config ?? DEFAULT_VOICE_CONFIG;
  const runtime = ctx.runtime ?? defaultVoiceRuntime;
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const [current] = await raw.select().from(primaryVoiceSessions).where(eq(primaryVoiceSessions.id, ctx.sessionId)).limit(1);
  if (!current) throw new VoiceError("NOT_FOUND", 404, "Voice session not found");
  if (current.studentUserId !== ctx.user.id) throw new VoiceError("FORBIDDEN", 403, "This voice session belongs to another student");
  if (current.status !== "ACTIVE" || current.startedAt) return { sessionId: current.id, expiresAt: current.expiresAt.toISOString() };
  const expiresAt = new Date(now.getTime() + current.reservedSeconds * 1000);
  await raw.update(primaryVoiceSessions).set({ startedAt: now, expiresAt }).where(eq(primaryVoiceSessions.id, ctx.sessionId));
  await raw.update(primaryActiveVoiceSessions).set({ expiresAt }).where(eq(primaryActiveVoiceSessions.voiceSessionId, ctx.sessionId));
  runtime.scheduleExpiry(ctx.sessionId, expiresAt, () => finalizeVoiceSession({ db: ctx.db, sessionId: ctx.sessionId, reason: "QUOTA_REACHED", provider: ctx.provider, config, runtime }).then(() => undefined));
  return { sessionId: ctx.sessionId, expiresAt: expiresAt.toISOString() };
}

/**
 * Ends a session (FR-2, FR-7, FR-12): asks the coach for the private summary, charges the
 * connected seconds (never more than the reservation), hangs the call up, prices the usage,
 * records the session, releases the lock, and adds the seconds and cost to the month.
 * @param ctx The database, the clock, the config, and the runtime; `user` limits the end to the owner.
 * @param ctx.sessionId The session.
 * @param ctx.reason Why it ends (USER_ENDED, QUOTA_REACHED, CONNECTION_LOST, PAGE_CLOSED, SERVICE_RECOVERY).
 * @param ctx.provider The provider, to hang up.
 * @param ctx.evaluator The fallback grader for the guarded transcript, when the coach sent no summary.
 * @returns The finished session.
 * @throws {VoiceError} NOT_FOUND or FORBIDDEN.
 */
export async function finalizeVoiceSession(
  ctx: Omit<VoiceCtx, "user"> & { user?: UserContext; sessionId: string; reason: string; provider: VoiceProvider; evaluator?: VoiceSummaryEvaluator },
): Promise<VoiceSessionRecord> {
  const config = ctx.config ?? DEFAULT_VOICE_CONFIG;
  const runtime = ctx.runtime ?? defaultVoiceRuntime;
  const [existing] = await ctx.db.select().from(primaryVoiceSessions).where(eq(primaryVoiceSessions.id, ctx.sessionId)).limit(1);
  if (!existing) throw new VoiceError("NOT_FOUND", 404, "Voice session not found");
  if (ctx.user && existing.studentUserId !== ctx.user.id) throw new VoiceError("FORBIDDEN", 403, "This voice session belongs to another student");
  const raw = createTenantDB(ctx.db, { schoolId: existing.schoolId }).unscoped(UNSCOPED_REASON);
  if (existing.status === "ENDED" || existing.status === "PROVIDER_FAILED") return toVoiceSessionRecord(existing);
  const endReason = !existing.startedAt && ctx.reason === "QUOTA_REACHED" ? "CONNECTION_TIMEOUT" : ctx.reason;
  // Charge only until the end request arrived, not the time spent generating feedback.
  const endedAt = ctx.now ?? new Date();
  await runtime.awaitSummary(ctx.sessionId);
  const consumedSeconds = consumedVoiceSeconds(existing.startedAt, endedAt, existing.reservedSeconds);
  const state = runtime.get(ctx.sessionId);
  if (state) await runtime.awaitResponsesDone(state);
  if (state) state.finalizing = true;
  const usage = state?.usage ?? emptyRealtimeUsage();
  const usageComplete = state?.usageComplete ?? false;
  const transcriptionSeconds = state ? [...state.transcriptionSeconds.values()].reduce((sum, seconds) => sum + seconds, 0) : null;
  let feedback: ProviderSummary | null = state?.summary ?? null;
  const transcript = state?.transcript.join("\n").trim();
  if (!feedback && transcript && ctx.evaluator) {
    feedback = normalizeProviderSummary(await ctx.evaluator.evaluate(state?.articleTitle ?? "English lesson", transcript).catch(() => null));
  }
  runtime.clearExpiry(ctx.sessionId);
  await ctx.provider.hangup(existing.providerCallId ?? "");
  const prior = existing.providerUsage && typeof existing.providerUsage === "object" ? (existing.providerUsage as Record<string, unknown>) : {};
  const model = typeof prior.model === "string" ? prior.model : config.model;
  const measuredRealtimeCostUsd = usageComplete ? realtimeCostUsd(model, usage) : null;
  const measuredTranscriptionCostUsd = usageComplete && transcriptionSeconds !== null ? transcriptionCostUsd(config.transcriptionModel, transcriptionSeconds) : null;
  const estimatedCostThb = Math.round((consumedSeconds / 60) * config.estimatedThbPerMinute * 100) / 100;
  const measuredUsd = measuredRealtimeCostUsd === null ? null : measuredRealtimeCostUsd + (measuredTranscriptionCostUsd ?? 0);
  const costThb = measuredUsd === null ? estimatedCostThb : Math.round(measuredUsd * config.thbPerUsd * 100) / 100;
  const updated = await raw.transaction(async (tx) => {
    const [session] = await tx
      .update(primaryVoiceSessions)
      .set({
        status: "ENDED",
        consumedSeconds,
        endedAt,
        endReason,
        summary: feedback ? { summaryTh: feedback.summaryTh, strengths: feedback.strengths, improvements: feedback.improvements, practicedTopics: feedback.practicedTopics } : null,
        scores: feedback?.scores ?? null,
        providerUsage: {
          model,
          estimatedCostThb,
          costThb,
          measuredRealtimeCostUsd,
          measuredTranscriptionCostUsd,
          rateCard: measuredRealtimeCostUsd === null ? null : RATE_CARD_VERSION,
          usage: usage.responses ? usage : null,
          usageComplete,
          inputTranscriptionModel: config.transcriptionModel,
          inputTranscriptionSeconds: transcriptionSeconds === null ? null : Math.round(transcriptionSeconds * 10) / 10,
          strictGuard: true,
          safetyEvents: state?.safetyEvents ?? {},
        },
      })
      .where(eq(primaryVoiceSessions.id, ctx.sessionId))
      .returning();
    await tx.delete(primaryActiveVoiceSessions).where(eq(primaryActiveVoiceSessions.voiceSessionId, ctx.sessionId));
    await tx
      .insert(primaryVoiceMonthlyUsage)
      .values({ schoolId: existing.schoolId, studentUserId: existing.studentUserId, month: existing.month, secondsUsed: consumedSeconds, sessionCount: 1, costThb, updatedAt: endedAt })
      .onConflictDoUpdate({
        target: [primaryVoiceMonthlyUsage.studentUserId, primaryVoiceMonthlyUsage.month],
        set: {
          secondsUsed: sql`${primaryVoiceMonthlyUsage.secondsUsed} + ${consumedSeconds}`,
          sessionCount: sql`${primaryVoiceMonthlyUsage.sessionCount} + 1`,
          costThb: sql`${primaryVoiceMonthlyUsage.costThb} + ${costThb}`,
          updatedAt: endedAt,
        },
      });
    return session;
  });
  runtime.release(ctx.sessionId);
  return toVoiceSessionRecord(updated ?? { ...existing, status: "ENDED", consumedSeconds, endedAt, endReason, summary: feedback, scores: feedback?.scores ?? null });
}

/**
 * After a service restart: ends the sessions whose reservation ran out, re-attaches the others.
 * @param ctx The database, the provider, the config, and the runtime.
 */
export async function recoverVoiceSessions(ctx: { db: DB; provider: VoiceProvider; config?: VoiceConfig; runtime?: VoiceRuntime }): Promise<void> {
  const runtime = ctx.runtime ?? defaultVoiceRuntime;
  const config = ctx.config ?? DEFAULT_VOICE_CONFIG;
  const active = await ctx.db.select().from(primaryVoiceSessions).where(eq(primaryVoiceSessions.status, "ACTIVE"));
  for (const session of active) {
    if (!session.providerCallId || session.expiresAt.getTime() <= Date.now()) {
      await finalizeVoiceSession({ db: ctx.db, sessionId: session.id, reason: "SERVICE_RECOVERY", provider: ctx.provider, config, runtime }).catch(() => undefined);
    } else {
      runtime.attach(session.id, ctx.provider, session.providerCallId, "English lesson", true);
      runtime.scheduleExpiry(session.id, session.expiresAt, () => finalizeVoiceSession({ db: ctx.db, sessionId: session.id, reason: "QUOTA_REACHED", provider: ctx.provider, config, runtime }).then(() => undefined));
    }
  }
}

/**
 * The finished sessions of the signed-in student, newest first.
 * @param ctx The database and the student.
 * @returns Up to 50 records.
 * @throws {AuthError} FORBIDDEN for a non-student.
 */
export async function listStudentVoiceSessions(ctx: VoiceCtx): Promise<VoiceSessionRecord[]> {
  const schoolId = studentSchool(ctx.user);
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const rows = await raw
    .select()
    .from(primaryVoiceSessions)
    .where(and(eq(primaryVoiceSessions.studentUserId, ctx.user.id), eq(primaryVoiceSessions.status, "ENDED")))
    .orderBy(desc(primaryVoiceSessions.createdAt))
    .limit(50);
  return rows.map(toVoiceSessionRecord);
}
