import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@prisma/client";

/**
 * Get accuracy metrics by question type for a classroom
 * Groups by student and calculates MCQ vs open-ended (SAQ + LAQ) accuracy
 */
export async function getClassAccuracy(req: NextRequest) {
  const session = (req as any).session;

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get classroomId from URL path params (via context)
  const classroomId = (req as any).params?.classroomId;
  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get("timeframe") || "30d";

  if (!classroomId) {
    return Response.json(
      { error: "Missing classroomId parameter" },
      { status: 400 }
    );
  }

  try {
    // Verify teacher has access to this classroom
    const classroomAccess = await prisma.classroomTeacher.findUnique({
      where: {
        classroomId_teacherId: {
          classroomId,
          teacherId: session.user.id,
        },
      },
    });

    if (
      !classroomAccess &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SYSTEM"
    ) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // Parse timeframe to date
    const daysMatch = timeframe.match(/^(\d+)d$/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all students in classroom
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            level: true,
            cefrLevel: true,
          },
        },
      },
    });

    const studentIds = classroomStudents.map((cs) => cs.studentId);

    // Get all user activities for these students in timeframe
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: { in: studentIds },
        createdAt: { gte: startDate },
        activityType: {
          in: [
            ActivityType.MC_QUESTION,
            ActivityType.SA_QUESTION,
            ActivityType.LA_QUESTION,
          ],
        },
        completed: true,
      },
      select: {
        userId: true,
        activityType: true,
        details: true,
      },
    });

    // Calculate accuracy per student per question type
    const studentMetrics = studentIds.map((studentId) => {
      const student = classroomStudents.find(
        (cs) => cs.studentId === studentId
      )?.student;
      const studentActivities = activities.filter(
        (a) => a.userId === studentId
      );

      // MCQ accuracy
      const mcqActivities = studentActivities.filter(
        (a) => a.activityType === ActivityType.MC_QUESTION
      );
      const mcqCorrect = mcqActivities.filter((a) => {
        const details = a.details as any;
        return details?.isCorrect === true || details?.correct === true;
      }).length;
      const mcqAccuracy =
        mcqActivities.length > 0
          ? (mcqCorrect / mcqActivities.length) * 100
          : 0;

      // Open-ended accuracy (SAQ + LAQ)
      const openEndedActivities = studentActivities.filter(
        (a) =>
          a.activityType === ActivityType.SA_QUESTION ||
          a.activityType === ActivityType.LA_QUESTION
      );
      const openEndedCorrect = openEndedActivities.filter((a) => {
        const details = a.details as any;
        // For open-ended, check score or rating (assuming score >= 3 out of 5 is "correct")
        return details?.score >= 3 || details?.rating >= 3;
      }).length;
      const openEndedAccuracy =
        openEndedActivities.length > 0
          ? (openEndedCorrect / openEndedActivities.length) * 100
          : 0;

      // Overall accuracy
      const totalAttempts = studentActivities.length;
      const totalCorrect = mcqCorrect + openEndedCorrect;
      const overallAccuracy =
        totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

      return {
        studentId,
        studentName: student?.name || "Unknown",
        level: student?.level || 1,
        cefrLevel: student?.cefrLevel || "A1-",
        mcqAccuracy: Math.round(mcqAccuracy * 10) / 10,
        mcqAttempts: mcqActivities.length,
        openEndedAccuracy: Math.round(openEndedAccuracy * 10) / 10,
        openEndedAttempts: openEndedActivities.length,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        totalAttempts,
      };
    });

    // Calculate class averages
    const validStudents = studentMetrics.filter((s) => s.totalAttempts > 0);
    const classAverages = {
      mcqAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.mcqAccuracy, 0) /
                validStudents.length) *
                10
            ) / 10
          : 0,
      openEndedAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.openEndedAccuracy, 0) /
                validStudents.length) *
                10
            ) / 10
          : 0,
      overallAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.overallAccuracy, 0) /
                validStudents.length) *
                10
            ) / 10
          : 0,
      totalAttempts: studentMetrics.reduce(
        (sum, s) => sum + s.totalAttempts,
        0
      ),
      activeStudents: validStudents.length,
    };

    return Response.json({
      students: studentMetrics,
      classAverages,
      timeframe,
    });
  } catch (error) {
    console.error("[getClassAccuracy] Error fetching class accuracy:", error);
    return Response.json(
      {
        error: "Failed to fetch accuracy data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
