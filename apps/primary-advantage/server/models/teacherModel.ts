import {
  db,
  eq,
  and,
  desc,
  inArray,
} from '@reading-advantage/db';
import {
  users,
  classrooms,
  classroomTeachers,
  classroomStudents,
  roles,
  userRoles,
  schools,
} from '@reading-advantage/db';
import bcrypt from "bcryptjs";
import {
  TeacherData,
  CreateTeacherInput,
  UpdateTeacherInput,
  UserWithRoles,
} from "@/types/index";

// Type for teacher query parameters
interface TeacherQueryParams {
  page: number;
  limit: number;
  search: string;
  role: string;
  userWithRoles: UserWithRoles;
}

// Get teachers with pagination and filtering
export const getTeachers = async (
  params: TeacherQueryParams,
): Promise<{
  teachers: TeacherData[];
  totalCount: number;
}> => {
  const { page, limit, search, role, userWithRoles } = params;

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      // School admin - only see teachers from their school
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    // Build the where clause for filtering. We restrict to users whose role
    // is in (teacher, admin) via the M:N userRoles table.
    const roleNames = role ? [role] : ["teacher", "admin"];
    const whereConditions: any[] = [
      ...(schoolFilter.schoolId ? [eq(users.schoolId, schoolFilter.schoolId)] : []),
    ];

    // Add search filter if provided
    if (search) {
      whereConditions.push(
        // OR across name/email — use sql template literal
        // We import `sql` lazily inline for clarity.
        // @ts-ignore - inline import
        // keep small: import at top
        // Using `or` from drizzle-orm is cleaner:
        // Actually use sql for the OR-ILIKE combo:
        // (we'll keep one inline)
        // Use sql template literal:
        // (we re-import at top to use here)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sqlOr(users.name, users.email, `%${search}%`),
      );
    }

    // Find the user IDs whose role matches roleNames — restrict via subquery
    // or via an inner join on userRoles+roles.
    // We use inner join approach.
    const baseQuery = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      schoolId: users.schoolId,
      cefrLevel: users.cefrLevel,
      createdAt: users.createdAt,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          ...whereConditions,
          // role-name filter
          ...(roleNames.length === 1
            ? [eq(roles.name, roleNames[0])]
            : [inArray(roles.name, roleNames)]),
        ),
      );

    const teachers = await baseQuery
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count
    const [countRow] = await db.select({ value: sqlCountStar() })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          ...whereConditions,
          ...(roleNames.length === 1
            ? [eq(roles.name, roleNames[0])]
            : [inArray(roles.name, roleNames)]),
        ),
      );
    const totalCount = Number(countRow?.value ?? 0);

    // Stitch: load ClassroomTeachers + nested classrooms + students in bulk.
    const teacherIds = teachers.map((t) => t.id);
    const classroomTeachersRows = teacherIds.length
      ? await db.select({
          teacherId: classroomTeachers.teacherId,
          classroomId: classrooms.id,
          classroomName: classrooms.name,
          classroomGrade: classrooms.grade,
          classroomStudentRelId: classroomStudents.id,
          classroomStudentId: classroomStudents.studentId,
        })
          .from(classroomTeachers)
          .innerJoin(classrooms, eq(classrooms.id, classroomTeachers.classroomId))
          .leftJoin(classroomStudents, eq(classroomStudents.classroomId, classrooms.id))
          .where(inArray(classroomTeachers.teacherId, teacherIds))
      : [];

    // Stitch by teacher.
    const ctByTeacher = new Map<string, Map<string, { id: string; name: string; grade: number | null; students: any[] }>>();
    for (const row of classroomTeachersRows) {
      if (!ctByTeacher.has(row.teacherId)) ctByTeacher.set(row.teacherId, new Map());
      const classroomMap = ctByTeacher.get(row.teacherId)!;
      if (!classroomMap.has(row.classroomId)) {
        classroomMap.set(row.classroomId, {
          id: row.classroomId,
          name: row.classroomName,
          grade: row.classroomGrade,
          students: [],
        });
      }
      if (row.classroomStudentId) {
        classroomMap.get(row.classroomId)!.students.push({ id: row.classroomStudentId });
      }
    }

    // Transform data to match the expected interface
    const teachersData: TeacherData[] = teachers.map((teacher) => {
      const ctList = Array.from(ctByTeacher.get(teacher.id)?.values() ?? []);

      const totalStudents = ctList.reduce((sum, c) => sum + c.students.length, 0);
      const totalClasses = ctList.length;

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: role ?? "teacher",
        createdAt: teacher.createdAt.toISOString(),
        image: teacher.image,
        schoolId: teacher.schoolId,
        cefrLevel: teacher.cefrLevel,
        totalStudents,
        totalClasses,
        assignedClassrooms: ctList.map((c) => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
        })),
      };
    });

    return { teachers: teachersData, totalCount };
  } catch (error) {
    console.error("Teacher Model: Error fetching teachers:", error);
    throw error;
  }
};

