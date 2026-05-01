import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
      return NextResponse.json(
        { error: "Missing classroomId" },
        { status: 400 }
      );
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        classroomId: classroomId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Missing classroomId or assignmentId" },
        { status: 400 }
      );
    }

    // Get all students in the classroom with their assignment status
    const students = await prisma.classroomStudent.findMany({
      where: {
        classroomId: classroomId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get student assignments for this assignment
    const studentAssignments = await prisma.studentAssignment.findMany({
      where: {
        assignmentId: assignmentId,
      },
    });

    // Map students with their completion status
    const studentsWithStatus = students.map((cs) => {
      const assignment = studentAssignments.find(
        (sa) => sa.studentId === cs.student.id
      );

      return {
        id: cs.student.id,
        name: cs.student.name || "Unknown",
        email: cs.student.email,
        isCompleted: assignment?.status === "COMPLETED",
      };
    });

    return NextResponse.json(studentsWithStatus);
  } catch (error) {
    console.error("Error fetching students for assignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Missing classroomId" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { assignmentIds, studentIds } = body;

    if (
      !assignmentIds ||
      !Array.isArray(assignmentIds) ||
      assignmentIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid assignmentIds" },
        { status: 400 }
      );
    }

    let targetStudentIds: string[] = studentIds;

    // ถ้าไม่มี studentIds ให้ดึงนักเรียนที่ยังทำไม่เสร็จจากการบ้านทั้งหมดที่เลือก
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      // ดึงนักเรียนทั้งหมดในห้องเรียน
      const classroomStudents = await prisma.classroomStudent.findMany({
        where: {
          classroomId,
        },
        select: {
          studentId: true,
        },
      });

      const allStudentIds = classroomStudents.map((cs) => cs.studentId);

      // ดึงนักเรียนที่ทำเสร็จแล้วจากการบ้านที่เลือก
      const completedRecords = await prisma.studentAssignment.findMany({
        where: {
          studentId: {
            in: allStudentIds,
          },
          assignmentId: {
            in: assignmentIds,
          },
          status: "COMPLETED",
        },
        select: {
          studentId: true,
        },
        distinct: ["studentId"],
      });

      const completedStudentIds = completedRecords.map(
        (record) => record.studentId
      );

      // หานักเรียนที่ยังไม่ได้ทำ (นักเรียนทั้งหมด ลบด้วยนักเรียนที่ทำเสร็จแล้ว)
      targetStudentIds = allStudentIds.filter(
        (studentId) => !completedStudentIds.includes(studentId)
      );

      if (targetStudentIds.length === 0) {
        return NextResponse.json(
          { success: true, count: 0, message: "No incomplete students found" },
          { status: 200 }
        );
      }
    }

    // Create notifications for each combination of assignment and student
    const notifications = [];
    for (const assignmentId of assignmentIds) {
      for (const studentId of targetStudentIds) {
        notifications.push({
          teacherId: user.id,
          studentId,
          assignmentId,
          isNoticed: false,
        });
      }
    }

    const result = await prisma.assignmentNotification.createMany({
      data: notifications,
      skipDuplicates: true, // Skip if notification already exists
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Error sending assignment notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Missing classroomId" },
        { status: 400 }
      );
    }

    // Get notification history for this classroom
    const notifications = await prisma.assignmentNotification.findMany({
      where: {
        assignment: {
          classroomId: classroomId,
        },
      },
      include: {
        assignment: {
          select: {
            title: true,
          },
        },
        student: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by assignment and createdAt (same batch)
    const grouped = notifications.reduce((acc: any[], notif) => {
      const key = `${notif.assignmentId}-${notif.createdAt.toISOString()}`;
      const existing = acc.find((item) => item.key === key);

      if (existing) {
        existing.studentCount++;
        existing.notifiedStudents.push(notif.student.name || "Unknown");
      } else {
        acc.push({
          key,
          id: notif.id,
          assignmentTitle: notif.assignment.title || "Untitled",
          studentCount: 1,
          createdAt: notif.createdAt,
          notifiedStudents: [notif.student.name || "Unknown"],
        });
      }

      return acc;
    }, []);

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Error fetching notification history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
