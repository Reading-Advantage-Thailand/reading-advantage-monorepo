import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { and, db, eq, inArray, asc } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import {
  calculateMasteryUpdates,
  buildResponseInput,
} from '@/lib/ai/mastery-calculator';
import { MasteryRunStatus } from '@/lib/enums';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';

const requestSchema = z.object({
  attemptId: z.string().min(1),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_ATTEMPTS = 3;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number) {
    super('rate-limit');
    this.retryAfter = Math.max(1, Math.ceil(retryAfter / 1000));
  }
}

type PlainStandardMastery = {
  id: string;
  studentId: string;
  standardId: string;
  masteryLevel: number;
  evidenceCount: number;
  lastAssessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type TransactionResult =
  | { state: 'processing' }
  | { state: 'already_complete'; records: PlainStandardMastery[] }
  | {
      state: 'processed';
      records: PlainStandardMastery[];
      updatedCount: number;
      skipped: number;
    };

/** Postgres error codes (postgres-js attaches the original as `.cause`). */
const PG_UNIQUE_VIOLATION = '23505';
const PG_SERIALIZATION_FAILURE = '40001';

function getPgErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object') {
    const cause = (err as { cause?: { code?: string }; code?: string }).cause;
    if (cause && typeof cause.code === 'string') return cause.code;
    const direct = (err as { code?: string }).code;
    if (typeof direct === 'string') return direct;
  }
  return undefined;
}

