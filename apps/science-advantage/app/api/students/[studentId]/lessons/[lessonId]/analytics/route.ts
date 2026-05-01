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
  { params }: { params: Promise<{ studentId: string; lessonId: string }> }
) {
  try {
    const session = await requireAuth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { studentId, lessonId } = resolvedParams;

    // Get student information
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        enrolledClass: {
          select: {
            id: true,
            name: true,
            teacherId: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check authorization: teacher must own at least one class the student is enrolled in
    const isTeacherOfStudent = student.enrolledClass.some(
      (cls) => cls.teacherId === session.user.id
    );
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOfStudent && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to student data' },
        { status: 403 }
      );
    }

    // Get lesson information
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        standards: true,
        quizQuestions: {
          include: {
            standards: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Get all attempts for this student on this lesson
    const attempts = await prisma.attempt.findMany({
      where: {
        studentId,
        lessonId,
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
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { attemptNumber: 'desc' },
    });

    // Build attempt history
    const attemptHistory = attempts.map((attempt) => {
      const totalQuestions = attempt.questionResponses.length;
      const correctAnswers = attempt.questionResponses.filter(
        (qr) => qr.isCorrect
      ).length;
      const scorePercentage =
        totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      const totalTimeSeconds = attempt.questionResponses.reduce(
        (sum, qr) => sum + qr.timeSpentSeconds,
        0
      );

      // Build question breakdown for this attempt
      const questionBreakdown = attempt.questionResponses.map((qr, index) => {
        return {
          questionId: qr.questionId,
          questionNumber: index + 1,
          questionText: qr.question.text,
          questionType: qr.question.type,
          studentAnswer: qr.studentAnswer,
          correctAnswer: qr.question.correctAnswer,
          isCorrect: qr.isCorrect,
          timeSpentSeconds: qr.timeSpentSeconds,
          points: qr.question.points,
        };
      });

      return {
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString() || null,
        status: attempt.completedAt ? 'completed' : 'in_progress',
        score: attempt.score,
        maxScore: attempt.maxScore,
        scorePercentage: Math.round(scorePercentage * 10) / 10,
        totalTimeSeconds,
        colorCode: getColorCode(scorePercentage),
        questionBreakdown,
      };
    });

    // Calculate standards performance for this student on this lesson
    const standardsMap = new Map<
      string,
      {
        standardId: string;
        standardCode: string;
        standardDescription: string;
        questionsCount: number;
        questionsAnswered: number;
        questionsCorrect: number;
      }
    >();

    // Populate standards map with questions
    lesson.quizQuestions.forEach((question) => {
      question.standards.forEach((standard) => {
        if (!standardsMap.has(standard.id)) {
          standardsMap.set(standard.id, {
            standardId: standard.id,
            standardCode: standard.code,
            standardDescription: standard.description,
            questionsCount: 0,
            questionsAnswered: 0,
            questionsCorrect: 0,
          });
        }
        const standardData = standardsMap.get(standard.id)!;
        standardData.questionsCount += 1;
      });
    });

    // Add student's responses to standards
    attempts.forEach((attempt) => {
      attempt.questionResponses.forEach((qr) => {
        qr.question.standards.forEach((standard) => {
          const standardData = standardsMap.get(standard.id);
          if (standardData) {
            // Only count the most recent attempt's answers
            if (attempt.attemptNumber === attempts[0].attemptNumber) {
              standardData.questionsAnswered += 1;
              if (qr.isCorrect) {
                standardData.questionsCorrect += 1;
              }
            }
          }
        });
      });
    });

    // Calculate standards analytics
    const standardsPerformance = Array.from(standardsMap.values()).map(
      (standardData) => {
        const masteryPercentage =
          standardData.questionsAnswered > 0
            ? (standardData.questionsCorrect / standardData.questionsAnswered) *
              100
            : 0;

        return {
          standardId: standardData.standardId,
          standardCode: standardData.standardCode,
          standardDescription: standardData.standardDescription,
          questionsCount: standardData.questionsCount,
          questionsAnswered: standardData.questionsAnswered,
          questionsCorrect: standardData.questionsCorrect,
          masteryPercentage: Math.round(masteryPercentage * 10) / 10,
          colorCode: getColorCode(masteryPercentage),
        };
      }
    );

    const response = {
      student: {
        id: student.id,
        name: student.name,
      },
      lesson: {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
      },
      attemptHistory,
      standardsPerformance,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching student-lesson analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
