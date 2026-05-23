import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { TeacherOverviewResponse, TeacherClassesResponse, TeacherClass } from "@/types/dashboard";
import { db, eq, and, gte, inArray, desc, sql } from "@reading-advantage/db";
import {
  users,
  schools,
  classroomTeachers,
  classrooms,
  classroomStudents,
  userActivity,
  assignments,
  studentAssignments,
} from "@reading-advantage/db/schema";

function convertToCSV(classes: TeacherClass[]): string {
  const headers = ["Class ID", "Class Name", "Class Code", "Student Count", "Active Students (7d)", "Average Level", "Total XP", "Created At", "Status"];
  const rows = classes.map((c) => [
    c.id, c.name, c.classCode, c.studentCount.toString(), c.activeStudents7d.toString(),
    c.averageLevel.toString(), c.totalXp.toString(), c.createdAt, c.archived ? "Archived" : "Active",
  ]);
  return [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => (cell.includes(",") || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(",")
    ),
  ].join("\n");
}

export async function getTeacherOverview(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole !== "TEACHER" && userRole !== "ADMIN" && userRole !== "SYSTEM") {
      return NextResponse.json({ code: "FORBIDDEN", message: "Access denied" }, { status: 403 });
    }

    const [teacher] = await db
      .select({ id: users.id, name: users.name, email: users.email, schoolId: users.schoolId })
      .from(users).where(eq(users.id, userId)).limit(1);

    if (!teacher) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Teacher not found" }, { status: 404 });
    }

    let schoolName: string | undefined;
    if (teacher.schoolId) {
      const [school] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, teacher.schoolId)).limit(1);
      schoolName = school?.name;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get teacher's classrooms
    const ctRows = await db
      .select({ classroomId: classroomTeachers.classroomId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.teacherId, userId));

    const classroomIds = ctRows.map((r) => r.classroomId);

    // Get students across all classrooms
    const studentRows = classroomIds.length > 0
      ? await db
          .select({ classroomId: classroomStudents.classroomId, studentId: classroomStudents.studentId, level: users.level })
          .from(classroomStudents)
          .innerJoin(users, eq(classroomStudents.studentId, users.id))
          .where(inArray(classroomStudents.classroomId, classroomIds))
      : [];

    const allStudentIds = [...new Set(studentRows.map((s) => s.studentId))];

    // Recent activity for active-student computation
    const recentActivityRows = allStudentIds.length > 0
      ? await db
          .select({ userId: userActivity.userId, createdAt: userActivity.createdAt })
          .from(userActivity)
          .where(and(inArray(userActivity.userId, allStudentIds), gte(userActivity.createdAt, thirtyDaysAgo)))
      : [];

    const activeStudents30d = new Set(recentActivityRows.map((a) => a.userId)).size;
    const todayActivityIds = new Set(
      recentActivityRows.filter((a) => new Date(a.createdAt) >= todayStart).map((a) => a.userId)
    );

    // Get all assignments + student assignments
    const assignmentRows = classroomIds.length > 0
      ? await db.select({ id: assignments.id }).from(assignments).where(inArray(assignments.classroomId, classroomIds))
      : [];
    const assignmentIds = assignmentRows.map((a) => a.id);

    const saRows = assignmentIds.length > 0
      ? await db
          .select({ assignmentId: studentAssignments.assignmentId, studentId: studentAssignments.studentId, status: studentAssignments.status, updatedAt: studentAssignments.completedAt })
          .from(studentAssignments)
          .where(inArray(studentAssignments.assignmentId, assignmentIds))
      : [];

    // Count pending assignments (assignments with at least one incomplete SA)
    const pendingAssignments = assignmentIds.filter((aId) => {
      const sas = saRows.filter((sa) => sa.assignmentId === aId);
      return sas.some((sa) => sa.status !== "COMPLETED");
    }).length;

    const assignmentsCompletedToday = saRows.filter(
      (sa) => sa.status === "COMPLETED" && sa.updatedAt && new Date(sa.updatedAt) >= todayStart
    ).length;

    const uniqueStudentIds = new Set(allStudentIds);
    const totalStudents = uniqueStudentIds.size;
    const avgLevel = allStudentIds.length > 0
      ? studentRows.reduce((sum, s) => sum + (s.level || 0), 0) / studentRows.length
      : 0;

    const response: TeacherOverviewResponse = {
      teacher: { id: teacher.id, name: teacher.name || "", email: teacher.email, schoolId: teacher.schoolId || undefined, schoolName },
      summary: {
        totalClasses: classroomIds.length,
        totalStudents,
        activeStudents30d,
        averageClassLevel: Math.round(avgLevel * 10) / 10,
        pendingAssignments,
      },
      recentActivity: { studentsActiveToday: todayActivityIds.size, assignmentsCompletedToday },
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;
    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240", "X-Response-Time": `${duration}ms` },
    });
  } catch (error) {
    console.error("[Controller] getTeacherOverview - Error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch teacher overview", details: error instanceof Error ? { error: error.message } : {} },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}

