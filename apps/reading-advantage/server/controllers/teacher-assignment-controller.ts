import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExtendedNextRequest } from "./auth-controller";
import { getCurrentUser } from "@/lib/session";
import { Role, Status } from "@prisma/client";

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

    // Check if user is admin, system, or teacher with appropriate permissions
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.TEACHER && user.role !== Role.SYSTEM)) {
      return NextResponse.json(
        { message: "Unauthorized. Admin, System, or Teacher access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const teacherFilter = searchParams.get("teacherId");
    const classroomFilter = searchParams.get("classroomId");
    const teacherName = searchParams.get("teacherName");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build where clause for assignments
    let assignmentWhere: any = {};

    if (classroomFilter) {
      assignmentWhere.classroomId = classroomFilter;
    }

    // For non-SYSTEM users (teachers), only show their own assignments
    // SYSTEM and ADMIN users can see all teachers
    const isSystemOrAdmin = user.role === Role.SYSTEM || user.role === Role.ADMIN;
    if (!isSystemOrAdmin && user.role === Role.TEACHER) {
      // Teachers can only see their own assignments unless filtered otherwise
      if (!teacherFilter) {
        // If no teacher filter is specified, default to current user's assignments
        assignmentWhere.classroom = {
          teachers: {
            some: {
              teacherId: user.id
            }
          }
        };
      }
    }

    // Get all assignments with related data
    const assignments = await prisma.assignment.findMany({
      where: assignmentWhere,
      include: {
        article: {
          select: {
            id: true,
            title: true,
          },
        },
        classroom: {
          select: {
            id: true,
            classroomName: true,
            grade: true,
            teacherId: true,
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            teachers: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            students: {
              select: {
                studentId: true,
              },
            },
          },
        },
        studentAssignments: {
          select: {
            status: true,
            studentId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Process assignments to get teacher-specific data
    const teacherAssignmentsMap = new Map<string, TeacherAssignment[]>();

    for (const assignment of assignments) {
      // Count status from studentAssignments
      const completedCount = assignment.studentAssignments.filter((sa) => sa.status === Status.COMPLETED).length;
      const inProgressCount = assignment.studentAssignments.filter((sa) => sa.status === Status.IN_PROGRESS).length;
      const notStartedCount = assignment.studentAssignments.filter((sa) => sa.status === Status.NOT_STARTED).length;
      const totalStudents = assignment.classroom.students.length;

      // Collect all teachers (from both old and new relations)
      const allTeachers: Array<{ id: string; name: string | null; email: string }> = [];
      
      // Add teachers from ClassroomTeacher table (new relation)
      assignment.classroom.teachers.forEach(ct => {
        allTeachers.push({
          id: ct.teacher.id,
          name: ct.teacher.name,
          email: ct.teacher.email,
        });
      });

      // Add teacher from old teacherId field if exists and not already in the list
      if (assignment.classroom.teacher && !allTeachers.some(t => t.id === assignment.classroom.teacher!.id)) {
        allTeachers.push({
          id: assignment.classroom.teacher.id,
          name: assignment.classroom.teacher.name,
          email: assignment.classroom.teacher.email,
        });
      }

      // Process each teacher in the classroom
      for (const teacher of allTeachers) {

        // Apply teacher filter if specified
        if (teacherFilter && teacher.id !== teacherFilter) {
          continue;
        }
        if (teacherName && !teacher.name?.toLowerCase().includes(teacherName.toLowerCase())) {
          continue;
        }

        const teacherAssignment: TeacherAssignment = {
          id: `${teacher.id}-${assignment.id}`,
          teacherId: teacher.id,
          teacherName: teacher.name || "Unknown",
          teacherEmail: teacher.email,
          classroomId: assignment.classroom.id,
          classroomName: assignment.classroom.classroomName || "Unknown",
          grade: assignment.classroom.grade,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentDescription: assignment.description,
          articleId: assignment.article.id,
          articleTitle: assignment.article.title || "Untitled",
          dueDate: assignment.dueDate,
          createdAt: assignment.createdAt,
          totalStudents,
          completedStudents: completedCount,
          inProgressStudents: inProgressCount,
          notStartedStudents: notStartedCount,
        };

        if (!teacherAssignmentsMap.has(teacher.id)) {
          teacherAssignmentsMap.set(teacher.id, []);
        }
        teacherAssignmentsMap.get(teacher.id)!.push(teacherAssignment);
      }
    }

    // Flatten the map to an array
    let allTeacherAssignments: TeacherAssignment[] = [];
    teacherAssignmentsMap.forEach((assignments) => {
      allTeacherAssignments.push(...assignments);
    });

    // Sort by creation date (newest first)
    allTeacherAssignments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Calculate pagination
    const totalCount = allTeacherAssignments.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAssignments = allTeacherAssignments.slice(startIndex, endIndex);

    // Calculate summary statistics
    const uniqueTeachers = new Set(allTeacherAssignments.map(a => a.teacherId)).size;
    const totalAssignments = allTeacherAssignments.length;
    const averageAssignmentsPerTeacher = uniqueTeachers > 0 ? totalAssignments / uniqueTeachers : 0;
    const totalStudentsAffected = allTeacherAssignments.reduce((sum, a) => sum + a.totalStudents, 0);

    return NextResponse.json({
      data: paginatedAssignments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      summary: {
        uniqueTeachers,
        totalAssignments,
        averageAssignmentsPerTeacher: Math.round(averageAssignmentsPerTeacher * 10) / 10,
        totalStudentsAffected,
      },
    });
  } catch (error: any) {
    console.error("Error in getTeacherAssignments:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
