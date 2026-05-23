import { NextResponse } from "next/server";
import { db, eq, and, inArray, desc } from "@reading-advantage/db";
import { assignments, articles, classrooms, classroomTeachers, classroomStudents, studentAssignments, users } from "@reading-advantage/db/schema";
import { ExtendedNextRequest } from "./auth-controller";
import { getCurrentUser } from "@/lib/session";

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  classroomId: string;
  classroomName: string;
  grade: number | null;
  assignmentId: string;
  assignmentTitle: string | null;
  assignmentDescription: string | null;
  articleId: string;
  articleTitle: string;
  dueDate: Date | null;
  createdAt: Date;
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  notStartedStudents: number;
}

export async function getTeacherAssignments(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "SYSTEM")) {
      return NextResponse.json({ message: "Unauthorized. Admin, System, or Teacher access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const teacherFilter = searchParams.get("teacherId");
    const classroomFilter = searchParams.get("classroomId");
    const teacherName = searchParams.get("teacherName");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const isSystemOrAdmin = user.role === "SYSTEM" || user.role === "ADMIN";

    // Determine which classroom IDs to query
    let classroomIdFilter: string[] | null = null;

    if (classroomFilter) {
      classroomIdFilter = [classroomFilter];
    } else if (!isSystemOrAdmin && user.role === "TEACHER" && !teacherFilter) {
      // Teachers see only their own classrooms
      const ctRows = await db
        .select({ classroomId: classroomTeachers.classroomId })
        .from(classroomTeachers)
        .where(eq(classroomTeachers.teacherId, user.id));
      classroomIdFilter = ctRows.map((r) => r.classroomId);
    }

    if (classroomIdFilter !== null && classroomIdFilter.length === 0) {
      return NextResponse.json({
        data: [], pagination: { currentPage: page, totalPages: 0, totalCount: 0, limit, hasNextPage: false, hasPreviousPage: false },
        summary: { uniqueTeachers: 0, totalAssignments: 0, averageAssignmentsPerTeacher: 0, totalStudentsAffected: 0 },
      });
    }

    // Fetch assignments with article and classroom info
    const baseAssignments = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        classroomId: assignments.classroomId,
        articleId: assignments.articleId,
        dueDate: assignments.dueDate,
        createdAt: assignments.createdAt,
        classroomName: classrooms.name,
        classroomGrade: classrooms.grade,
        classroomTeacherId: classrooms.teacherId,
        articleTitle: articles.title,
      })
      .from(assignments)
      .innerJoin(classrooms, eq(assignments.classroomId, classrooms.id))
      .innerJoin(articles, eq(assignments.articleId, articles.id))
      .where(classroomIdFilter ? inArray(assignments.classroomId, classroomIdFilter) : undefined)
      .orderBy(desc(assignments.createdAt));

    if (baseAssignments.length === 0) {
      return NextResponse.json({
        data: [], pagination: { currentPage: page, totalPages: 0, totalCount: 0, limit, hasNextPage: false, hasPreviousPage: false },
        summary: { uniqueTeachers: 0, totalAssignments: 0, averageAssignmentsPerTeacher: 0, totalStudentsAffected: 0 },
      });
    }

    const allClassroomIds = [...new Set(baseAssignments.map((a) => a.classroomId))];
    const allAssignmentIds = baseAssignments.map((a) => a.id);

    // Batch fetch classroomTeachers with teacher info
    const ctRows = await db
      .select({
        classroomId: classroomTeachers.classroomId,
        teacherId: users.id,
        teacherName: users.name,
        teacherEmail: users.email,
      })
      .from(classroomTeachers)
      .innerJoin(users, eq(classroomTeachers.teacherId, users.id))
      .where(inArray(classroomTeachers.classroomId, allClassroomIds));

    // Also get primary teachers (from classrooms.teacherId) in case not in classroomTeachers
    const primaryTeacherIds = [...new Set(baseAssignments.map((a) => a.classroomTeacherId).filter(Boolean))] as string[];
    const primaryTeacherRows = primaryTeacherIds.length > 0
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, primaryTeacherIds))
      : [];

    // Batch fetch student counts per classroom
    const csRows = await db
      .select({ classroomId: classroomStudents.classroomId, studentId: classroomStudents.studentId })
      .from(classroomStudents)
      .where(inArray(classroomStudents.classroomId, allClassroomIds));

    // Batch fetch student assignment statuses
    const saRows = await db
      .select({ assignmentId: studentAssignments.assignmentId, studentId: studentAssignments.studentId, status: studentAssignments.status })
      .from(studentAssignments)
      .where(inArray(studentAssignments.assignmentId, allAssignmentIds));

    // Build lookup maps
    const ctByClassroom = new Map<string, { teacherId: string; teacherName: string | null; teacherEmail: string }[]>();
    for (const r of ctRows) {
      if (!ctByClassroom.has(r.classroomId)) ctByClassroom.set(r.classroomId, []);
      ctByClassroom.get(r.classroomId)!.push({ teacherId: r.teacherId, teacherName: r.teacherName, teacherEmail: r.teacherEmail });
    }

    const primaryTeacherMap = new Map(primaryTeacherRows.map((t) => [t.id, t]));
    const studentCountByClassroom = new Map<string, number>();
    for (const cs of csRows) {
      studentCountByClassroom.set(cs.classroomId, (studentCountByClassroom.get(cs.classroomId) ?? 0) + 1);
    }

    const teacherAssignmentsMap = new Map<string, TeacherAssignment[]>();

    for (const assignment of baseAssignments) {
      const classTeachers = ctByClassroom.get(assignment.classroomId) ?? [];

      // Build de-duped teacher list
      const allTeachers: Array<{ id: string; name: string | null; email: string }> = classTeachers.map((ct) => ({
        id: ct.teacherId,
        name: ct.teacherName,
        email: ct.teacherEmail,
      }));

      const primaryTeacher = assignment.classroomTeacherId ? primaryTeacherMap.get(assignment.classroomTeacherId) : undefined;
      if (primaryTeacher && !allTeachers.some((t) => t.id === primaryTeacher.id)) {
        allTeachers.push({ id: primaryTeacher.id, name: primaryTeacher.name, email: primaryTeacher.email });
      }

      const assignmentSAs = saRows.filter((sa) => sa.assignmentId === assignment.id);
      const completedCount = assignmentSAs.filter((sa) => sa.status === "COMPLETED").length;
      const inProgressCount = assignmentSAs.filter((sa) => sa.status === "IN_PROGRESS").length;
      const notStartedCount = assignmentSAs.filter((sa) => sa.status === "NOT_STARTED").length;
      const totalStudents = studentCountByClassroom.get(assignment.classroomId) ?? 0;

      for (const teacher of allTeachers) {
        if (teacherFilter && teacher.id !== teacherFilter) continue;
        if (teacherName && !teacher.name?.toLowerCase().includes(teacherName.toLowerCase())) continue;

        const ta: TeacherAssignment = {
          id: `${teacher.id}-${assignment.id}`,
          teacherId: teacher.id,
          teacherName: teacher.name || "Unknown",
          teacherEmail: teacher.email,
          classroomId: assignment.classroomId,
          classroomName: assignment.classroomName || "Unknown",
          grade: assignment.classroomGrade,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentDescription: assignment.description,
          articleId: assignment.articleId ?? "",
          articleTitle: assignment.articleTitle || "Untitled",
          dueDate: assignment.dueDate,
          createdAt: assignment.createdAt,
          totalStudents,
          completedStudents: completedCount,
          inProgressStudents: inProgressCount,
          notStartedStudents: notStartedCount,
        };

        if (!teacherAssignmentsMap.has(teacher.id)) teacherAssignmentsMap.set(teacher.id, []);
        teacherAssignmentsMap.get(teacher.id)!.push(ta);
      }
    }

    let allTeacherAssignments: TeacherAssignment[] = [];
    teacherAssignmentsMap.forEach((tas) => allTeacherAssignments.push(...tas));
    allTeacherAssignments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalCount = allTeacherAssignments.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const paginatedAssignments = allTeacherAssignments.slice(startIndex, startIndex + limit);

    const uniqueTeachers = new Set(allTeacherAssignments.map((a) => a.teacherId)).size;
    const totalAssignments = allTeacherAssignments.length;
    const averageAssignmentsPerTeacher = uniqueTeachers > 0 ? totalAssignments / uniqueTeachers : 0;
    const totalStudentsAffected = allTeacherAssignments.reduce((sum, a) => sum + a.totalStudents, 0);

    return NextResponse.json({
      data: paginatedAssignments,
      pagination: { currentPage: page, totalPages, totalCount, limit, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
      summary: { uniqueTeachers, totalAssignments, averageAssignmentsPerTeacher: Math.round(averageAssignmentsPerTeacher * 10) / 10, totalStudentsAffected },
    });
  } catch (error: any) {
    console.error("Error in getTeacherAssignments:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
