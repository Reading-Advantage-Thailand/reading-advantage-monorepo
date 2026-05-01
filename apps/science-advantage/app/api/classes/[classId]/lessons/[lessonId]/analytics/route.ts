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

// Helper function to truncate text
function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; lessonId: string }> }
) {
  try {
    const session = await requireAuth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { classId, lessonId } = resolvedParams;

    // Verify class exists and user has access
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          select: { id: true, name: true },
        },
      },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check authorization: only class teacher or admin can access analytics
    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to class analytics' },
        { status: 403 }
      );
    }

    // Verify lesson exists and is part of this class curriculum
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
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
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found in this class' },
        { status: 404 }
      );
    }

    // Get all lesson completions for students in this class
    const lessonCompletions = await prisma.lessonCompletion.findMany({
      where: {
        lessonId,
        student: {
          enrolledClass: {
            some: { id: classId },
          },
        },
      },
      include: {
        student: {
          select: { id: true, name: true },
        },
      },
    });

    // Calculate class-level statistics
    const totalStudents = classRecord.students.length;
    const studentsCompleted = lessonCompletions.filter(
      (lc) => lc.status === 'COMPLETED'
    ).length;
    const completionRate =
      totalStudents > 0 ? (studentsCompleted / totalStudents) * 100 : 0;

    const completedLessons = lessonCompletions.filter(
      (lc) => lc.status === 'COMPLETED'
    );

    const averageScore =
      completedLessons.length > 0
        ? completedLessons.reduce(
            (sum, lc) => sum + (lc.mostRecentScore || 0),
            0
          ) / completedLessons.length
        : 0;

    const averageScorePercentage =
      completedLessons.length > 0
        ? completedLessons.reduce(
            (sum, lc) => sum + (lc.mostRecentScorePercentage || 0),
            0
          ) / completedLessons.length
        : 0;

    // Build student performance data
    const studentsData = classRecord.students.map((student) => {
      const completion = lessonCompletions.find(
        (lc) => lc.studentId === student.id
      );

      return {
        studentId: student.id,
        studentName: student.name,
        completionStatus: completion?.status || 'NOT_STARTED',
        mostRecentScore: completion?.mostRecentScore || null,
        mostRecentScorePercentage:
          completion?.mostRecentScorePercentage || null,
        bestScore: completion?.bestScore || null,
        bestScorePercentage: completion?.bestScorePercentage || null,
        attempts: completion?.attemptsCount || 0,
        totalTimeSeconds: completion?.totalTimeSpentSeconds || 0,
        colorCode:
          completion?.mostRecentScorePercentage !== null &&
          completion?.mostRecentScorePercentage !== undefined
            ? getColorCode(completion.mostRecentScorePercentage)
            : null,
      };
    });

    // Get all question responses for this lesson from students in this class
    const questionResponses = await prisma.questionResponse.findMany({
      where: {
        question: {
          lessonId,
        },
        attempt: {
          student: {
            enrolledClass: {
              some: { id: classId },
            },
          },
        },
      },
      include: {
        question: true,
        attempt: {
          include: {
            student: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Calculate question-level analytics
    const questionAnalytics = lesson.quizQuestions.map((question, index) => {
      const responses = questionResponses.filter(
        (qr) => qr.questionId === question.id
      );
      const correctResponses = responses.filter((qr) => qr.isCorrect);
      const incorrectResponses = responses.filter((qr) => !qr.isCorrect);

      const percentCorrect =
        responses.length > 0
          ? (correctResponses.length / responses.length) * 100
          : 0;

      const averageTimeSeconds =
        responses.length > 0
          ? responses.reduce((sum, qr) => sum + qr.timeSpentSeconds, 0) /
            responses.length
          : 0;

      // Get unique students who answered incorrectly (use most recent attempt)
      const incorrectStudentIds = new Set(
        incorrectResponses.map((qr) => qr.attempt.studentId)
      );
      const incorrectStudents = Array.from(incorrectStudentIds)
        .map((studentId) => {
          const response = incorrectResponses.find(
            (qr) => qr.attempt.studentId === studentId
          );
          return response?.attempt.student.name || '';
        })
        .filter(Boolean)
        .sort();

      return {
        questionId: question.id,
        questionNumber: index + 1,
        questionTextTruncated: truncateText(question.text),
        questionType: question.type,
        percentCorrect: Math.round(percentCorrect * 10) / 10,
        averageTimeSeconds: Math.round(averageTimeSeconds),
        totalResponses: responses.length,
        correctResponses: correctResponses.length,
        incorrectStudents,
      };
    });

    // Sort questions by percentCorrect (lowest first) to highlight challenging questions
    questionAnalytics.sort((a, b) => a.percentCorrect - b.percentCorrect);

    // Calculate standards performance
    const standardsMap = new Map<
      string,
      {
        standardId: string;
        standardCode: string;
        standardDescription: string;
        questionsCount: number;
        responses: Array<{ studentId: string; isCorrect: boolean }>;
      }
    >();

    // Populate standards map with questions and responses
    lesson.quizQuestions.forEach((question) => {
      question.standards.forEach((standard) => {
        if (!standardsMap.has(standard.id)) {
          standardsMap.set(standard.id, {
            standardId: standard.id,
            standardCode: standard.code,
            standardDescription: standard.description,
            questionsCount: 0,
            responses: [],
          });
        }
        const standardData = standardsMap.get(standard.id)!;
        standardData.questionsCount += 1;

        // Add responses for this question
        const questionResponsesForStandard = questionResponses.filter(
          (qr) => qr.questionId === question.id
        );
        questionResponsesForStandard.forEach((qr) => {
          standardData.responses.push({
            studentId: qr.attempt.studentId,
            isCorrect: qr.isCorrect,
          });
        });
      });
    });

    // Calculate standards analytics
    const standardsAnalytics = Array.from(standardsMap.values()).map(
      (standardData) => {
        // Group responses by student to calculate mastery
        const studentResponses = new Map<
          string,
          { correct: number; total: number }
        >();

        standardData.responses.forEach((response) => {
          if (!studentResponses.has(response.studentId)) {
            studentResponses.set(response.studentId, {
              correct: 0,
              total: 0,
            });
          }
          const stats = studentResponses.get(response.studentId)!;
          stats.total += 1;
          if (response.isCorrect) {
            stats.correct += 1;
          }
        });

        // Count students who mastered this standard (≥80%)
        let studentsMastered = 0;
        studentResponses.forEach((stats) => {
          const percentage = (stats.correct / stats.total) * 100;
          if (percentage >= 80) {
            studentsMastered += 1;
          }
        });

        const percentMastered =
          studentResponses.size > 0
            ? (studentsMastered / studentResponses.size) * 100
            : 0;

        const flagForReteach = percentMastered < 70;

        return {
          standardId: standardData.standardId,
          standardCode: standardData.standardCode,
          standardDescription: standardData.standardDescription,
          questionsCount: standardData.questionsCount,
          studentsMastered,
          percentMastered: Math.round(percentMastered * 10) / 10,
          flagForReteach,
          colorCode: getColorCode(percentMastered),
        };
      }
    );

    const response = {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
      },
      standards: lesson.standards.map((s) => ({
        code: s.code,
        description: s.description,
      })),
      classStats: {
        totalStudents,
        studentsCompleted,
        completionRate: Math.round(completionRate * 10) / 10,
        averageScore: Math.round(averageScore * 10) / 10,
        averageScorePercentage: Math.round(averageScorePercentage * 10) / 10,
      },
      students: studentsData,
      questions: questionAnalytics,
      standardsPerformance: standardsAnalytics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching lesson analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