// Local helpers — keep import block tidy.
import { sql as sqlTag, count as sqlCountStar, or as drizzleOr } from '@reading-advantage/db';
function sqlOr(colA: any, colB: any, pattern: string) {
  return sqlTag`(${colA} ILIKE ${pattern} OR ${colB} ILIKE ${pattern})`;
}
void drizzleOr; // kept for parity — actual call uses sql template above

// Get teacher by ID
export const getTeacherById = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<TeacherData | null> => {
  try {
    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    const whereConditions: any[] = [
      eq(users.id, id),
      inArray(roles.name, ["teacher", "admin"]),
      ...(schoolFilter.schoolId ? [eq(users.schoolId, schoolFilter.schoolId)] : []),
    ];

    const teachers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      schoolId: users.schoolId,
      cefrLevel: users.cefrLevel,
      createdAt: users.createdAt,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(...whereConditions))
      .limit(1);

    const teacher = teachers[0];

    if (!teacher) {
      return null;
    }

    // Stitch ClassroomTeachers + classrooms + students.
    const ctRows = await db.select({
      classroomId: classrooms.id,
      classroomName: classrooms.name,
      classroomGrade: classrooms.grade,
      classroomStudentRelId: classroomStudents.id,
      classroomStudentId: classroomStudents.studentId,
    })
      .from(classroomTeachers)
      .innerJoin(classrooms, eq(classrooms.id, classroomTeachers.classroomId))
      .leftJoin(classroomStudents, eq(classroomStudents.classroomId, classrooms.id))
      .where(eq(classroomTeachers.teacherId, id));

    const classroomMap = new Map<string, { id: string; name: string; grade: number | null; students: any[] }>();
    for (const row of ctRows) {
      if (!classroomMap.has(row.classroomId)) {
        classroomMap.set(row.classroomId, {
          id: row.classroomId,
          name: row.classroomName,
          grade: row.classroomGrade,
          students: [],
        });
      }
      if (row.classroomStudentId) {
        classroomMap.get(row.classroomId)!.students.push({ id: row.classroomStudentId });
      }
    }
    const ctList = Array.from(classroomMap.values());

    const totalStudents = ctList.reduce((sum, c) => sum + c.students.length, 0);
    const totalClasses = ctList.length;

    const teacherData: TeacherData = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: "teacher",
      createdAt: teacher.createdAt.toISOString(),
      image: teacher.image,
      schoolId: teacher.schoolId,
      cefrLevel: teacher.cefrLevel,
      totalStudents,
      totalClasses,
      assignedClassrooms: ctList.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
      })),
    };

    return teacherData;
  } catch (error) {
    console.error("Teacher Model: Error fetching teacher by ID:", error);
    throw error;
  }
};

