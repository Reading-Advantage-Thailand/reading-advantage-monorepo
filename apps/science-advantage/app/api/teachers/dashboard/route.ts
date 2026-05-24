import { NextRequest, NextResponse } from 'next/server';
import { and, db, desc, eq, inArray, lt, sql } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceLessonCompletions,
  scienceLessons,
  scienceStandardMastery,
  users,
} from '@reading-advantage/db/schema';

import { requireRole } from '@/lib/auth/server';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole('TEACHER');

    const teacherId = session.user.id;

    const teacherClasses = await db
      .select({ id: scienceClasses.id, name: scienceClasses.name })
      .from(scienceClasses)
      .where(eq(scienceClasses.teacherId, teacherId));

    if (teacherClasses.length === 0) {
      return NextResponse.json({
        classProgress: [],
        studentsNeedingAttention: 0,
        recentCompletions: [],
      });
    }

    const classIds = teacherClasses.map((c) => c.id);

    const [classProgress, studentsNeedingAttention, recentCompletions] =
      await Promise.all([
        computeClassProgress(classIds, teacherClasses),
        countStudentsNeedingAttention(classIds),
        fetchRecentCompletions(classIds),
      ]);

    return NextResponse.json({
      classProgress,
      studentsNeedingAttention,
      recentCompletions,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to load teacher dashboard data', error);
    return NextResponse.json(
      { error: 'Unable to load dashboard data' },
      { status: 500 }
    );
  }
}

async function computeClassProgress(
  classIds: string[],
  teacherClasses: Array<{ id: string; name: string }>
) {
  const results: Array<{
    classId: string;
    className: string;
    completionRate: number;
    averageScore: number;
    activeStudents: number;
  }> = [];

  for (const classId of classIds) {
    const classInfo = teacherClasses.find((c) => c.id === classId);
    if (!classInfo) continue;

    const enrolledStudents = await db
      .select({ id: scienceClassStudents.studentId })
      .from(scienceClassStudents)
      .where(eq(scienceClassStudents.classId, classId));

    const activeStudents = enrolledStudents.length;

    if (activeStudents === 0) {
      results.push({
        classId,
        className: classInfo.name,
        completionRate: 0,
        averageScore: 0,
        activeStudents: 0,
      });
      continue;
    }

    const studentIds = enrolledStudents.map((s) => s.id);

    const completions = await db
      .select({
        studentId: scienceLessonCompletions.studentId,
        mostRecentScorePercentage:
          scienceLessonCompletions.mostRecentScorePercentage,
      })
      .from(scienceLessonCompletions)
      .where(
        and(
          inArray(scienceLessonCompletions.studentId, studentIds),
          eq(scienceLessonCompletions.status, 'COMPLETED')
        )
      );

    const uniqueCompletions = new Set(
      completions.map((c) => c.studentId)
    ).size;

    const completionRate =
      activeStudents > 0
        ? Math.round((uniqueCompletions / activeStudents) * 1000) / 10
        : 0;

    const scoresWithValues = completions.filter(
      (c) => c.mostRecentScorePercentage !== null
    );
    const averageScore =
      scoresWithValues.length > 0
        ? Math.round(
            (scoresWithValues.reduce(
              (sum, c) => sum + (c.mostRecentScorePercentage ?? 0),
              0
            ) /
              scoresWithValues.length) *
              10
          ) / 10
        : 0;

    results.push({
      classId,
      className: classInfo.name,
      completionRate: Math.min(completionRate, 100),
      averageScore,
      activeStudents,
    });
  }

  return results;
}

async function countStudentsNeedingAttention(classIds: string[]) {
  // Distinct students in any of the teacher's classes whose mastery on at
  // least one standard is below 0.6. Mirrors the Prisma groupBy semantics.
  const enrolled = await db
    .selectDistinct({ studentId: scienceClassStudents.studentId })
    .from(scienceClassStudents)
    .where(inArray(scienceClassStudents.classId, classIds));

  if (enrolled.length === 0) return 0;

  const enrolledIds = enrolled.map((e) => e.studentId);

  const rows = await db
    .selectDistinct({ studentId: scienceStandardMastery.studentId })
    .from(scienceStandardMastery)
    .where(
      and(
        inArray(scienceStandardMastery.studentId, enrolledIds),
        lt(scienceStandardMastery.masteryLevel, sql`0.6`)
      )
    );

  return rows.length;
}

async function fetchRecentCompletions(classIds: string[]) {
  const enrolled = await db
    .selectDistinct({ studentId: scienceClassStudents.studentId })
    .from(scienceClassStudents)
    .where(inArray(scienceClassStudents.classId, classIds));

  if (enrolled.length === 0) return [];

  const enrolledIds = enrolled.map((e) => e.studentId);

  const completions = await db
    .select({
      mostRecentScorePercentage:
        scienceLessonCompletions.mostRecentScorePercentage,
      completedAt: scienceLessonCompletions.completedAt,
      createdAt: scienceLessonCompletions.createdAt,
      studentName: users.name,
      lessonTitle: scienceLessons.title,
    })
    .from(scienceLessonCompletions)
    .innerJoin(users, eq(users.id, scienceLessonCompletions.studentId))
    .innerJoin(
      scienceLessons,
      eq(scienceLessons.id, scienceLessonCompletions.lessonId)
    )
    .where(
      and(
        eq(scienceLessonCompletions.status, 'COMPLETED'),
        inArray(scienceLessonCompletions.studentId, enrolledIds)
      )
    )
    .orderBy(desc(scienceLessonCompletions.completedAt))
    .limit(5);

  return completions.map((c) => ({
    studentName: c.studentName,
    lessonTitle: c.lessonTitle,
    score: c.mostRecentScorePercentage,
    completedAt: c.completedAt?.toISOString() ?? c.createdAt.toISOString(),
  }));
}
