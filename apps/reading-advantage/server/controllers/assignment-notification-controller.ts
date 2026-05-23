import { NextResponse } from "next/server";
import { alias } from "drizzle-orm";
import { db, eq, and, inArray, desc } from "@reading-advantage/db";
import {
  assignmentNotifications,
  assignments,
  articles,
  classrooms,
  classroomTeachers,
  classroomStudents,
  users,
} from "@reading-advantage/db/schema";
import { ExtendedNextRequest } from "./auth-controller";

// Aliased user table for dual-join (teacher + student)
const teacherUsers = alias(users, "teacher_users");
const studentUsers = alias(users, "student_users");

export async function getAssignmentNotifications(req: ExtendedNextRequest) {
  try {
    const user = req.session?.user;
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const history = searchParams.get("history") === "true";
    const userId = user.id;

    if (!history) {
      // Student view
      const rows = await db
        .select({
          id: assignmentNotifications.id,
          studentId: assignmentNotifications.studentId,
          teacherId: assignmentNotifications.teacherId,
          assignmentId: assignmentNotifications.assignmentId,
          isNoticed: assignmentNotifications.isNoticed,
          createdAt: assignmentNotifications.createdAt,
          updatedAt: assignmentNotifications.updatedAt,
          assignmentTitle: assignments.title,
          assignmentDueDate: assignments.dueDate,
          assignmentClassroomId: assignments.classroomId,
          articleId: articles.id,
          articleTitle: articles.title,
          classroomName: classrooms.name,
          teacherName: teacherUsers.name,
        })
        .from(assignmentNotifications)
        .innerJoin(assignments, eq(assignmentNotifications.assignmentId, assignments.id))
        .leftJoin(articles, eq(assignments.articleId, articles.id))
        .leftJoin(classrooms, eq(assignments.classroomId, classrooms.id))
        .leftJoin(teacherUsers, eq(assignmentNotifications.teacherId, teacherUsers.id))
        .where(and(eq(assignmentNotifications.studentId, userId), eq(assignmentNotifications.isNoticed, false)))
        .orderBy(desc(assignmentNotifications.createdAt));

      const notifications = rows.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        teacherId: r.teacherId,
        assignmentId: r.assignmentId,
        isNoticed: r.isNoticed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        assignment: {
          id: r.assignmentId,
          classroomId: r.assignmentClassroomId,
          title: r.assignmentTitle,
          dueDate: r.assignmentDueDate,
          article: { id: r.articleId, title: r.articleTitle },
          classroom: { classroomName: r.classroomName },
        },
        teacher: { id: r.teacherId, name: r.teacherName },
      }));

      return NextResponse.json({ success: true, data: notifications });
    }

    // Teacher view
    if (!["TEACHER", "ADMIN", "SYSTEM", "SUPERADMIN"].includes(user.role as string)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: assignmentNotifications.id,
        studentId: assignmentNotifications.studentId,
        teacherId: assignmentNotifications.teacherId,
        assignmentId: assignmentNotifications.assignmentId,
        isNoticed: assignmentNotifications.isNoticed,
        createdAt: assignmentNotifications.createdAt,
        updatedAt: assignmentNotifications.updatedAt,
        assignmentTitle: assignments.title,
        articleId: articles.id,
        articleTitle: articles.title,
        studentName: studentUsers.name,
      })
      .from(assignmentNotifications)
      .innerJoin(assignments, eq(assignmentNotifications.assignmentId, assignments.id))
      .leftJoin(articles, eq(assignments.articleId, articles.id))
      .leftJoin(studentUsers, eq(assignmentNotifications.studentId, studentUsers.id))
      .where(eq(assignmentNotifications.teacherId, userId))
      .orderBy(desc(assignmentNotifications.createdAt))
      .limit(100);

    const notifications = rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      teacherId: r.teacherId,
      assignmentId: r.assignmentId,
      isNoticed: r.isNoticed,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      assignment: {
        id: r.assignmentId,
        title: r.assignmentTitle,
        article: { id: r.articleId, title: r.articleTitle },
      },
      student: { id: r.studentId, name: r.studentName },
    }));

    const groupedNotifications = notifications.reduce((acc, notification) => {
      const aId = notification.assignmentId;
      if (!acc[aId]) {
        acc[aId] = { assignment: notification.assignment, notifications: [] };
      }
      acc[aId].notifications.push({
        id: notification.id,
        student: notification.student,
        isNoticed: notification.isNoticed,
        createdAt: notification.createdAt,
      });
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ success: true, data: Object.values(groupedNotifications) });
  } catch (error) {
    console.error("Error fetching assignment notifications:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function sendAssignmentNotifications(req: ExtendedNextRequest) {
  try {
    const user = req.session?.user;
    if (!user || !["TEACHER", "ADMIN", "SYSTEM", "SUPERADMIN"].includes(user.role as string)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { assignmentIds, studentIds } = body;
    const teacherId = user.id;

    if (!assignmentIds || !studentIds) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Validate assignments exist and teacher has access
    const assignmentRows = await db
      .select({ id: assignments.id, classroomId: assignments.classroomId })
      .from(assignments)
      .where(inArray(assignments.id, assignmentIds));

    if (assignmentRows.length !== assignmentIds.length) {
      return NextResponse.json({ success: false, message: "Some assignments not found" }, { status: 404 });
    }

    const classroomIds = [...new Set(assignmentRows.map((a) => a.classroomId))];

    // Get classroomTeachers and classroomStudents for all relevant classrooms
    const [ctRows, csRows, classroomRows] = await Promise.all([
      db.select({ classroomId: classroomTeachers.classroomId, teacherId: classroomTeachers.teacherId })
        .from(classroomTeachers).where(inArray(classroomTeachers.classroomId, classroomIds)),
      db.select({ classroomId: classroomStudents.classroomId, studentId: classroomStudents.studentId })
        .from(classroomStudents).where(inArray(classroomStudents.classroomId, classroomIds)),
      db.select({ id: classrooms.id, teacherId: classrooms.teacherId })
        .from(classrooms).where(inArray(classrooms.id, classroomIds)),
    ]);

    for (const assignment of assignmentRows) {
      const cTeachers = ctRows.filter((ct) => ct.classroomId === assignment.classroomId);
      const classroom = classroomRows.find((c) => c.id === assignment.classroomId);
      const isAuthorized =
        classroom?.teacherId === teacherId ||
        cTeachers.some((t) => t.teacherId === teacherId);

      if (!isAuthorized) {
        return NextResponse.json({ success: false, message: "Forbidden - Not authorized for this classroom" }, { status: 403 });
      }

      const validStudentIds = new Set(csRows.filter((cs) => cs.classroomId === assignment.classroomId).map((cs) => cs.studentId));
      for (const studentId of studentIds) {
        if (!validStudentIds.has(studentId)) {
          return NextResponse.json({ success: false, message: `Forbidden - Student ${studentId} not in classroom` }, { status: 403 });
        }
      }
    }

    const notificationsToCreate = [];
    for (const assignmentId of assignmentIds) {
      for (const studentId of studentIds) {
        notificationsToCreate.push({ assignmentId, studentId, teacherId, isNoticed: false });
      }
    }

    const inserted = await db
      .insert(assignmentNotifications)
      .values(notificationsToCreate)
      .onConflictDoNothing()
      .returning({ id: assignmentNotifications.id });

    return NextResponse.json({ success: true, message: `Sent ${inserted.length} notifications`, data: { count: inserted.length } });
  } catch (error) {
    console.error("Error sending assignment notifications:", error);
    return NextResponse.json({ success: false, message: "Failed to send notifications" }, { status: 500 });
  }
}

export async function updateNotificationStatus(req: ExtendedNextRequest) {
  try {
    const user = req.session?.user;
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { notificationId, isNoticed } = body;

    if (!notificationId || typeof isNoticed !== "boolean") {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(assignmentNotifications)
      .where(eq(assignmentNotifications.id, notificationId))
      .limit(1);

    if (!existing || existing.studentId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const [notification] = await db
      .update(assignmentNotifications)
      .set({ isNoticed })
      .where(eq(assignmentNotifications.id, notificationId))
      .returning();

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error updating notification status:", error);
    return NextResponse.json({ success: false, message: "Failed to update notification" }, { status: 500 });
  }
}

export async function getNotificationHistory(req: ExtendedNextRequest) {
  try {
    const user = req.session?.user;
    if (!user || !["TEACHER", "ADMIN", "SYSTEM", "SUPERADMIN"].includes(user.role as string)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json({ success: false, message: "Missing assignmentId" }, { status: 400 });
    }

    const [assignment] = await db
      .select({ id: assignments.id, classroomId: assignments.classroomId })
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .limit(1);

    if (!assignment) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    const [classroom] = await db
      .select({ id: classrooms.id, teacherId: classrooms.teacherId })
      .from(classrooms)
      .where(eq(classrooms.id, assignment.classroomId))
      .limit(1);

    const ctRows = await db
      .select({ teacherId: classroomTeachers.teacherId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.classroomId, assignment.classroomId));

    const isAuthorized =
      classroom?.teacherId === user.id || ctRows.some((t) => t.teacherId === user.id);

    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: assignmentNotifications.id,
        studentId: assignmentNotifications.studentId,
        teacherId: assignmentNotifications.teacherId,
        assignmentId: assignmentNotifications.assignmentId,
        isNoticed: assignmentNotifications.isNoticed,
        createdAt: assignmentNotifications.createdAt,
        updatedAt: assignmentNotifications.updatedAt,
        studentName: studentUsers.name,
        teacherName: teacherUsers.name,
      })
      .from(assignmentNotifications)
      .leftJoin(studentUsers, eq(assignmentNotifications.studentId, studentUsers.id))
      .leftJoin(teacherUsers, eq(assignmentNotifications.teacherId, teacherUsers.id))
      .where(eq(assignmentNotifications.assignmentId, assignmentId))
      .orderBy(desc(assignmentNotifications.createdAt));

    const notifications = rows.map((r) => ({
      ...r,
      student: { id: r.studentId, name: r.studentName },
      teacher: { id: r.teacherId, name: r.teacherName },
    }));

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notification history:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch notification history" }, { status: 500 });
  }
}
