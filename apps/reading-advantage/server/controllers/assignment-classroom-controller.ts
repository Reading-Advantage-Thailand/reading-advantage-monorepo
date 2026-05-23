import { NextResponse } from "next/server";
import { db, eq, and, inArray, desc } from "@reading-advantage/db";
import { assignments, classroomStudents, studentAssignments, assignmentNotifications, users } from "@reading-advantage/db/schema";
import { ExtendedNextRequest } from "./auth-controller";

/**
 * Get all assignments for a specific classroom
 */
export async function getClassroomAssignments(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await ctx.params;
  try {
    if (!classroomId) {
      return NextResponse.json({ error: "Missing classroomId" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.classroomId, classroomId))
      .orderBy(desc(assignments.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Get all students in a classroom with their completion status for a specific assignment
 */
export async function getAssignmentStudents(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ classroomId: string; assignmentId: string }> }
) {
  const { classroomId, assignmentId } = await ctx.params;
  try {
    if (!classroomId || !assignmentId) {
      return NextResponse.json({ error: "Missing classroomId or assignmentId" }, { status: 400 });
    }

    // Get all students in the classroom with user info
    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId));

    // Get student assignments for this assignment
    const saRows = await db
      .select()
      .from(studentAssignments)
      .where(eq(studentAssignments.assignmentId, assignmentId));

    const studentsWithStatus = students.map((s) => {
      const assignment = saRows.find((sa) => sa.studentId === s.id);
      return {
        id: s.id,
        name: s.name || "Unknown",
        email: s.email,
        isCompleted: assignment?.status === "COMPLETED",
      };
    });

    return NextResponse.json(studentsWithStatus);
  } catch (error) {
    console.error("Error fetching students for assignment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Send assignment notifications to students in a classroom
 * Body: { assignmentIds: string[], studentIds?: string[] }
 */
export async function sendClassroomAssignmentNotifications(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await ctx.params;
  try {
    const user = req.session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!classroomId) {
      return NextResponse.json({ error: "Missing classroomId" }, { status: 400 });
    }

    const body = await req.json();
    const { assignmentIds, studentIds } = body;

    if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return NextResponse.json({ error: "Missing or invalid assignmentIds" }, { status: 400 });
    }

    let targetStudentIds: string[] = studentIds;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      const csRows = await db
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, classroomId));

      const allStudentIds = csRows.map((cs) => cs.studentId);

      const completedRows = await db
        .selectDistinct({ studentId: studentAssignments.studentId })
        .from(studentAssignments)
        .where(
          and(
            inArray(studentAssignments.studentId, allStudentIds),
            inArray(studentAssignments.assignmentId, assignmentIds),
            eq(studentAssignments.status, "COMPLETED")
          )
        );

      const completedStudentIds = completedRows.map((r) => r.studentId);
      targetStudentIds = allStudentIds.filter((id) => !completedStudentIds.includes(id));

      if (targetStudentIds.length === 0) {
        return NextResponse.json(
          { success: true, count: 0, message: "No incomplete students found" },
          { status: 200 }
        );
      }
    }

    const notifications = [];
    for (const assignmentId of assignmentIds) {
      for (const studentId of targetStudentIds) {
        notifications.push({ teacherId: user.id, studentId, assignmentId, isNoticed: false });
      }
    }

    const inserted = await db
      .insert(assignmentNotifications)
      .values(notifications)
      .onConflictDoNothing()
      .returning({ id: assignmentNotifications.id });

    return NextResponse.json({ success: true, count: inserted.length });
  } catch (error) {
    console.error("Error sending assignment notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Get notification history for a classroom
 */
export async function getClassroomNotificationHistory(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await ctx.params;
  try {
    if (!classroomId) {
      return NextResponse.json({ error: "Missing classroomId" }, { status: 400 });
    }

    const notifications = await db
      .select({
        id: assignmentNotifications.id,
        assignmentId: assignmentNotifications.assignmentId,
        createdAt: assignmentNotifications.createdAt,
        assignmentTitle: assignments.title,
        studentName: users.name,
      })
      .from(assignmentNotifications)
      .innerJoin(assignments, eq(assignmentNotifications.assignmentId, assignments.id))
      .innerJoin(users, eq(assignmentNotifications.studentId, users.id))
      .where(eq(assignments.classroomId, classroomId))
      .orderBy(desc(assignmentNotifications.createdAt));

    const grouped = notifications.reduce((acc: any[], notif) => {
      const key = `${notif.assignmentId}-${notif.createdAt.toISOString()}`;
      const existing = acc.find((item) => item.key === key);

      if (existing) {
        existing.studentCount++;
        existing.notifiedStudents.push(notif.studentName || "Unknown");
      } else {
        acc.push({
          key,
          id: notif.id,
          assignmentTitle: notif.assignmentTitle || "Untitled",
          studentCount: 1,
          createdAt: notif.createdAt,
          notifiedStudents: [notif.studentName || "Unknown"],
        });
      }

      return acc;
    }, []);

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Error fetching notification history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
