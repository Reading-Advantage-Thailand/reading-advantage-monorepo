import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { GoalsService } from "@/server/services/goals-service";
import { CreateGoalInput, UpdateGoalInput } from "@/types/learning-goals";

/**
 * Verify teacher has access to classroom
 */
async function verifyTeacherAccess(
  teacherId: string,
  classroomId: string,
  role: Role
): Promise<boolean> {
  // SYSTEM and ADMIN have access to all classrooms
  if (role === Role.SYSTEM || role === Role.ADMIN) {
    return true;
  }

  // Check if teacher is assigned to this classroom
  const classroomTeacher = await prisma.classroomTeacher.findFirst({
    where: {
      classroomId,
      teacherId,
    },
  });

  return !!classroomTeacher;
}

/**
 * Get all goals for students in a classroom (grouped by goal type/title)
 */
export async function getClassroomGoals(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract classroomId from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];

    if (!classroomId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Classroom ID is required" },
        { status: 400 }
      );
    }

    // Verify teacher access
    const hasAccess = await verifyTeacherAccess(
      session.user.id,
      classroomId,
      session.user.role
    );

    if (!hasAccess) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "No access to this classroom" },
        { status: 403 }
      );
    }

    // Get all students in the classroom
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Get goals for all students
    const studentIds = classroomStudents.map((cs) => cs.studentId);
    
    const goals = await prisma.learningGoal.findMany({
      where: {
        userId: { in: studentIds },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    // Group goals by similar characteristics (title, goalType, targetValue, targetDate)
    // to identify goals that were created for the whole class
    const goalGroups = new Map<string, {
      goalInfo: {
        id: string;
        goalType: string;
        title: string;
        description: string | null;
        targetValue: number;
        unit: string;
        targetDate: Date;
        priority: string;
        createdAt: Date;
      };
      students: {
        studentId: string;
        studentName: string | null;
        studentEmail: string | null;
        studentImage: string | null;
        goalId: string;
        currentValue: number;
        status: string;
        completedAt: Date | null;
      }[];
      totalStudents: number;
      completedCount: number;
      activeCount: number;
      averageProgress: number;
    }>();

    goals.forEach((goal) => {
      // Create a key based on goal characteristics
      const key = `${goal.title}|${goal.goalType}|${goal.targetValue}|${goal.targetDate.getTime()}`;
      
      const student = classroomStudents.find((cs) => cs.studentId === goal.userId);
      
      if (!goalGroups.has(key)) {
        goalGroups.set(key, {
          goalInfo: {
            id: goal.id, // Use first goal's ID as representative
            goalType: goal.goalType,
            title: goal.title,
            description: goal.description,
            targetValue: goal.targetValue,
            unit: goal.unit,
            targetDate: goal.targetDate,
            priority: goal.priority,
            createdAt: goal.createdAt,
          },
          students: [],
          totalStudents: 0,
          completedCount: 0,
          activeCount: 0,
          averageProgress: 0,
        });
      }

      const group = goalGroups.get(key)!;
      group.students.push({
        studentId: goal.userId,
        studentName: student?.student.name || null,
        studentEmail: student?.student.email || null,
        studentImage: student?.student.image || null,
        goalId: goal.id,
        currentValue: goal.currentValue,
        status: goal.status,
        completedAt: goal.completedAt,
      });
      group.totalStudents++;
      if (goal.status === "COMPLETED") group.completedCount++;
      if (goal.status === "ACTIVE") group.activeCount++;
    });

    // Calculate average progress for each group
    goalGroups.forEach((group) => {
      const totalProgress = group.students.reduce((sum, student) => {
        return sum + (student.currentValue / group.goalInfo.targetValue) * 100;
      }, 0);
      group.averageProgress = group.totalStudents > 0 ? totalProgress / group.totalStudents : 0;
    });

    // Convert map to array
    const groupedGoals = Array.from(goalGroups.values());

    return NextResponse.json({
      success: true,
      data: groupedGoals,
      total: groupedGoals.length,
    });
  } catch (error) {
    console.error("Error fetching classroom goals:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

/**
 * Create a goal for all students in the classroom
 */
export async function createClassroomGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract classroomId from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];

    if (!classroomId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Classroom ID is required" },
        { status: 400 }
      );
    }

    // Verify teacher access
    const hasAccess = await verifyTeacherAccess(
      session.user.id,
      classroomId,
      session.user.role
    );

    if (!hasAccess) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "No access to this classroom" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as CreateGoalInput;

    // Get all students in the classroom
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      select: { studentId: true },
    });

    if (classroomStudents.length === 0) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "No students in this classroom" },
        { status: 400 }
      );
    }

    // Create goal for all students
    const goals = await Promise.all(
      classroomStudents.map((cs) =>
        GoalsService.createGoal(cs.studentId, body)
      )
    );

    return NextResponse.json(
      {
        success: true,
        message: `Created goal for ${goals.length} students`,
        count: goals.length,
        goals,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating classroom goal:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to create goal" },
      { status: 500 }
    );
  }
}

/**
 * Update a goal for a student in the classroom
 */
export async function updateClassroomGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract classroomId and goalId from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!classroomId || !goalId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Classroom ID and Goal ID are required" },
        { status: 400 }
      );
    }

    // Verify teacher access
    const hasAccess = await verifyTeacherAccess(
      session.user.id,
      classroomId,
      session.user.role
    );

    if (!hasAccess) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "No access to this classroom" },
        { status: 403 }
      );
    }

    // Get the goal and verify student is in classroom
    const goal = await prisma.learningGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Goal not found" },
        { status: 404 }
      );
    }

    const classroomStudent = await prisma.classroomStudent.findFirst({
      where: {
        classroomId,
        studentId: goal.userId,
      },
    });

    if (!classroomStudent) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Student not in this classroom" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as UpdateGoalInput;

    await GoalsService.updateGoal(goalId, goal.userId, body);

    // Fetch updated goal
    const updatedGoal = await GoalsService.getGoalById(goalId, goal.userId);

    return NextResponse.json({
      success: true,
      goal: updatedGoal,
    });
  } catch (error) {
    console.error("Error updating classroom goal:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to update goal" },
      { status: 500 }
    );
  }
}

/**
 * Delete a goal for a student in the classroom
 */
export async function deleteClassroomGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract classroomId and goalId from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!classroomId || !goalId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Classroom ID and Goal ID are required" },
        { status: 400 }
      );
    }

    // Verify teacher access
    const hasAccess = await verifyTeacherAccess(
      session.user.id,
      classroomId,
      session.user.role
    );

    if (!hasAccess) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "No access to this classroom" },
        { status: 403 }
      );
    }

    // Get the goal and verify student is in classroom
    const goal = await prisma.learningGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Goal not found" },
        { status: 404 }
      );
    }

    const classroomStudent = await prisma.classroomStudent.findFirst({
      where: {
        classroomId,
        studentId: goal.userId,
      },
    });

    if (!classroomStudent) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Student not in this classroom" },
        { status: 403 }
      );
    }

    await GoalsService.deleteGoal(goalId, goal.userId);

    return NextResponse.json({
      success: true,
      message: "Goal deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting classroom goal:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
