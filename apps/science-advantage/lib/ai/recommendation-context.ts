import { and, asc, db, eq, inArray, max } from '@reading-advantage/db';
import {
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessonStandards,
  scienceLessons,
  scienceStandardMastery,
  scienceStandards,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';
import { createHash, randomUUID } from 'crypto';

import { aiConfig } from '@/lib/config/ai';
import type { LessonType, StandardsAlignment } from '@/lib/enums';

import type { CandidateLesson, RecommendationContext } from './types';

// Inline lesson-completion status union (matches DB text values).
type LessonCompletionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

type AttemptWithRelations = {
  id: string;
  studentId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  completedAt: Date | null;
  lesson: {
    id: string;
    title: string;
    lessonType: LessonType;
    gradeLevel: number;
    order: number;
    standards: Array<{
      id: string;
      code: string;
      description: string | null;
      framework: StandardsAlignment;
    }>;
    curriculumUnits: Array<{
      id: string;
      title: string;
      order: number;
      framework: StandardsAlignment;
    }>;
  };
  student: {
    id: string;
    gradeLevel: number | null;
  };
  questionResponses: Array<{
    id: string;
    isCorrect: boolean;
    question: {
      id: string;
      standards: { id: string; code: string }[];
    };
  }>;
};

type CurriculumLesson = {
  id: string;
  title: string;
  lessonType: LessonType;
  order: number;
  gradeLevel: number;
  standards: { id: string; code: string }[];
  lessonCompletions: Array<{
    status: LessonCompletionStatus;
    completedAt: Date | null;
  }>;
};

const MAX_WEAK_STANDARDS = 5;
const MAX_CANDIDATE_LESSONS = 20;

function hashStudentId(studentId: string) {
  return createHash('sha256')
    .update(`${studentId}:${aiConfig.hashSecret}`)
    .digest('hex')
    .slice(0, 16);
}

function formatLesson(lesson: CurriculumLesson, peerLessons: CurriculumLesson[]): CandidateLesson {
  const prerequisites = peerLessons
    .filter(candidate => candidate.order < lesson.order)
    .map(candidate => candidate.id);

  return {
    id: lesson.id,
    slug: lesson.id,
    title: lesson.title,
    lessonType: lesson.lessonType,
    order: lesson.order,
    gradeLevel: lesson.gradeLevel,
    standards: lesson.standards,
    prerequisites,
    completed: lesson.lessonCompletions.some(
      entry => entry.status === 'COMPLETED'
    ),
  };
}

function summarizeAttempt(attempt: AttemptWithRelations) {
  const questionCount = attempt.questionResponses.length;
  const correctCount = attempt.questionResponses.filter(
    response => response.isCorrect
  ).length;

  const incorrectStandards = new Set<string>();
  for (const response of attempt.questionResponses) {
    if (response.isCorrect) continue;
    for (const standard of response.question.standards) {
      incorrectStandards.add(standard.code);
    }
  }

  const scorePercentage =
    attempt.maxScore > 0
      ? Number(((attempt.score / attempt.maxScore) * 100).toFixed(2))
      : null;

  return {
    attemptId: attempt.id,
    lessonId: attempt.lessonId,
    lessonSlug: attempt.lesson.id,
    lessonTitle: attempt.lesson.title,
    completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
    scorePercentage,
    questionCount,
    correctCount,
    incorrectStandards: Array.from(incorrectStandards),
  };
}

/**
 * @kind read
 * Assembles the mastery snapshot, candidate-lesson list, and attempt summary
 * used as input to the LLM-driven recommendation prompt.
 *
 * Note: `prisma` is no longer a parameter (Track 3 migration). The function
 * uses the shared `db` import directly.
 */
export async function buildRecommendationContext(
  params: { attempt: AttemptWithRelations }
): Promise<RecommendationContext> {
  const { attempt } = params;
  const traceId = `rec_${randomUUID()}`;
  const studentHash = hashStudentId(attempt.studentId);

  const unitIds = attempt.lesson.curriculumUnits.map(unit => unit.id);

  // ── 1. Mastery snapshot (top-N weakest standards) ────────────────────────
  const masteryRecordsPromise = db
    .select({
      standardId: scienceStandardMastery.standardId,
      masteryLevel: scienceStandardMastery.masteryLevel,
      evidenceCount: scienceStandardMastery.evidenceCount,
      lastAssessedAt: scienceStandardMastery.lastAssessedAt,
      standardCode: scienceStandards.code,
      standardDescription: scienceStandards.description,
    })
    .from(scienceStandardMastery)
    .innerJoin(
      scienceStandards,
      eq(scienceStandards.id, scienceStandardMastery.standardId)
    )
    .where(eq(scienceStandardMastery.studentId, attempt.studentId))
    .orderBy(asc(scienceStandardMastery.masteryLevel))
    .limit(MAX_WEAK_STANDARDS);

  // ── 2. Mastery version (max updatedAt across student's mastery rows) ─────
  const masteryAggregatePromise = db
    .select({ value: max(scienceStandardMastery.updatedAt) })
    .from(scienceStandardMastery)
    .where(eq(scienceStandardMastery.studentId, attempt.studentId));

  // ── 3. Curriculum units + nested lessons + standards + this-student's
  //      completion rows (assembled in-memory from 4 small queries).
  const curriculumUnitsPromise: Promise<Array<{
    id: string;
    title: string;
    order: number;
    framework: StandardsAlignment;
    lessons: CurriculumLesson[];
  }>> = (async () => {
    if (unitIds.length === 0) return [];

    const units = await db
      .select({
        id: scienceCurriculumUnits.id,
        title: scienceCurriculumUnits.title,
        order: scienceCurriculumUnits.order,
        framework: scienceCurriculumUnits.framework,
      })
      .from(scienceCurriculumUnits)
      .where(inArray(scienceCurriculumUnits.id, unitIds));

    // For each unit, fetch its ordered lessons + per-lesson standards +
    // per-lesson completions for this student.
    const enriched = await Promise.all(
      units.map(async (unit) => {
        const lessonRows = await db
          .select({
            id: scienceLessons.id,
            title: scienceLessons.title,
            order: scienceLessons.order,
            lessonType: scienceLessons.lessonType,
            gradeLevel: scienceLessons.gradeLevel,
          })
          .from(scienceUnitLessons)
          .innerJoin(
            scienceLessons,
            eq(scienceLessons.id, scienceUnitLessons.lessonId)
          )
          .where(eq(scienceUnitLessons.unitId, unit.id))
          .orderBy(asc(scienceLessons.order));

        const lessonIds = lessonRows.map((l) => l.id);

        const standardsRows = lessonIds.length
          ? await db
              .select({
                lessonId: scienceLessonStandards.lessonId,
                standardId: scienceStandards.id,
                code: scienceStandards.code,
              })
              .from(scienceLessonStandards)
              .innerJoin(
                scienceStandards,
                eq(scienceStandards.id, scienceLessonStandards.standardId)
              )
              .where(inArray(scienceLessonStandards.lessonId, lessonIds))
          : [];

        const completionRows = lessonIds.length
          ? await db
              .select({
                lessonId: scienceLessonCompletions.lessonId,
                status: scienceLessonCompletions.status,
                completedAt: scienceLessonCompletions.completedAt,
              })
              .from(scienceLessonCompletions)
              .where(
                and(
                  eq(scienceLessonCompletions.studentId, attempt.studentId),
                  inArray(scienceLessonCompletions.lessonId, lessonIds)
                )
              )
          : [];

        const lessons: CurriculumLesson[] = lessonRows.map((l) => ({
          id: l.id,
          title: l.title,
          order: l.order,
          lessonType: l.lessonType as LessonType,
          gradeLevel: l.gradeLevel,
          standards: standardsRows
            .filter((s) => s.lessonId === l.id)
            .map((s) => ({ id: s.standardId, code: s.code })),
          lessonCompletions: completionRows
            .filter((c) => c.lessonId === l.id)
            .map((c) => ({
              status: c.status as LessonCompletionStatus,
              completedAt: c.completedAt,
            })),
        }));

        return {
          id: unit.id,
          title: unit.title,
          order: unit.order,
          framework: unit.framework as StandardsAlignment,
          lessons,
        };
      })
    );

    return enriched;
  })();

  const [masteryRecords, masteryAggregate, curriculumUnits] = await Promise.all([
    masteryRecordsPromise,
    masteryAggregatePromise,
    curriculumUnitsPromise,
  ]);

  const masterySnapshot = masteryRecords.map(record => ({
    standardId: record.standardId,
    code: record.standardCode,
    description: record.standardDescription,
    masteryLevel: Number(record.masteryLevel),
    evidenceCount: record.evidenceCount,
    lastAssessedAt: record.lastAssessedAt.toISOString(),
  }));

  const maxUpdatedAt = masteryAggregate[0]?.value;
  const masteryVersion = maxUpdatedAt instanceof Date ? maxUpdatedAt.getTime() : 0;

  const candidateLessons: CandidateLesson[] = [];
  for (const unit of curriculumUnits) {
    const peers = unit.lessons.slice(0, MAX_CANDIDATE_LESSONS);
    for (const lesson of peers) {
      candidateLessons.push(formatLesson(lesson, peers));
    }
  }

  const attemptSummary = summarizeAttempt(attempt);

  const standardsAlignment =
    attempt.lesson.standards[0]?.framework ??
    curriculumUnits[0]?.framework ??
    null;

  return {
    traceId,
    studentId: attempt.studentId,
    studentHash,
    studentGrade: attempt.student.gradeLevel,
    standardsAlignment,
    masterySnapshot,
    masteryVersion,
    candidateLessons,
    attemptSummary,
    curriculumTitle: curriculumUnits[0]?.title ?? null,
  };
}

export type { AttemptWithRelations };
