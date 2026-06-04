import { z } from "zod";
import { and, eq, inArray, asc } from "drizzle-orm";
import { db, type DB } from "@reading-advantage/db";
import { createTenantDB } from "../db-contract.js";
import {
  scienceAttempts,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_ATTEMPTS = 3;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super("rate-limit");
    this.retryAfter = Math.max(1, Math.ceil(retryAfter / 1000));
  }
}

const PG_UNIQUE_VIOLATION = "23505";
const PG_SERIALIZATION_FAILURE = "40001";

function getPgErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object") {
    const cause = (err as { cause?: { code?: string }; code?: string }).cause;
    if (cause && typeof cause.code === "string") return cause.code;
    const direct = (err as { code?: string }).code;
    if (typeof direct === "string") return direct;
  }
  return undefined;
}

function assertRateLimit(studentId: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(studentId);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(studentId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  if (entry.count >= RATE_LIMIT_ATTEMPTS) {
    throw new RateLimitError(entry.resetAt - now);
  }
  entry.count += 1;
  rateLimitStore.set(studentId, entry);
}

type PlainStandardMastery = {
  id: string; studentId: string; standardId: string; masteryLevel: number;
  evidenceCount: number; lastAssessedAt: Date; createdAt: Date; updatedAt: Date;
};

type TransactionResult =
  | { state: "processing" }
  | { state: "already_complete"; records: PlainStandardMastery[] }
  | { state: "processed"; records: PlainStandardMastery[]; updatedCount: number; skipped: number };

const requestSchema = z.object({ attemptId: z.string().min(1) });

function serializeRecords(records: PlainStandardMastery[]) {
  return records.map((r) => ({
    id: r.id, studentId: r.studentId, standardId: r.standardId,
    masteryLevel: r.masteryLevel, evidenceCount: r.evidenceCount,
    lastAssessedAt: r.lastAssessedAt.toISOString(),
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  }));
}

async function loadAttemptContext(client: DB, attemptId: string) {
  const [attempt] = await client.select().from(scienceAttempts).where(eq(scienceAttempts.id, attemptId)).limit(1);
  if (!attempt) return null;

  const responseRows = await client
    .select({ questionId: scienceQuestionResponses.questionId, isCorrect: scienceQuestionResponses.isCorrect, answeredAt: scienceQuestionResponses.answeredAt })
    .from(scienceQuestionResponses).where(eq(scienceQuestionResponses.attemptId, attemptId));

  const questionIds = responseRows.map((r) => r.questionId);
  const questions = questionIds.length
    ? await client.select({ id: scienceQuizQuestions.id, points: scienceQuizQuestions.points }).from(scienceQuizQuestions).where(inArray(scienceQuizQuestions.id, questionIds))
    : [];
  const pointsByQuestion = new Map(questions.map((q) => [q.id, q.points]));

  const standardLinks = questionIds.length
    ? await client.select({ questionId: scienceQuestionStandards.questionId, standardId: scienceQuestionStandards.standardId }).from(scienceQuestionStandards).where(inArray(scienceQuestionStandards.questionId, questionIds))
    : [];
  const standardsByQuestion = new Map<string, string[]>();
  for (const link of standardLinks) {
    const arr = standardsByQuestion.get(link.questionId) ?? [];
    arr.push(link.standardId);
    standardsByQuestion.set(link.questionId, arr);
  }

  const [masteryRun] = await client.select().from(scienceMasteryRuns).where(eq(scienceMasteryRuns.attemptId, attemptId)).limit(1);

  return {
    attempt,
    questionResponses: responseRows.map((r) => ({
      questionId: r.questionId, isCorrect: r.isCorrect, answeredAt: r.answeredAt,
      question: { points: pointsByQuestion.get(r.questionId) ?? 1, standardIds: standardsByQuestion.get(r.questionId) ?? [] },
    })),
    masteryRun: masteryRun ?? null,
  };
}

/** HTTP response shape returned by recordRun. */
export type MasteryHttpResponse = {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
};

/**
 * Processes a mastery run for a completed quiz attempt. Parses the request,
 * validates authorization, runs the mastery calculation in a serializable
 * transaction, and returns an HTTP-ready response.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param request - The incoming HTTP request
 * @param deps - Injected dependencies for mastery calculation and feature flags
 * @returns HTTP response with status, body, and optional headers
 * @throws {AuthError} When user lacks mastery:write:own permission
 * @throws {RateLimitError} When rate limit is exceeded
 * @throws {z.ZodError} When request body fails validation
 */
export async function recordRun({
  user, tenant, request, deps,
}: {
  user: UserContext;
  tenant: Tenant;
  request: Request;
  deps: {
    calculateMasteryUpdates: (input: {
      responses: Array<{ standardIds: string[]; isCorrect: boolean; weight: number; answeredAt: Date }>;
      existingMastery: Array<{ standardId: string; masteryLevel: number; evidenceCount: number; lastAssessedAt: Date }>;
    }) => { updates: Array<{ standardId: string; masteryLevel: number; evidenceCount: number; lastAssessedAt: Date }>; skipped: number };
    buildResponseInput: (params: { standardIds: string[]; isCorrect: boolean; weight?: number | null; answeredAt?: Date | null }) => { standardIds: string[]; isCorrect: boolean; weight: number; answeredAt: Date };
    enableMasteryPipeline: boolean;
    log: (event: string, data: Record<string, unknown>) => void;
    metric: { increment: (name: string, value?: number, tags?: Record<string, string>) => void; observe: (name: string, value: number, tags?: Record<string, string>) => void };
  };
}): Promise<MasteryHttpResponse> {
  assertCan(user, "mastery:write:own", tenant);

  const tenantDb = createTenantDB(db, tenant);
  const body = await request.json();
  const { attemptId } = requestSchema.parse(body);
  const startedAt = Date.now();

  const loaded = await loadAttemptContext(tenantDb, attemptId);
  if (!loaded) return { status: 404, body: { success: false, error: "Attempt not found" } };

  const { attempt, questionResponses } = loaded;

  if (user.role === "STUDENT" && user.id !== attempt.studentId) {
    return { status: 403, body: { success: false, error: "Forbidden" } };
  }
  if (!attempt.completedAt) {
    return { status: 409, body: { success: false, error: "Attempt still grading" } };
  }
  if (!deps.enableMasteryPipeline) {
    deps.log("mastery.update.disabled", { attemptId });
    return { status: 202, body: { success: false, reason: "DISABLED" }, headers: { "retry-after": "60" } };
  }

  assertRateLimit(attempt.studentId);

  const responses = questionResponses.map((r) =>
    deps.buildResponseInput({
      standardIds: r.question.standardIds, isCorrect: r.isCorrect,
      weight: r.question.points, answeredAt: r.answeredAt ?? attempt.completedAt ?? new Date(),
    })
  );

  const standardIds = new Set<string>();
  for (const r of responses) for (const sid of r.standardIds) standardIds.add(sid);

  if (!standardIds.size) {
    const durationMs = Date.now() - startedAt;
    deps.log("mastery.update", { attemptId, updatedCount: 0, durationMs });
    return { status: 200, body: { success: true, updated: 0, records: [], durationMs } };
  }

  const txResult: TransactionResult = await tenantDb.transaction(async (tx) => {
    const [run] = await tx.select().from(scienceMasteryRuns).where(eq(scienceMasteryRuns.attemptId, attemptId)).limit(1);

    if (run && run.status === "PROCESSING" && run.studentId === attempt.studentId) return { state: "processing" as const };

    if (run && run.status === "COMPLETED" && run.studentId === attempt.studentId) {
      const existingRecords = await tx.select().from(scienceStandardMastery)
        .where(and(eq(scienceStandardMastery.studentId, attempt.studentId), inArray(scienceStandardMastery.standardId, Array.from(standardIds))))
        .orderBy(asc(scienceStandardMastery.standardId));
      return {
        state: "already_complete" as const,
        records: existingRecords.map((r) => ({ id: r.id, studentId: r.studentId, standardId: r.standardId, masteryLevel: Number(r.masteryLevel), evidenceCount: r.evidenceCount, lastAssessedAt: r.lastAssessedAt, createdAt: r.createdAt, updatedAt: r.updatedAt })),
      };
    }

    if (run) {
      await tx.update(scienceMasteryRuns).set({ status: "PROCESSING", lastError: null, updatedAt: new Date() }).where(eq(scienceMasteryRuns.attemptId, attemptId));
    } else {
      try {
        await tx.insert(scienceMasteryRuns).values({ attemptId, studentId: attempt.studentId, schoolId: tenant.schoolId!, status: "PROCESSING", updatedCount: 0 });
      } catch (e) {
        if (getPgErrorCode(e) === PG_UNIQUE_VIOLATION) return { state: "processing" as const };
        throw e;
      }
    }

    const existingMastery = await tx.select().from(scienceStandardMastery)
      .where(and(eq(scienceStandardMastery.studentId, attempt.studentId), inArray(scienceStandardMastery.standardId, Array.from(standardIds))));

    const { updates, skipped } = deps.calculateMasteryUpdates({
      responses,
      existingMastery: existingMastery.map((r) => ({ standardId: r.standardId, masteryLevel: Number(r.masteryLevel), evidenceCount: r.evidenceCount, lastAssessedAt: r.lastAssessedAt })),
    });

    const updatedRecords: PlainStandardMastery[] = [];
    for (const update of updates) {
      const [record] = await tx.insert(scienceStandardMastery)
        .values({ studentId: attempt.studentId, standardId: update.standardId, schoolId: tenant.schoolId!, masteryLevel: String(update.masteryLevel), evidenceCount: update.evidenceCount, lastAssessedAt: update.lastAssessedAt })
        .onConflictDoUpdate({ target: [scienceStandardMastery.studentId, scienceStandardMastery.standardId], set: { masteryLevel: String(update.masteryLevel), evidenceCount: update.evidenceCount, lastAssessedAt: update.lastAssessedAt, updatedAt: new Date() } })
        .returning();
      updatedRecords.push({ id: record.id, studentId: record.studentId, standardId: record.standardId, masteryLevel: Number(record.masteryLevel), evidenceCount: record.evidenceCount, lastAssessedAt: record.lastAssessedAt, createdAt: record.createdAt, updatedAt: record.updatedAt });
    }
    updatedRecords.sort((a, b) => a.standardId.localeCompare(b.standardId));

    await tx.update(scienceMasteryRuns).set({ status: "COMPLETED", updatedCount: updates.length, lastError: null, updatedAt: new Date() }).where(eq(scienceMasteryRuns.attemptId, attemptId));

    return { state: "processed" as const, records: updatedRecords, updatedCount: updates.length, skipped };
  }, { isolationLevel: "serializable" });

  const durationMs = Date.now() - startedAt;

  if (txResult.state === "processing") return { status: 202, body: { success: false, reason: "QUEUED" }, headers: { "retry-after": "30" } };
  if (txResult.state === "already_complete") {
    deps.log("mastery.update", { attemptId, updatedCount: 0, durationMs });
    return { status: 200, body: { success: true, updated: 0, records: serializeRecords(txResult.records), durationMs } };
  }

  deps.metric.increment("mastery_updates_total", txResult.updatedCount, { attemptId });
  if (txResult.skipped > 0) deps.metric.increment("mastery_updates_skipped_total", txResult.skipped, { attemptId });
  deps.metric.observe("mastery_updates_latency_ms", durationMs, { attemptId });
  deps.log("mastery.update", { attemptId, updatedCount: txResult.updatedCount, durationMs });

  return { status: 200, body: { success: true, updated: txResult.updatedCount, records: serializeRecords(txResult.records), durationMs } };
}

/**
 * Records a mastery run failure for an attempt.
 * @param attemptId - The attempt that failed
 * @param studentId - The student who owns the attempt
 * @param errorMessage - The error message to record
 */
export async function recordRunFailure({
  attemptId, studentId, schoolId, errorMessage,
}: { attemptId: string; studentId: string; schoolId: string; errorMessage: string }) {
  await db.insert(scienceMasteryRuns)
    .values({ attemptId, studentId, schoolId, status: "FAILED", updatedCount: 0, lastError: errorMessage })
    .onConflictDoUpdate({ target: scienceMasteryRuns.attemptId, set: { status: "FAILED", lastError: errorMessage, updatedAt: new Date() } });
}

/** Resets the in-memory rate limit store. For testing only. */
export function resetRateLimitStore() { rateLimitStore.clear(); }