// Create new teacher
export const createTeacher = async (params: {
  name: string;
  email: string;
  role: string;
  password?: string;
  classroomIds?: string[];
  userWithRoles: UserWithRoles;
  force?: boolean;
}): Promise<{
  success: boolean;
  teacher?: TeacherData;
  error?: string;
  requiresConfirmation?: boolean;
  existingSchool?: { id: string; name: string };
}> => {
  const { name, email, role, password, classroomIds, userWithRoles, force } =
    params;

  try {
    // Check if user already exists (with school + roles for the include shape).
    const existingUserRows = await db.select({
      id: users.id,
      email: users.email,
      schoolId: users.schoolId,
      schoolRowId: schools.id,
      schoolName: schools.name,
      roleName: roles.name,
    })
      .from(users)
      .leftJoin(schools, eq(schools.id, users.schoolId))
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(users.email, email));

    const existingUser = existingUserRows.length > 0
      ? {
          id: existingUserRows[0].id,
          email: existingUserRows[0].email,
          schoolId: existingUserRows[0].schoolId,
          School: existingUserRows[0].schoolRowId
            ? {
                id: existingUserRows[0].schoolRowId,
                name: existingUserRows[0].schoolName,
              }
            : null,
          roles: existingUserRows
            .filter((row) => row.roleName)
            .map((row) => ({
              role: { name: row.roleName as string },
            })),
        }
      : null;

    // Determine school assignment
    let schoolId = null;
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolId = userWithRoles.schoolId;
    }

    // If user exists, handle accordingly
    if (existingUser) {
      if (existingUser.schoolId && existingUser.School) {
        if (force) {
          return await updateExistingTeacherToSchool({
            existingUser,
            name,
            email,
            role,
            password,
            classroomIds,
            schoolId,
            userWithRoles,
          });
        } else {
          return {
            success: false,
            requiresConfirmation: true,
            existingSchool: {
              id: existingUser.School.id,
              name: existingUser.School.name,
            },
            error: "Teacher already belongs to a school",
          };
        }
      } else {
        return await updateExistingTeacherToSchool({
          existingUser,
          name,
          email,
          role,
          password,
          classroomIds,
          schoolId,
          userWithRoles,
        });
      }
    }

    // Get the role ID
    const [roleRecord] = await db.select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, role))
      .limit(1);

    if (!roleRecord) {
      return { success: false, error: "Invalid role specified" };
    }

    // Generate password if not provided
    const hashedPassword = password
      ? bcrypt.hashSync(password, 10)
      : bcrypt.hashSync(Math.random().toString(36).slice(-8), 10);

    // Validate classroom IDs if provided
    if (classroomIds && classroomIds.length > 0) {
      const classroomConditions: any[] = [
        inArray(classrooms.id, classroomIds),
      ];
      if (schoolId) classroomConditions.push(eq(classrooms.schoolId, schoolId));

      const validClassrooms = await db.select({ id: classrooms.id })
        .from(classrooms)
        .where(and(...classroomConditions));

      if (validClassrooms.length !== classroomIds.length) {
        return {
          success: false,
          error: "Some classroom IDs are invalid or not accessible",
        };
      }
    }

    // Create the new teacher and assign classrooms in a transaction
    const completeTeacher = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        name,
        email,
        password: hashedPassword,
        schoolId,
      }).returning();

      await tx.insert(userRoles).values({
        userId: user.id,
        roleId: roleRecord.id,
      });

      // Assign to classrooms if provided
      if (classroomIds && classroomIds.length > 0) {
        // Drizzle's `insert(...).onConflictDoNothing()` would be the closest
        // analogue of Prisma's `skipDuplicates: true`; we keep an explicit
        // insert per row for portability with the shared client config.
        for (const classroomId of classroomIds) {
          await tx.insert(classroomTeachers).values({
            classroomId,
            teacherId: user.id,
          }).onConflictDoNothing();
        }
      }

      return user.id;
    });

    // Refetch with the include shape (roles + ClassroomTeachers + classroom.students).
    return await refetchTeacherWithInclude(completeTeacher, role);
  } catch (error) {
    console.error("Teacher Model: Error creating teacher:", error);
    return { success: false, error: "Failed to create teacher" };
  }
};

