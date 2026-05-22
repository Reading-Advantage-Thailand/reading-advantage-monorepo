import { NextResponse } from "next/server";
import { db, eq, and, desc } from "@reading-advantage/db";
import {
  assignmentNotifications,
  assignments,
  users,
} from "@reading-advantage/db/schema";
import { ExtendedNextRequest } from "./auth-controller";

/**
 * Get unread assignment notifications for a student
 */
export async function getStudentUnreadNotifications(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await ctx.params;
  try {

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    const notifications = await db
      .select({
        id: assignmentNotifications.id,
        teacherId: assignmentNotifications.teacherId,
        studentId: assignmentNotifications.studentId,
        assignmentId: assignmentNotifications.assignmentId,
        isNoticed: assignmentNotifications.isNoticed,
        createdAt: assignmentNotifications.createdAt,
        updatedAt: assignmentNotifications.updatedAt,
        assignment: {
          id: assignments.id,
          title: assignments.title,
          description: assignments.description,
          dueDate: assignments.dueDate,
          articleId: assignments.articleId,
        },
        teacher: {
          name: users.name,
        },
      })
      .from(assignmentNotifications)
      .leftJoin(assignments, eq(assignmentNotifications.assignmentId, assignments.id))
      .leftJoin(users, eq(assignmentNotifications.teacherId, users.id))
      .where(
        and(
          eq(assignmentNotifications.studentId, studentId),
          eq(assignmentNotifications.isNoticed, false),
        )
      )
      .orderBy(desc(assignmentNotifications.createdAt));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check if there's an unread notification for a specific assignment
 */
export async function checkStudentAssignmentNotification(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ studentId: string; assignmentId: string }> }
) {
  const { studentId, assignmentId } = await ctx.params;
  try {

    if (!studentId || !assignmentId) {
      return NextResponse.json(
        { error: "Missing studentId or assignmentId" },
        { status: 400 }
      );
    }

    const [notification] = await db
      .select()
      .from(assignmentNotifications)
      .where(
        and(
          eq(assignmentNotifications.studentId, studentId),
          eq(assignmentNotifications.assignmentId, assignmentId),
          eq(assignmentNotifications.isNoticed, false),
        )
      )
      .limit(1);

    return NextResponse.json({
      hasNotification: !!notification,
    });
  } catch (error) {
    console.error("Error checking assignment notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Mark a notification as acknowledged (noticed)
 */
export async function acknowledgeNotification(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ studentId: string; notificationId: string }> }
) {
  const { studentId, notificationId } = await ctx.params;
  try {

    if (!studentId || !notificationId) {
      return NextResponse.json(
        { error: "Missing studentId or notificationId" },
        { status: 400 }
      );
    }

    const [notification] = await db
      .update(assignmentNotifications)
      .set({ isNoticed: true, updatedAt: new Date() })
      .where(
        and(
          eq(assignmentNotifications.id, notificationId),
          eq(assignmentNotifications.studentId, studentId),
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Error acknowledging notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
