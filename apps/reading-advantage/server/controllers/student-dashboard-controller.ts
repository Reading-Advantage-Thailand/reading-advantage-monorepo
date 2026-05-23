import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { StudentMeResponse } from "@/types/dashboard";
import { db, eq, and, gte, sql, inArray } from "@reading-advantage/db";
import { users, schools, lessonRecords, userActivity, studentAssignments, assignments, userWordRecords, xpLogs } from "@reading-advantage/db/schema";

export async function getStudentDashboard(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get student with school
    const [student] = await db
      .select({ id: users.id, name: users.name, email: users.email, level: users.level, cefrLevel: users.cefrLevel, xp: users.xp, schoolId: users.schoolId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Student not found" }, { status: 404 });
    }

    let schoolName: string | undefined;
    if (student.schoolId) {
      const [school] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, student.schoolId)).limit(1);
      schoolName = school?.name;
    }

    // Fetch related data in parallel
    const [lessonRows, activityRows, saRows, wordRows, xpRows] = await Promise.all([
      db.select({ id: lessonRecords.id, createdAt: lessonRecords.createdAt })
        .from(lessonRecords).where(eq(lessonRecords.userId, userId)),
      db.select({ createdAt: userActivity.createdAt, timer: userActivity.timer })
        .from(userActivity).where(eq(userActivity.userId, userId))
        .orderBy(sql`${userActivity.createdAt} DESC`),
      db.select({ id: studentAssignments.id, status: studentAssignments.status, score: studentAssignments.score, assignmentId: studentAssignments.assignmentId })
        .from(studentAssignments).where(eq(studentAssignments.studentId, userId)),
      db.select({ id: userWordRecords.id })
        .from(userWordRecords).where(and(eq(userWordRecords.userId, userId), sql`${userWordRecords.difficulty} >= 0.9`)),
      db.select({ xpEarned: xpLogs.xpEarned, createdAt: xpLogs.createdAt })
        .from(xpLogs).where(eq(xpLogs.userId, userId)),
    ]);

    // Fetch due dates for assignments
    const assignmentIds = saRows.map((sa) => sa.assignmentId).filter(Boolean) as string[];
    const assignmentDueDates: Record<string, Date | null> = {};
    if (assignmentIds.length > 0) {
      const aRows = await db
        .select({ id: assignments.id, dueDate: assignments.dueDate })
        .from(assignments)
        .where(inArray(assignments.id, assignmentIds));
      for (const a of aRows) {
        assignmentDueDates[a.id] = a.dueDate;
      }
    }

    const booksRead = lessonRows.length;
    const totalReadingTime =
      activityRows.filter((a) => a.timer !== null).reduce((sum, a) => sum + (a.timer ?? 0), 0) / 60;

    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    const activityDates = new Set(
      activityRows.map((a) => {
        const date = new Date(a.createdAt);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split("T")[0];
      })
    );

    while (activityDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const lastActive = activityRows.length > 0 ? activityRows[0].createdAt.toISOString() : undefined;

    const now = new Date();
    const pending = saRows.filter((sa) => sa.status !== "COMPLETED").length;
    const completed = saRows.filter((sa) => sa.status === "COMPLETED").length;
    const overdue = saRows.filter((sa) => {
      const dueDate = sa.assignmentId ? assignmentDueDates[sa.assignmentId] : null;
      return sa.status !== "COMPLETED" && dueDate && new Date(dueDate) < now;
    }).length;

    const scores = saRows.filter((sa) => sa.score !== null).map((sa) => sa.score as number);
    const averageAccuracy =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;

    const vocabularyMastered = wordRows.length;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const xpThisWeek = xpRows.filter((l) => new Date(l.createdAt) >= weekStart).reduce((sum, l) => sum + l.xpEarned, 0);

    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    const xpThisMonth = xpRows.filter((l) => new Date(l.createdAt) >= monthStart).reduce((sum, l) => sum + l.xpEarned, 0);

    const response: StudentMeResponse = {
      student: {
        id: student.id,
        name: student.name || "Unknown",
        email: student.email,
        level: student.level,
        cefrLevel: student.cefrLevel,
        xp: student.xp,
        schoolId: student.schoolId || undefined,
        schoolName,
      },
      progress: { booksRead, totalReadingTime: Math.round(totalReadingTime), streak, lastActive },
      assignments: { pending, completed, overdue },
      performance: {
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        vocabularyMastered,
        xpThisWeek,
        xpThisMonth,
      },
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;
    console.log(`[Controller] getStudentDashboard - ${duration}ms - user: ${userId}`);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getStudentDashboard - Error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch student data", details: error instanceof Error ? { error: error.message } : {} },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}
