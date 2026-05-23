import { ExtendedNextRequest } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { getCurrentUser } from "@/lib/session";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isoWeek from "dayjs/plugin/isoWeek";
import {
  db,
  eq,
  and,
  or,
  ne,
  gte,
  lt,
  lte,
  inArray,
  notInArray,
  desc,
  asc,
  sql,
} from "@reading-advantage/db";
import {
  classrooms,
  classroomStudents,
  classroomTeachers,
  users,
  schools,
  licenses,
  xpLogs,
  userActivity,
  lessonRecords,
  assignments,
  studentAssignments,
  licenseOnUsers,
} from "@reading-advantage/db/schema";

dayjs.extend(isSameOrAfter);
dayjs.extend(isoWeek);

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateClassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function convertStudentsToCSV(students: any[]): string {
  const headers = [
    "Student ID",
    "Name",
    "Email",
    "Level",
    "CEFR Level",
    "XP",
    "Last Active",
    "Assignments Completed",
    "Assignments Pending",
    "Reading Sessions",
    "Average Accuracy (%)",
    "Joined At",
  ];

  const rows = students.map((s) => [
    s.id,
    s.name,
    s.email,
    s.level.toString(),
    s.cefrLevel,
    s.xp.toString(),
    s.lastActive || "Never",
    s.assignmentsCompleted.toString(),
    s.assignmentsPending.toString(),
    s.readingSessions.toString(),
    (s.averageAccuracy * 100).toFixed(2),
    s.joinedAt,
  ]);

  return [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (cell.includes(",") || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(",")
    ),
  ].join("\n");
}

/** Get student IDs that belong to any of the given license IDs (direct or via licenseOnUsers). */
async function getUserIdsForLicenses(licenseIds: string[]): Promise<string[]> {
  if (licenseIds.length === 0) return [];
  const [direct, indirect] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.licenseId as any, licenseIds)),
    db
      .select({ userId: licenseOnUsers.userId })
      .from(licenseOnUsers)
      .where(inArray(licenseOnUsers.licenseId, licenseIds)),
  ]);
  return [...new Set([...direct.map((r) => r.id), ...indirect.map((r) => r.userId)])];
}

