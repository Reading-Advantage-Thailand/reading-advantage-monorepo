import {
  db,
  eq,
  and,
  desc,
  inArray,
  gte,
  count,
  sql,
} from '@reading-advantage/db';
import {
  users,
  classrooms,
  classroomStudents,
  roles,
  userRoles,
  userActivity,
  xpLogs,
} from '@reading-advantage/db';
import bcrypt from "bcryptjs";
import {
  StudentData,
  CreateStudentInput,
  UpdateStudentInput,
  UserWithRoles,
} from "@/types/index";

// Type for student query parameters
interface StudentQueryParams {
  page: number;
  limit: number;
  search: string;
  classroomId: string;
  cefrLevel: string;
  userWithRoles: UserWithRoles;
}

// Local alias — keep the existing name semantics in helper code.
const studentRole = "student";

/**
 * Build the join+where clause that limits to users whose role.name is
 * "student". The Prisma model exposed `roles: { some: { role: { name } } }`;
 * we replace it with two inner joins + an eq on the role name.
 */
function studentJoinAndWhere(extra: any[] = []) {
  return and(
    eq(roles.name, studentRole),
    ...extra,
  );
}

// Get students with pagination and filtering
export const getStudents = async (
  params: StudentQueryParams,
): Promise<{
  students: StudentData[];
  totalCount: number;
}> => {
  const { page, limit, search, classroomId, cefrLevel, userWithRoles } = params;

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause based on user's permissions
    const whereConditions: any[] = [eq(roles.name, studentRole)];

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereConditions.push(eq(users.schoolId, userWithRoles.schoolId));
    }

    // Add search filter (Prisma: contains + mode: insensitive → ILIKE)
    if (search) {
      whereConditions.push(
        // OR across name/email — use sql OR
        sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`,
      );
    }

    // Add CEFR level filter
    if (cefrLevel) {
      whereConditions.push(eq(users.cefrLevel, cefrLevel));
    }

    // If classroomId is provided, restrict to students enrolled in that
    // classroom via the classroomStudents join table.
    let classroomFilterIds: string[] | null = null;
    if (classroomId) {
      const enrolled = await db.select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, classroomId));
      classroomFilterIds = enrolled.map((row) => row.studentId);
      if (!classroomFilterIds.length) {
        // No enrolled students — short-circuit to empty result.
        return { students: [], totalCount: 0 };
      }
      whereConditions.push(inArray(users.id, classroomFilterIds));
    }

    // Paginate over DISTINCT students. The student↔classroom relation fans out
    // (a student enrolled in N classrooms produces N join rows), so the page
    // query must NOT join the classroom tables — otherwise `.limit/.offset`
    // would paginate enrollment rows and a page could return fewer than `limit`
    // distinct students (FR-1 of review_findings_followup_20260626). Classroom
    // data is attached in a follow-up query keyed by the page's student ids.
    const [students, countRow] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        cefrLevel: users.cefrLevel,
        xp: users.xp,
        createdAt: users.createdAt,
      })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(...whereConditions))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(...whereConditions)),
    ]);
    const totalCount = Number(countRow[0]?.value ?? 0);

    // Attach one classroom per page student (first by enrollment time). Keyed by
    // the page's student ids so the lookup never re-introduces pagination fan-out.
    const pageStudentIds = students.map((s) => s.id);
    const classroomByStudent = new Map<string, { classroomId: string; classroomName: string }>();
    if (pageStudentIds.length > 0) {
      const enrollments = await db.select({
        studentId: classroomStudents.studentId,
        classroomId: classrooms.id,
        classroomName: classrooms.name,
      })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
        .where(inArray(classroomStudents.studentId, pageStudentIds))
        .orderBy(classroomStudents.joinedAt);
      for (const row of enrollments) {
        if (!classroomByStudent.has(row.studentId)) {
          classroomByStudent.set(row.studentId, {
            classroomId: row.classroomId,
            classroomName: row.classroomName,
          });
        }
      }
    }

    const studentsData: StudentData[] = students.map((student) => {
      const classroom = classroomByStudent.get(student.id);
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        cefrLevel: student.cefrLevel,
        xp: student.xp,
        role: studentRole,
        createdAt: student.createdAt.toISOString().split("T")[0],
        className: classroom?.classroomName ?? null,
        classroomId: classroom?.classroomId ?? null,
      };
    });

    return { students: studentsData, totalCount };
  } catch (error) {
    console.error("Student Model: Error fetching students:", error);
    throw error;
  }
};

// Get student by ID
export const getStudentById = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<StudentData | null> => {
  try {
    console.log("Student Model: Fetching student by ID:", id);

    // Build where clause based on user's permissions
    const whereConditions: any[] = [
      eq(users.id, id),
      eq(roles.name, studentRole),
    ];

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereConditions.push(eq(users.schoolId, userWithRoles.schoolId));
    }

    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      cefrLevel: users.cefrLevel,
      xp: users.xp,
      level: users.level,
      createdAt: users.createdAt,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(classroomStudents, eq(classroomStudents.studentId, users.id))
      .leftJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
      .where(and(...whereConditions))
      .limit(1);

    const student = rows[0];

    if (!student) {
      console.log("Student Model: Student not found:", id);
      return null;
    }

    // Transform data
    const studentData: StudentData = {
      id: student.id,
      name: student.name,
      email: student.email,
      cefrLevel: student.cefrLevel,
      xp: student.xp,
      role: studentRole,
      createdAt: student.createdAt.toISOString().split("T")[0],
      className: student.classroomName || null,
      classroomId: student.classroomId || null,
    };

    console.log("Student Model: Successfully fetched student:", studentData.id);
    return studentData;
  } catch (error) {
    console.error("Student Model: Error fetching student by ID:", error);
    throw error;
  }
};

// Create new student
export const createStudent = async (params: {
  name: string;
  email: string;
  cefrLevel: string;
  classroomId?: string;
  password?: string;
  userWithRoles: UserWithRoles;
}): Promise<{ success: boolean; student?: StudentData; error?: string }> => {
  const { name, email, cefrLevel, classroomId, password, userWithRoles } =
    params;

  try {
    console.log("Student Model: Creating student with email:", email);

    // Check if user already exists
    const [existingUser] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      console.log("Student Model: User already exists with email:", email);
      return { success: false, error: "User with this email already exists" };
    }

    // Get the Student role ID
    const [roleRecord] = await db.select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, studentRole))
      .limit(1);

    if (!roleRecord) {
      console.log("Student Model: Student role not found");
      return { success: false, error: "Student role not found" };
    }

    // Determine school assignment
    let schoolId = null;
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolId = userWithRoles.schoolId;
    }

    // Validate classroom if provided
    if (classroomId) {
      const classroomConditions: any[] = [eq(classrooms.id, classroomId)];
      if (schoolId) classroomConditions.push(eq(classrooms.schoolId, schoolId));

      const [classroom] = await db.select({ id: classrooms.id })
        .from(classrooms)
        .where(and(...classroomConditions))
        .limit(1);

      if (!classroom) {
        console.log("Student Model: Invalid classroom specified:", classroomId);
        return { success: false, error: "Invalid classroom specified" };
      }
    }

    // Generate password if not provided
    const hashedPassword = password
      ? bcrypt.hashSync(password, 10)
      : bcrypt.hashSync(Math.random().toString(36).slice(-8), 10);

    // Create the new student (and role + optional classroom link) in a tx.
    const newStudentId = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({
        name,
        email,
        password: hashedPassword,
        cefrLevel,
        schoolId,
        xp: 0,
        level: 1,
      }).returning({ id: users.id });

      await tx.insert(userRoles).values({
        userId: created.id,
        roleId: roleRecord.id,
      });

      if (classroomId) {
        await tx.insert(classroomStudents).values({
          studentId: created.id,
          classroomId,
        });
      }

      return created.id;
    });

    // Refetch the full record with the include shape.
    const studentRows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      cefrLevel: users.cefrLevel,
      xp: users.xp,
      level: users.level,
      createdAt: users.createdAt,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
    })
      .from(users)
      .leftJoin(classroomStudents, eq(classroomStudents.studentId, users.id))
      .leftJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
      .where(eq(users.id, newStudentId))
      .limit(1);

    const newStudent = studentRows[0];

    // Format response
    const studentData: StudentData = {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      cefrLevel: newStudent.cefrLevel,
      xp: newStudent.xp,
      role: studentRole,
      createdAt: newStudent.createdAt.toISOString().split("T")[0],
      className: newStudent.classroomName || null,
      classroomId: newStudent.classroomId || null,
    };

    console.log("Student Model: Successfully created student:", studentData.id);
    return { success: true, student: studentData };
  } catch (error) {
    console.error("Student Model: Error creating student:", error);
    return { success: false, error: "Failed to create student" };
  }
};

// Update student
export const updateStudent = async (
  id: string,
  updateData: UpdateStudentInput,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; student?: StudentData; error?: string }> => {
  try {
    console.log("Student Model: Updating student:", id);

    // Build where clause based on user's permissions
    const whereConditions: any[] = [
      eq(users.id, id),
      eq(roles.name, studentRole),
    ];

    // If user is school admin, only allow updates to students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereConditions.push(eq(users.schoolId, userWithRoles.schoolId));
    }

    // Check if student exists and user has permission to update
    const [existingStudent] = await db.select({
      id: users.id,
      email: users.email,
      schoolId: users.schoolId,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(...whereConditions))
      .limit(1);

    if (!existingStudent) {
      console.log("Student Model: Student not found or no permission:", id);
      return { success: false, error: "Student not found" };
    }

    // Check if email is being updated and doesn't conflict
    if (updateData.email && updateData.email !== existingStudent.email) {
      const [emailExists] = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, updateData.email))
        .limit(1);

      if (emailExists) {
        console.log("Student Model: Email already in use:", updateData.email);
        return { success: false, error: "Email already in use" };
      }
    }

    // Validate classroom if being updated
    if (updateData.classroomId) {
      const classroomConditions: any[] = [eq(classrooms.id, updateData.classroomId)];
      if (
        userWithRoles.schoolId &&
        userWithRoles.SchoolAdmins.length > 0
      ) {
        classroomConditions.push(eq(classrooms.schoolId, userWithRoles.schoolId));
      }

      const [classroom] = await db.select({ id: classrooms.id })
        .from(classrooms)
        .where(and(...classroomConditions))
        .limit(1);

      if (!classroom) {
        console.log(
          "Student Model: Invalid classroom specified:",
          updateData.classroomId,
        );
        return { success: false, error: "Invalid classroom specified" };
      }
    }

    // Prepare update data
    const updatePayload: any = {};
    if (updateData.name) updatePayload.name = updateData.name;
    if (updateData.email) updatePayload.email = updateData.email;
    if (updateData.cefrLevel) updatePayload.cefrLevel = updateData.cefrLevel;
    if (updateData.password) {
      updatePayload.password = bcrypt.hashSync(updateData.password, 10);
    }

    // Update the student (and optionally their classroom link) in a tx.
    await db.transaction(async (tx) => {
      if (Object.keys(updatePayload).length) {
        await tx.update(users)
          .set(updatePayload)
          .where(eq(users.id, id));
      }

      if (updateData.classroomId !== undefined) {
        // Remove existing classroom relationships
        await tx.delete(classroomStudents).where(eq(classroomStudents.studentId, id));

        // Add new classroom relationship if classroomId is provided
        if (updateData.classroomId) {
          await tx.insert(classroomStudents).values({
            studentId: id,
            classroomId: updateData.classroomId,
          });
        }
      }
    });

    // Refetch to get updated classroom info
    const studentRows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      cefrLevel: users.cefrLevel,
      xp: users.xp,
      level: users.level,
      createdAt: users.createdAt,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
    })
      .from(users)
      .leftJoin(classroomStudents, eq(classroomStudents.studentId, users.id))
      .leftJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
      .where(eq(users.id, id))
      .limit(1);

    const finalStudent = studentRows[0];

    // Format response with updated classroom info
    const studentData: StudentData = {
      id: finalStudent.id,
      name: finalStudent.name,
      email: finalStudent.email,
      cefrLevel: finalStudent.cefrLevel,
      xp: finalStudent.xp,
      role: studentRole,
      createdAt: finalStudent.createdAt.toISOString().split("T")[0],
      className: finalStudent.classroomName || null,
      classroomId: finalStudent.classroomId || null,
    };

    console.log(
      "Student Model: Successfully updated student:",
      studentData.id,
    );
    return { success: true, student: studentData };
  } catch (error) {
    console.error("Student Model: Error updating student:", error);
    return { success: false, error: "Failed to update student" };
  }
};

// Delete student
export const deleteStudent = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Student Model: Deleting student:", id);

    // Build where clause based on user's permissions
    const whereConditions: any[] = [
      eq(users.id, id),
      eq(roles.name, studentRole),
    ];

    // If user is school admin, only allow deletion of students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereConditions.push(eq(users.schoolId, userWithRoles.schoolId));
    }

    // Check if student exists and user has permission to delete
    const [existingStudent] = await db.select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(...whereConditions))
      .limit(1);

    if (!existingStudent) {
      console.log("Student Model: Student not found or no permission:", id);
      return { success: false, error: "Student not found" };
    }

    // Delete related records first
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    await db.delete(classroomStudents).where(eq(classroomStudents.studentId, id));
    await db.delete(userActivity).where(eq(userActivity.userId, id));
    await db.delete(xpLogs).where(eq(xpLogs.userId, id));

    // Delete the student
    await db.delete(users).where(eq(users.id, id));

    console.log("Student Model: Successfully deleted student:", id);
    return { success: true };
  } catch (error) {
    console.error("Student Model: Error deleting student:", error);
    return { success: false, error: "Failed to delete student" };
  }
};

// Get student statistics
export const getStudentStatistics = async (userWithRoles: UserWithRoles) => {
  try {
    // Build where clause based on user's permissions
    const whereConditions: any[] = [eq(roles.name, studentRole)];

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereConditions.push(eq(users.schoolId, userWithRoles.schoolId));
    }

    // Fetch students + their recent activity (last 7 days) in one query.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const allStudentsForStats = await db.select({
      xp: users.xp,
      cefrLevel: users.cefrLevel,
      createdAt: users.createdAt,
      recentActivityUserId: userActivity.userId,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(
        userActivity,
        and(
          eq(userActivity.userId, users.id),
          gte(userActivity.createdAt, sevenDaysAgo),
        ),
      )
      .where(and(...whereConditions));

    const totalStudents = allStudentsForStats.length;
    const averageXp =
      totalStudents > 0
        ? Math.round(
            allStudentsForStats.reduce((sum, student) => sum + student.xp, 0) /
              totalStudents,
          )
        : 0;

    // Calculate most common CEFR level
    const levelCounts = allStudentsForStats.reduce(
      (acc, student) => {
        const level = student.cefrLevel || "A0-";
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommonLevel =
      Object.entries(levelCounts).reduce((a, b) =>
        levelCounts[a[0]] > levelCounts[b[0]] ? a : b,
      )?.[0] || "A0-";

    // Calculate active users this week
    const activeUserIds = new Set(
      allStudentsForStats
        .filter((s) => s.recentActivityUserId)
        .map((student) => student.recentActivityUserId as string),
    );
    const activeThisWeek = activeUserIds.size;
    const activePercentage =
      totalStudents > 0
        ? Math.round((activeThisWeek / totalStudents) * 100)
        : 0;

    const statistics = {
      totalStudents,
      averageXp,
      mostCommonLevel,
      activeThisWeek,
      activePercentage,
    };

    return statistics;
  } catch (error) {
    console.error("Student Model: Error calculating statistics:", error);
    throw error;
  }
};