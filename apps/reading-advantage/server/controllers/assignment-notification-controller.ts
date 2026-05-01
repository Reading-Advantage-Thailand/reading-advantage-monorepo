import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExtendedNextRequest } from "./auth-controller";

/**
 * Get assignment notifications
 * For students: Get their pending notifications
 * For teachers: Get notification history
 */
export async function getAssignmentNotifications(req: ExtendedNextRequest) {
  try {
    const user = req.session?.user;
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const history = searchParams.get("history") === "true";
    const userId = user.id;

    // Student view - get their unnoticed notifications
    if (!history) {
      const studentId = userId;
      const notifications = await prisma.assignmentNotification.findMany({
        where: {
          studentId,
          isNoticed: false,
        },
        include: {
          assignment: {
            include: {
              article: {
                select: {
                  title: true,
                  id: true,
                },
              },
              classroom: {
                select: {
                  classroomName: true,
                },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        data: notifications,
      });
    }

    // Teacher view - get notification history
    if (history) {
      if (!["TEACHER", "ADMIN", "SYSTEM", "SUPERADMIN"].includes(user.role as string)) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }

      const teacherId = userId;
      const notifications = await prisma.assignmentNotification.findMany({
        where: {
          teacherId,
        },
        include: {
          assignment: {
            include: {
              article: {
                select: {
                  title: true,
                  id: true,
                },
              },
            },
          },
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100, // Limit to last 100 notifications
      });

      // Group by assignment
      const groupedNotifications = notifications.reduce((acc, notification) => {
        const assignmentId = notification.assignmentId;
        if (!acc[assignmentId]) {
          acc[assignmentId] = {
            assignment: notification.assignment,
            notifications: [],
          };
        }
        acc[assignmentId].notifications.push({
          id: notification.id,
          student: notification.student,
          isNoticed: notification.isNoticed,
          createdAt: notification.createdAt,
        });
        return acc;
      }, {} as Record<string, any>);

      return NextResponse.json({
        success: true,
        data: Object.values(groupedNotifications),
      });
    }

    return NextResponse.json(
      { success: false, message: "Missing required parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching assignment notifications:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * Send assignment notifications to students
 * Body: { assignmentIds: string[], studentIds: string[], teacherId: string }
 */
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
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate that assignments exist and verify classroom scope
    const assignments = await prisma.assignment.findMany({
      where: {
        id: { in: assignmentIds },
      },
      include: {
        classroom: {
          include: {
            teachers: true,
            students: true,
          }
        }
      }
    });

    if (assignments.length !== assignmentIds.length) {
      return NextResponse.json(
        { success: false, message: "Some assignments not found" },
        { status: 404 }
      );
    }

    for (const assignment of assignments) {
      // Validate teacher has access to the classroom
      const isAuthorized =
        assignment.classroom.teacherId === teacherId ||
        assignment.classroom.teachers.some((t) => t.teacherId === teacherId);
      
      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, message: "Forbidden - Not authorized for this classroom" },
          { status: 403 }
        );
      }

      // Verify all studentIds belong to this classroom
      const validStudentIds = new Set(assignment.classroom.students.map(s => s.studentId));
      for (const studentId of studentIds) {
        if (!validStudentIds.has(studentId)) {
          return NextResponse.json(
            { success: false, message: `Forbidden - Student ${studentId} not in classroom` },
            { status: 403 }
          );
        }
      }
    }

    // Create notifications for each combination of assignment and student
    const notificationsToCreate = [];
    for (const assignmentId of assignmentIds) {
      for (const studentId of studentIds) {
        notificationsToCreate.push({
          assignmentId,
          studentId,
          teacherId,
          isNoticed: false,
        });
      }
    }

    // Use createMany with skipDuplicates to avoid errors if notification already exists
    const result = await prisma.assignmentNotification.createMany({
      data: notificationsToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      message: `Sent ${result.count} notifications`,
      data: { count: result.count },
    });
  } catch (error) {
    console.error("Error sending assignment notifications:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send notifications" },
      { status: 500 }
    );
  }
}

/**
 * Update notification status (mark as noticed)
 * Body: { notificationId: string, isNoticed: boolean }
 */
export async function updateNotificationStatus(req: ExtendedNextRequest) {
  try {
    const user = req.session?.user;
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { notificationId, isNoticed } = body;

    if (!notificationId || typeof isNoticed !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.assignmentNotification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.studentId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const notification = await prisma.assignmentNotification.update({
      where: {
        id: notificationId,
      },
      data: {
        isNoticed,
      },
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error updating notification status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update notification" },
      { status: 500 }
    );
  }
}

/**
 * Get notification history for a specific assignment
 * This shows which students have been notified and their status
 */
export async function getNotificationHistory(req: ExtendedNextRequest) {
  try {
    const user = req.session?.user;
    if (!user || !["TEACHER", "ADMIN", "SYSTEM", "SUPERADMIN"].includes(user.role as string)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "Missing assignmentId" },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        classroom: {
          include: { teachers: true }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    const isAuthorized =
      assignment.classroom.teacherId === user.id ||
      assignment.classroom.teachers.some((t) => t.teacherId === user.id);

    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const notifications = await prisma.assignmentNotification.findMany({
      where: {
        assignmentId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notification history:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notification history" },
      { status: 500 }
    );
  }
}
