import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { Role, Status } from "@prisma/client";
import {
  TeacherOverviewResponse,
  TeacherClassesResponse,
  TeacherClass,
} from "@/types/dashboard";
import { prisma } from "@/lib/prisma";

/**
 * Get teacher overview
 * @param req - Extended Next request with session
 * @returns Teacher overview response
 */
export async function getTeacherOverview(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Only teachers and admins can access this endpoint
    if (
      userRole !== Role.TEACHER &&
      userRole !== Role.ADMIN &&
      userRole !== Role.SYSTEM
    ) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    // Get teacher data with their classes and students
    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: true,
        teacherClassrooms: {
          include: {
            classroom: {
              include: {
                students: {
                  include: {
                    student: {
                      include: {
                        userActivities: {
                          select: {
                            createdAt: true,
                          },
                          take: 1,
                          orderBy: {
                            createdAt: "desc",
                          },
                        },
                      },
                    },
                  },
                },
                assignments: {
                  include: {
                    studentAssignments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Teacher not found" },
        { status: 404 }
      );
    }

    // Calculate dates
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Gather all classes
    const classes = teacher.teacherClassrooms.map((tc) => tc.classroom);

    // Gather all students across all classes
    const allStudents = classes.flatMap((c) =>
      c.students.map((cs) => cs.student)
    );

    // Count unique students
    const uniqueStudentIds = new Set(allStudents.map((s) => s.id));
    const totalStudents = uniqueStudentIds.size;

    // Count active students (active in last 30 days)
    const activeStudents30d = allStudents.filter((s) =>
      s.userActivities.some((a) => new Date(a.createdAt) >= thirtyDaysAgo)
    ).length;

    // Calculate average class level
    const avgLevel =
      allStudents.length > 0
        ? allStudents.reduce((sum, s) => sum + s.level, 0) / allStudents.length
        : 0;

    // Count pending assignments (unique assignments that have at least one incomplete student assignment)
    const pendingAssignments = classes.reduce((total, c) => {
      const classroomPendingAssignments = c.assignments.filter((a) => {
        // Check if this assignment has at least one student who hasn't completed it
        return a.studentAssignments.some(
          (sa) => sa.status !== Status.COMPLETED
        );
      }).length;
      return total + classroomPendingAssignments;
    }, 0);

    // Count students active today
    const studentsActiveToday = allStudents.filter((s) =>
      s.userActivities.some((a) => new Date(a.createdAt) >= todayStart)
    ).length;

    // Count assignments completed today
    const assignmentsCompletedToday = classes.reduce((total, c) => {
      return (
        total +
        c.assignments.reduce((assignmentTotal, a) => {
          const completedToday = a.studentAssignments.filter(
            (sa) =>
              sa.status === Status.COMPLETED &&
              new Date(sa.updatedAt) >= todayStart
          ).length;
          return assignmentTotal + completedToday;
        }, 0)
      );
    }, 0);

    const response: TeacherOverviewResponse = {
      teacher: {
        id: teacher.id,
        name: teacher.name || "",
        email: teacher.email,
        schoolId: teacher.schoolId || undefined,
        schoolName: teacher.school?.name || undefined,
      },
      summary: {
        totalClasses: classes.length,
        totalStudents,
        activeStudents30d,
        averageClassLevel: Math.round(avgLevel * 10) / 10,
        pendingAssignments,
      },
      recentActivity: {
        studentsActiveToday,
        assignmentsCompletedToday,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getTeacherOverview - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch teacher overview",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(classes: TeacherClass[]): string {
  const headers = [
    "Class ID",
    "Class Name",
    "Class Code",
    "Student Count",
    "Active Students (7d)",
    "Average Level",
    "Total XP",
    "Created At",
    "Status",
  ];

  const rows = classes.map((c) => [
    c.id,
    c.name,
    c.classCode,
    c.studentCount.toString(),
    c.activeStudents7d.toString(),
    c.averageLevel.toString(),
    c.totalXp.toString(),
    c.createdAt,
    c.archived ? "Archived" : "Active",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape cells that contain commas or quotes
          if (cell.includes(",") || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Get teacher classes
 * @param req - Extended Next request with session
 * @returns Teacher classes response
 */
export async function getTeacherClasses(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Only teachers and admins can access this endpoint
    if (
      userRole !== Role.TEACHER &&
      userRole !== Role.ADMIN &&
      userRole !== Role.SYSTEM
    ) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Access denied" },
        { status: 403 }
      );
    }

    // Check for CSV export format
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get teacher's classes
    const teacherClasses = await prisma.classroomTeacher.findMany({
      where: { teacherId: userId },
      include: {
        classroom: {
          include: {
            students: {
              include: {
                student: {
                  select: {
                    id: true,
                    level: true,
                    xp: true,
                    userActivities: {
                      select: {
                        createdAt: true,
                      },
                      where: {
                        createdAt: {
                          gte: sevenDaysAgo,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Process classes data
    const classes: TeacherClass[] = teacherClasses.map((tc: any) => {
      const classroom = tc.classroom;
      const students = classroom.students.map((cs: any) => cs.student);

      // Count active students (had activity in last 7 days)
      const activeStudents7d = students.filter(
        (s: any) => s.userActivities.length > 0
      ).length;

      // Calculate average level
      const avgLevel =
        students.length > 0
          ? students.reduce((sum: number, s: any) => sum + s.level, 0) /
            students.length
          : 0;

      // Calculate total XP
      const totalXp = students.reduce((sum: number, s: any) => sum + s.xp, 0);

      return {
        id: classroom.id,
        name: classroom.classroomName || "Unnamed Class",
        classCode: classroom.classCode || "",
        studentCount: students.length,
        activeStudents7d,
        averageLevel: Math.round(avgLevel * 10) / 10,
        totalXp,
        createdAt: classroom.createdAt.toISOString(),
        archived: classroom.archived || false,
      };
    });

    // Sort by creation date (newest first)
    classes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // If CSV format is requested, return CSV
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

    // Otherwise, return JSON
    const response: TeacherClassesResponse = {
      classes,
      summary: {
        total: classes.length,
        active: classes.filter((c) => !c.archived).length,
        archived: classes.filter((c) => c.archived).length,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getTeacherClasses - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch teacher classes",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}
