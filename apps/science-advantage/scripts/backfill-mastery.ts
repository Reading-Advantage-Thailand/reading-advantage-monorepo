#!/usr/bin/env tsx

/**
 * Replays historical quiz attempts to populate the StandardMastery table.
 *
 * Usage:
 *   tsx scripts/backfill-mastery.ts [--from=2025-10-01] [--to=2025-10-29] [--student=student_123] [--batch=200] [--dry-run]
 */

import { MasteryRunStatus, Prisma } from '@prisma/client';

import { calculateMasteryUpdates, buildResponseInput } from '@/lib/ai/mastery-calculator';
import prisma from '@/lib/prisma';

type CliOptions = {
  from?: Date;
  to?: Date;
  student?: string;
  batch: number;
  dryRun: boolean;
};

type AttemptResult = {
  attemptId: string;
  studentId: string;
  updated: number;
  skipped: number;
  status: 'processed' | 'skipped';
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    batch: 200,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--batch=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (Number.isNaN(value) || value <= 0) {
        throw new Error('Invalid value for --batch. Provide a positive integer.');
      }
      options.batch = value;
      continue;
    }

    if (arg.startsWith('--student=')) {
      options.student = arg.split('=')[1];
      continue;
    }

    if (arg.startsWith('--from=')) {
      const value = new Date(arg.split('=')[1]);
      if (Number.isNaN(value.getTime())) {
        throw new Error('Invalid ISO date for --from');
      }
      options.from = value;
      continue;
    }

    if (arg.startsWith('--to=')) {
      const value = new Date(arg.split('=')[1]);
      if (Number.isNaN(value.getTime())) {
        throw new Error('Invalid ISO date for --to');
      }
      options.to = value;
      continue;
    }

    console.warn(`Unknown argument ignored: ${arg}`);
  }

  return options;
}

async function processAttempt(
  attemptId: string,
  studentId: string,
  options: CliOptions
): Promise<AttemptResult> {
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
    },
  });

  if (!attempt || !attempt.completedAt) {
    return { attemptId, studentId, updated: 0, skipped: 0, status: 'skipped' };
  }

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
    return { attemptId, studentId, updated: 0, skipped: responses.length, status: 'skipped' };
  }

  if (options.dryRun) {
    const existingMastery = await prisma.standardMastery.findMany({
      where: {
        studentId,
        standardId: { in: Array.from(standardIds) },
      },
    });

    const normalized = existingMastery.map(record => ({
      standardId: record.standardId,
      masteryLevel: Number(record.masteryLevel),
      evidenceCount: record.evidenceCount,
      lastAssessedAt: record.lastAssessedAt,
    }));

    const { updates, skipped } = calculateMasteryUpdates({
      responses,
      existingMastery: normalized,
    });

    return {
      attemptId,
      studentId,
      updated: updates.length,
      skipped,
      status: 'processed',
    };
  }

  const result = await prisma.$transaction(
    async tx => {
      const run = await tx.masteryRun.findUnique({ where: { attemptId } });

      if (
        run &&
        run.studentId === studentId &&
        run.status === MasteryRunStatus.COMPLETED
      ) {
        return { updated: 0, skipped: 0 };
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
        await tx.masteryRun.create({
          data: {
            attemptId,
            studentId,
            status: MasteryRunStatus.PROCESSING,
          },
        });
      }

      const existingMastery = await tx.standardMastery.findMany({
        where: {
          studentId,
          standardId: { in: Array.from(standardIds) },
        },
      });

      const normalized = existingMastery.map(record => ({
        standardId: record.standardId,
        masteryLevel: Number(record.masteryLevel),
        evidenceCount: record.evidenceCount,
        lastAssessedAt: record.lastAssessedAt,
      }));

      const { updates, skipped } = calculateMasteryUpdates({
        responses,
        existingMastery: normalized,
      });

      for (const update of updates) {
        await tx.standardMastery.upsert({
          where: {
            studentId_standardId: {
              studentId,
              standardId: update.standardId,
            },
          },
          update: {
            masteryLevel: update.masteryLevel,
            evidenceCount: update.evidenceCount,
            lastAssessedAt: update.lastAssessedAt,
          },
          create: {
            studentId,
            standardId: update.standardId,
            masteryLevel: update.masteryLevel,
            evidenceCount: update.evidenceCount,
            lastAssessedAt: update.lastAssessedAt,
          },
        });
      }

      await tx.masteryRun.update({
        where: { attemptId },
        data: {
          status: MasteryRunStatus.COMPLETED,
          updatedCount: updates.length,
          lastError: null,
        },
      });

      return { updated: updates.length, skipped };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );

  return {
    attemptId,
    studentId,
    updated: result.updated,
    skipped: result.skipped,
    status: 'processed',
  };
}

async function main() {
  const options = parseArgs();

  console.log('🔄 Mastery Backfill');
  console.log(`• Dry run: ${options.dryRun ? 'yes' : 'no'}`);
  console.log(`• Batch size: ${options.batch}`);
  if (options.from) console.log(`• From: ${options.from.toISOString()}`);
  if (options.to) console.log(`• To: ${options.to.toISOString()}`);
  if (options.student) console.log(`• Student filter: ${options.student}`);
  console.log('');

  const where: Prisma.AttemptWhereInput = {
    completedAt: { not: null },
  };

  if (options.student) {
    where.studentId = options.student;
  }

  if (options.from || options.to) {
    where.completedAt = {
      ...(options.from ? { gte: options.from } : {}),
      ...(options.to ? { lte: options.to } : {}),
    };
  }

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalAttempts = 0;

  while (true) {
    const attempts = await prisma.attempt.findMany({
      where,
      orderBy: { completedAt: 'asc' },
      take: options.batch,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (!attempts.length) {
      break;
    }

    for (const attempt of attempts) {
      totalAttempts += 1;
      const result = await processAttempt(attempt.id, attempt.studentId, options);

      if (result.status === 'processed') {
        totalProcessed += 1;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;

        console.log(
          `${options.dryRun ? '[dry-run] ' : ''}Attempt ${result.attemptId} (${result.studentId}) ➜ updated ${result.updated} rows (skipped ${result.skipped})`
        );
      } else {
        totalSkipped += result.skipped;
        console.log(
          `Attempt ${result.attemptId} (${result.studentId}) skipped (no standards)`
        );
      }
    }

    cursor = attempts[attempts.length - 1].id;
  }

  console.log('\n✅ Backfill complete');
  console.log(`• Attempts scanned: ${totalAttempts}`);
  console.log(`• Attempts processed: ${totalProcessed}`);
  console.log(`• Mastery rows updated: ${totalUpdated}`);
  console.log(`• Responses without standards: ${totalSkipped}`);

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('❌ Backfill failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
