#!/usr/bin/env tsx

/**
 * Replays historical quiz attempts to populate the StandardMastery table.
 *
 * Usage:
 *   tsx scripts/backfill-mastery.ts [--from=2025-10-01] [--to=2025-10-29] [--student=student_123] [--batch=200] [--dry-run]
 */

import {
  and,
  asc,
  db,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
} from '@reading-advantage/db';
import type { SQL } from 'drizzle-orm';
import {
  scienceAttempts,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
} from '@reading-advantage/db/schema';

import { calculateMasteryUpdates, buildResponseInput } from '@/lib/ai/mastery-calculator';
import { MasteryRunStatus } from '@/lib/enums';

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
  const [attempt] = await db
    .select({
      id: scienceAttempts.id,
      completedAt: scienceAttempts.completedAt,
    })
    .from(scienceAttempts)
    .where(eq(scienceAttempts.id, attemptId))
    .limit(1);

  if (!attempt || !attempt.completedAt) {
    return { attemptId, studentId, updated: 0, skipped: 0, status: 'skipped' };
  }

  const responseRows = await db
    .select({
      questionId: scienceQuestionResponses.questionId,
      isCorrect: scienceQuestionResponses.isCorrect,
      answeredAt: scienceQuestionResponses.answeredAt,
      points: scienceQuizQuestions.points,
    })
    .from(scienceQuestionResponses)
    .innerJoin(
      scienceQuizQuestions,
      eq(scienceQuizQuestions.id, scienceQuestionResponses.questionId)
    )
    .where(eq(scienceQuestionResponses.attemptId, attemptId));

  const questionIds = Array.from(new Set(responseRows.map((r) => r.questionId)));
  const standardLinks = questionIds.length
    ? await db
        .select({
          questionId: scienceQuestionStandards.questionId,
          standardId: scienceQuestionStandards.standardId,
        })
        .from(scienceQuestionStandards)
        .where(inArray(scienceQuestionStandards.questionId, questionIds))
    : [];

  const standardsByQuestion = new Map<string, string[]>();
  for (const link of standardLinks) {
    const list = standardsByQuestion.get(link.questionId) ?? [];
    list.push(link.standardId);
    standardsByQuestion.set(link.questionId, list);
  }

  const responses = responseRows.map((response) =>
    buildResponseInput({
      standardIds: standardsByQuestion.get(response.questionId) ?? [],
      isCorrect: response.isCorrect,
      weight: response.points,
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
    const existingMastery = await db
      .select({
        standardId: scienceStandardMastery.standardId,
        masteryLevel: scienceStandardMastery.masteryLevel,
        evidenceCount: scienceStandardMastery.evidenceCount,
        lastAssessedAt: scienceStandardMastery.lastAssessedAt,
      })
      .from(scienceStandardMastery)
      .where(
        and(
          eq(scienceStandardMastery.studentId, studentId),
          inArray(scienceStandardMastery.standardId, Array.from(standardIds))
        )
      );

    const normalized = existingMastery.map((record) => ({
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

  const result = await db.transaction(
    async (tx) => {
      const [run] = await tx
        .select()
        .from(scienceMasteryRuns)
        .where(eq(scienceMasteryRuns.attemptId, attemptId))
        .limit(1);

      if (
        run &&
        run.studentId === studentId &&
        run.status === MasteryRunStatus.COMPLETED
      ) {
        return { updated: 0, skipped: 0 };
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
        await tx.insert(scienceMasteryRuns).values({
          attemptId,
          studentId,
          status: MasteryRunStatus.PROCESSING,
        });
      }

      const existingMastery = await tx
        .select({
          standardId: scienceStandardMastery.standardId,
          masteryLevel: scienceStandardMastery.masteryLevel,
          evidenceCount: scienceStandardMastery.evidenceCount,
          lastAssessedAt: scienceStandardMastery.lastAssessedAt,
        })
        .from(scienceStandardMastery)
        .where(
          and(
            eq(scienceStandardMastery.studentId, studentId),
            inArray(scienceStandardMastery.standardId, Array.from(standardIds))
          )
        );

      const normalized = existingMastery.map((record) => ({
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
        await tx
          .insert(scienceStandardMastery)
          .values({
            studentId,
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
          });
      }

      await tx
        .update(scienceMasteryRuns)
        .set({
          status: MasteryRunStatus.COMPLETED,
          updatedCount: updates.length,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(scienceMasteryRuns.attemptId, attemptId));

      return { updated: updates.length, skipped };
    },
    {
      isolationLevel: 'serializable',
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

  const conditions: SQL[] = [isNotNull(scienceAttempts.completedAt)];
  if (options.student) {
    conditions.push(eq(scienceAttempts.studentId, options.student));
  }
  if (options.from) {
    conditions.push(gte(scienceAttempts.completedAt, options.from));
  }
  if (options.to) {
    conditions.push(lte(scienceAttempts.completedAt, options.to));
  }

  let cursor: { completedAt: Date; id: string } | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalAttempts = 0;

  while (true) {
    const cursorConditions = cursor
      ? [
          or(
            gt(scienceAttempts.completedAt, cursor.completedAt),
            and(
              eq(scienceAttempts.completedAt, cursor.completedAt),
              gt(scienceAttempts.id, cursor.id)
            )
          ),
        ]
      : [];

    const whereExpr = and(...conditions, ...cursorConditions);

    const attempts = await db
      .select({
        id: scienceAttempts.id,
        studentId: scienceAttempts.studentId,
        completedAt: scienceAttempts.completedAt,
      })
      .from(scienceAttempts)
      .where(whereExpr)
      .orderBy(asc(scienceAttempts.completedAt), asc(scienceAttempts.id))
      .limit(options.batch);

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

    const last = attempts[attempts.length - 1];
    if (!last.completedAt) {
      break;
    }
    cursor = { completedAt: last.completedAt, id: last.id };
  }

  console.log('\n✅ Backfill complete');
  console.log(`• Attempts scanned: ${totalAttempts}`);
  console.log(`• Attempts processed: ${totalProcessed}`);
  console.log(`• Mastery rows updated: ${totalUpdated}`);
  console.log(`• Responses without standards: ${totalSkipped}`);
}

main().catch((error) => {
  console.error('❌ Backfill failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
