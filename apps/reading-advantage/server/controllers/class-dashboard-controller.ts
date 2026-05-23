/**
 * Class Dashboard Controller
 * Provides comprehensive class-level metrics for teachers
 */

import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { db, eq, and, inArray, gte, sql } from "@reading-advantage/db";
import {
  classroomTeachers,
  classrooms,
  classroomStudents,
  assignments,
  studentAssignments,
  userActivity,
  xpLogs,
  users,
} from "@reading-advantage/db/schema";

interface RequestContext {
  params: Promise<{ classroomId: string }>;
}

async function verifyClassAccess(classroomId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === "SYSTEM" || userRole === "ADMIN") {
    return true;
  }

  const [ct] = await db
    .select()
    .from(classroomTeachers)
    .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, userId)))
    .limit(1);

  return !!ct;
}

export async function getClassOverview(req: ExtendedNextRequest, ctx: RequestContext) {
  try {
    const { classroomId } = await ctx.params;
    const session = req.session;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;

    const hasAccess = await verifyClassAccess(classroomId, user.id, user.role as string);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied. You do not have permission to view this class." }, { status: 403 });
    }

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
    if (!classroom) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Get students with level/xp data
    const studentRows = await db
      .select({
        studentId: classroomStudents.studentId,
        level: users.level,
        cefrLevel: users.cefrLevel,
        xp: users.xp,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId));

    const studentIds = studentRows.map((s) => s.studentId);

    // Get assignment IDs for this classroom
    const assignmentRows = await db
      .select({ id: assignments.id, dueDate: assignments.dueDate })
      .from(assignments)
      .where(eq(assignments.classroomId, classroomId));

    const assignmentIds = assignmentRows.map((a) => a.id);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let completedCount = 0;
    let activity7dIds: string[] = [];
    let activity30dIds: string[] = [];
    let xpLogRows: { userId: string; activityType: string; xpEarned: number }[] = [];

    if (studentIds.length > 0) {
      // Completed student assignments
      if (assignmentIds.length > 0) {
        const [cRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(studentAssignments)
          .where(
            and(
              inArray(studentAssignments.assignmentId, assignmentIds),
              eq(studentAssignments.status, "COMPLETED")
            )
          );
        completedCount = cRow?.count ?? 0;
      }

      // Active users in 7d and 30d (distinct userId)
      const [act7d, act30d] = await Promise.all([
        db
          .selectDistinct({ userId: userActivity.userId })
          .from(userActivity)
          .where(and(inArray(userActivity.userId, studentIds), gte(userActivity.createdAt, sevenDaysAgo))),
        db
          .selectDistinct({ userId: userActivity.userId })
          .from(userActivity)
          .where(and(inArray(userActivity.userId, studentIds), gte(userActivity.createdAt, thirtyDaysAgo))),
      ]);
      activity7dIds = act7d.map((r) => r.userId);
      activity30dIds = act30d.map((r) => r.userId);

      // XP logs for MCQ/SAQ accuracy approximation
      xpLogRows = await db
        .select({ userId: xpLogs.userId, activityType: xpLogs.activityType, xpEarned: xpLogs.xpEarned })
        .from(xpLogs)
        .where(
          and(
            inArray(xpLogs.userId, studentIds),
            inArray(xpLogs.activityType, ["MC_QUESTION", "SA_QUESTION"])
          )
        );
    }

    const totalStudents = studentRows.length;
    const averageLevel =
      totalStudents > 0 ? studentRows.reduce((sum, s) => sum + (s.level || 0), 0) / totalStudents : 0;
    const totalXpEarned = studentRows.reduce((sum, s) => sum + (s.xp || 0), 0);
    const assignmentsActive = assignmentRows.filter((a) => !a.dueDate || a.dueDate > now).length;

    const mcLogs = xpLogRows.filter((l) => l.activityType === "MC_QUESTION");
    const mcQuestionAccuracy =
      mcLogs.length > 0
        ? Math.round((mcLogs.reduce((sum, l) => sum + (l.xpEarned || 0), 0) / mcLogs.length) * 10) / 10
        : 0;

    const saLogs = xpLogRows.filter((l) => l.activityType === "SA_QUESTION");
    const saQuestionAccuracy =
      saLogs.length > 0
        ? Math.round((saLogs.reduce((sum, l) => sum + (l.xpEarned || 0), 0) / saLogs.length) * 10) / 10
        : 0;

    const result = {
      class: {
        id: classroom.id,
        name: classroom.name,
        classCode: classroom.classCode,
        schoolId: classroom.schoolId,
        createdAt: classroom.createdAt.toISOString(),
      },
      summary: {
        totalStudents,
        activeStudents7d: activity7dIds.length,
        activeStudents30d: activity30dIds.length,
        averageLevel: Math.round(averageLevel * 10) / 10,
        totalXpEarned,
        assignmentsActive,
        assignmentsCompleted: completedCount,
      },
      performance: { saQuestionAccuracy, mcQuestionAccuracy },
    };

    return NextResponse.json({
      ...result,
      cache: { cached: false, generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Error fetching class overview:", error);
    return NextResponse.json({ error: "Failed to fetch class overview" }, { status: 500 });
  }
}