/** Shape a classroom row + joined students + teacher into the API shape. */
function formatClassroomRow(
  classroom: {
    id: string;
    name: string;
    classCode: string | null;
    grade: number | null;
    archived: boolean;
    createdAt: Date;
    createdBy: string | null;
    teacherId: string;
    updatedAt: Date;
  },
  teacher: { id: string; name: string | null } | null,
  students: { studentId: string; email: string | null; joinedAt: Date }[],
  currentUserId?: string
) {
  return {
    id: classroom.id,
    classroomName: classroom.name,
    classCode: classroom.classCode,
    grade: classroom.grade?.toString() ?? null,
    archived: classroom.archived,
    title: classroom.name,
    importedFromGoogle: false,
    alternateLink: "",
    createdAt: classroom.createdAt,
    createdBy: teacher ?? { id: classroom.createdBy ?? "", name: "" },
    isOwner: currentUserId ? classroom.teacherId === currentUserId : false,
    teachers: [
      {
        teacherId: teacher?.id ?? "",
        name: teacher?.name ?? "",
        role: "OWNER" as const,
        joinedAt: classroom.createdAt,
      },
    ],
    student: students.map((s) => ({
      studentId: s.studentId,
      email: s.email,
      lastActivity: s.joinedAt,
    })),
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function getAllStudentList(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const teacherLicenseRows = await db
      .select({ licenseId: licenseOnUsers.licenseId })
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.userId, user.id));

    const [teacherUser] = await db
      .select({ licenseId: users.licenseId })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const licenseIdsFromTable = teacherLicenseRows.map((r) => r.licenseId);
    const allLicenseIds = teacherUser?.licenseId
      ? [...licenseIdsFromTable, teacherUser.licenseId]
      : licenseIdsFromTable;
    const uniqueLicenseIds = [...new Set(allLicenseIds)];

    if (uniqueLicenseIds.length === 0) {
      return NextResponse.json({ students: [] }, { status: 200 });
    }

    // Students with matching licenseId or licenseOnUsers entry
    const indirectIds = await db
      .select({ userId: licenseOnUsers.userId })
      .from(licenseOnUsers)
      .where(inArray(licenseOnUsers.licenseId, uniqueLicenseIds));

    const allUserIds = [...new Set(indirectIds.map((r) => r.userId))];

    const directStudents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        xp: users.xp,
        level: users.level,
        cefrLevel: users.cefrLevel,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        licenseId: users.licenseId,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          inArray(users.role as any, ["STUDENT", "USER"]),
          or(
            inArray(users.licenseId as any, uniqueLicenseIds),
            allUserIds.length > 0 ? inArray(users.id, allUserIds) : sql`false`
          )
        )
      );

    const studentIds = directStudents.map((s) => s.id);
    const licenseUserRows =
      studentIds.length > 0
        ? await db
            .select({ userId: licenseOnUsers.userId, licenseId: licenseOnUsers.licenseId })
            .from(licenseOnUsers)
            .where(inArray(licenseOnUsers.userId, studentIds))
        : [];

    const licensesByUser: Record<string, string[]> = {};
    for (const r of licenseUserRows) {
      if (!licensesByUser[r.userId]) licensesByUser[r.userId] = [];
      licensesByUser[r.userId].push(r.licenseId);
    }

    const studentsResult = directStudents.map((s) => ({
      ...s,
      licenseOnUsers: (licensesByUser[s.id] ?? []).map((lid) => ({ licenseId: lid })),
    }));

    return NextResponse.json({ students: studentsResult }, { status: 200 });
  } catch (error) {
    console.error("Error fetching student list:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function getClassroom(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedLicenseId = searchParams.get("licenseId");

    let classroomList: any[] = [];

    if (user.role === "SYSTEM") {
      let teacherIds: string[] | undefined;
      if (requestedLicenseId) {
        teacherIds = await getUserIdsForLicenses([requestedLicenseId]);
      }

      const rows = await db
        .select()
        .from(classrooms)
        .where(
          and(
            ne(classrooms.archived, true),
            teacherIds && teacherIds.length > 0
              ? inArray(classrooms.teacherId, teacherIds)
              : undefined
          )
        )
        .orderBy(desc(classrooms.createdAt));

      classroomList = await Promise.all(
        rows.map(async (c) => {
          const [teacher] = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, c.teacherId))
            .limit(1);

          const studentRows = await db
            .select({ studentId: classroomStudents.studentId, email: users.email, joinedAt: classroomStudents.joinedAt })
            .from(classroomStudents)
            .leftJoin(users, eq(classroomStudents.studentId, users.id))
            .where(eq(classroomStudents.classroomId, c.id));

          return {
            ...formatClassroomRow(c, teacher ?? null, studentRows, user.id),
            isOwner: c.createdBy != null,
          };
        })
      );
    } else if (user.role === "ADMIN") {
      if (!user.license_id) {
        return NextResponse.json({ error: "Admin license not found" }, { status: 404 });
      }

      const userIds = await getUserIdsForLicenses([user.license_id]);

      const rows = await db
        .select()
        .from(classrooms)
        .where(userIds.length > 0 ? inArray(classrooms.teacherId, userIds) : sql`false`)
        .orderBy(desc(classrooms.createdAt));

      classroomList = await Promise.all(
        rows.map(async (c) => {
          const [teacher] = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, c.teacherId))
            .limit(1);

          const studentRows = await db
            .select({ studentId: classroomStudents.studentId, email: users.email, joinedAt: classroomStudents.joinedAt })
            .from(classroomStudents)
            .leftJoin(users, eq(classroomStudents.studentId, users.id))
            .where(eq(classroomStudents.classroomId, c.id));

          return {
            ...formatClassroomRow(c, teacher ?? null, studentRows, user.id),
          };
        })
      );
    } else {
      // TEACHER role
      const ownedRows = await db
        .select()
        .from(classrooms)
        .where(and(eq(classrooms.teacherId, user.id), ne(classrooms.archived, true)))
        .orderBy(desc(classrooms.createdAt));

      // Co-teacher classrooms
      const coTeacherRows = await db
        .select({
          id: classrooms.id,
          name: classrooms.name,
          classCode: classrooms.classCode,
          grade: classrooms.grade,
          archived: classrooms.archived,
          createdAt: classrooms.createdAt,
          createdBy: classrooms.createdBy,
          teacherId: classrooms.teacherId,
          updatedAt: classrooms.updatedAt,
          teacherName: users.name,
        })
        .from(classroomTeachers)
        .innerJoin(classrooms, eq(classroomTeachers.classroomId, classrooms.id))
        .leftJoin(users, eq(classrooms.teacherId, users.id))
        .where(
          and(
            eq(classroomTeachers.teacherId, user.id),
            ne(classrooms.archived, true)
          )
        )
        .orderBy(desc(classrooms.createdAt));

      const coTeacherClassroomIds = coTeacherRows.map((r) => r.id);

      const ownedData = await Promise.all(
        ownedRows.map(async (c) => {
          const [teacher] = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, c.teacherId))
            .limit(1);

          const studentRows = await db
            .select({ studentId: classroomStudents.studentId, email: users.email, joinedAt: classroomStudents.joinedAt })
            .from(classroomStudents)
            .leftJoin(users, eq(classroomStudents.studentId, users.id))
            .where(eq(classroomStudents.classroomId, c.id));

          return { ...formatClassroomRow(c, teacher ?? null, studentRows, user.id), isOwner: true };
        })
      );

      const coTeacherStudentRows =
        coTeacherClassroomIds.length > 0
          ? await db
              .select({ classroomId: classroomStudents.classroomId, studentId: classroomStudents.studentId, email: users.email, joinedAt: classroomStudents.joinedAt })
              .from(classroomStudents)
              .leftJoin(users, eq(classroomStudents.studentId, users.id))
              .where(inArray(classroomStudents.classroomId, coTeacherClassroomIds))
          : [];

      const coTeacherData = coTeacherRows.map((c) => {
        const studentRows = coTeacherStudentRows
          .filter((s) => s.classroomId === c.id)
          .map((s) => ({ studentId: s.studentId, email: s.email, joinedAt: s.joinedAt }));

        return {
          id: c.id,
          classroomName: c.name,
          classCode: c.classCode,
          grade: c.grade?.toString() ?? null,
          archived: c.archived,
          title: c.name,
          importedFromGoogle: false,
          alternateLink: "",
          createdAt: c.createdAt,
          createdBy: { id: c.teacherId, name: c.teacherName },
          isOwner: false,
          teachers: [{ teacherId: c.teacherId, name: c.teacherName ?? "", role: "OWNER" as const, joinedAt: c.createdAt }],
          student: studentRows.map((s) => ({
            studentId: s.studentId,
            email: s.email,
            lastActivity: s.joinedAt,
          })),
        };
      });

      const allRaw = [...ownedData, ...coTeacherData];
      classroomList = allRaw.filter(
        (c, i, self) => i === self.findIndex((x) => x.id === c.id)
      );
    }

    // Calculate XP data for each classroom
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);

    const classroomsWithXp = await Promise.all(
      classroomList.map(async (classroom) => {
        const studentIds = classroom.student.map((s: any) => s.studentId).filter(Boolean);

        if (studentIds.length === 0) {
          return { ...classroom, xpData: { today: 0, week: 0, month: 0, allTime: 0 } };
        }

        const [xpLogRows, totalXpRows] = await Promise.all([
          db
            .select({ xpEarned: xpLogs.xpEarned, createdAt: xpLogs.createdAt })
            .from(xpLogs)
            .where(inArray(xpLogs.userId, studentIds)),
          db
            .select({ xp: users.xp })
            .from(users)
            .where(inArray(users.id, studentIds)),
        ]);

        const todayXp = xpLogRows.filter((l) => l.createdAt >= todayStart).reduce((s, l) => s + l.xpEarned, 0);
        const weekXp = xpLogRows.filter((l) => l.createdAt >= weekStart).reduce((s, l) => s + l.xpEarned, 0);
        const monthXp = xpLogRows.filter((l) => l.createdAt >= monthStart).reduce((s, l) => s + l.xpEarned, 0);
        const allTimeXp = totalXpRows.reduce((s, u) => s + (u.xp || 0), 0);

        return { ...classroom, xpData: { today: todayXp, week: weekXp, month: monthXp, allTime: allTimeXp } };
      })
    );

    return NextResponse.json({ message: "success", data: classroomsWithXp }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function getStudentClassroom(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select({ classroomId: classroomStudents.classroomId })
      .from(classroomStudents)
      .where(eq(classroomStudents.studentId, user.id))
      .limit(1);

    const classroomId = rows.length > 0 ? rows[0].classroomId : null;
    return NextResponse.json({ message: "success", data: classroomId }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function getClassroomStudent(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [teacher] = await db
      .select({ licenseId: users.licenseId })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!teacher?.licenseId) {
      return NextResponse.json({ error: "Teacher license not found" }, { status: 404 });
    }

    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        xp: users.xp,
        level: users.level,
        cefrLevel: users.cefrLevel,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        licenseId: users.licenseId,
      })
      .from(users)
      .where(
        and(
          inArray(users.role as any, ["STUDENT", "USER"]),
          eq(users.licenseId as any, teacher.licenseId)
        )
      );

    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function getEnrollClassroom(req: ExtendedNextRequest) {
  try {
    const params = req.nextUrl.searchParams.get("studentId");
    const user = await getCurrentUser();

    if (!params) return NextResponse.json({ messages: "Invalid user ID" }, { status: 501 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [studentData] = await db
      .select({ id: users.id, name: users.name, email: users.email, xp: users.xp, level: users.level, cefrLevel: users.cefrLevel, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, params))
      .limit(1);

    if (!studentData) return NextResponse.json({ messages: "Student not found" }, { status: 404 });

    // Classrooms owned by the teacher that do NOT contain this student
    const enrolledClassroomIds = await db
      .select({ classroomId: classroomStudents.classroomId })
      .from(classroomStudents)
      .where(eq(classroomStudents.studentId, params));
    const enrolledIds = enrolledClassroomIds.map((r) => r.classroomId);

    const classroomRows = await db
      .select()
      .from(classrooms)
      .where(
        and(
          eq(classrooms.teacherId, user.id),
          ne(classrooms.archived, true),
          enrolledIds.length > 0 ? notInArray(classrooms.id, enrolledIds) : undefined
        )
      );

    const filteredClassrooms = await Promise.all(
      classroomRows.map(async (c) => {
        const studentRows = await db
          .select({ studentId: classroomStudents.studentId, email: users.email, joinedAt: classroomStudents.joinedAt })
          .from(classroomStudents)
          .leftJoin(users, eq(classroomStudents.studentId, users.id))
          .where(eq(classroomStudents.classroomId, c.id));

        return {
          id: c.id,
          classroomName: c.name,
          classCode: c.classCode,
          grade: c.grade?.toString(),
          archived: c.archived,
          teacherId: c.teacherId,
          importedFromGoogle: false,
          student: studentRows.map((s) => ({ studentId: s.studentId, email: s.email, lastActivity: s.joinedAt })),
        };
      })
    );

    return NextResponse.json(
      {
        student: { ...studentData, display_name: studentData.name, last_activity: studentData.updatedAt },
        classroom: filteredClassrooms,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getEnrollClassroom:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function getUnenrollClassroom(req: ExtendedNextRequest) {
  try {
    const params = req.nextUrl.searchParams.get("studentId");
    const user = await getCurrentUser();

    if (!params) return NextResponse.json({ messages: "Invalid user ID" }, { status: 501 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [studentData] = await db
      .select({ id: users.id, name: users.name, email: users.email, xp: users.xp, level: users.level, cefrLevel: users.cefrLevel, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, params))
      .limit(1);

    if (!studentData) return NextResponse.json({ messages: "Student not found" }, { status: 404 });

    // Classrooms owned by the teacher that DO contain this student
    const enrolledClassroomIds = await db
      .select({ classroomId: classroomStudents.classroomId })
      .from(classroomStudents)
      .where(eq(classroomStudents.studentId, params));
    const enrolledIds = enrolledClassroomIds.map((r) => r.classroomId);

    const classroomRows =
      enrolledIds.length > 0
        ? await db
            .select()
            .from(classrooms)
            .where(
              and(
                eq(classrooms.teacherId, user.id),
                ne(classrooms.archived, true),
                inArray(classrooms.id, enrolledIds)
              )
            )
        : [];

    const filteredClassrooms = await Promise.all(
      classroomRows.map(async (c) => {
        const studentRows = await db
          .select({ studentId: classroomStudents.studentId, email: users.email, joinedAt: classroomStudents.joinedAt })
          .from(classroomStudents)
          .leftJoin(users, eq(classroomStudents.studentId, users.id))
          .where(eq(classroomStudents.classroomId, c.id));

        return {
          id: c.id,
          classroomName: c.name,
          classCode: c.classCode,
          grade: c.grade?.toString(),
          archived: c.archived,
          teacherId: c.teacherId,
          importedFromGoogle: false,
          student: studentRows.map((s) => ({ studentId: s.studentId, email: s.email, lastActivity: s.joinedAt })),
        };
      })
    );

    return NextResponse.json(
      {
        student: { ...studentData, display_name: studentData.name, last_activity: studentData.updatedAt },
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
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });

    const studentRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        xp: users.xp,
        level: users.level,
        cefrLevel: users.cefrLevel,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        joinedAt: classroomStudents.joinedAt,
      })
      .from(classroomStudents)
      .leftJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId));

    const filteredUsers = studentRows.map((u) => ({
      ...u,
      display_name: u.name,
      last_activity: u.joinedAt,
    }));

    const classroomDoc = {
      id: classroom.id,
      classroomName: classroom.name,
      classCode: classroom.classCode,
      teacherId: classroom.teacherId,
      archived: classroom.archived,
      grade: classroom.grade?.toString(),
      createdAt: classroom.createdAt,
      updatedAt: classroom.updatedAt,
      importedFromGoogle: false,
      googleClassroomId: null,
    };

    return NextResponse.json({ studentInClass: filteredUsers, classroom: classroomDoc }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function updateStudentClassroom(req: ExtendedNextRequest) {
  try {
    const json = await req.json();
    const { name, studentId } = json;

    await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, studentId));

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function getClassroomTeacher(req: ExtendedNextRequest) {
  try {
    const teachers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.role, "TEACHER" as any));

    return NextResponse.json({ teachers }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function createdClassroom(req: ExtendedNextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json: { classroom?: Course; courses?: Course[] } = await req.json();
    const isImportedFromGoogle: boolean = Array.isArray(json.courses);
    const courses: Course[] = isImportedFromGoogle ? json.courses! : [json.classroom!];

    for (const data of courses.filter((course): course is Course => !!course)) {
      const classCode = data.classCode || data.enrollmentCode || generateClassCode();

      const [newClassroom] = await db
        .insert(classrooms)
        .values({
          name: data.classroomName || data.name || "",
          teacherId: user.id,
          createdBy: user.id,
          classCode,
          archived: false,
          grade: data.grade ? parseInt(data.grade) : null,
          createdAt: data.creationTime ? new Date(data.creationTime) : new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Add creator as OWNER in classroomTeachers
      await db.insert(classroomTeachers).values({
        teacherId: user.id,
        classroomId: newClassroom.id,
        role: "OWNER",
        createdAt: new Date(),
      });

      if (isImportedFromGoogle && data.studentCount) {
        for (const student of data.studentCount) {
          if (student.profile?.emailAddress) {
            const [userRecord] = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.email, student.profile.emailAddress))
              .limit(1);
            if (userRecord) {
              await db
                .insert(classroomStudents)
                .values({ classroomId: newClassroom.id, studentId: userRecord.id })
                .onConflictDoNothing();
            }
          }
        }
      } else if (!isImportedFromGoogle && data.classroom?.student) {
        for (const student of data.classroom.student) {
          if (student.studentId) {
            await db
              .insert(classroomStudents)
              .values({ classroomId: newClassroom.id, studentId: student.studentId })
              .onConflictDoNothing();
          }
        }
      }
    }

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error creating classroom:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function achivedClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const { archived } = await req.json();

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });

    await db.update(classrooms).set({ archived, updatedAt: new Date() }).where(eq(classrooms.id, classroomId));

    return NextResponse.json({ message: "success updated archived status" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function updateClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const { classroomName, grade } = await req.json();

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });

    await db
      .update(classrooms)
      .set({ name: classroomName, grade: grade ? parseInt(grade) : null, updatedAt: new Date() })
      .where(eq(classrooms.id, classroomId));

    return NextResponse.json({ message: "success updated" }, { status: 200 });
  } catch (error) {
    console.error("Error updating classroom:", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function deleteClassroom(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });

    await db.delete(classrooms).where(eq(classrooms.id, classroomId));

    return NextResponse.json({ message: "success deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function patchClassroomEnroll(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  const studentSchema = z.object({
    studentId: z.string(),
    lastActivity: z.string(),
  });

  try {
    const json = await req.json();
    const newStudents = z.array(studentSchema).parse(json.student);

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });

    for (const student of newStudents) {
      const [existingEnrollment] = await db
        .select({ classroomId: classroomStudents.classroomId })
        .from(classroomStudents)
        .where(eq(classroomStudents.studentId, student.studentId))
        .limit(1);

      if (existingEnrollment) {
        const [enrolledClassroom] = await db
          .select({ name: classrooms.name })
          .from(classrooms)
          .where(eq(classrooms.id, existingEnrollment.classroomId))
          .limit(1);

        return NextResponse.json(
          {
            message: `Student is already enrolled in classroom: ${enrolledClassroom?.name ?? existingEnrollment.classroomId}`,
            error: "ALREADY_ENROLLED",
          },
          { status: 400 }
        );
      }

      await db
        .insert(classroomStudents)
        .values({ classroomId, studentId: student.studentId })
        .onConflictDoNothing();
    }

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error enrolling students:", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function patchClassroomUnenroll(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const json = await req.json();
    const studentId = json.studentId;

    if (!studentId) return NextResponse.json({ message: "Student ID is required" }, { status: 400 });

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });

    const result = await db
      .delete(classroomStudents)
      .where(and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.studentId, studentId)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ message: "Student not found in classroom" }, { status: 404 });
    }

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error unenrolling student:", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

export async function getClassXp(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const licenseId = searchParams.get("licenseId");
    const timeRange = searchParams.get("timeRange") || "year";

    if (!year) return NextResponse.json({ message: "Year parameter is required" }, { status: 400 });

    const yearNum = parseInt(year);
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

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
      default:
        startDate = new Date(yearNum, 0, 1);
        endDate = new Date(yearNum + 1, 0, 1);
        break;
    }

    if (!licenseId) {
      return NextResponse.json({ message: "Please specify a licenseId parameter" }, { status: 400 });
    }

    const licenseUserRows = await db
      .select({ userId: licenseOnUsers.userId })
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.licenseId, licenseId));

    if (licenseUserRows.length === 0) {
      return NextResponse.json({ message: `License ${licenseId} not found` }, { status: 404 });
    }

    const userIds = licenseUserRows.map((r) => r.userId);

    // Get classrooms that have at least one of these students
    const relevantClassroomIds = await db
      .selectDistinct({ classroomId: classroomStudents.classroomId })
      .from(classroomStudents)
      .where(inArray(classroomStudents.studentId, userIds));
    const classroomIds = relevantClassroomIds.map((r) => r.classroomId);

    if (classroomIds.length === 0) {
      return NextResponse.json({ year, licenseId, timeRange, data: { dataMostActive: { [timeRange]: [] }, dataLeastActive: { [timeRange]: [] } } });
    }

    const classroomRows = await db.select().from(classrooms).where(inArray(classrooms.id, classroomIds));

    // For each classroom, sum XP of students in the date range
    const classroomXpMap: { [id: string]: { name: string; xp: number } } = {};

    await Promise.all(
      classroomRows.map(async (c) => {
        const studentRows = await db
          .select({ studentId: classroomStudents.studentId })
          .from(classroomStudents)
          .where(and(eq(classroomStudents.classroomId, c.id), inArray(classroomStudents.studentId, userIds)));

        const sIds = studentRows.map((s) => s.studentId);
        if (sIds.length === 0) return;

        const xpLogRows = await db
          .select({ xpEarned: xpLogs.xpEarned })
          .from(xpLogs)
          .where(and(inArray(xpLogs.userId, sIds), gte(xpLogs.createdAt, startDate), lt(xpLogs.createdAt, endDate)));

        const totalClassroomXp = xpLogRows.reduce((s, l) => s + l.xpEarned, 0);
        if (totalClassroomXp > 0) {
          classroomXpMap[c.id] = { name: c.name ?? `Classroom ${c.id}`, xp: totalClassroomXp };
        }
      })
    );

    const classroomData = Object.values(classroomXpMap);
    const mostActive = [...classroomData].sort((a, b) => b.xp - a.xp).slice(0, 5);
    const leastActive = [...classroomData].sort((a, b) => a.xp - b.xp).slice(0, 5);

    return NextResponse.json({
      year,
      licenseId,
      timeRange,
      data: { dataMostActive: { [timeRange]: mostActive }, dataLeastActive: { [timeRange]: leastActive } },
    });
  } catch (error) {
    console.error("Error fetching XP data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function getTopSchoolsXp(req: NextRequest): Promise<NextResponse> {
  try {
    const allLicenseUserRows = await db.select().from(licenseOnUsers);
    const allUserIds = [...new Set(allLicenseUserRows.map((r) => r.userId))];

    if (allUserIds.length === 0) return NextResponse.json({ data: [] }, { status: 200 });

    const xpRows = await db
      .select({ userId: xpLogs.userId, xpEarned: xpLogs.xpEarned })
      .from(xpLogs)
      .where(inArray(xpLogs.userId, allUserIds));

    const xpByUser: Record<string, number> = {};
    for (const r of xpRows) {
      xpByUser[r.userId] = (xpByUser[r.userId] ?? 0) + r.xpEarned;
    }

    // Get license → school mapping
    const licenseIds = [...new Set(allLicenseUserRows.map((r) => r.licenseId))];
    const licenseInfoRows = await db
      .select({ id: licenses.id, schoolName: licenses.schoolName })
      .from(licenses)
      .where(inArray(licenses.id, licenseIds));

    const schoolXpMap: Record<string, number> = {};
    for (const lu of allLicenseUserRows) {
      const license = licenseInfoRows.find((l) => l.id === lu.licenseId);
      if (!license) continue;
      schoolXpMap[license.schoolName] = (schoolXpMap[license.schoolName] ?? 0) + (xpByUser[lu.userId] ?? 0);
    }

    const topSchools = Object.entries(schoolXpMap)
      .filter(([, xp]) => xp > 0)
      .map(([school, xp]) => ({ school, xp }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);

    return NextResponse.json({ data: topSchools }, { status: 200 });
  } catch (error) {
    console.error("Error fetching top schools XP data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function getClassroomXpCustomRange(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const licenseId = searchParams.get("licenseId");

    if (!fromDate || !toDate) {
      return NextResponse.json({ message: "Both 'from' and 'to' date parameters are required" }, { status: 400 });
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setDate(endDate.getDate() + 1);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ message: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ message: "Start date must be before end date" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let classroomIds: string[] = [];

    if (user.role === "SYSTEM") {
      const rows = await db.select({ id: classrooms.id }).from(classrooms).where(ne(classrooms.archived, true));
      classroomIds = rows.map((r) => r.id);
    } else if (user.role === "ADMIN") {
      const [adminUser] = await db.select({ licenseId: users.licenseId }).from(users).where(eq(users.id, user.id)).limit(1);
      if (!adminUser?.licenseId) return NextResponse.json({ error: "Admin user must have a license" }, { status: 400 });

      const userIds = await getUserIdsForLicenses([adminUser.licenseId]);
      const rows = await db
        .select({ id: classrooms.id })
        .from(classrooms)
        .where(and(ne(classrooms.archived, true), userIds.length > 0 ? inArray(classrooms.teacherId, userIds) : sql`false`));
      classroomIds = rows.map((r) => r.id);
    } else {
      const rows = await db
        .select({ id: classrooms.id })
        .from(classrooms)
        .where(and(eq(classrooms.teacherId, user.id), ne(classrooms.archived, true)));
      classroomIds = rows.map((r) => r.id);
    }

    if (classroomIds.length === 0) {
      return NextResponse.json({ message: "success", data: [], dateRange: { from: fromDate, to: toDate } });
    }

    const classroomRows = await db.select().from(classrooms).where(inArray(classrooms.id, classroomIds));

    const classroomData = await Promise.all(
      classroomRows.map(async (c) => {
        const [teacher] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c.teacherId)).limit(1);

        const studentRows = await db
          .select({ studentId: classroomStudents.studentId, email: users.email, joinedAt: classroomStudents.joinedAt })
          .from(classroomStudents)
          .leftJoin(users, eq(classroomStudents.studentId, users.id))
          .where(eq(classroomStudents.classroomId, c.id));

        const studentIds = studentRows.map((s) => s.studentId);
        let customRangeXp = 0;

        if (studentIds.length > 0) {
          const xpLogRows = await db
            .select({ xpEarned: xpLogs.xpEarned })
            .from(xpLogs)
            .where(and(inArray(xpLogs.userId, studentIds), gte(xpLogs.createdAt, startDate), lte(xpLogs.createdAt, endDate)));
          customRangeXp = xpLogRows.reduce((s, l) => s + l.xpEarned, 0);
        }

        return {
          id: c.id,
          classroomName: c.name,
          classCode: c.classCode,
          grade: c.grade?.toString(),
          archived: c.archived,
          title: c.name,
          importedFromGoogle: false,
          alternateLink: "",
          createdAt: c.createdAt,
          createdBy: teacher ?? null,
          isOwner: c.teacherId === user.id,
          teachers: [{ teacherId: teacher?.id ?? "", name: teacher?.name ?? "", role: "OWNER" as const, joinedAt: c.createdAt }],
          student: studentRows.map((s) => ({ studentId: s.studentId, email: s.email, lastActivity: s.joinedAt })),
          xpData: { customRange: customRangeXp, today: 0, week: 0, month: 0, allTime: 0 },
        };
      })
    );

    return NextResponse.json({ message: "success", data: classroomData, dateRange: { from: fromDate, to: toDate } });
  } catch (error) {
    console.error("Error fetching custom range XP data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function getClassXpPerStudents(req: NextRequest, ctx: RequestContext) {
  try {
    const params = await ctx.params;
    const classroomId = params?.classroomId;
    if (!classroomId) return NextResponse.json({ message: "Missing classroomId" }, { status: 400 });

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);

    if (!classroom) return NextResponse.json({ message: "Classroom not found" }, { status: 404 });

    const studentRows = await db
      .select({ id: users.id, name: users.name, xp: users.xp })
      .from(classroomStudents)
      .leftJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId));

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);

    const result: Record<string, any> = {};

    for (const student of studentRows) {
      if (!student.id) continue;
      const displayName = student.name || student.id;

      const xpLogRows = await db
        .select({ xpEarned: xpLogs.xpEarned, createdAt: xpLogs.createdAt })
        .from(xpLogs)
        .where(eq(xpLogs.userId, student.id));

      result[displayName] = {
        today: xpLogRows.filter((l) => l.createdAt >= todayStart).reduce((s, l) => s + l.xpEarned, 0),
        week: xpLogRows.filter((l) => l.createdAt >= weekStart).reduce((s, l) => s + l.xpEarned, 0),
        month: xpLogRows.filter((l) => l.createdAt >= monthStart).reduce((s, l) => s + l.xpEarned, 0),
        allTime: student.xp ?? 0,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching XP data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function addCoTeacher(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { teacherEmail, role = "CO_TEACHER" } = body;

    if (!teacherEmail) return NextResponse.json({ error: "Teacher email is required" }, { status: 400 });

    const [classroom] = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.id, classroomId), or(eq(classrooms.teacherId, user.id), eq(classrooms.createdBy as any, user.id))))
      .limit(1);

    if (!classroom) return NextResponse.json({ error: "Only classroom creator can add co-teachers" }, { status: 403 });

    const [teacher] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, teacherEmail))
      .limit(1);

    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    if (teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "User must have TEACHER role" }, { status: 400 });
    }

    const [existingTeacher] = await db
      .select()
      .from(classroomTeachers)
      .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, teacher.id)))
      .limit(1);

    if (existingTeacher) return NextResponse.json({ error: "Teacher is already in this classroom" }, { status: 400 });

    await db.insert(classroomTeachers).values({ teacherId: teacher.id, classroomId, role, createdAt: new Date() });

    return NextResponse.json({ message: "Co-teacher added successfully", teacher: { id: teacher.id, name: teacher.name, email: teacher.email, role } }, { status: 200 });
  } catch (error) {
    console.error("Error adding co-teacher:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function removeCoTeacher(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { teacherId } = body;

    if (!teacherId) return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });

    const [classroom] = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.id, classroomId), or(eq(classrooms.teacherId, user.id), eq(classrooms.createdBy as any, user.id))))
      .limit(1);

    if (!classroom) return NextResponse.json({ error: "Only classroom creator can remove co-teachers" }, { status: 403 });

    const [teacherInClassroom] = await db
      .select({ id: classroomTeachers.id, role: classroomTeachers.role, teacherName: users.name })
      .from(classroomTeachers)
      .leftJoin(users, eq(classroomTeachers.teacherId, users.id))
      .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, teacherId)))
      .limit(1);

    if (!teacherInClassroom) return NextResponse.json({ error: "Teacher not found in this classroom" }, { status: 404 });

    if (teacherInClassroom.role === "OWNER") return NextResponse.json({ error: "Cannot remove classroom owner" }, { status: 400 });

    await db
      .delete(classroomTeachers)
      .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, teacherId)));

    return NextResponse.json({ message: "Co-teacher removed successfully", removedTeacher: { id: teacherId, name: teacherInClassroom.teacherName } }, { status: 200 });
  } catch (error) {
    console.error("Error removing co-teacher:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function getClassroomTeachers(req: ExtendedNextRequest, ctx: RequestContext) {
  const { classroomId } = await ctx.params;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [classroom] = await db
      .select({ id: classrooms.id, teacherId: classrooms.teacherId, createdAt: classrooms.createdAt, teacherName: users.name, teacherEmail: users.email })
      .from(classrooms)
      .leftJoin(users, eq(classrooms.teacherId, users.id))
      .where(and(eq(classrooms.id, classroomId), or(eq(classrooms.teacherId, user.id), eq(classrooms.createdBy as any, user.id))))
      .limit(1);

    if (!classroom) return NextResponse.json({ error: "Classroom not found or access denied" }, { status: 404 });

    const coTeacherRows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: classroomTeachers.role, joinedAt: classroomTeachers.createdAt })
      .from(classroomTeachers)
      .leftJoin(users, eq(classroomTeachers.teacherId, users.id))
      .where(eq(classroomTeachers.classroomId, classroomId))
      .orderBy(sql`CASE WHEN ${classroomTeachers.role} = 'OWNER' THEN 0 ELSE 1 END`, asc(classroomTeachers.createdAt));

    const teachers =
      coTeacherRows.length === 0
        ? [{ id: classroom.teacherId, name: classroom.teacherName ?? "Unknown", email: classroom.teacherEmail, role: "OWNER", joined_at: classroom.createdAt, is_creator: true }]
        : coTeacherRows.map((t) => ({ id: t.id, name: t.name, email: t.email, role: t.role, joined_at: t.joinedAt, is_creator: t.role === "OWNER" }));

    return NextResponse.json({ classroomId, teachers }, { status: 200 });
  } catch (error) {
    console.error("Error getting classroom teachers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function getClassroomOverview(req: ExtendedNextRequest, classroomId: string) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const userId = session.user.id;
    const userRole = session.user.role;

    const [classroom] = await db
      .select({ id: classrooms.id, name: classrooms.name, classCode: classrooms.classCode, schoolId: classrooms.schoolId, createdAt: classrooms.createdAt, schoolName: schools.name })
      .from(classrooms)
      .leftJoin(schools, eq(classrooms.schoolId, schools.id))
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (!classroom) return NextResponse.json({ code: "NOT_FOUND", message: "Classroom not found" }, { status: 404 });

    const teacherRows = await db
      .select({ teacherId: classroomTeachers.teacherId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.classroomId, classroomId));

    const isTeacher = teacherRows.some((t) => t.teacherId === userId);
    const isAdmin = userRole === "ADMIN" || userRole === "SYSTEM";

    if (!isTeacher && !isAdmin) return NextResponse.json({ code: "FORBIDDEN", message: "Access denied" }, { status: 403 });

    const studentRows = await db
      .select({ studentId: classroomStudents.studentId })
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, classroomId));
    const studentIds = studentRows.map((r) => r.studentId);

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let activeStudents7d = 0;
    let activeStudents30d = 0;
    let avgLevel = 0;
    let totalXpEarned = 0;
    let booksCompleted = 0;
    let readingTimeTotal = 0;
    let readingTimeCount = 0;

    if (studentIds.length > 0) {
      const studentDataRows = await db
        .select({ id: users.id, level: users.level, xp: users.xp })
        .from(users)
        .where(inArray(users.id, studentIds));

      totalXpEarned = studentDataRows.reduce((s, u) => s + (u.xp ?? 0), 0);
      avgLevel = studentDataRows.length > 0 ? studentDataRows.reduce((s, u) => s + (u.level ?? 0), 0) / studentDataRows.length : 0;

      const activityRows = await db
        .select({ userId: userActivity.userId, createdAt: userActivity.createdAt, timer: userActivity.timer })
        .from(userActivity)
        .where(inArray(userActivity.userId, studentIds));

      const sevenAgo = sevenDaysAgo;
      const thirtyAgo = thirtyDaysAgo;
      const activeSet7d = new Set(activityRows.filter((a) => a.createdAt >= sevenAgo).map((a) => a.userId));
      const activeSet30d = new Set(activityRows.filter((a) => a.createdAt >= thirtyAgo).map((a) => a.userId));
      activeStudents7d = activeSet7d.size;
      activeStudents30d = activeSet30d.size;

      const timerRows = activityRows.filter((a) => a.timer != null);
      readingTimeTotal = timerRows.reduce((s, a) => s + (a.timer ?? 0), 0);
      readingTimeCount = timerRows.length;

      const lessonRows = await db
        .select({ userId: lessonRecords.userId })
        .from(lessonRecords)
        .where(inArray(lessonRecords.userId, studentIds));
      booksCompleted = lessonRows.length;
    }

    const assignmentRows = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classroomId, classroomId));
    const assignmentIds = assignmentRows.map((a) => a.id);

    let assignmentsActive = 0;
    let assignmentsCompleted = 0;
    let averageAccuracy = 0;

    if (assignmentIds.length > 0) {
      const saRows = await db
        .select({ assignmentId: studentAssignments.assignmentId, status: studentAssignments.status, score: studentAssignments.score })
        .from(studentAssignments)
        .where(inArray(studentAssignments.assignmentId, assignmentIds));

      const byAssignment: Record<string, typeof saRows> = {};
      for (const sa of saRows) {
        if (!byAssignment[sa.assignmentId]) byAssignment[sa.assignmentId] = [];
        byAssignment[sa.assignmentId].push(sa);
      }

      for (const [, sas] of Object.entries(byAssignment)) {
        const hasIncomplete = sas.some((sa) => sa.status !== "COMPLETED");
        if (hasIncomplete) assignmentsActive++;
        if (sas.length > 0 && sas.every((sa) => sa.status === "COMPLETED")) assignmentsCompleted++;
      }

      const allScores = saRows.filter((sa) => sa.score != null).map((sa) => sa.score!);
      if (allScores.length > 0) {
        averageAccuracy = allScores.reduce((s, sc) => s + sc, 0) / allScores.length;
      }
    }

    const averageReadingTime = readingTimeCount > 0 ? readingTimeTotal / readingTimeCount / 60 : 0;

    const response = {
      class: {
        id: classroom.id,
        name: classroom.name ?? "Unnamed Class",
        classCode: classroom.classCode ?? "",
        schoolId: classroom.schoolId ?? undefined,
        schoolName: classroom.schoolName ?? undefined,
        createdAt: classroom.createdAt.toISOString(),
      },
      summary: {
        totalStudents: studentIds.length,
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
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;
    console.log(`[Controller] getClassroomOverview - ${duration}ms - classroomId: ${classroomId}`);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240", "X-Response-Time": `${duration}ms` },
    });
  } catch (error) {
    console.error("[Controller] getClassroomOverview - Error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch class overview", details: error instanceof Error ? { error: error.message } : {} },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}