// Helper used by both createTeacher and updateExistingTeacherToSchool.
async function refetchTeacherWithInclude(userId: string, primaryRoleName: string) {
  const teacherRows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    image: users.image,
    schoolId: users.schoolId,
    cefrLevel: users.cefrLevel,
    createdAt: users.createdAt,
    roleName: roles.name,
  })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(users.id, userId));

  const rolesForUser = teacherRows
    .filter((r) => r.roleName)
    .map((r) => ({ role: { name: r.roleName as string } }));

  // Stitch ClassroomTeachers
  const ctRows = await db.select({
    classroomId: classrooms.id,
    classroomName: classrooms.name,
    classroomGrade: classrooms.grade,
    classroomStudentRelId: classroomStudents.id,
    classroomStudentId: classroomStudents.studentId,
  })
    .from(classroomTeachers)
    .innerJoin(classrooms, eq(classrooms.id, classroomTeachers.classroomId))
    .leftJoin(classroomStudents, eq(classroomStudents.classroomId, classrooms.id))
    .where(eq(classroomTeachers.teacherId, userId));

  const classroomMap = new Map<string, { id: string; name: string; grade: number | null; students: any[] }>();
  for (const row of ctRows) {
    if (!classroomMap.has(row.classroomId)) {
      classroomMap.set(row.classroomId, {
        id: row.classroomId,
        name: row.classroomName,
        grade: row.classroomGrade,
        students: [],
      });
    }
    if (row.classroomStudentId) {
      classroomMap.get(row.classroomId)!.students.push({ id: row.classroomStudentId });
    }
  }
  const ctList = Array.from(classroomMap.values());

  const teacher = teacherRows[0];

  const totalStudents = ctList.reduce((sum, c) => sum + c.students.length, 0);
  const totalClasses = ctList.length;

  const teacherData: TeacherData = {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    role: primaryRoleName,
    createdAt: teacher.createdAt.toISOString(),
    image: teacher.image,
    schoolId: teacher.schoolId,
    cefrLevel: teacher.cefrLevel,
    totalStudents,
    totalClasses,
    assignedClassrooms: ctList.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
    })),
  };

  return { success: true, teacher: teacherData, _rolesForUser: rolesForUser };
}

// Helper function to update existing teacher to a new school
async function updateExistingTeacherToSchool(params: {
  existingUser: any;
  name: string;
  email: string;
  role: string;
  password?: string;
  classroomIds?: string[];
  schoolId: string | null;
  userWithRoles: UserWithRoles;
}): Promise<{
  success: boolean;
  teacher?: TeacherData;
  error?: string;
}> {
  const {
    existingUser,
    name,
    email,
    role,
    password,
    classroomIds,
    schoolId,
    userWithRoles,
  } = params;

  try {
    // Get the role ID
    const [roleRecord] = await db.select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, role))
      .limit(1);

    if (!roleRecord) {
      return { success: false, error: "Invalid role specified" };
    }

    // Validate classroom IDs if provided
    if (classroomIds && classroomIds.length > 0) {
      const classroomConditions: any[] = [
        inArray(classrooms.id, classroomIds),
      ];
      if (schoolId) classroomConditions.push(eq(classrooms.schoolId, schoolId));

      const validClassrooms = await db.select({ id: classrooms.id })
        .from(classrooms)
        .where(and(...classroomConditions));

      if (validClassrooms.length !== classroomIds.length) {
        return {
          success: false,
          error: "Some classroom IDs are invalid or not accessible",
        };
      }
    }

    // Update the existing teacher in a transaction
    await db.transaction(async (tx) => {
      const updateData: any = {
        name,
        schoolId,
      };

      if (password) {
        updateData.password = bcrypt.hashSync(password, 10);
      }

      await tx.update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id));

      // Look up the user's current roles to decide if we need to rotate them.
      const currentRoleRows = await tx.select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, existingUser.id));
      const currentRoleNames = currentRoleRows.map((r) => r.name);
      const hasRole = currentRoleNames.includes(role);
      const firstRoleIsRequested = currentRoleNames[0] === role;

      if (!hasRole || (currentRoleNames.length > 0 && !firstRoleIsRequested)) {
        // Look up the teacher/admin role IDs to remove (rotate).
        const teacherAdminRoles = await tx.select({ id: roles.id })
          .from(roles)
          .where(inArray(roles.name, ["teacher", "admin"]));

        const roleIds = teacherAdminRoles.map((r) => r.id);
        if (roleIds.length) {
          await tx.delete(userRoles).where(
            and(
              eq(userRoles.userId, existingUser.id),
              inArray(userRoles.roleId, roleIds),
            ),
          );
        }
        await tx.insert(userRoles).values({
          userId: existingUser.id,
          roleId: roleRecord.id,
        });
      }

      if (classroomIds !== undefined) {
        // Remove existing classroom assignments
        await tx.delete(classroomTeachers)
          .where(eq(classroomTeachers.teacherId, existingUser.id));

        if (classroomIds.length > 0) {
          for (const classroomId of classroomIds) {
            await tx.insert(classroomTeachers).values({
              classroomId,
              teacherId: existingUser.id,
            }).onConflictDoNothing();
          }
        }
      }
    });

    return await refetchTeacherWithInclude(existingUser.id, role);
  } catch (error) {
    console.error("Teacher Model: Error updating existing teacher:", error);
    return { success: false, error: "Failed to update teacher" };
  }
}

