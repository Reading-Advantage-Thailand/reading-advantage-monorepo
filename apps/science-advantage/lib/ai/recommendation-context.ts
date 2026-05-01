import type {
  CurriculumUnit,
  Lesson,
  LessonCompletionStatus,
  LessonType,
  PrismaClient,
  StandardsAlignment,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

import { aiConfig } from '@/lib/config/ai';

import type { CandidateLesson, RecommendationContext } from './types';

type AttemptWithRelations = {
  id: string;
  studentId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  completedAt: Date | null;
  lesson: Pick<Lesson, 'id' | 'title' | 'lessonType' | 'gradeLevel' | 'order'> & {
    standards: Array<{
      id: string;
      code: string;
      description: string | null;
      framework: StandardsAlignment;
    }>;
    curriculumUnits: Pick<CurriculumUnit, 'id' | 'title' | 'order' | 'framework'>[];
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

export async function buildRecommendationContext(
  prisma: PrismaClient,
  params: { attempt: AttemptWithRelations }
): Promise<RecommendationContext> {
  const { attempt } = params;
  const traceId = `rec_${randomUUID()}`;
  const studentHash = hashStudentId(attempt.studentId);

  const unitIds = attempt.lesson.curriculumUnits.map(unit => unit.id);

  const [masteryRecords, masteryAggregate, curriculumUnits] = await Promise.all([
    prisma.standardMastery.findMany({
      where: { studentId: attempt.studentId },
      include: {
        standard: {
          select: { id: true, code: true, description: true, framework: true },
        },
      },
      orderBy: { masteryLevel: 'asc' },
      take: MAX_WEAK_STANDARDS,
    }),
    prisma.standardMastery.aggregate({
      where: { studentId: attempt.studentId },
      _max: { updatedAt: true },
    }),
    unitIds.length
      ? prisma.curriculumUnit.findMany({
          where: { id: { in: unitIds } },
          select: {
            id: true,
            title: true,
            order: true,
            framework: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                lessonType: true,
                gradeLevel: true,
                standards: {
                  select: { id: true, code: true },
                },
                lessonCompletions: {
                  where: { studentId: attempt.studentId },
                  select: { status: true, completedAt: true },
                },
              },
            },
          },
        })
      : [],
  ]);

  const masterySnapshot = masteryRecords.map(record => ({
    standardId: record.standardId,
    code: record.standard.code,
    description: record.standard.description,
    masteryLevel: Number(record.masteryLevel),
    evidenceCount: record.evidenceCount,
    lastAssessedAt: record.lastAssessedAt.toISOString(),
  }));

  const masteryVersion = masteryAggregate._max.updatedAt
    ? masteryAggregate._max.updatedAt.getTime()
    : 0;

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
