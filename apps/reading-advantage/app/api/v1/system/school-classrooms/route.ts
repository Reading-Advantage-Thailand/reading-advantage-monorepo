import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== Role.SYSTEM) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const licenseId = searchParams.get("licenseId");

    if (!licenseId) {
      return NextResponse.json(
        { error: "License ID is required" },
        { status: 400 }
      );
    }

    // Find license by ID
    const license = await prisma.license.findUnique({
      where: {
        id: licenseId,
      },
    });

    if (!license) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Find all users with this license
    const usersWithLicense = await prisma.licenseOnUser.findMany({
      where: {
        licenseId: license.id,
      },
      select: {
        userId: true,
      },
    });

    const userIds = usersWithLicense.map((licenseUser) => licenseUser.userId);

    // Find all classrooms where any of these users are teachers
    const classrooms = await prisma.classroom.findMany({
      where: {
        OR: [
          {
            teachers: {
              some: {
                teacherId: {
                  in: userIds,
                },
              },
            },
          },
          {
            teacherId: {
              in: userIds,
            },
          },
          {
            createdBy: {
              in: userIds,
            },
          },
        ],
      },
      include: {
        creator: {
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
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Transform data to match the expected format and calculate XP data
    const transformedClassrooms = await Promise.all(
      classrooms.map(async (classroom) => {
        // Collect all teachers from different sources
        const teachersList: Array<{
          teacherId: string;
          name: string;
          role: string;
          joinedAt: string;
        }> = [];
        
        // Add from ClassroomTeacher relation
        classroom.teachers.forEach((tc) => {
          teachersList.push({
            teacherId: tc.teacher.id,
            name: tc.teacher.name || "",
            role: tc.role,
            joinedAt: tc.createdAt.toISOString(),
          });
        });
        
        // Add creator as OWNER if not already in the list
        if (classroom.creator && !teachersList.find(t => t.teacherId === classroom.creator!.id)) {
          teachersList.push({
            teacherId: classroom.creator.id,
            name: classroom.creator.name || "",
            role: "OWNER" as any,
            joinedAt: classroom.createdAt.toISOString(),
          });
        }
        
        // Add main teacher (teacherId field) if exists and not already in the list
        if (classroom.teacher && !teachersList.find(t => t.teacherId === classroom.teacher!.id)) {
          teachersList.push({
            teacherId: classroom.teacher.id,
            name: classroom.teacher.name || "",
            role: "MAIN_TEACHER" as any,
            joinedAt: classroom.createdAt.toISOString(),
          });
        }

        // Calculate XP data for this classroom
        const studentIds = classroom.students.map(sc => sc.student.id).filter(Boolean);
        
        let xpData = {
          today: 0,
          week: 0,
          month: 0,
          allTime: 0,
        };

        if (studentIds.length > 0) {
          try {
            const now = new Date();

            // Calculate date ranges
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);

            const monthStart = new Date(now);
            monthStart.setMonth(now.getMonth() - 1);

            // Get XP logs for all students in this classroom
            const xpLogs = await prisma.xPLog.findMany({
              where: {
                userId: { in: studentIds },
              },
              select: {
                xpEarned: true,
                createdAt: true,
              },
            });

            // Get total XP for all students in this classroom
            const totalXp = await prisma.user.findMany({
              where: {
                id: { in: studentIds },
              },
              select: {
                xp: true,
              },
            });

            // Calculate XP for different time periods
            const todayXp = xpLogs
              .filter((log) => log.createdAt >= todayStart)
              .reduce((sum, log) => sum + log.xpEarned, 0);

            const weekXp = xpLogs
              .filter((log) => log.createdAt >= weekStart)
              .reduce((sum, log) => sum + log.xpEarned, 0);

            const monthXp = xpLogs
              .filter((log) => log.createdAt >= monthStart)
              .reduce((sum, log) => sum + log.xpEarned, 0);

            const allTimeXp = totalXp.reduce(
              (sum, user) => sum + (user.xp || 0),
              0
            );

            xpData = {
              today: todayXp,
              week: weekXp,
              month: monthXp,
              allTime: allTimeXp,
            };
          } catch (error) {
            console.error(
              `Error calculating XP for classroom ${classroom.id}:`,
              error
            );
          }
        }

        return {
          id: classroom.id,
          classroomName: classroom.classroomName,
          classCode: classroom.classCode,
          grade: classroom.grade?.toString() || "",
          archived: classroom.archived || false,
          title: classroom.classroomName || "",
          importedFromGoogle: false,
          alternateLink: "",
          createdAt: classroom.createdAt.toISOString(),
          createdBy: classroom.creator || { id: "", name: "" },
          isOwner: true, // For system view, we can assume ownership
          teachers: teachersList,
          student: classroom.students.map((sc) => ({
            studentId: sc.student.id,
            email: sc.student.email || "",
            lastActivity: "",
          })),
          xpData,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: transformedClassrooms,
      schoolName: license.schoolName || "Unknown School",
    });
  } catch (error) {
    console.error("Error fetching school classrooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