// Update teacher
export const updateTeacher = async (
  id: string,
  updateData: UpdateTeacherInput,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; teacher?: TeacherData; error?: string }> => {
  try {
    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    // Check if teacher exists and user has permission to update
    const teacherConditions: any[] = [
      eq(users.id, id),
      inArray(roles.name, ["teacher", "admin"]),
      ...(schoolFilter.schoolId ? [eq(users.schoolId, schoolFilter.schoolId)] : []),
    ];

    const [existingTeacher] = await db.select({
      id: users.id,
      email: users.email,
      schoolId: users.schoolId,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(...teacherConditions))
      .limit(1);

    if (!existingTeacher) {
      return { success: false, error: "Teacher not found" };
    }

    // Check if email is being updated and doesn't conflict
    if (updateData.email && updateData.email !== existingTeacher.email) {
      const [emailExists] = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, updateData.email))
        .limit(1);

      if (emailExists) {
        return { success: false, error: "Email already in use" };
      }
    }

    // Validate classroom IDs if provided
    if (updateData.classroomIds) {
      const classroomConditions: any[] = [
        inArray(classrooms.id, updateData.classroomIds),
      ];
      if (existingTeacher.schoolId) {
        classroomConditions.push(eq(classrooms.schoolId, existingTeacher.schoolId));
      }

      const validClassrooms = await db.select({ id: classrooms.id })
        .from(classrooms)
        .where(and(...classroomConditions));

      if (validClassrooms.length !== updateData.classroomIds.length) {
        return {
          success: false,
          error: "Some classroom IDs are invalid or not accessible",
        };
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

    // Update the teacher and handle classroom assignments in a transaction
    await db.transaction(async (tx) => {
      if (Object.keys(updatePayload).length) {
        await tx.update(users)
          .set(updatePayload)
          .where(eq(users.id, id));
      }

      // Handle role update if specified
      if (updateData.role) {
        const [roleRecord] = await tx.select({ id: roles.id })
          .from(roles)
          .where(eq(roles.name, updateData.role))
          .limit(1);

        if (roleRecord) {
          // Remove all existing roles for this user (closest to Prisma
          // `userRole.deleteMany({ where: { userId } })`).
          await tx.delete(userRoles).where(eq(userRoles.userId, id));
          await tx.insert(userRoles).values({
            userId: id,
            roleId: roleRecord.id,
          });
        }
      }

      if (updateData.classroomIds !== undefined) {
        await tx.delete(classroomTeachers)
          .where(eq(classroomTeachers.teacherId, id));

        if (updateData.classroomIds.length > 0) {
          for (const classroomId of updateData.classroomIds) {
            await tx.insert(classroomTeachers).values({
              classroomId,
              teacherId: id,
            }).onConflictDoNothing();
          }
        }
      }
    });

    const refetch = await refetchTeacherWithInclude(id, updateData.role ?? "teacher");
    return {
      success: refetch.success,
      teacher: refetch.teacher,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (refetch as any).error,
    };
  } catch (error) {
    console.error("Teacher Model: Error updating teacher:", error);
    return { success: false, error: "Failed to update teacher" };
  }
};

// Delete teacher
export const deleteTeacher = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    // Check if teacher exists and user has permission to delete
    const teacherConditions: any[] = [
      eq(users.id, id),
      inArray(roles.name, ["teacher", "admin"]),
      ...(schoolFilter.schoolId ? [eq(users.schoolId, schoolFilter.schoolId)] : []),
    ];

    const [existingTeacher] = await db.select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(...teacherConditions))
      .limit(1);

    if (!existingTeacher) {
      return { success: false, error: "Teacher not found" };
    }

    // Delete related records first
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    await db.delete(classroomTeachers).where(eq(classroomTeachers.teacherId, id));

    // Delete the teacher
    await db.delete(users).where(eq(users.id, id));

    return { success: true };
  } catch (error) {
    console.error("Teacher Model: Error deleting teacher:", error);
    return { success: false, error: "Failed to delete teacher" };
  }
};

