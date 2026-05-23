import { NextRequest } from "next/server";
import { db, eq, and, gte, inArray } from "@reading-advantage/db";
import { classroomTeachers, classroomStudents, userActivity, users } from "@reading-advantage/db/schema";

export async function getClassAccuracy(req: NextRequest) {
  const session = (req as any).session;

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classroomId = (req as any).params?.classroomId;
  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get("timeframe") || "30d";

  if (!classroomId) {
    return Response.json({ error: "Missing classroomId parameter" }, { status: 400 });
  }

  try {
    // Verify teacher has access to this classroom
    const [classroomAccess] = await db
      .select()
      .from(classroomTeachers)
      .where(
        and(
          eq(classroomTeachers.classroomId, classroomId),
          eq(classroomTeachers.teacherId, session.user.id)
        )
      )
      .limit(1);

    if (
      !classroomAccess &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SYSTEM"
    ) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    const daysMatch = timeframe.match(/^(\d+)d$/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all students in classroom
    const csRows = await db
      .select({
        studentId: classroomStudents.studentId,
        studentName: users.name,
        level: users.level,
        cefrLevel: users.cefrLevel,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId));

    const studentIds = csRows.map((cs) => cs.studentId);

    if (studentIds.length === 0) {
      return Response.json({
        students: [],
        classAverages: {
          mcqAccuracy: 0,
          openEndedAccuracy: 0,
          overallAccuracy: 0,
          totalAttempts: 0,
          activeStudents: 0,
        },
        timeframe,
      });
    }

    // Get all user activities for these students in timeframe
    const activities = await db
      .select({
        userId: userActivity.userId,
        activityType: userActivity.activityType,
        details: userActivity.details,
      })
      .from(userActivity)
      .where(
        and(
          inArray(userActivity.userId, studentIds),
          gte(userActivity.createdAt, startDate),
          inArray(userActivity.activityType, ["MC_QUESTION", "SA_QUESTION", "LA_QUESTION"] as any),
          eq(userActivity.completed, true)
        )
      );

    const studentMetrics = studentIds.map((studentId) => {
      const cs = csRows.find((r) => r.studentId === studentId);
      const studentActivities = activities.filter((a) => a.userId === studentId);

      const mcqActivities = studentActivities.filter((a) => a.activityType === "MC_QUESTION");
      const mcqCorrect = mcqActivities.filter((a) => {
        const details = a.details as any;
        return details?.isCorrect === true || details?.correct === true;
      }).length;
      const mcqAccuracy = mcqActivities.length > 0 ? (mcqCorrect / mcqActivities.length) * 100 : 0;

      const openEndedActivities = studentActivities.filter(
        (a) => a.activityType === "SA_QUESTION" || a.activityType === "LA_QUESTION"
      );
      const openEndedCorrect = openEndedActivities.filter((a) => {
        const details = a.details as any;
        return details?.score >= 3 || details?.rating >= 3;
      }).length;
      const openEndedAccuracy =
        openEndedActivities.length > 0
          ? (openEndedCorrect / openEndedActivities.length) * 100
          : 0;

      const totalAttempts = studentActivities.length;
      const totalCorrect = mcqCorrect + openEndedCorrect;
      const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

      return {
        studentId,
        studentName: cs?.studentName || "Unknown",
        level: cs?.level || 1,
        cefrLevel: cs?.cefrLevel || "A1-",
        mcqAccuracy: Math.round(mcqAccuracy * 10) / 10,
        mcqAttempts: mcqActivities.length,
        openEndedAccuracy: Math.round(openEndedAccuracy * 10) / 10,
        openEndedAttempts: openEndedActivities.length,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        totalAttempts,
      };
    });

    const validStudents = studentMetrics.filter((s) => s.totalAttempts > 0);
    const classAverages = {
      mcqAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.mcqAccuracy, 0) / validStudents.length) * 10
            ) / 10
          : 0,
      openEndedAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.openEndedAccuracy, 0) / validStudents.length) * 10
            ) / 10
          : 0,
      overallAccuracy:
        validStudents.length > 0
          ? Math.round(
              (validStudents.reduce((sum, s) => sum + s.overallAccuracy, 0) / validStudents.length) * 10
            ) / 10
          : 0,
      totalAttempts: studentMetrics.reduce((sum, s) => sum + s.totalAttempts, 0),
      activeStudents: validStudents.length,
    };

    return Response.json({ students: studentMetrics, classAverages, timeframe });
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
