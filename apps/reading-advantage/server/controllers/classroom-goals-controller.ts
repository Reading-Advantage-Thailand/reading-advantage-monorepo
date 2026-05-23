import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { db, eq, and, inArray } from "@reading-advantage/db";
import { classroomTeachers, classroomStudents, users, learningGoals } from "@reading-advantage/db/schema";
import { GoalsService } from "@/server/services/goals-service";
import { CreateGoalInput, UpdateGoalInput } from "@/types/learning-goals";

async function verifyTeacherAccess(teacherId: string, classroomId: string, role: string): Promise<boolean> {
  if (role === "SYSTEM" || role === "ADMIN") return true;

  const [row] = await db
    .select({ id: classroomTeachers.id })
    .from(classroomTeachers)
    .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, teacherId)))
    .limit(1);

  return !!row;
}

export async function getClassroomGoals(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];

    if (!classroomId) return NextResponse.json({ code: "BAD_REQUEST", message: "Classroom ID is required" }, { status: 400 });

    const hasAccess = await verifyTeacherAccess(session.user.id, classroomId, session.user.role);
    if (!hasAccess) return NextResponse.json({ code: "FORBIDDEN", message: "No access to this classroom" }, { status: 403 });

    const studentEnrollRows = await db
      .select({
        studentId: classroomStudents.studentId,
        studentName: users.name,
        studentEmail: users.email,
        studentImage: users.image,
      })
      .from(classroomStudents)
      .leftJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId));

    const studentIds = studentEnrollRows.map((r) => r.studentId);

    const goals =
      studentIds.length > 0
        ? await db
            .select()
            .from(learningGoals)
            .where(inArray(learningGoals.userId, studentIds))
            .orderBy(learningGoals.createdAt)
        : [];

    const goalGroups = new Map<
      string,
      {
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
      }
    >();

    for (const goal of goals) {
      const key = `${goal.title}|${goal.goalType}|${goal.targetValue}|${goal.targetDate.getTime()}`;
      const student = studentEnrollRows.find((r) => r.studentId === goal.userId);

      if (!goalGroups.has(key)) {
        goalGroups.set(key, {
          goalInfo: {
            id: goal.id,
            goalType: goal.goalType,
            title: goal.title,
            description: goal.description ?? null,
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
        studentName: student?.studentName ?? null,
        studentEmail: student?.studentEmail ?? null,
        studentImage: student?.studentImage ?? null,
        goalId: goal.id,
        currentValue: goal.currentValue,
        status: goal.status,
        completedAt: goal.completedAt ?? null,
      });
      group.totalStudents++;
      if (goal.status === "COMPLETED") group.completedCount++;
      if (goal.status === "ACTIVE") group.activeCount++;
    }

    goalGroups.forEach((group) => {
      const totalProgress = group.students.reduce(
        (sum, s) => sum + (s.currentValue / group.goalInfo.targetValue) * 100,
        0
      );
      group.averageProgress = group.totalStudents > 0 ? totalProgress / group.totalStudents : 0;
    });

    const groupedGoals = Array.from(goalGroups.values());

    return NextResponse.json({ success: true, data: groupedGoals, total: groupedGoals.length });
  } catch (error) {
    console.error("Error fetching classroom goals:", error);
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function createClassroomGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];

    if (!classroomId) return NextResponse.json({ code: "BAD_REQUEST", message: "Classroom ID is required" }, { status: 400 });

    const hasAccess = await verifyTeacherAccess(session.user.id, classroomId, session.user.role);
    if (!hasAccess) return NextResponse.json({ code: "FORBIDDEN", message: "No access to this classroom" }, { status: 403 });

    const body = (await req.json()) as CreateGoalInput;

    const enrollRows = await db
      .select({ studentId: classroomStudents.studentId })
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, classroomId));

    if (enrollRows.length === 0) {
      return NextResponse.json({ code: "BAD_REQUEST", message: "No students in this classroom" }, { status: 400 });
    }

    const goals = await Promise.all(enrollRows.map((r) => GoalsService.createGoal(r.studentId, body)));

    return NextResponse.json(
      { success: true, message: `Created goal for ${goals.length} students`, count: goals.length, goals },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating classroom goal:", error);
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Failed to create goal" }, { status: 500 });
  }
}

export async function updateClassroomGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!classroomId || !goalId) {
      return NextResponse.json({ code: "BAD_REQUEST", message: "Classroom ID and Goal ID are required" }, { status: 400 });
    }

    const hasAccess = await verifyTeacherAccess(session.user.id, classroomId, session.user.role);
    if (!hasAccess) return NextResponse.json({ code: "FORBIDDEN", message: "No access to this classroom" }, { status: 403 });

    const [goal] = await db.select().from(learningGoals).where(eq(learningGoals.id, goalId)).limit(1);

    if (!goal) return NextResponse.json({ code: "NOT_FOUND", message: "Goal not found" }, { status: 404 });

    const [enrollRow] = await db
      .select({ studentId: classroomStudents.studentId })
      .from(classroomStudents)
      .where(and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.studentId, goal.userId)))
      .limit(1);

    if (!enrollRow) return NextResponse.json({ code: "FORBIDDEN", message: "Student not in this classroom" }, { status: 403 });

    const body = (await req.json()) as UpdateGoalInput;

    await GoalsService.updateGoal(goalId, goal.userId, body);

    const updatedGoal = await GoalsService.getGoalById(goalId, goal.userId);

    return NextResponse.json({ success: true, goal: updatedGoal });
  } catch (error) {
    console.error("Error updating classroom goal:", error);
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Failed to update goal" }, { status: 500 });
  }
}

export async function deleteClassroomGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const classroomIndex = pathParts.indexOf("classroom");
    const classroomId = pathParts[classroomIndex + 1];
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!classroomId || !goalId) {
      return NextResponse.json({ code: "BAD_REQUEST", message: "Classroom ID and Goal ID are required" }, { status: 400 });
    }

    const hasAccess = await verifyTeacherAccess(session.user.id, classroomId, session.user.role);
    if (!hasAccess) return NextResponse.json({ code: "FORBIDDEN", message: "No access to this classroom" }, { status: 403 });

    const [goal] = await db.select().from(learningGoals).where(eq(learningGoals.id, goalId)).limit(1);

    if (!goal) return NextResponse.json({ code: "NOT_FOUND", message: "Goal not found" }, { status: 404 });

    const [enrollRow] = await db
      .select({ studentId: classroomStudents.studentId })
      .from(classroomStudents)
      .where(and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.studentId, goal.userId)))
      .limit(1);

    if (!enrollRow) return NextResponse.json({ code: "FORBIDDEN", message: "Student not in this classroom" }, { status: 403 });

    await GoalsService.deleteGoal(goalId, goal.userId);

    return NextResponse.json({ success: true, message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Error deleting classroom goal:", error);
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Failed to delete goal" }, { status: 500 });
  }
}