// Get teacher statistics
export const getTeacherStatistics = async (userWithRoles: UserWithRoles) => {
  try {
    // Determine school filter based on user's role
    let schoolFilter: any = {};
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolFilter = { schoolId: userWithRoles.schoolId };
    }

    const whereConditions: any[] = [
      inArray(roles.name, ["teacher", "admin"]),
      ...(schoolFilter.schoolId ? [eq(users.schoolId, schoolFilter.schoolId)] : []),
    ];

    // Get all teachers + their classroom/student counts in one query.
    const allTeachers = await db.select({
      teacherId: users.id,
      classroomId: classrooms.id,
      classroomStudentRelId: classroomStudents.id,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(classroomTeachers, eq(classroomTeachers.teacherId, users.id))
      .leftJoin(classrooms, eq(classrooms.id, classroomTeachers.classroomId))
      .leftJoin(classroomStudents, eq(classroomStudents.classroomId, classrooms.id))
      .where(and(...whereConditions));

    // Stitch per-teacher.
    const byTeacher = new Map<string, { classroomIds: Set<string>; studentRelIds: Set<string>; studentCount: number }>();
    for (const row of allTeachers) {
      if (!byTeacher.has(row.teacherId)) {
        byTeacher.set(row.teacherId, {
          classroomIds: new Set(),
          studentRelIds: new Set(),
          studentCount: 0,
        });
      }
      const bucket = byTeacher.get(row.teacherId)!;
      if (row.classroomId) bucket.classroomIds.add(row.classroomId);
      if (row.classroomStudentRelId) bucket.studentRelIds.add(row.classroomStudentRelId);
    }
    for (const bucket of byTeacher.values()) {
      bucket.studentCount = bucket.studentRelIds.size;
    }

    const totalTeachers = byTeacher.size;
    let totalStudents = 0;
    let totalClasses = 0;
    let activeTeachers = 0;
    for (const bucket of byTeacher.values()) {
      totalStudents += bucket.studentCount;
      totalClasses += bucket.classroomIds.size;
      if (bucket.classroomIds.size > 0) activeTeachers++;
    }

    const averageStudentsPerTeacher =
      totalTeachers > 0 ? Math.round(totalStudents / totalTeachers) : 0;

    const statistics = {
      totalTeachers,
      totalStudents,
      totalClasses,
      averageStudentsPerTeacher,
      activeTeachers,
    };

    return statistics;
  } catch (error) {
    console.error("Teacher Model: Error calculating statistics:", error);
    throw error;
  }
};