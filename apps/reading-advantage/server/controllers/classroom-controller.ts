import { prisma } from "@/lib/prisma";
import { ExtendedNextRequest } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { getAllLicenses } from "./license-controller";
import { getCurrentUser } from "@/lib/session";
import { Role, Status } from "@prisma/client";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isSameOrAfter);
dayjs.extend(isoWeek);

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

interface License {
  id: string;
  school_name?: string;
}

interface User {
  xp?: number;
}

interface SchoolXP {
  school: string;
  xp: number;
}

interface Student {
  studentId?: string;
  email?: string;
  lastActivity?: string;
  profile?: {
    emailAddress?: string;
  };
}

interface Course {
  teacherId?: string | string[];
  userId?: string;
  classCode?: string;
  enrollmentCode?: string;
  classroomName?: string;
  name?: string;
  grade?: string;
  classroom?: {
    student?: Student[];
  };
  title?: string;
  creationTime?: string;
  alternateLink?: string;
  studentCount?: Student[];
  id?: string;
}

interface Classroom {
  teacherId: string | string[];
  archived: boolean;
  classCode: string;
  classroomName: string;
  grade: string;
  student: Student[];
  title: string;
  createdAt: Date;
  importedFromGoogle: boolean;
  alternateLink: string;
  license_id: string;
  googleClassroomId?: string;
}

// get all classrooms
// for get all -> GET /api/classroom
// for get all students -> GET /api/classroom/students
// for get by teacher -> GET /api/classroom?teacherId=abc123