function assertRateLimit(studentId: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(studentId);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(studentId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (entry.count >= RATE_LIMIT_ATTEMPTS) {
    throw new RateLimitError(entry.resetAt - now);
  }

  entry.count += 1;
  rateLimitStore.set(studentId, entry);
}

function serializeRecords(records: PlainStandardMastery[]) {
  return records.map((record) => ({
    id: record.id,
    studentId: record.studentId,
    standardId: record.standardId,
    masteryLevel: record.masteryLevel,
    evidenceCount: record.evidenceCount,
    lastAssessedAt: record.lastAssessedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));
}

/**
 * Loads the attempt + nested question/standard data needed by the mastery
 * calculator. Replaces the deep prisma.attempt.findUnique(include) call with
 * a small batch of Drizzle SELECTs.
 */
async function loadAttemptContext(
  client: typeof db,
  attemptId: string
): Promise<
  | {
      attempt: typeof scienceAttempts.$inferSelect;
      questionResponses: Array<{
        questionId: string;
        isCorrect: boolean;
        answeredAt: Date | null;
        question: {
          points: number;
          standardIds: string[];
        };
      }>;
      masteryRun: typeof scienceMasteryRuns.$inferSelect | null;
    }
  | null
> {
  const [attempt] = await client
    .select()
    .from(scienceAttempts)
    .where(eq(scienceAttempts.id, attemptId))
    .limit(1);

  if (!attempt) return null;

  const responseRows = await client
    .select({
      questionId: scienceQuestionResponses.questionId,
      isCorrect: scienceQuestionResponses.isCorrect,
      answeredAt: scienceQuestionResponses.answeredAt,
    })
    .from(scienceQuestionResponses)
    .where(eq(scienceQuestionResponses.attemptId, attemptId));

  const questionIds = responseRows.map((r) => r.questionId);

  const questions = questionIds.length
    ? await client
        .select({
          id: scienceQuizQuestions.id,
          points: scienceQuizQuestions.points,
        })
        .from(scienceQuizQuestions)
        .where(inArray(scienceQuizQuestions.id, questionIds))
    : [];
  const pointsByQuestion = new Map(questions.map((q) => [q.id, q.points]));

  const standardLinks = questionIds.length
    ? await client
        .select({
          questionId: scienceQuestionStandards.questionId,
          standardId: scienceQuestionStandards.standardId,
        })
        .from(scienceQuestionStandards)
        .where(inArray(scienceQuestionStandards.questionId, questionIds))
    : [];
  const standardsByQuestion = new Map<string, string[]>();
  for (const link of standardLinks) {
    const arr = standardsByQuestion.get(link.questionId) ?? [];
    arr.push(link.standardId);
    standardsByQuestion.set(link.questionId, arr);
  }

  const [masteryRun] = await client
    .select()
    .from(scienceMasteryRuns)
    .where(eq(scienceMasteryRuns.attemptId, attemptId))
    .limit(1);

  return {
    attempt,
    questionResponses: responseRows.map((r) => ({
      questionId: r.questionId,
      isCorrect: r.isCorrect,
      answeredAt: r.answeredAt,
      question: {
        points: pointsByQuestion.get(r.questionId) ?? 1,
        standardIds: standardsByQuestion.get(r.questionId) ?? [],
      },
    })),
    masteryRun: masteryRun ?? null,
  };
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let attemptContext:
    | { id: string; studentId: string }
    | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { attemptId } = requestSchema.parse(body);

    const loaded = await loadAttemptContext(db, attemptId);

    if (!loaded) {
      return NextResponse.json(
        { success: false, error: 'Attempt not found' },
        { status: 404 }
      );
    }

    const { attempt, questionResponses } = loaded;

    attemptContext = { id: attempt.id, studentId: attempt.studentId };

    if (
      session.user.role === 'STUDENT' &&
      session.user.id !== attempt.studentId
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!attempt.completedAt) {
      return NextResponse.json(
        { success: false, error: 'Attempt still grading' },
        { status: 409 }
      );
    }

    if (!env.NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE) {
      logger.warn('mastery.update.disabled', {
        attemptId,
        studentId: attempt.studentId,
      });
      return NextResponse.json(
        { success: false, reason: 'DISABLED' },
        { status: 202, headers: { 'retry-after': '60' } }
      );
    }

    assertRateLimit(attempt.studentId);

    const responses = questionResponses.map((response) =>
      buildResponseInput({
        standardIds: response.question.standardIds,
        isCorrect: response.isCorrect,
        weight: response.question.points,
        answeredAt:
          response.answeredAt ?? attempt.completedAt ?? new Date(),
      })
    );

    const standardIds = new Set<string>();
    for (const response of responses) {
      for (const standardId of response.standardIds) {
        standardIds.add(standardId);
      }
    }

    if (!standardIds.size) {
      const durationMs = Date.now() - startedAt;
      logger.info('mastery.update', {
        attemptId,
        studentId: attempt.studentId,
        updatedCount: 0,
        durationMs,
        fallbackUsed: false,
      });
      return NextResponse.json(
        {
          success: true,
          updated: 0,
          records: [],
          durationMs,
        },
        { status: 200 }
      );
    }

    const transactionResult: TransactionResult = await db.transaction(
      async (tx) => {
        const [run] = await tx
          .select()
          .from(scienceMasteryRuns)
          .where(eq(scienceMasteryRuns.attemptId, attemptId))
          .limit(1);

        if (
          run &&
          run.status === MasteryRunStatus.PROCESSING &&
          run.studentId === attempt.studentId
        ) {
          return { state: 'processing' };
        }

        if (
          run &&
          run.status === MasteryRunStatus.COMPLETED &&
          run.studentId === attempt.studentId
        ) {
          const existingRecords = await tx
            .select()
            .from(scienceStandardMastery)
            .where(
              and(
                eq(scienceStandardMastery.studentId, attempt.studentId),
                inArray(
                  scienceStandardMastery.standardId,
                  Array.from(standardIds)
                )
              )
            )
            .orderBy(asc(scienceStandardMastery.standardId));

          const plain = existingRecords.map((record) => ({
            id: record.id,
            studentId: record.studentId,
            standardId: record.standardId,
            masteryLevel: Number(record.masteryLevel),
            evidenceCount: record.evidenceCount,
            lastAssessedAt: record.lastAssessedAt,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          }));

          return { state: 'already_complete', records: plain };
        }

        if (run) {
          await tx
            .update(scienceMasteryRuns)
            .set({
              status: MasteryRunStatus.PROCESSING,
              lastError: null,
              updatedAt: new Date(),
            })
            .where(eq(scienceMasteryRuns.attemptId, attemptId));
        } else {
          try {
            await tx.insert(scienceMasteryRuns).values({
              attemptId,
              studentId: attempt.studentId,
              status: MasteryRunStatus.PROCESSING,
              updatedCount: 0,
            });
          } catch (creationError) {
            if (getPgErrorCode(creationError) === PG_UNIQUE_VIOLATION) {
              return { state: 'processing' };
            }
            throw creationError;
          }
        }

        const existingMastery = await tx
          .select()
          .from(scienceStandardMastery)
          .where(
            and(
              eq(scienceStandardMastery.studentId, attempt.studentId),
              inArray(
                scienceStandardMastery.standardId,
                Array.from(standardIds)
              )
            )
          );

        const normalizedExisting = existingMastery.map((record) => ({
          standardId: record.standardId,
          masteryLevel: Number(record.masteryLevel),
          evidenceCount: record.evidenceCount,
          lastAssessedAt: record.lastAssessedAt,
        }));

        const { updates, skipped } = calculateMasteryUpdates({
          responses,
          existingMastery: normalizedExisting,
        });

        const updatedRecords: PlainStandardMastery[] = [];

        for (const update of updates) {
          const [record] = await tx
            .insert(scienceStandardMastery)
            .values({
              studentId: attempt.studentId,
              standardId: update.standardId,
              masteryLevel: String(update.masteryLevel),
              evidenceCount: update.evidenceCount,
              lastAssessedAt: update.lastAssessedAt,
            })
            .onConflictDoUpdate({
              target: [
                scienceStandardMastery.studentId,
                scienceStandardMastery.standardId,
              ],
              set: {
                masteryLevel: String(update.masteryLevel),
                evidenceCount: update.evidenceCount,
                lastAssessedAt: update.lastAssessedAt,
                updatedAt: new Date(),
              },
            })
            .returning();

          updatedRecords.push({
            id: record.id,
            studentId: record.studentId,
            standardId: record.standardId,
            masteryLevel: Number(record.masteryLevel),
            evidenceCount: record.evidenceCount,
            lastAssessedAt: record.lastAssessedAt,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          });
        }

        updatedRecords.sort((a, b) => a.standardId.localeCompare(b.standardId));

        await tx
          .update(scienceMasteryRuns)
          .set({
            status: MasteryRunStatus.COMPLETED,
            updatedCount: updates.length,
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(scienceMasteryRuns.attemptId, attemptId));

        return {
          state: 'processed',
          records: updatedRecords,
          updatedCount: updates.length,
          skipped,
        };
      },
      { isolationLevel: 'serializable' }
    );

    const durationMs = Date.now() - startedAt;

    if (transactionResult.state === 'processing') {
      logger.info('mastery.update.pending', {
        attemptId,
        studentId: attempt.studentId,
      });
      return NextResponse.json(
        { success: false, reason: 'QUEUED' },
        { status: 202, headers: { 'retry-after': '30' } }
      );
    }

    if (transactionResult.state === 'already_complete') {
      logger.info('mastery.update', {
        attemptId,
        studentId: attempt.studentId,
        updatedCount: 0,
        durationMs,
        fallbackUsed: false,
      });
      return NextResponse.json(
        {
          success: true,
          updated: 0,
          records: serializeRecords(transactionResult.records),
          durationMs,
        },
        { status: 200 }
      );
    }

    metrics.increment('mastery_updates_total', transactionResult.updatedCount, {
      studentId: attempt.studentId,
      attemptId,
    });

    if (transactionResult.skipped > 0) {
      metrics.increment(
        'mastery_updates_skipped_total',
        transactionResult.skipped,
        {
          studentId: attempt.studentId,
          attemptId,
        }
      );
    }

    metrics.observe('mastery_updates_latency_ms', durationMs, {
      studentId: attempt.studentId,
      attemptId,
    });

    logger.info('mastery.update', {
      attemptId,
      studentId: attempt.studentId,
      updatedCount: transactionResult.updatedCount,
      durationMs,
      fallbackUsed: false,
    });

    return NextResponse.json(
      {
        success: true,
        updated: transactionResult.updatedCount,
        records: serializeRecords(transactionResult.records),
        durationMs,
      },
      { status: 200 }
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        {
          status: 429,
          headers: { 'retry-after': error.retryAfter.toString() },
        }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    if (getPgErrorCode(error) === PG_SERIALIZATION_FAILURE) {
      logger.warn('mastery.update.retry', {
        attemptId: attemptContext?.id,
        studentId: attemptContext?.studentId,
        durationMs,
      });
      return NextResponse.json(
        { success: false, reason: 'QUEUED' },
        { status: 202, headers: { 'retry-after': '15' } }
      );
    }

    logger.error('mastery.update.error', {
      attemptId: attemptContext?.id,
      studentId: attemptContext?.studentId,
      durationMs,
      message:
        error instanceof Error
          ? error.message
          : 'Unknown mastery pipeline error',
    });

    metrics.increment('mastery_updates_failed_total', 1, {
      studentId: attemptContext?.studentId ?? 'unknown',
      attemptId: attemptContext?.id ?? 'unknown',
    });

    if (attemptContext) {
      const failureMessage =
        error instanceof Error ? error.message : 'Unhandled mastery error';
      await db
        .insert(scienceMasteryRuns)
        .values({
          attemptId: attemptContext.id,
          studentId: attemptContext.studentId,
          status: MasteryRunStatus.FAILED,
          updatedCount: 0,
          lastError: failureMessage,
        })
        .onConflictDoUpdate({
          target: scienceMasteryRuns.attemptId,
          set: {
            status: MasteryRunStatus.FAILED,
            lastError: failureMessage,
            updatedAt: new Date(),
          },
        });
    }

    return NextResponse.json(
      { success: false, reason: 'QUEUED' },
      { status: 202, headers: { 'retry-after': '30' } }
    );
  }
}