export async function getClassroomStudents(req: ExtendedNextRequest, classroomId: string) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const userId = session.user.id;
    const userRole = session.user.role;

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const [classroom] = await db.select({ id: classrooms.id }).from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
    if (!classroom) return NextResponse.json({ code: "NOT_FOUND", message: "Classroom not found" }, { status: 404 });

    const teacherRows = await db
      .select({ teacherId: classroomTeachers.teacherId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.classroomId, classroomId));

    const isTeacher = teacherRows.some((t) => t.teacherId === userId);
    const isAdmin = userRole === "ADMIN" || userRole === "SYSTEM";

    if (!isTeacher && !isAdmin) return NextResponse.json({ code: "FORBIDDEN", message: "Access denied" }, { status: 403 });

    const studentEnrollRows = await db
      .select({ studentId: classroomStudents.studentId, joinedAt: classroomStudents.joinedAt })
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, classroomId));

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const students = await Promise.all(
      studentEnrollRows.map(async (enroll) => {
        const [student] = await db
          .select({ id: users.id, name: users.name, email: users.email, level: users.level, cefrLevel: users.cefrLevel, xp: users.xp })
          .from(users)
          .where(eq(users.id, enroll.studentId))
          .limit(1);

        if (!student) return null;

        const [lastActivityRow] = await db
          .select({ createdAt: userActivity.createdAt })
          .from(userActivity)
          .where(eq(userActivity.userId, enroll.studentId))
          .orderBy(desc(userActivity.createdAt))
          .limit(1);

        const lessonRows = await db
          .select({ id: lessonRecords.id })
          .from(lessonRecords)
          .where(eq(lessonRecords.userId, enroll.studentId));

        const saRows = await db
          .select({ status: studentAssignments.status, score: studentAssignments.score, classroomId: assignments.classroomId })
          .from(studentAssignments)
          .leftJoin(assignments, eq(studentAssignments.assignmentId, assignments.id))
          .where(and(eq(studentAssignments.studentId, enroll.studentId), eq(assignments.classroomId, classroomId)));

        const assignmentsCompleted = saRows.filter((sa) => sa.status === "COMPLETED").length;
        const assignmentsPending = saRows.filter((sa) => sa.status !== "COMPLETED").length;
        const scores = saRows.filter((sa) => sa.score != null).map((sa) => sa.score!);
        const averageAccuracy = scores.length > 0 ? scores.reduce((s, sc) => s + sc, 0) / scores.length : 0;
        const lastActive = lastActivityRow ? lastActivityRow.createdAt.toISOString() : undefined;

        return {
          id: student.id,
          name: student.name || "Unknown",
          email: student.email,
          level: student.level,
          cefrLevel: student.cefrLevel,
          xp: student.xp,
          lastActive,
          assignmentsCompleted,
          assignmentsPending,
          readingSessions: lessonRows.length,
          averageAccuracy,
          joinedAt: enroll.joinedAt.toISOString(),
        };
      })
    );

    const validStudents = students.filter(Boolean) as NonNullable<(typeof students)[0]>[];
    validStudents.sort((a, b) => a.name.localeCompare(b.name));

    const active7d = validStudents.filter((s) => s.lastActive && new Date(s.lastActive) >= sevenDaysAgo).length;
    const active30d = validStudents.filter((s) => s.lastActive && new Date(s.lastActive) >= thirtyDaysAgo).length;
    const averageLevel = validStudents.length > 0 ? validStudents.reduce((s, st) => s + st.level, 0) / validStudents.length : 0;

    if (format === "csv") {
      const csv = convertStudentsToCSV(validStudents);
      const duration = Date.now() - startTime;
      console.log(`[Controller] getClassroomStudents - ${duration}ms - CSV export - ${validStudents.length} students`);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="class-${classroomId}-students-${new Date().toISOString().split("T")[0]}.csv"`,
          "X-Response-Time": `${duration}ms`,
        },
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[Controller] getClassroomStudents - ${duration}ms - classroomId: ${classroomId} - ${validStudents.length} students`);

    return NextResponse.json(
      {
        students: validStudents,
        summary: { total: validStudents.length, active7d, active30d, averageLevel: Math.round(averageLevel * 10) / 10 },
        cache: { cached: false, generatedAt: new Date().toISOString() },
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240", "X-Response-Time": `${duration}ms` } }
    );
  } catch (error) {
    console.error("[Controller] getClassroomStudents - Error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch class students", details: error instanceof Error ? { error: error.message } : {} },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}
