import { MasteryRunStatus, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { getCurrentSession } from '@/lib/auth/session';
import { calculateMasteryUpdates, buildResponseInput } from '@/lib/ai/mastery-calculator';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import prisma from '@/lib/prisma';

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
  return records.map(record => ({
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

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let attemptContext:
    | {
        id: string;
        studentId: string;
      }
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

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        questionResponses: {
          include: {
            question: {
              include: { standards: true },
            },
          },
        },
        masteryRun: true,
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Attempt not found' },
        { status: 404 }
      );
    }

    attemptContext = {
      id: attempt.id,
      studentId: attempt.studentId,
    };

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
        {
          status: 202,
          headers: { 'retry-after': '60' },
        }
      );
    }

    assertRateLimit(attempt.studentId);

    const responses = attempt.questionResponses.map(response =>
      buildResponseInput({
        standardIds: response.question.standards.map(standard => standard.id),
        isCorrect: response.isCorrect,
        weight: response.question.points,
        answeredAt: response.answeredAt ?? attempt.completedAt ?? new Date(),
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

    const transactionResult = await prisma.$transaction(
      async tx => {
        const run = await tx.masteryRun.findUnique({
          where: { attemptId },
        });

        if (
          run &&
          run.status === MasteryRunStatus.PROCESSING &&
          run.studentId === attempt.studentId
        ) {
          return { state: 'processing' } as TransactionResult;
        }

        if (
          run &&
          run.status === MasteryRunStatus.COMPLETED &&
          run.studentId === attempt.studentId
        ) {
          const existingRecords = await tx.standardMastery.findMany({
            where: {
              studentId: attempt.studentId,
              standardId: { in: Array.from(standardIds) },
            },
            orderBy: { standardId: 'asc' },
          });

          const plain = existingRecords.map(record => ({
            id: record.id,
            studentId: record.studentId,
            standardId: record.standardId,
            masteryLevel: Number(record.masteryLevel),
            evidenceCount: record.evidenceCount,
            lastAssessedAt: record.lastAssessedAt,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          }));

          return { state: 'already_complete', records: plain } as TransactionResult;
        }

        if (run) {
          await tx.masteryRun.update({
            where: { attemptId },
            data: {
              status: MasteryRunStatus.PROCESSING,
              lastError: null,
            },
          });
        } else {
          try {
            await tx.masteryRun.create({
              data: {
                attemptId,
                studentId: attempt.studentId,
                status: MasteryRunStatus.PROCESSING,
              },
            });
          } catch (creationError) {
            const isUniqueViolation =
              creationError instanceof Prisma.PrismaClientKnownRequestError
                ? creationError.code === 'P2002'
                : typeof creationError === 'object' &&
                  creationError !== null &&
                  'code' in creationError &&
                  (creationError as { code?: string }).code === 'P2002';

            if (isUniqueViolation) {
              return { state: 'processing' } as TransactionResult;
            }

            throw creationError;
          }
        }

        const existingMastery = await tx.standardMastery.findMany({
          where: {
            studentId: attempt.studentId,
            standardId: { in: Array.from(standardIds) },
          },
        });

        const normalizedExisting = existingMastery.map(record => ({
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
          const record = await tx.standardMastery.upsert({
            where: {
              studentId_standardId: {
                studentId: attempt.studentId,
                standardId: update.standardId,
              },
            },
            update: {
              masteryLevel: update.masteryLevel,
              evidenceCount: update.evidenceCount,
              lastAssessedAt: update.lastAssessedAt,
            },
            create: {
              studentId: attempt.studentId,
              standardId: update.standardId,
              masteryLevel: update.masteryLevel,
              evidenceCount: update.evidenceCount,
              lastAssessedAt: update.lastAssessedAt,
            },
          });

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

        await tx.masteryRun.update({
          where: { attemptId },
          data: {
            status: MasteryRunStatus.COMPLETED,
            updatedCount: updates.length,
            lastError: null,
          },
        });

        return {
          state: 'processed',
          records: updatedRecords,
          updatedCount: updates.length,
          skipped,
        } as TransactionResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    const durationMs = Date.now() - startedAt;

    if (transactionResult.state === 'processing') {
      logger.info('mastery.update.pending', {
        attemptId,
        studentId: attempt.studentId,
      });

      return NextResponse.json(
        { success: false, reason: 'QUEUED' },
        {
          status: 202,
          headers: { 'retry-after': '30' },
        }
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
      metrics.increment('mastery_updates_skipped_total', transactionResult.skipped, {
        studentId: attempt.studentId,
        attemptId,
      });
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
          details: error.errors.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      logger.warn('mastery.update.retry', {
        attemptId: attemptContext?.id,
        studentId: attemptContext?.studentId,
        durationMs,
      });

      return NextResponse.json(
        { success: false, reason: 'QUEUED' },
        {
          status: 202,
          headers: { 'retry-after': '15' },
        }
      );
    }

    logger.error('mastery.update.error', {
      attemptId: attemptContext?.id,
      studentId: attemptContext?.studentId,
      durationMs,
      message:
        error instanceof Error ? error.message : 'Unknown mastery pipeline error',
    });

    metrics.increment('mastery_updates_failed_total', 1, {
      studentId: attemptContext?.studentId ?? 'unknown',
      attemptId: attemptContext?.id ?? 'unknown',
    });

    if (attemptContext) {
      await prisma.masteryRun.upsert({
        where: { attemptId: attemptContext.id },
        update: {
          status: MasteryRunStatus.FAILED,
          lastError:
            error instanceof Error ? error.message : 'Unhandled mastery error',
        },
        create: {
          attemptId: attemptContext.id,
          studentId: attemptContext.studentId,
          status: MasteryRunStatus.FAILED,
          lastError:
            error instanceof Error ? error.message : 'Unhandled mastery error',
        },
      });
    }

    return NextResponse.json(
      { success: false, reason: 'QUEUED' },
      {
        status: 202,
        headers: { 'retry-after': '30' },
      }
    );
  }
}