export async function getTeacherClasses(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole !== "TEACHER" && userRole !== "ADMIN" && userRole !== "SYSTEM") {
      return NextResponse.json({ code: "FORBIDDEN", message: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get teacher's classrooms
    const ctRows = await db
      .select({ classroomId: classroomTeachers.classroomId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.teacherId, userId));

    const classroomIds = ctRows.map((r) => r.classroomId);

    if (classroomIds.length === 0) {
      const response: TeacherClassesResponse = {
        classes: [],
        summary: { total: 0, active: 0, archived: 0 },
        cache: { cached: false, generatedAt: new Date().toISOString() },
      };
      return NextResponse.json(response);
    }

    // Get classroom details
    const classroomRows = await db
      .select()
      .from(classrooms)
      .where(inArray(classrooms.id, classroomIds));

    // Get students per classroom with level/xp
    const studentRows = await db
      .select({
        classroomId: classroomStudents.classroomId,
        studentId: classroomStudents.studentId,
        level: users.level,
        xp: users.xp,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(inArray(classroomStudents.classroomId, classroomIds));

    const allStudentIds = [...new Set(studentRows.map((s) => s.studentId))];

    // Get recent activity (last 7 days) to find active students
    const activeStudentIds = allStudentIds.length > 0
      ? new Set(
          (await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(and(inArray(userActivity.userId, allStudentIds), gte(userActivity.createdAt, sevenDaysAgo)))
          ).map((r) => r.userId)
        )
      : new Set<string>();

    const classes: TeacherClass[] = classroomRows.map((classroom) => {
      const students = studentRows.filter((s) => s.classroomId === classroom.id);
      const activeStudents7d = students.filter((s) => activeStudentIds.has(s.studentId)).length;
      const avgLevel = students.length > 0 ? students.reduce((sum, s) => sum + (s.level || 0), 0) / students.length : 0;
      const totalXp = students.reduce((sum, s) => sum + (s.xp || 0), 0);

      return {
        id: classroom.id,
        name: classroom.name || "Unnamed Class",
        classCode: classroom.classCode || "",
        studentCount: students.length,
        activeStudents7d,
        averageLevel: Math.round(avgLevel * 10) / 10,
        totalXp,
        createdAt: classroom.createdAt.toISOString(),
        archived: classroom.archived || false,
      };
    });

    classes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (format === "csv") {
      const csv = convertToCSV(classes);
      const duration = Date.now() - startTime;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="teacher-classes-${new Date().toISOString().split("T")[0]}.csv"`,
          "X-Response-Time": `${duration}ms`,
        },
      });
    }

    const response: TeacherClassesResponse = {
      classes,
      summary: {
        total: classes.length,
        active: classes.filter((c) => !c.archived).length,
        archived: classes.filter((c) => c.archived).length,
      },
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;
    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240", "X-Response-Time": `${duration}ms` },
    });
  } catch (error) {
    console.error("[Controller] getTeacherClasses - Error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch teacher classes", details: error instanceof Error ? { error: error.message } : {} },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}
