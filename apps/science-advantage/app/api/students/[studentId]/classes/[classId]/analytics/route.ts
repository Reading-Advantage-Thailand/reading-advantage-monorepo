import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth/server';
import prisma from '@/lib/prisma';

// Helper function to get color code based on score percentage
function getColorCode(percentage: number): string {
  if (percentage >= 90) return 'blue';
  if (percentage >= 80) return 'green';
  if (percentage >= 60) return 'yellow';
  return 'red';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string; classId: string }> }
) {
  try {
    const session = await requireAuth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { studentId, classId } = resolvedParams;

    // Get class information
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        standardsAlignment: true,
        teacherId: true,
        students: {
          where: { id: studentId },
          select: { id: true, name: true },
        },
      },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check authorization: teacher must own the class or be admin
    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to student analytics' },
        { status: 403 }
      );
    }

    // Check if student is enrolled in this class
    const student = classRecord.students[0];
    if (!student) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 403 }
      );
    }

    // Get all lessons for this class
    const lessons = await prisma.lesson.findMany({
      where: {
        curriculumUnits: {
          some: {
            classId,
          },
        },
      },
      include: {
        standards: true,
        quizQuestions: {
          include: {
            standards: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Get all lesson completions for this student in this class
    const lessonCompletions = await prisma.lessonCompletion.findMany({
      where: {
        studentId,
        lessonId: {
          in: lessons.map((l) => l.id),
        },
      },
    });

    // Get all attempts for this student across all lessons
    const attempts = await prisma.attempt.findMany({
      where: {
        studentId,
        lessonId: {
          in: lessons.map((l) => l.id),
        },
        completedAt: { not: null },
      },
      include: {
        questionResponses: {
          include: {
            question: {
              include: {
                standards: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Build lessons performance table
    const lessonsPerformance = lessons.map((lesson) => {
      const completion = lessonCompletions.find(
        (lc) => lc.lessonId === lesson.id
      );

      const completionStatus =
        completion?.status === 'COMPLETED'
          ? 'completed'
          : completion?.status === 'IN_PROGRESS'
            ? 'in_progress'
            : 'not_started';

      const mostRecentScore = completion?.mostRecentScorePercentage ?? null;
      const attemptsCount = completion?.attemptsCount ?? 0;
      const totalTimeSeconds = completion?.totalTimeSpentSeconds ?? 0;

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order,
        completionStatus,
        mostRecentScore,
        mostRecentScorePercentage: mostRecentScore,
        attemptsCount,
        totalTimeSeconds,
        colorCode: mostRecentScore !== null ? getColorCode(mostRecentScore) : null,
      };
    });

    // Calculate overall summary
    const completedLessons = lessonsPerformance.filter(
      (lp) => lp.completionStatus === 'completed'
    );
    const lessonsCompleted = completedLessons.length;

    const averageScore =
      completedLessons.length > 0
        ? completedLessons.reduce(
            (sum, lp) => sum + (lp.mostRecentScore || 0),
            0
          ) / completedLessons.length
        : 0;

    const totalTimeSpent = lessonsPerformance.reduce(
      (sum, lp) => sum + lp.totalTimeSeconds,
      0
    );

    const totalAttempts = lessonsPerformance.reduce(
      (sum, lp) => sum + lp.attemptsCount,
      0
    );

    // Build standards mastery map
    const standardsMap = new Map<
      string,
      {
        standardId: string;
        standardCode: string;
        standardDescription: string;
        questionsAnswered: number;
        questionsCorrect: number;
      }
    >();

    // For each lesson, get the most recent attempt and aggregate standards performance
    lessons.forEach((lesson) => {
      // Initialize standards from lesson
      lesson.standards.forEach((standard) => {
        if (!standardsMap.has(standard.id)) {
          standardsMap.set(standard.id, {
            standardId: standard.id,
            standardCode: standard.code,
            standardDescription: standard.description,
            questionsAnswered: 0,
            questionsCorrect: 0,
          });
        }
      });

      // Get most recent attempt for this lesson
      const lessonAttempts = attempts.filter((a) => a.lessonId === lesson.id);
      if (lessonAttempts.length === 0) return;

      const mostRecentAttempt = lessonAttempts[0]; // Already sorted by completedAt desc

      // Aggregate standards performance from this attempt
      mostRecentAttempt.questionResponses.forEach((qr) => {
        qr.question.standards.forEach((standard) => {
          const standardData = standardsMap.get(standard.id);
          if (standardData) {
            standardData.questionsAnswered += 1;
            if (qr.isCorrect) {
              standardData.questionsCorrect += 1;
            }
          }
        });
      });
    });

    // Calculate standards mastery
    const standardsPerformance = Array.from(standardsMap.values())
      .map((standardData) => {
        const masteryPercentage =
          standardData.questionsAnswered > 0
            ? (standardData.questionsCorrect / standardData.questionsAnswered) *
              100
            : 0;

        return {
          standardId: standardData.standardId,
          standardCode: standardData.standardCode,
          standardDescription: standardData.standardDescription,
          questionsAnswered: standardData.questionsAnswered,
          questionsCorrect: standardData.questionsCorrect,
          masteryPercentage: Math.round(masteryPercentage * 10) / 10,
          colorCode: getColorCode(masteryPercentage),
          needsIntervention: masteryPercentage < 60,
        };
      })
      .sort((a, b) => a.masteryPercentage - b.masteryPercentage); // Sort by mastery % (lowest first)

    const response = {
      student: {
        id: student.id,
        name: student.name,
      },
      class: {
        id: classRecord.id,
        name: classRecord.name,
        gradeLevel: classRecord.gradeLevel,
        standardsAlignment: classRecord.standardsAlignment,
      },
      summary: {
        lessonsCompleted,
        totalLessons: lessons.length,
        averageScore: Math.round(averageScore * 10) / 10,
        averageScorePercentage: Math.round(averageScore * 10) / 10,
        totalTimeSpent,
        totalAttempts,
        colorCode: getColorCode(averageScore),
      },
      lessonsPerformance,
      standardsPerformance,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching student class analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