export async function getAllStudentList(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherLicensesFromTable = await prisma.licenseOnUser.findMany({
      where: {
        userId: user.id,
      },
      select: {
        licenseId: true,
      },
    });

    const teacherData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { licenseId: true },
    });

    const licenseIdsFromTable = teacherLicensesFromTable.map(
      (license) => license.licenseId
    );
    const allLicenseIds = teacherData?.licenseId
      ? [...licenseIdsFromTable, teacherData.licenseId]
      : licenseIdsFromTable;

    const uniqueLicenseIds = [...new Set(allLicenseIds)];

    const students = await prisma.user.findMany({
      where: {
        role: {
          in: ["STUDENT", "USER"],
        },
        OR: [
          {
            licenseOnUsers: {
              some: {
                licenseId: {
                  in: uniqueLicenseIds,
                },
              },
            },
          },
          {
            licenseId: {
              in: uniqueLicenseIds,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        cefrLevel: true,
        createdAt: true,
        updatedAt: true,
        licenseId: true,
        licenseOnUsers: {
          select: {
            licenseId: true,
          },
        },
      },
    });

    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error("Error fetching student list:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function getClassroom(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let classrooms: any[] = [];

    // Get licenseId from query params (for SYSTEM role to filter by specific license)
    const { searchParams } = new URL(req.url);
    const requestedLicenseId = searchParams.get("licenseId");

    // Handle different user roles
    if (user.role === "SYSTEM") {
      // SYSTEM role: show classrooms filtered by license if provided
      let targetLicenseId = requestedLicenseId;
      let userIds: string[] = [];

      if (targetLicenseId) {
        // Get all users with the specified license
        const usersWithLicense = await prisma.user.findMany({
          where: {
            OR: [
              { licenseId: targetLicenseId },
              {
                licenseOnUsers: {
                  some: {
                    licenseId: targetLicenseId,
                  },
                },
              },
            ],
          },
          select: { id: true },
        });
        userIds = usersWithLicense.map((u) => u.id);
      }

      const allClassrooms = await prisma.classroom.findMany({
        where: {
          archived: {
            not: true,
          },
          ...(userIds.length > 0 && {
            teacherId: {
              in: userIds,
            },
          }),
        },
        include: {
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  email: true,
                  name: true,
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

      classrooms = allClassrooms.map((classroom) => ({
        id: classroom.id,
        classroomName: classroom.classroomName,
        classCode: classroom.classCode,
        grade: classroom.grade?.toString(),
        archived: classroom.archived || false,
        title: classroom.classroomName,
        importedFromGoogle: false,
        alternateLink: "",
        createdAt: classroom.createdAt,
        createdBy: classroom.createdBy,
        isOwner: classroom.createdBy ? true : false,
        teachers: [
          {
            teacherId: classroom.teacher?.id || "",
            name: classroom.teacher?.name || "",
            role: "OWNER" as const,
            joinedAt: classroom.createdAt,
          },
        ],
        student: classroom.students.map((cs) => ({
          studentId: cs.student.id,
          email: cs.student.email,
          lastActivity: cs.createdAt,
        })),
      }));
    } else if (user.role === "ADMIN") {
      // ADMIN role: show all classrooms of the same license

      if (!user.license_id) {
        return NextResponse.json(
          { error: "Admin license not found" },
          { status: 404 }
        );
      }

      // Get all users with the same license
      const usersWithSameLicense = await prisma.user.findMany({
        where: {
          OR: [
            { licenseId: user.license_id },
            {
              licenseOnUsers: {
                some: {
                  licenseId: user.license_id,
                },
              },
            },
          ],
        },
        select: { id: true, name: true, email: true },
      });

      const userIds = usersWithSameLicense.map((u) => u.id);

      // First, check all classrooms without archived filter
      const allClassroomsForLicense = await prisma.classroom.findMany({
        where: {
          teacherId: {
            in: userIds,
          },
        },
        select: {
          id: true,
          classroomName: true,
          archived: true,
          teacherId: true,
        },
      });

      // Get classrooms where teacher is in the same license
      const licenseClassrooms = await prisma.classroom.findMany({
        where: {
          teacherId: {
            in: userIds,
          },
          // Show all classrooms including archived ones for ADMIN
          // archived: {
          //   not: true,
          // },
        },
        include: {
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  email: true,
                  name: true,
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

      classrooms = licenseClassrooms.map((classroom) => ({
        id: classroom.id,
        classroomName: classroom.classroomName,
        classCode: classroom.classCode,
        grade: classroom.grade?.toString(),
        archived: classroom.archived || false,
        title: classroom.classroomName,
        importedFromGoogle: false,
        alternateLink: "",
        createdAt: classroom.createdAt,
        createdBy: classroom.teacher,
        isOwner: classroom.teacherId === user.id,
        teachers: [
          {
            teacherId: classroom.teacher?.id || "",
            name: classroom.teacher?.name || "",
            role: "OWNER" as const,
            joinedAt: classroom.createdAt,
          },
        ],
        student: classroom.students.map((cs) => ({
          studentId: cs.student.id,
          email: cs.student.email,
          lastActivity: cs.createdAt,
        })),
      }));
    } else {
      // Default behavior for TEACHER role
      const ownedClassrooms = await prisma.classroom.findMany({
        where: {
          teacherId: user.id,
          archived: {
            not: true,
          },
        },
        include: {
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  email: true,
                  name: true,
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

      const coTeacherClassrooms = (await prisma.$queryRaw`
        SELECT c.*, 
               t.id as teacher_id, t.name as teacher_name,
               ct.role as user_role, ct."createdAt" as joined_at
        FROM "classrooms" c
        JOIN "classroomTeachers" ct ON c.id = ct.classroom_id
        LEFT JOIN "users" t ON c.teacher_id = t.id
        WHERE ct.teacher_id = ${user.id}
          AND c.archived != true
        ORDER BY c."createdAt" DESC
      `) as any[];

      const coTeacherClassroomIds = coTeacherClassrooms.map((c: any) => c.id);
      const coTeacherStudents =
        coTeacherClassroomIds.length > 0
          ? await prisma.classroomStudent.findMany({
              where: {
                classroomId: {
                  in: coTeacherClassroomIds,
                },
              },
              include: {
                student: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            })
          : [];

      const transformedOwnedData = ownedClassrooms.map((classroom) => ({
        id: classroom.id,
        classroomName: classroom.classroomName,
        classCode: classroom.classCode,
        grade: classroom.grade?.toString(),
        archived: classroom.archived || false,
        title: classroom.classroomName,
        importedFromGoogle: false,
        alternateLink: "",
        createdAt: classroom.createdAt,
        createdBy: classroom.teacher,
        isOwner: true,
        teachers: [
          {
            teacherId: classroom.teacher?.id || "",
            name: classroom.teacher?.name || "",
            role: "OWNER" as const,
            joinedAt: classroom.createdAt,
          },
        ],
        student: classroom.students.map((cs) => ({
          studentId: cs.student.id,
          email: cs.student.email,
          lastActivity: cs.createdAt,
        })),
      }));

      const transformedCoTeacherData = coTeacherClassrooms.map(
        (classroom: any) => {
          const studentsForClassroom = coTeacherStudents.filter(
            (cs) => cs.classroomId === classroom.id
          );

          return {
            id: classroom.id,
            classroomName: classroom.classroom_name,
            classCode: classroom.class_code,
            grade: classroom.grade?.toString(),
            archived: classroom.archived || false,
            title: classroom.classroom_name,
            importedFromGoogle: false,
            alternateLink: "",
            createdAt: classroom.createdAt,
            createdBy: {
              id: classroom.teacher_id,
              name: classroom.teacher_name,
            },
            isOwner: false,
            teachers: [
              {
                teacherId: classroom.teacher_id || "",
                name: classroom.teacher_name || "",
                role: "OWNER" as const,
                joinedAt: classroom.createdAt,
              },
            ],
            student: studentsForClassroom.map((cs) => ({
              studentId: cs.student.id,
              email: cs.student.email,
              lastActivity: cs.createdAt,
            })),
          };
        }
      );

      const allClassrooms = [
        ...transformedOwnedData,
        ...transformedCoTeacherData,
      ];
      classrooms = allClassrooms.filter(
        (classroom, index, self) =>
          index === self.findIndex((c) => c.id === classroom.id)
      );
    }

    // Calculate XP data for each classroom
    const classroomsWithXp = await Promise.all(
      classrooms.map(async (classroom) => {
        try {
          // Get all students in this classroom
          const studentIds = classroom.student
            .map((s: any) => s.studentId)
            .filter(Boolean);

          if (studentIds.length === 0) {
            return {
              ...classroom,
              xpData: {
                today: 0,
                week: 0,
                month: 0,
                allTime: 0,
              },
            };
          }

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

          return {
            ...classroom,
            xpData: {
              today: todayXp,
              week: weekXp,
              month: monthXp,
              allTime: allTimeXp,
            },
          };
        } catch (error) {
          console.error(
            `Error calculating XP for classroom ${classroom.id}:`,
            error
          );
          return {
            ...classroom,
            xpData: {
              today: 0,
              week: 0,
              month: 0,
              allTime: 0,
            },
          };
        }
      })
    );

    return NextResponse.json(
      {
        message: "success",
        data: classroomsWithXp,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    console.error(error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function getStudentClassroom(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentClassrooms = await prisma.classroomStudent.findMany({
      where: {
        studentId: user.id,
      },
      include: {
        classroom: true,
      },
    });

    const classroomId =
      studentClassrooms.length > 0 ? studentClassrooms[0].classroom.id : null;

    return NextResponse.json(
      {
        message: "success",
        data: classroomId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    console.error(error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// get all classrooms students
export async function getClassroomStudent(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: user.id },
      select: { licenseId: true },
    });

    if (!teacher || !teacher.licenseId) {
      return NextResponse.json(
        { error: "Teacher license not found" },
        { status: 404 }
      );
    }

    const students = await prisma.user.findMany({
      where: {
        role: {
          in: ["STUDENT", "USER"],
        },
        licenseId: teacher.licenseId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        cefrLevel: true,
        createdAt: true,
        updatedAt: true,
        licenseId: true,
      },
    });

    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error(error);
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

// get enroll classroom
export async function getEnrollClassroom(req: ExtendedNextRequest) {
  try {
    const params = req.nextUrl.searchParams.get("studentId");
    const user = await getCurrentUser();

    if (!params) {
      return NextResponse.json(
        { messages: "Invalid user ID" },
        { status: 501 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentData = await prisma.user.findUnique({
      where: { id: params },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        cefrLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!studentData) {
      return NextResponse.json(
        { messages: "Student not found" },
        { status: 404 }
      );
    }

    const classrooms = await prisma.classroom.findMany({
      where: {
        teacherId: user.id,
        archived: { not: true },
        students: {
          none: {
            studentId: params,
          },
        },
      },
      include: {
        students: {
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const filteredClassrooms = classrooms.map((classroom) => ({
      id: classroom.id,
      classroomName: classroom.classroomName,
      classCode: classroom.classCode,
      grade: classroom.grade?.toString(),
      archived: classroom.archived,
      teacherId: classroom.teacherId,
      importedFromGoogle: false,
      student: classroom.students.map((cs) => ({
        studentId: cs.student.id,
        email: cs.student.email,
        lastActivity: cs.createdAt,
      })),
    }));

    return NextResponse.json(
      {
        student: {
          ...studentData,
          display_name: studentData.name,
          last_activity: studentData.updatedAt,
        },
        classroom: filteredClassrooms,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getEnrollClassroom:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

// get unenroll classroom
export async function getUnenrollClassroom(req: ExtendedNextRequest) {
  try {
    const params = req.nextUrl.searchParams.get("studentId");
    const user = await getCurrentUser();

    if (!params) {
      return NextResponse.json(
        { messages: "Invalid user ID" },
        { status: 501 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentData = await prisma.user.findUnique({
      where: { id: params },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        cefrLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!studentData) {
      return NextResponse.json(
        { messages: "Student not found" },
        { status: 404 }
      );
    }

    const classrooms = await prisma.classroom.findMany({
      where: {
        teacherId: user.id,
        archived: { not: true },
        students: {
          some: {
            studentId: params,
          },
        },
      },
      include: {
        students: {
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const filteredClassrooms = classrooms.map((classroom) => ({
      id: classroom.id,
      classroomName: classroom.classroomName,
      classCode: classroom.classCode,
      grade: classroom.grade?.toString(),
      archived: classroom.archived,
      teacherId: classroom.teacherId,
      importedFromGoogle: false,
      student: classroom.students.map((cs) => ({
        studentId: cs.student.id,
        email: cs.student.email,
        lastActivity: cs.createdAt,
      })),
    }));

    return NextResponse.json(
      {
        student: {
          ...studentData,
          display_name: studentData.name,
          last_activity: studentData.updatedAt,
        },
        classroom: filteredClassrooms,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getUnenrollClassroom:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function getStudentInClassroom(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await ctx.params;
  try {

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                xp: true,
                level: true,
                cefrLevel: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 }
      );
    }

    const filteredUsers = classroom.students.map((cs) => ({
      ...cs.student,
      display_name: cs.student.name,
      last_activity: cs.createdAt,
    }));

    const classroomDoc = {
      id: classroom.id,
      classroomName: classroom.classroomName,
      classCode: classroom.classCode,
      teacherId: classroom.teacherId,
      archived: classroom.archived,
      grade: classroom.grade?.toString(),
      createdAt: classroom.createdAt,
      updatedAt: classroom.updatedAt,
      importedFromGoogle: false,
      googleClassroomId: null,
    };

    return NextResponse.json(
      { studentInClass: filteredUsers, classroom: classroomDoc },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

// update student classroom
export async function updateStudentClassroom(req: ExtendedNextRequest) {
  try {
    const json = await req.json();
    const name = json.name;
    const studentId = json.studentId;

    await prisma.user.update({
      where: { id: studentId },
      data: { name: name },
    });

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

// get all classrooms teachers
export async function getClassroomTeacher(req: ExtendedNextRequest) {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ teachers }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

// create classroom
export async function createdClassroom(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: { classroom?: Course; courses?: Course[] } = await req.json();
    const isImportedFromGoogle: boolean = Array.isArray(json.courses);
    const courses: Course[] = isImportedFromGoogle
      ? json.courses!
      : [json.classroom!];

    for (const data of courses.filter((course): course is Course => !!course)) {
      const classCode =
        data.classCode || data.enrollmentCode || generateClassCode();

      // Use raw SQL to create classroom with new schema
      const classroomResult = await prisma.$queryRaw`
        INSERT INTO classrooms (id, classroom_name, teacher_id, created_by, class_code, archived, grade, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${data.classroomName || data.name || ""}, ${user.id}, ${user.id}, ${classCode}, false, ${data.grade ? parseInt(data.grade) : null}, ${data.creationTime ? new Date(data.creationTime) : new Date()}, NOW())
        RETURNING *
      `;

      const classroom = (classroomResult as any[])[0];

      // Add creator as OWNER in ClassroomTeacher table
      await prisma.$queryRaw`
        INSERT INTO "classroomTeachers" (id, teacher_id, classroom_id, role, "createdAt")
        VALUES (gen_random_uuid(), ${user.id}, ${classroom.id}, 'OWNER'::"TeacherRole", NOW())
      `;

      if (isImportedFromGoogle && data.studentCount) {
        for (const student of data.studentCount) {
          if (student.profile?.emailAddress) {
            const userRecord = await prisma.user.findUnique({
              where: { email: student.profile.emailAddress },
            });

            if (userRecord) {
              await prisma.classroomStudent.create({
                data: {
                  classroomId: classroom.id,
                  studentId: userRecord.id,
                },
              });
            }
          }
        }
      } else if (!isImportedFromGoogle && data.classroom?.student) {
        for (const student of data.classroom.student) {
          if (student.studentId) {
            await prisma.classroomStudent.create({
              data: {
                classroomId: classroom.id,
                studentId: student.studentId,
              },
            });
          }
        }
      }
    }

    return NextResponse.json(
      {
        message: "success",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating classroom:", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function generateClassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// achive classroom
export async function achivedClassroom(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  try {
    const { archived } = await req.json();

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    await prisma.classroom.update({
      where: { id: classroomId },
      data: { archived },
    });

    return NextResponse.json(
      { message: "success updated archived status" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

// update classroom
export async function updateClassroom(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  try {
    const { classroomName, grade } = await req.json();

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    // Update the classroom
    await prisma.classroom.update({
      where: { id: classroomId },
      data: {
        classroomName,
        grade: grade ? parseInt(grade) : null,
      },
    });

    return NextResponse.json({ message: "success updated" }, { status: 200 });
  } catch (error) {
    console.error("Error updating classroom:", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

// delete classroom
export async function deleteClassroom(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    await prisma.classroom.delete({
      where: { id: classroomId },
    });

    return NextResponse.json({ message: "success deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function patchClassroomEnroll(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  const studentSchema = z.object({
    studentId: z.string(),
    lastActivity: z.string(),
  });

  try {
    const json = await req.json();
    const newStudents = z.array(studentSchema).parse(json.student);

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    for (const student of newStudents) {
      const existingEnrollment = await prisma.classroomStudent.findFirst({
        where: {
          studentId: student.studentId,
        },
        include: {
          classroom: true,
        },
      });

      if (existingEnrollment) {
        return NextResponse.json(
          {
            message: `Student is already enrolled in classroom: ${existingEnrollment.classroom.classroomName}`,
            error: "ALREADY_ENROLLED",
          },
          { status: 400 }
        );
      }

      await prisma.classroomStudent.upsert({
        where: {
          classroomId_studentId: {
            classroomId: classroomId,
            studentId: student.studentId,
          },
        },
        update: {},
        create: {
          classroomId: classroomId,
          studentId: student.studentId,
        },
      });
    }

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error enrolling students:", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function patchClassroomUnenroll(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  try {
    const json = await req.json();
    const studentId = json.studentId;

    if (!studentId) {
      return NextResponse.json(
        { message: "Student ID is required" },
        { status: 400 }
      );
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    await prisma.classroomStudent.delete({
      where: {
        classroomId_studentId: {
          classroomId: classroomId,
          studentId: studentId,
        },
      },
    });

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error unenrolling student:", error);

    if (error instanceof Error && error.message.includes("P2025")) {
      return NextResponse.json(
        { message: "Student not found in classroom" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function getClassXp(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const licenseId = searchParams.get("licenseId");
    const timeRange = searchParams.get("timeRange") || "year";

    if (!year) {
      return NextResponse.json(
        { message: "Year parameter is required" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    let startDate: Date;
    let endDate: Date;

    const now = new Date();
    switch (timeRange) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        endDate = now;
        break;
      case "year":
      default:
        startDate = new Date(yearNum, 0, 1);
        endDate = new Date(yearNum + 1, 0, 1);
        break;
    }

    if (licenseId) {
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
        include: {
          licenseUsers: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!license) {
        return NextResponse.json(
          { message: `License ${licenseId} not found` },
          { status: 404 }
        );
      }

      const userIds = license.licenseUsers.map((lu) => lu.userId);

      const classrooms = await prisma.classroom.findMany({
        where: {
          students: {
            some: {
              studentId: { in: userIds },
            },
          },
        },
        include: {
          students: {
            include: {
              student: {
                include: {
                  xpLogs: {
                    where: {
                      createdAt: {
                        gte: startDate,
                        lt: endDate,
                      },
                    },
                    select: {
                      xpEarned: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const classroomXpMap: {
        [classroomId: string]: { name: string; xp: number };
      } = {};

      classrooms.forEach((classroom) => {
        let totalClassroomXp = 0;

        classroom.students.forEach((classroomStudent) => {
          if (userIds.includes(classroomStudent.studentId)) {
            const studentXp = classroomStudent.student.xpLogs.reduce(
              (sum, log) => sum + log.xpEarned,
              0
            );
            totalClassroomXp += studentXp;
          }
        });

        if (totalClassroomXp > 0) {
          classroomXpMap[classroom.id] = {
            name: classroom.classroomName || `Classroom ${classroom.id}`,
            xp: totalClassroomXp,
          };
        }
      });

      const classroomData = Object.values(classroomXpMap);
      const mostActive = classroomData.sort((a, b) => b.xp - a.xp).slice(0, 5);
      const leastActive = classroomData.sort((a, b) => a.xp - b.xp).slice(0, 5);

      const data = {
        dataMostActive: {
          [timeRange]: mostActive,
        },
        dataLeastActive: {
          [timeRange]: leastActive,
        },
      };

      return NextResponse.json({
        year,
        licenseId,
        timeRange,
        data,
      });
    }
    return NextResponse.json(
      { message: "Please specify a licenseId parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching XP data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getTopSchoolsXp(req: NextRequest): Promise<NextResponse> {
  try {
    const licenses = await prisma.license.findMany({
      include: {
        licenseUsers: {
          include: {
            user: {
              include: {
                xpLogs: {
                  select: {
                    xpEarned: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const schoolXpData: { school: string; xp: number }[] = [];

    licenses.forEach((license) => {
      let totalXp = 0;

      license.licenseUsers.forEach((licenseUser) => {
        const userXp = licenseUser.user.xpLogs.reduce(
          (sum, log) => sum + log.xpEarned,
          0
        );
        totalXp += userXp;
      });

      if (totalXp > 0) {
        schoolXpData.push({
          school: license.schoolName,
          xp: totalXp,
        });
      }
    });

    const topSchools = schoolXpData.sort((a, b) => b.xp - a.xp).slice(0, 10);

    return NextResponse.json({ data: topSchools }, { status: 200 });
  } catch (error) {
    console.error("Error fetching top schools XP data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get classroom XP data for custom date range
export async function getClassroomXpCustomRange(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const licenseId = searchParams.get("licenseId");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { message: "Both 'from' and 'to' date parameters are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    // Add one day to end date to include the entire day
    endDate.setDate(endDate.getDate() + 1);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { message: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let classrooms: any[] = [];

    // Get classrooms based on user role and license
    if (user.role === "SYSTEM") {
      // SYSTEM role: get all classrooms
      classrooms = await prisma.classroom.findMany({
        where: {
          archived: { not: true },
        },
        include: {
          students: {
            include: {
              student: {
                include: {
                  xpLogs: {
                    where: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                    select: {
                      xpEarned: true,
                      createdAt: true,
                    },
                  },
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
      });
    } else if (user.role === "ADMIN") {
      // ADMIN role: get classrooms from same license
      const adminUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { licenseId: true },
      });

      if (!adminUser?.licenseId) {
        return NextResponse.json(
          { error: "Admin user must have a license" },
          { status: 400 }
        );
      }

      const usersWithSameLicense = await prisma.user.findMany({
        where: {
          OR: [
            { licenseId: adminUser.licenseId },
            {
              licenseOnUsers: {
                some: {
                  licenseId: adminUser.licenseId,
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      const userIds = usersWithSameLicense.map((u) => u.id);

      classrooms = await prisma.classroom.findMany({
        where: {
          teacherId: { in: userIds },
          archived: { not: true },
        },
        include: {
          students: {
            include: {
              student: {
                include: {
                  xpLogs: {
                    where: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                    select: {
                      xpEarned: true,
                      createdAt: true,
                    },
                  },
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
      });
    } else {
      // TEACHER role: get only their classrooms
      classrooms = await prisma.classroom.findMany({
        where: {
          teacherId: user.id,
          archived: { not: true },
        },
        include: {
          students: {
            include: {
              student: {
                include: {
                  xpLogs: {
                    where: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                    select: {
                      xpEarned: true,
                      createdAt: true,
                    },
                  },
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
      });
    }

    // Calculate XP data for each classroom in the custom date range
    const classroomData = classrooms.map((classroom) => {
      const customRangeXp = classroom.students.reduce(
        (total: number, cs: any) => {
          const studentXp = cs.student.xpLogs.reduce(
            (sum: number, log: any) => sum + log.xpEarned,
            0
          );
          return total + studentXp;
        },
        0
      );

      return {
        id: classroom.id,
        classroomName: classroom.classroomName,
        classCode: classroom.classCode,
        grade: classroom.grade?.toString(),
        archived: classroom.archived || false,
        title: classroom.classroomName,
        importedFromGoogle: false,
        alternateLink: "",
        createdAt: classroom.createdAt,
        createdBy: classroom.teacher,
        isOwner: classroom.teacherId === user.id,
        teachers: [
          {
            teacherId: classroom.teacher?.id || "",
            name: classroom.teacher?.name || "",
            role: "OWNER" as const,
            joinedAt: classroom.createdAt,
          },
        ],
        student: classroom.students.map((cs: any) => ({
          studentId: cs.student.id,
          email: cs.student.email,
          lastActivity: cs.createdAt,
        })),
        xpData: {
          customRange: customRangeXp,
          today: 0, // These could be calculated if needed
          week: 0,
          month: 0,
          allTime: 0,
        },
      };
    });

    return NextResponse.json({
      message: "success",
      data: classroomData,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
    });
  } catch (error) {
    console.error("Error fetching custom range XP data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getClassXpPerStudents(
  req: NextRequest,
  ctx: RequestContext
) {
  try {
    const params = await ctx.params;
    const classroomId = params?.classroomId;
    if (!classroomId) {
      return NextResponse.json(
        { message: "Missing classroomId" },
        { status: 400 }
      );
    }

    // Get classroom with students using Prisma
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                xp: true,
                xpLogs: {
                  select: {
                    xpEarned: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    const result: Record<string, any> = {};

    // Calculate XP for each student for all periods
    for (const cs of classroom.students) {
      const student = cs.student;
      const displayName = student.name || student.id;

      const now = new Date();

      // Calculate date ranges
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);

      const monthStart = new Date(now);
      monthStart.setMonth(now.getMonth() - 1);

      // Filter and calculate XP for each period
      const todayLogs = student.xpLogs.filter(
        (log) => log.createdAt >= todayStart
      );
      const weekLogs = student.xpLogs.filter(
        (log) => log.createdAt >= weekStart
      );
      const monthLogs = student.xpLogs.filter(
        (log) => log.createdAt >= monthStart
      );

      result[displayName] = {
        today: todayLogs.reduce((sum, log) => sum + log.xpEarned, 0),
        week: weekLogs.reduce((sum, log) => sum + log.xpEarned, 0),
        month: monthLogs.reduce((sum, log) => sum + log.xpEarned, 0),
        allTime: student.xp,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching XP data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function addCoTeacher(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { teacherEmail, role = "CO_TEACHER" } = body;

    if (!teacherEmail) {
      return NextResponse.json(
        { error: "Teacher email is required" },
        { status: 400 }
      );
    }

    const classroom = await prisma.$queryRaw`
      SELECT * FROM classrooms 
      WHERE id = ${classroomId} 
      AND (teacher_id = ${user.id} OR created_by = ${user.id})
    `;

    if ((classroom as any[]).length === 0) {
      return NextResponse.json(
        { error: "Only classroom creator can add co-teachers" },
        { status: 403 }
      );
    }

    const teacher = await prisma.user.findUnique({
      where: { email: teacherEmail },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (teacher.role !== "TEACHER") {
      return NextResponse.json(
        { error: "User must have TEACHER role" },
        { status: 400 }
      );
    }

    const existingTeacher = await prisma.$queryRaw`
      SELECT * FROM "classroomTeachers" 
      WHERE classroom_id = ${classroomId} AND teacher_id = ${teacher.id}
    `;

    if ((existingTeacher as any[]).length > 0) {
      return NextResponse.json(
        { error: "Teacher is already in this classroom" },
        { status: 400 }
      );
    }

    await prisma.$queryRaw`
      INSERT INTO "classroomTeachers" (id, teacher_id, classroom_id, role, "createdAt")
      VALUES (gen_random_uuid(), ${teacher.id}, ${classroomId}, ${role}::"TeacherRole", NOW())
    `;

    return NextResponse.json(
      {
        message: "Co-teacher added successfully",
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          role: role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding co-teacher:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function removeCoTeacher(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { teacherId } = body;

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    const classroom = await prisma.$queryRaw`
      SELECT * FROM classrooms 
      WHERE id = ${classroomId} 
      AND (teacher_id = ${user.id} OR created_by = ${user.id})
    `;

    if ((classroom as any[]).length === 0) {
      return NextResponse.json(
        { error: "Only classroom creator can remove co-teachers" },
        { status: 403 }
      );
    }

    const teacherInClassroom = await prisma.$queryRaw`
      SELECT ct.*, u.name 
      FROM "classroomTeachers" ct
      JOIN users u ON ct.teacher_id = u.id
      WHERE ct.classroom_id = ${classroomId} AND ct.teacher_id = ${teacherId}
    `;

    if ((teacherInClassroom as any[]).length === 0) {
      return NextResponse.json(
        { error: "Teacher not found in this classroom" },
        { status: 404 }
      );
    }

    const teacher = (teacherInClassroom as any[])[0];
    if (teacher.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove classroom owner" },
        { status: 400 }
      );
    }

    await prisma.$queryRaw`
      DELETE FROM "classroomTeachers" 
      WHERE classroom_id = ${classroomId} AND teacher_id = ${teacherId}
    `;

    return NextResponse.json(
      {
        message: "Co-teacher removed successfully",
        removedTeacher: {
          id: teacherId,
          name: teacher.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing co-teacher:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all teachers in a classroom
export async function getClassroomTeachers(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { classroomId } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroom = await prisma.$queryRaw`
      SELECT c.*, 
             t.id as teacher_id, t.name as teacher_name, t.email as teacher_email
      FROM classrooms c
      LEFT JOIN users t ON c.teacher_id = t.id
      WHERE c.id = ${classroomId} 
      AND (c.teacher_id = ${user.id} OR c.created_by = ${user.id})
    `;

    if ((classroom as any[]).length === 0) {
      return NextResponse.json(
        { error: "Classroom not found or access denied" },
        { status: 404 }
      );
    }

    const classroomData = (classroom as any[])[0];

    const newTeachers = await prisma.$queryRaw`
      SELECT 
        ct.role,
        ct."createdAt" as joined_at,
        u.id,
        u.name,
        u.email,
        true as is_from_new_table
      FROM "classroomTeachers" ct
      JOIN users u ON ct.teacher_id = u.id
      WHERE ct.classroom_id = ${classroomId}
      ORDER BY 
        CASE WHEN ct.role = 'OWNER' THEN 0 ELSE 1 END,
        ct."createdAt" ASC
    `;

    let teachers;
    if ((newTeachers as any[]).length === 0) {
      teachers = [
        {
          id: classroomData.teacher_id || "",
          name: classroomData.teacher_name || "Unknown",
          email: classroomData.teacher_email || "",
          role: "OWNER",
          joined_at: classroomData.createdAt,
          is_creator: true,
        },
      ];
    } else {
      teachers = (newTeachers as any[]).map((t: any) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        role: t.role,
        joined_at: t.joined_at,
        is_creator: t.role === "OWNER",
      }));
    }

    return NextResponse.json(
      {
        classroomId,
        teachers: teachers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting classroom teachers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get classroom overview
 * @param req - Extended Next request with session
 * @param classroomId - Classroom ID
 * @returns Classroom overview response
 */
export async function getClassroomOverview(req: ExtendedNextRequest, classroomId: string) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Get classroom with details
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        school: true,
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
                    activityType: true,
                    timer: true,
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
                lessonRecords: {
                  select: {
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
        assignments: {
          include: {
            studentAssignments: {
              select: {
                id: true,
                status: true,
                score: true,
              },
            },
          },
        },
        teachers: {
          select: {
            teacherId: true,
          },
        },
      },
    }) as any;

    if (!classroom) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Check access rights
    const isTeacher = classroom.teachers.some((t: any) => t.teacherId === userId);
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SYSTEM;

    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all students
    const students = classroom.students.map((cs: any) => cs.student);

    // Count active students
    const activeStudents7d = students.filter((s: any) =>
      s.userActivities.some((a: any) => new Date(a.createdAt) >= sevenDaysAgo)
    ).length;

    const activeStudents30d = students.filter((s: any) =>
      s.userActivities.some((a: any) => new Date(a.createdAt) >= thirtyDaysAgo)
    ).length;

    // Calculate average level
    const avgLevel = students.length > 0
      ? students.reduce((sum: number, s: any) => sum + s.level, 0) / students.length
      : 0;

    // Calculate total XP earned
    const totalXpEarned = students.reduce((sum: number, s: any) => sum + s.xp, 0);

    // Count assignments
    const assignmentsActive = classroom.assignments.filter((a: any) => {
      const hasIncomplete = a.studentAssignments.some(
        (sa: any) => sa.status !== Status.COMPLETED
      );
      return hasIncomplete;
    }).length;

    const assignmentsCompleted = classroom.assignments.filter((a: any) => {
      const allCompleted = a.studentAssignments.every(
        (sa: any) => sa.status === Status.COMPLETED
      );
      return allCompleted && a.studentAssignments.length > 0;
    }).length;

    // Calculate performance metrics
    const allScores = classroom.assignments.flatMap((a: any) =>
      a.studentAssignments
        .filter((sa: any) => sa.score !== null)
        .map((sa: any) => sa.score!)
    );

    const averageAccuracy = allScores.length > 0
      ? allScores.reduce((sum: number, score: number) => sum + score, 0) / allScores.length
      : 0;

    // Calculate average reading time (in minutes)
    const readingTimes = students.flatMap((s: any) =>
      s.userActivities
        .filter((a: any) => a.timer !== null)
        .map((a: any) => a.timer!)
    );

    const averageReadingTime = readingTimes.length > 0
      ? readingTimes.reduce((sum: number, time: number) => sum + time, 0) / readingTimes.length / 60 // Convert to minutes
      : 0;

    // Count books completed (lesson records)
    const booksCompleted = students.reduce((total: number, s: any) => {
      return total + s.lessonRecords.length;
    }, 0);

    const response = {
      class: {
        id: classroom.id,
        name: classroom.classroomName || 'Unnamed Class',
        classCode: classroom.classCode || '',
        schoolId: classroom.schoolId || undefined,
        schoolName: classroom.school?.name || undefined,
        createdAt: classroom.createdAt.toISOString(),
      },
      summary: {
        totalStudents: students.length,
        activeStudents7d,
        activeStudents30d,
        averageLevel: Math.round(avgLevel * 10) / 10,
        totalXpEarned,
        assignmentsActive,
        assignmentsCompleted,
      },
      performance: {
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        averageReadingTime: Math.round(averageReadingTime * 10) / 10,
        booksCompleted,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    console.log(`[Controller] getClassroomOverview - ${duration}ms - classroomId: ${classroomId}`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=240',
        'X-Response-Time': `${duration}ms`,
      },
    });
  } catch (error) {
    console.error('[Controller] getClassroomOverview - Error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch class overview',
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

/**
 * Helper function to convert students to CSV
 */
function convertStudentsToCSV(students: any[]): string {
  const headers = [
    'Student ID',
    'Name',
    'Email',
    'Level',
    'CEFR Level',
    'XP',
    'Last Active',
    'Assignments Completed',
    'Assignments Pending',
    'Reading Sessions',
    'Average Accuracy (%)',
    'Joined At',
  ];

  const rows = students.map((s) => [
    s.id,
    s.name,
    s.email,
    s.level.toString(),
    s.cefrLevel,
    s.xp.toString(),
    s.lastActive || 'Never',
    s.assignmentsCompleted.toString(),
    s.assignmentsPending.toString(),
    s.readingSessions.toString(),
    (s.averageAccuracy * 100).toFixed(2),
    s.joinedAt,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape cells that contain commas or quotes
        if (cell.includes(',') || cell.includes('"')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * Get classroom students
 * @param req - Extended Next request with session
 * @param classroomId - Classroom ID
 * @returns Classroom students response
 */
export async function getClassroomStudents(req: ExtendedNextRequest, classroomId: string) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Check for CSV export format
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    // Get classroom with students
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        teachers: {
          select: {
            teacherId: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                level: true,
                cefrLevel: true,
                xp: true,
                userActivities: {
                  select: {
                    createdAt: true,
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                  take: 1,
                },
                lessonRecords: {
                  select: {
                    id: true,
                  },
                },
                studentAssignments: {
                  select: {
                    id: true,
                    status: true,
                    score: true,
                    assignment: {
                      select: {
                        classroomId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) as any;

    if (!classroom) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Check access rights
    const isTeacher = classroom.teachers.some((t: any) => t.teacherId === userId);
    const isAdmin = userRole === Role.ADMIN || userRole === Role.SYSTEM;

    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Process students data
    const students = classroom.students.map((cs: any) => {
      const student = cs.student;

      // Filter assignments for this classroom only
      const classroomAssignments = student.studentAssignments.filter(
        (sa: any) => sa.assignment?.classroomId === classroomId
      );

      // Count completed vs pending assignments
      const assignmentsCompleted = classroomAssignments.filter(
        (sa: any) => sa.status === Status.COMPLETED
      ).length;

      const assignmentsPending = classroomAssignments.filter(
        (sa: any) => sa.status !== Status.COMPLETED
      ).length;

      // Calculate average accuracy
      const scores = classroomAssignments
        .filter((sa: any) => sa.score !== null)
        .map((sa: any) => sa.score);

      const averageAccuracy = scores.length > 0
        ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
        : 0;

      // Get last active date
      const lastActive = student.userActivities.length > 0
        ? student.userActivities[0].createdAt.toISOString()
        : undefined;

      return {
        id: student.id,
        name: student.name || 'Unknown',
        email: student.email,
        level: student.level,
        cefrLevel: student.cefrLevel,
        xp: student.xp,
        lastActive,
        assignmentsCompleted,
        assignmentsPending,
        readingSessions: student.lessonRecords.length,
        averageAccuracy,
        joinedAt: cs.createdAt.toISOString(),
      };
    });

    // Sort by name
    students.sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Calculate summary statistics
    const active7d = students.filter((s: any) => {
      if (!s.lastActive) return false;
      return new Date(s.lastActive) >= sevenDaysAgo;
    }).length;

    const active30d = students.filter((s: any) => {
      if (!s.lastActive) return false;
      return new Date(s.lastActive) >= thirtyDaysAgo;
    }).length;

    const averageLevel = students.length > 0
      ? students.reduce((sum: number, s: any) => sum + s.level, 0) / students.length
      : 0;

    // If CSV format is requested, return CSV
    if (format === 'csv') {
      const csv = convertStudentsToCSV(students);
      const duration = Date.now() - startTime;

      console.log(`[Controller] getClassroomStudents - ${duration}ms - CSV export - ${students.length} students`);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="class-${classroomId}-students-${new Date().toISOString().split('T')[0]}.csv"`,
          'X-Response-Time': `${duration}ms`,
        },
      });
    }

    // Otherwise, return JSON
    const response = {
      students,
      summary: {
        total: students.length,
        active7d,
        active30d,
        averageLevel: Math.round(averageLevel * 10) / 10,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    console.log(`[Controller] getClassroomStudents - ${duration}ms - classroomId: ${classroomId} - ${students.length} students`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=240',
        'X-Response-Time': `${duration}ms`,
      },
    });
  } catch (error) {
    console.error('[Controller] getClassroomStudents - Error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch class students',
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}
