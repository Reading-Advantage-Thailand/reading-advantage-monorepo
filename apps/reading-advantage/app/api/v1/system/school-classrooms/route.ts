import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db, and, eq, gte, inArray, or, sum } from "@reading-advantage/db";
import {
  users,
  licenses,
  licenseOnUsers,
  classrooms,
  classroomStudents,
  classroomTeachers,
  xpLogs,
} from "@reading-advantage/db/schema";
import { Role } from "@/lib/enums";

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
    const licenseRows = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId))
      .limit(1);
    const license = licenseRows[0];

    if (!license) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Find all users with this license
    const licenseUserRows = await db
      .select({ userId: licenseOnUsers.userId })
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.licenseId, license.id));

    const userIds = licenseUserRows.map((r) => r.userId);

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        schoolName: license.schoolName || "Unknown School",
      });
    }

    // Find all classrooms where any of these users are teachers
    // (via classroomTeachers join, primary teacherId, or createdBy)
    const teacherClassroomIdRows = await db
      .select({ classroomId: classroomTeachers.classroomId })
      .from(classroomTeachers)
      .where(inArray(classroomTeachers.teacherId, userIds));
    const teacherClassroomIds = teacherClassroomIdRows.map((r) => r.classroomId);

    const classroomRows = await db
      .select()
      .from(classrooms)
      .where(
        or(
          teacherClassroomIds.length > 0
            ? inArray(classrooms.id, teacherClassroomIds)
            : undefined,
          inArray(classrooms.teacherId, userIds),
          inArray(classrooms.createdBy, userIds)
        )
      );

    // Collect related data per classroom
    const classroomIds = classroomRows.map((c) => c.id);
    const creatorIds = Array.from(
      new Set(classroomRows.map((c) => c.createdBy).filter((v): v is string => !!v))
    );
    const mainTeacherIds = Array.from(
      new Set(classroomRows.map((c) => c.teacherId).filter((v): v is string => !!v))
    );

    const [
      teacherJoinRows,
      studentJoinRows,
      creatorUserRows,
      mainTeacherUserRows,
    ] = await Promise.all([
      classroomIds.length > 0
        ? db
            .select({
              classroomId: classroomTeachers.classroomId,
              teacherId: classroomTeachers.teacherId,
              role: classroomTeachers.role,
              createdAt: classroomTeachers.createdAt,
              name: users.name,
            })
            .from(classroomTeachers)
            .innerJoin(users, eq(users.id, classroomTeachers.teacherId))
            .where(inArray(classroomTeachers.classroomId, classroomIds))
        : Promise.resolve(
            [] as Array<{
              classroomId: string;
              teacherId: string;
              role: string;
              createdAt: Date;
              name: string | null;
            }>
          ),
      classroomIds.length > 0
        ? db
            .select({
              classroomId: classroomStudents.classroomId,
              studentId: classroomStudents.studentId,
              email: users.email,
            })
            .from(classroomStudents)
            .innerJoin(users, eq(users.id, classroomStudents.studentId))
            .where(inArray(classroomStudents.classroomId, classroomIds))
        : Promise.resolve(
            [] as Array<{
              classroomId: string;
              studentId: string;
              email: string | null;
            }>
          ),
      creatorIds.length > 0
        ? db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, creatorIds))
        : Promise.resolve([] as Array<{ id: string; name: string | null }>),
      mainTeacherIds.length > 0
        ? db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, mainTeacherIds))
        : Promise.resolve([] as Array<{ id: string; name: string | null }>),
    ]);

    const creatorById = new Map(creatorUserRows.map((u) => [u.id, u]));
    const mainTeacherById = new Map(mainTeacherUserRows.map((u) => [u.id, u]));

    // Bucket teachers + students per classroom
    const teachersByClassroom = new Map<string, typeof teacherJoinRows>();
    for (const row of teacherJoinRows) {
      const arr = teachersByClassroom.get(row.classroomId) ?? [];
      arr.push(row);
      teachersByClassroom.set(row.classroomId, arr);
    }
    const studentsByClassroom = new Map<string, typeof studentJoinRows>();
    for (const row of studentJoinRows) {
      const arr = studentsByClassroom.get(row.classroomId) ?? [];
      arr.push(row);
      studentsByClassroom.set(row.classroomId, arr);
    }

    // Transform data to match the expected format and calculate XP data
    const transformedClassrooms = await Promise.all(
      classroomRows.map(async (classroom) => {
        const classroomTeacherRows = teachersByClassroom.get(classroom.id) ?? [];
        const classroomStudentRows = studentsByClassroom.get(classroom.id) ?? [];

        // Collect all teachers from different sources
        const teachersList: Array<{
          teacherId: string;
          name: string;
          role: string;
          joinedAt: string;
        }> = [];

        // Add from ClassroomTeacher relation
        for (const tc of classroomTeacherRows) {
          teachersList.push({
            teacherId: tc.teacherId,
            name: tc.name || "",
            role: tc.role,
            joinedAt: tc.createdAt.toISOString(),
          });
        }

        const creator = classroom.createdBy
          ? creatorById.get(classroom.createdBy) ?? null
          : null;
        const mainTeacher = classroom.teacherId
          ? mainTeacherById.get(classroom.teacherId) ?? null
          : null;

        // Add creator as OWNER if not already in the list
        if (creator && !teachersList.find((t) => t.teacherId === creator.id)) {
          teachersList.push({
            teacherId: creator.id,
            name: creator.name || "",
            role: "OWNER",
            joinedAt: classroom.createdAt.toISOString(),
          });
        }

        // Add main teacher (teacherId field) if exists and not already in the list
        if (
          mainTeacher &&
          !teachersList.find((t) => t.teacherId === mainTeacher.id)
        ) {
          teachersList.push({
            teacherId: mainTeacher.id,
            name: mainTeacher.name || "",
            role: "MAIN_TEACHER",
            joinedAt: classroom.createdAt.toISOString(),
          });
        }

        // Calculate XP data for this classroom
        const studentIds = classroomStudentRows
          .map((sc) => sc.studentId)
          .filter(Boolean);

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

            const [todayRows, weekRows, monthRows, totalXpRows] =
              await Promise.all([
                db
                  .select({ total: sum(xpLogs.xpEarned) })
                  .from(xpLogs)
                  .where(
                    and(
                      inArray(xpLogs.userId, studentIds),
                      gte(xpLogs.createdAt, todayStart)
                    )
                  ),
                db
                  .select({ total: sum(xpLogs.xpEarned) })
                  .from(xpLogs)
                  .where(
                    and(
                      inArray(xpLogs.userId, studentIds),
                      gte(xpLogs.createdAt, weekStart)
                    )
                  ),
                db
                  .select({ total: sum(xpLogs.xpEarned) })
                  .from(xpLogs)
                  .where(
                    and(
                      inArray(xpLogs.userId, studentIds),
                      gte(xpLogs.createdAt, monthStart)
                    )
                  ),
                db
                  .select({ total: sum(users.xp) })
                  .from(users)
                  .where(inArray(users.id, studentIds)),
              ]);

            xpData = {
              today: Number(todayRows[0]?.total ?? 0),
              week: Number(weekRows[0]?.total ?? 0),
              month: Number(monthRows[0]?.total ?? 0),
              allTime: Number(totalXpRows[0]?.total ?? 0),
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
          classroomName: classroom.name,
          classCode: classroom.classCode,
          grade: classroom.grade?.toString() || "",
          archived: classroom.archived || false,
          title: classroom.name || "",
          importedFromGoogle: false,
          alternateLink: "",
          createdAt: classroom.createdAt.toISOString(),
          createdBy: creator || { id: "", name: "" },
          isOwner: true, // For system view, we can assume ownership
          teachers: teachersList,
          student: classroomStudentRows.map((sc) => ({
            studentId: sc.studentId,
            email: sc.email || "",
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
