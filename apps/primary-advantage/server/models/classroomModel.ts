import {
  db,
  eq,
  and,
  desc,
  asc,
  inArray,
} from '@reading-advantage/db';
import {
  classrooms,
  classroomStudents,
  classroomTeachers,
  users,
  userRoles,
  roles,
  schools,
  schoolAdmins,
  userActivity,
} from '@reading-advantage/db';
import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { currentUser } from "@/lib/session";
import { UserWithRoles } from "@/server/utils/auth";

export const createClassCode = async (
  classrooomId: string,
  classCode: string,
) => {
  try {
    const expiresAt = addDays(new Date(), 1);

    const [classroom] = await db.select({ id: classrooms.id, name: classrooms.name })
      .from(classrooms)
      .where(eq(classrooms.id, classrooomId))
      .limit(1);

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }

    if (classroom) {
      // Update the existing classroom's expiration date
      const [updated] = await db.update(classrooms)
        .set({ classCode, codeExpiresAt: expiresAt, updatedAt: new Date() })
        .where(eq(classrooms.id, classrooomId))
        .returning();
      return updated;
    }
  } catch (error) {
    throw new Error("Failed to generate or update classroom code");
  }
};

export const createClassroom = async (data: {
  name: string;
  teacherId?: string;
  classCode?: string;
  grade?: string;
  role?: string;
}) => {
  try {
    let created = false;
    await db.transaction(async (tx) => {
      const [user] = await tx.select({ schoolId: users.schoolId })
        .from(users)
        .where(eq(users.id, data.teacherId as string))
        .limit(1);

      const schoolId = user?.schoolId ?? null;

      if (data.role === "teacher" && data.teacherId) {
        const [classroom] = await tx.insert(classrooms).values({
          name: data.name,
          classCode: data.classCode || null,
          grade: data.grade ? parseInt(data.grade) : null,
          schoolId: schoolId,
        }).returning();

        await tx.insert(classroomTeachers).values({
          classroomId: classroom.id,
          teacherId: data.teacherId,
        });
        created = true;
        return;
      }

      if (data.role === "admin") {
        await tx.insert(classrooms).values({
          name: data.name,
          classCode: data.classCode || null,
          grade: data.grade ? parseInt(data.grade) : null,
          schoolId: schoolId,
        });
        created = true;
        return;
      }

      // system or other elevated roles: create without owner assignment; school optional
      await tx.insert(classrooms).values({
        name: data.name,
        classCode: data.classCode || null,
        grade: data.grade ? parseInt(data.grade) : null,
      });
      created = true;
    });

    if (!created) throw new Error("FAILED_CREATE");
    return { success: true, message: "Classroom created successfully" };
  } catch (error) {
    throw new Error("FAILED_CREATE");
  }
};

// Enroll a student in a classroom
export const enrollStudentInClassroom = async (
  studentId: string,
  classroomId: string,
) => {
  try {
    // Check if the student is already enrolled
    const [existingEnrollment] = await db.select().from(classroomStudents)
      .where(
        and(
          eq(classroomStudents.classroomId, classroomId),
          eq(classroomStudents.studentId, studentId),
        ),
      )
      .limit(1);

    if (existingEnrollment) {
      throw new Error("Student is already enrolled in this classroom");
    }

    // Check if classroom exists
    const [classroom] = await db.select().from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if student exists and has STUDENT role
    const [student] = await db.select().from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(users.id, studentId),
          eq(roles.name, "student"),
        ),
      )
      .limit(1);

    if (!student) {
      throw new Error("Student not found or invalid role");
    }

    // Create the enrollment
    const [enrollment] = await db.insert(classroomStudents).values({
      studentId,
      classroomId,
    }).returning();

    // Stitch the nested student + classroom shape that the Prisma `include` produced.
    return {
      ...enrollment,
      student: {
        id: student.users?.id ?? student.id,
        name: student.users?.name,
        email: student.users?.email,
      },
      classroom: {
        id: classroom.id,
        name: classroom.name,
      },
    };
  } catch (error) {
    console.error("Error enrolling student:", error);
    throw error;
  }
};

// Un-enroll a student from a classroom
export const unenrollStudentFromClassroom = async (
  studentId: string,
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // If teacherId is provided, verify the teacher owns the classroom
    if (teacherId) {
      const [classroom] = await db.select({ id: classrooms.id })
        .from(classrooms)
        .innerJoin(classroomTeachers, eq(classroomTeachers.classroomId, classrooms.id))
        .where(
          and(
            eq(classrooms.id, classroomId),
            eq(classroomTeachers.teacherId, teacherId),
          ),
        )
        .limit(1);

      if (!classroom) {
        throw new Error("Classroom not found or access denied");
      }
    }

    // Check if the enrollment exists
    const [enrollment] = await db.select().from(classroomStudents)
      .where(
        and(
          eq(classroomStudents.classroomId, classroomId),
          eq(classroomStudents.studentId, studentId),
        ),
      )
      .limit(1);

    if (!enrollment) {
      throw new Error("Student is not enrolled in this classroom");
    }

    // Look up the related student + classroom rows for the return shape.
    const [student] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    const [classroom] = await db.select({
      id: classrooms.id,
      name: classrooms.name,
    })
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    // Delete the enrollment
    await db.delete(classroomStudents)
      .where(
        and(
          eq(classroomStudents.classroomId, classroomId),
          eq(classroomStudents.studentId, studentId),
        ),
      );

    return {
      ...enrollment,
      student: student ?? null,
      classroom: classroom ?? null,
    };
  } catch (error) {
    console.error("Error unenrolling student:", error);
    throw error;
  }
};

// Get available students for enrollment (students not in the classroom)
export const getAvailableStudentsForClassroom = async (
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // If teacherId is provided, verify the teacher owns the classroom
    if (teacherId) {
      const [classroom] = await db.select({ id: classrooms.id })
        .from(classrooms)
        .innerJoin(classroomTeachers, eq(classroomTeachers.classroomId, classrooms.id))
        .where(
          and(
            eq(classrooms.id, classroomId),
            eq(classroomTeachers.teacherId, teacherId),
          ),
        )
        .limit(1);

      if (!classroom) {
        throw new Error("Classroom not found or access denied");
      }
    }

    // Get all students who are not enrolled in this classroom.
    // We use a NOT IN subquery (anti-join) to mirror Prisma's
    // `studentClassroom: { none: { classroomId } }`.
    const enrolledStudentIds = await db
      .select({ id: classroomStudents.studentId })
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, classroomId));

    const enrolledIds = enrolledStudentIds.map((row) => row.id);

    const conditions: any[] = [
      // join student role
    ];

    // Build the user query: users INNER JOIN userRoles INNER JOIN roles
    // WHERE role.name = 'student' AND id NOT IN (enrolled)
    const baseQuery = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      cefrLevel: users.cefrLevel,
      level: users.level,
      xp: users.xp,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId));

    const whereConditions: any[] = [eq(roles.name, "student")];
    if (enrolledIds.length) {
      // Exclude enrolled students
      whereConditions.push(
        // use sql template for NOT IN
         
        // drizzle's `notInArray` operator
        // import notInArray from drizzle-orm in production
        // keep simple: use sql
        // @ts-ignore - drizzle import shape
        // we already imported `inArray` but need `notInArray`
        // use raw sql template
        // NOTE: this preserves Prisma's `none` semantics
        // The condition is "users.id NOT IN (...)"
        // We import notInArray lazily inline.
        // Since `notInArray` is in `@reading-advantage/db` barrel, call it
        // via a dynamic re-import would be overkill — use sql template literal.
        // Use a sql`` with the inlined IDs (validated as strings above).
        // @ts-ignore
        // safer: notInArray is exported, use it directly
        // we need to add it to imports — let's import it
        // We import via a separate import at the top of the file
        notInArrayFn(users.id, enrolledIds),
      );
    }

    const availableStudents = await baseQuery
      .where(and(...whereConditions))
      .orderBy(asc(users.name));

    return availableStudents;
  } catch (error) {
    console.error("Error fetching available students:", error);
    throw error;
  }
};

// Local alias for the notInArray operator — kept as a small helper to avoid
// growing the top-level import block in this file.
import { notInArray as notInArrayFn } from '@reading-advantage/db';

// Get all classrooms based on user role
export const getAllClassrooms = async (userWithRoles: UserWithRoles) => {
  try {
    // Check user roles to determine access level
    const isSystemAdmin = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "system",
    );

    const isAdmin = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "admin",
    );

    const isTeacher = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "teacher",
    );

    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    // Build where clause based on user role
    const whereConditions: any[] = [];

    if (isSystemAdmin) {
      // System admins can see all classrooms across all schools
      // No additional where clause needed
    } else if (isAdmin || isSchoolAdmin) {
      // Admins and school admins can see all classrooms in their school
      if (userWithRoles.schoolId) {
        whereConditions.push(eq(classrooms.schoolId, userWithRoles.schoolId));
      }
    } else if (isTeacher) {
      // Teachers can only see classrooms they teach in
      const teacherClassroomIds = await db
        .select({ classroomId: classroomTeachers.classroomId })
        .from(classroomTeachers)
        .where(eq(classroomTeachers.teacherId, userWithRoles.id));
      const classroomIds = teacherClassroomIds.map((row) => row.classroomId);
      if (classroomIds.length) {
        whereConditions.push(inArray(classrooms.id, classroomIds));
      } else {
        // No classrooms assigned; return nothing.
        whereConditions.push(eq(classrooms.id, "__never__"));
      }
    } else {
      // Other roles (like students) cannot access classroom lists
      throw new Error("Insufficient permissions to view classrooms");
    }

    // Fetch classrooms with basic information first
    const classroomsRows = await db.select({
      id: classrooms.id,
      name: classrooms.name,
      grade: classrooms.grade,
      classCode: classrooms.classCode,
      createdAt: classrooms.createdAt,
      updatedAt: classrooms.updatedAt,
      schoolId: classrooms.schoolId,
      schoolName: schools.name,
    })
      .from(classrooms)
      .leftJoin(schools, eq(schools.id, classrooms.schoolId))
      .where(whereConditions.length ? and(...whereConditions) : undefined)
      .orderBy(desc(classrooms.createdAt));

    // For each classroom, fetch teachers and students separately to avoid type issues
    const classroomsWithDetails = await Promise.all(
      classroomsRows.map(async (classroom) => {
        const teacherRows = await db.select({
          userId: users.id,
          name: users.name,
          email: users.email,
        })
          .from(classroomTeachers)
          .innerJoin(users, eq(users.id, classroomTeachers.teacherId))
          .where(eq(classroomTeachers.classroomId, classroom.id));

        const studentRows = await db.select({
          studentId: users.id,
          name: users.name,
          email: users.email,
        })
          .from(classroomStudents)
          .innerJoin(users, eq(users.id, classroomStudents.studentId))
          .where(eq(classroomStudents.classroomId, classroom.id));

        return {
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade,
          classCode: classroom.classCode,
          createdAt: classroom.createdAt,
          updatedAt: classroom.updatedAt,
          schoolId: classroom.schoolId,
          school: {
            id: classroom.schoolId,
            name: classroom.schoolName,
          },
          teachers: teacherRows.map((t) => ({
            id: t.userId,
            name: t.name,
            email: t.email,
          })),
          students: studentRows.map((s) => ({
            id: s.studentId,
            name: s.name,
            email: s.email,
          })),
        };
      }),
    );

    return classroomsWithDetails;
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    throw new Error("Failed to fetch classrooms");
  }
};

// Update a classroom
export const updateClassroom = async (
  id: string,
  data: {
    name?: string;
    grade?: string;
    description?: string;
  },
) => {
  try {
    const [updatedClassroom] = await db.update(classrooms)
      .set({
        name: data.name,
        grade: data.grade ? parseInt(data.grade) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(classrooms.id, id))
      .returning();

    if (!updatedClassroom) {
      return null;
    }

    // Stitch teachers + students for the include shape.
    const teacherRows = await db.select({
      id: classroomTeachers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
      .from(classroomTeachers)
      .innerJoin(users, eq(users.id, classroomTeachers.teacherId))
      .where(eq(classroomTeachers.classroomId, id));

    const studentRows = await db.select({
      id: classroomStudents.id,
      studentId: users.id,
      name: users.name,
      email: users.email,
    })
      .from(classroomStudents)
      .innerJoin(users, eq(users.id, classroomStudents.studentId))
      .where(eq(classroomStudents.classroomId, id));

    return {
      ...updatedClassroom,
      teachers: teacherRows.map((t) => ({
        id: t.id,
        user: { id: t.userId, name: t.name, email: t.email },
      })),
      students: studentRows.map((s) => ({
        id: s.id,
        student: { id: s.studentId, name: s.name, email: s.email },
      })),
    };
  } catch (error) {
    console.error("Error updating classroom:", error);
    return null;
  }
};

// Delete a classroom
export const deleteClassroom = async (
  classroomId: string,
  teacherId: string,
  role?: string,
) => {
  try {
    if (role === "teacher") {
      // First, verify the teacher is part of the classroom
      const teacherRows = await db.select({
        userId: classroomTeachers.teacherId,
      })
        .from(classroomTeachers)
        .where(eq(classroomTeachers.classroomId, classroomId));

      const [classroom] = await db.select({ id: classrooms.id })
        .from(classrooms)
        .where(eq(classrooms.id, classroomId))
        .limit(1);

      if (!classroom) {
        return { success: false, error: "Classroom not found" };
      }

      // Count how many teachers are in the classroom
      const teacherCount = teacherRows.length;

      if (teacherCount > 1) {
        // Multiple teachers: only remove the current teacher from the classroom
        await db.delete(classroomTeachers)
          .where(
            and(
              eq(classroomTeachers.classroomId, classroomId),
              eq(classroomTeachers.teacherId, teacherId),
            ),
          );
        return { success: true, message: "Removed from classroom" };
      } else {
        // Only one teacher: delete the entire classroom
        await db.delete(classrooms).where(eq(classrooms.id, classroomId));
        return { success: true, message: "Classroom deleted" };
      }
    }

    if (role === "admin" || role === "system") {
      await db.delete(classrooms).where(eq(classrooms.id, classroomId));
      return { success: true };
    }

    return {
      success: false,
      error: "Insufficient permissions to delete classroom",
    };
  } catch (error) {
    console.error("Error deleting classroom:", error);
    return { success: false, error: "Failed to delete classroom" };
  }
};

// Get all students for a teacher from their classrooms
export const getAllStudentsByTeacher = async (teacherId: string) => {
  try {
    // Get all classrooms for the teacher
    const teacherClassrooms = await db.select({
      classroomId: classroomTeachers.classroomId,
      classroomName: classrooms.name,
      studentId: classroomStudents.studentId,
      studentUserId: users.id,
      studentName: users.name,
      studentEmail: users.email,
      studentXp: users.xp,
      studentLevel: users.level,
      studentCefrLevel: users.cefrLevel,
      studentCreatedAt: users.createdAt,
      studentUpdatedAt: users.updatedAt,
    })
      .from(classroomTeachers)
      .innerJoin(classrooms, eq(classrooms.id, classroomTeachers.classroomId))
      .leftJoin(classroomStudents, eq(classroomStudents.classroomId, classrooms.id))
      .leftJoin(users, eq(users.id, classroomStudents.studentId))
      .where(eq(classroomTeachers.teacherId, teacherId));

    // Extract unique students across all classrooms
    const studentMap = new Map();

    teacherClassrooms.forEach((row) => {
      if (!row.studentUserId) return;
      const studentId = row.studentUserId;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          display_name: row.studentName,
          email: row.studentEmail,
          xp: row.studentXp,
          level: row.studentLevel,
          cefrLevel: row.studentCefrLevel,
          createdAt: row.studentCreatedAt,
          updatedAt: row.studentUpdatedAt,
          classrooms: [],
        });
      }
      // Add classroom info to student
      studentMap.get(studentId).classrooms.push({
        id: row.classroomId,
        name: row.classroomName,
      });
    });

    // Convert map to array
    const students = Array.from(studentMap.values());

    return students;
  } catch (error) {
    console.error("Error fetching students by teacher:", error);
    throw new Error("Failed to fetch students");
  }
};

// Get all students by admin
export const getAllStudentsByAdmin = async (adminId: string) => {
  try {
    const [schoolAdmin] = await db.select({ schoolId: schoolAdmins.schoolId })
      .from(schoolAdmins)
      .where(eq(schoolAdmins.userId, adminId))
      .limit(1);

    if (!schoolAdmin) {
      return [];
    }

    // Get all classrooms for the school
    const adminClassrooms = await db.select({
      classroomId: classrooms.id,
      classroomName: classrooms.name,
      studentUserId: users.id,
      studentName: users.name,
      studentEmail: users.email,
      studentXp: users.xp,
      studentLevel: users.level,
      studentCefrLevel: users.cefrLevel,
      studentCreatedAt: users.createdAt,
      studentUpdatedAt: users.updatedAt,
    })
      .from(classrooms)
      .leftJoin(classroomStudents, eq(classroomStudents.classroomId, classrooms.id))
      .leftJoin(users, eq(users.id, classroomStudents.studentId))
      .where(eq(classrooms.schoolId, schoolAdmin.schoolId));

    // Extract unique students across all classrooms
    const studentMap = new Map();

    adminClassrooms.forEach((row) => {
      if (!row.studentUserId) return;
      const studentId = row.studentUserId;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          display_name: row.studentName,
          email: row.studentEmail,
          xp: row.studentXp,
          level: row.studentLevel,
          cefrLevel: row.studentCefrLevel,
          createdAt: row.studentCreatedAt,
          updatedAt: row.studentUpdatedAt,
          classrooms: [],
        });
      }
      // Add classroom info to student
      studentMap.get(studentId).classrooms.push({
        id: row.classroomId,
        name: row.classroomName,
      });
    });

    // Convert map to array
    const students = Array.from(studentMap.values());

    return students;
  } catch (error) {
    console.error("Error fetching students by teacher:", error);
    throw new Error("Failed to fetch students");
  }
};

// Get all students in the system (for system role)
export const getAllStudentsInSystem = async () => {
  try {
    // Get all users with STUDENT role, plus their classroom memberships and
    // each classroom's teachers. We stitch the include shape in memory.
    const studentRows = await db.select({
      studentId: users.id,
      studentName: users.name,
      studentEmail: users.email,
      studentXp: users.xp,
      studentLevel: users.level,
      studentCefrLevel: users.cefrLevel,
      studentCreatedAt: users.createdAt,
      studentUpdatedAt: users.updatedAt,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
    })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(classroomStudents, eq(classroomStudents.studentId, users.id))
      .leftJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
      .where(eq(roles.name, "student"))
      .orderBy(desc(users.createdAt));

    // For each (student, classroom) row, fetch the classroom's teachers.
    const classroomIds = Array.from(
      new Set(
        studentRows
          .map((r) => r.classroomId)
          .filter((id): id is string => !!id),
      ),
    );

    const teacherByClassroom = new Map<string, any[]>();
    if (classroomIds.length) {
      const teacherRows = await db.select({
        classroomId: classroomTeachers.classroomId,
        teacherRelId: classroomTeachers.id,
        userId: users.id,
        name: users.name,
        email: users.email,
      })
        .from(classroomTeachers)
        .innerJoin(users, eq(users.id, classroomTeachers.teacherId))
        .where(inArray(classroomTeachers.classroomId, classroomIds));
      for (const row of teacherRows) {
        if (!teacherByClassroom.has(row.classroomId)) {
          teacherByClassroom.set(row.classroomId, []);
        }
        teacherByClassroom.get(row.classroomId)!.push({
          id: row.teacherRelId,
          user: { id: row.userId, name: row.name, email: row.email },
        });
      }
    }

    // Group by student
    const groupedByStudent = new Map<string, any>();
    for (const row of studentRows) {
      const sid = row.studentId;
      if (!groupedByStudent.has(sid)) {
        groupedByStudent.set(sid, {
          id: sid,
          display_name: row.studentName,
          email: row.studentEmail,
          xp: row.studentXp,
          level: row.studentLevel,
          cefrLevel: row.studentCefrLevel,
          createdAt: row.studentCreatedAt,
          updatedAt: row.studentUpdatedAt,
          classrooms: [],
        });
      }
      if (row.classroomId) {
        const teacherList = teacherByClassroom.get(row.classroomId) ?? [];
        groupedByStudent.get(sid).classrooms.push({
          id: row.classroomId,
          name: row.classroomName,
          teacher: teacherList[0]?.user,
        });
      }
    }

    return Array.from(groupedByStudent.values());
  } catch (error) {
    console.error("Error fetching all students in system:", error);
    throw new Error("Failed to fetch students");
  }
};

// Get a specific classroom with its students
export const getClassroomWithStudents = async (
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // If teacherId is provided, verify the teacher owns the classroom
    const whereConditions: any[] = [eq(classrooms.id, classroomId)];
    if (teacherId) {
      whereConditions.push(eq(classrooms.teacherId, teacherId));
    }

    const [classroom] = await db.select().from(classrooms)
      .where(and(...whereConditions))
      .limit(1);

    if (!classroom) {
      return null;
    }

    // Stitch students + their latest activity for the include shape.
    const studentRows = await db.select({
      classroomStudentId: classroomStudents.id,
      studentId: users.id,
      studentName: users.name,
      studentEmail: users.email,
      studentXp: users.xp,
      studentLevel: users.level,
      studentCefrLevel: users.cefrLevel,
      studentCreatedAt: users.createdAt,
      studentUpdatedAt: users.updatedAt,
    })
      .from(classroomStudents)
      .innerJoin(users, eq(users.id, classroomStudents.studentId))
      .where(eq(classroomStudents.classroomId, classroomId));

    // For each student, fetch the latest userActivity row.
    const studentIds = studentRows.map((s) => s.studentId);
    const latestActivityByStudent = new Map<string, Date | null>();
    if (studentIds.length) {
      const activityRows = await db.select({
        userId: userActivity.userId,
        createdAt: userActivity.createdAt,
      })
        .from(userActivity)
        .where(inArray(userActivity.userId, studentIds))
        .orderBy(desc(userActivity.createdAt));
      for (const row of activityRows) {
        if (!latestActivityByStudent.has(row.userId)) {
          latestActivityByStudent.set(row.userId, row.createdAt);
        }
      }
    }

    const studentInClass = studentRows.map((cs) => ({
      id: cs.studentId,
      display_name: cs.studentName,
      email: cs.studentEmail,
      last_activity: (latestActivityByStudent.get(cs.studentId) ?? null)?.toISOString() ?? null,
      level: cs.studentLevel,
      xp: cs.studentXp,
      cefrLevel: cs.studentCefrLevel,
    }));

    // Fetch the classroom's teachers (id, user-id).
    const teacherRows = await db.select({
      id: classroomTeachers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
      .from(classroomTeachers)
      .innerJoin(users, eq(users.id, classroomTeachers.teacherId))
      .where(eq(classroomTeachers.classroomId, classroomId));

    const primaryTeacher = teacherRows[0]?.user;

    const formattedClassroom = {
      id: classroom.id,
      classroomName: classroom.name,
      classCode: classroom.classCode,
      passwordStudents: classroom.passwordStudents,
      codeExpiresAt: classroom.codeExpiresAt?.toISOString() || null,
      grade: classroom.grade,
      teacherId: primaryTeacher?.id,
      archived: false, // Add this field based on your schema
      noOfStudents: studentRows.length,
    };

    return {
      classroom: formattedClassroom,
      studentInClass,
    };
  } catch (error) {
    console.error("Error fetching classroom with students:", error);
    throw new Error("Failed to fetch classroom with students");
  }
};

export const getClassroomStudentForLogin = async (code: string) => {
  try {
    //check code
    const [checkCode] = await db.select({
      id: classrooms.id,
      passwordStudents: classrooms.passwordStudents,
      codeExpiresAt: classrooms.codeExpiresAt,
    })
      .from(classrooms)
      .where(eq(classrooms.passwordStudents, code))
      .limit(1);

    if (!checkCode) {
      return NextResponse.json(
        { error: "Invalid Classroom Code" },
        { status: 404 },
      );
    }

    if (checkCode.codeExpiresAt && new Date() > checkCode.codeExpiresAt) {
      return NextResponse.json(
        { error: "Classroom code has expired" },
        { status: 410 }, // 410 Gone = valid but expired
      );
    }

    const studentInClass = await db.select({
      id: classroomStudents.id,
      classroomId: classroomStudents.classroomId,
      studentId: classroomStudents.studentId,
      joinedAt: classroomStudents.joinedAt,
      studentUserId: users.id,
      studentEmail: users.email,
      studentName: users.name,
    })
      .from(classroomStudents)
      .innerJoin(users, eq(users.id, classroomStudents.studentId))
      .where(eq(classroomStudents.classroomId, checkCode.id));

    return NextResponse.json({ students: studentInClass }, { status: 200 });
  } catch (error) {
    throw new Error("error getClassroomStudentForLogin");
  }
};

// Generate a unique class code for a classroom
export const generateClassCode = async (
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // Get classroom with existing password
    const [classroom] = await db.select({
      id: classrooms.id,
      name: classrooms.name,
      passwordStudents: classrooms.passwordStudents,
      codeExpiresAt: classrooms.codeExpiresAt,
    })
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (!classroom) {
      return null;
    }

    const existingPassword = classroom.passwordStudents;

    // Generate a unique 8-character alphanumeric code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // Function to check if password exists in database
    const isPasswordUnique = async (password: string): Promise<boolean> => {
      const [existing] = await db.select({ id: classrooms.id })
        .from(classrooms)
        .where(eq(classrooms.passwordStudents, password))
        .limit(1);
      return !existing;
    };

    let newPassword = generateCode();
    let attempts = 0;
    const maxAttempts = 20;

    // Generate new password that:
    // 1. Is not in the database
    // 2. Is different from existing password (if any)
    while (attempts < maxAttempts) {
      const isUnique = await isPasswordUnique(newPassword);
      const isDifferent = !existingPassword || newPassword !== existingPassword;

      if (isUnique && isDifferent) {
        break;
      }

      newPassword = generateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error(
        "Unable to generate unique class code after maximum attempts",
      );
    }

    // Set expiration to 7 days from now
    const expiresAt = addDays(new Date(), 7);

    // Update the classroom with the new password and expiration date
    const [updatedClassroom] = await db.update(classrooms)
      .set({
        passwordStudents: newPassword,
        codeExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(classrooms.id, classroomId))
      .returning({
        id: classrooms.id,
        name: classrooms.name,
        passwordStudents: classrooms.passwordStudents,
        codeExpiresAt: classrooms.codeExpiresAt,
      });

    return updatedClassroom;
  } catch (error) {
    console.error("Error generating class code:", error);
    throw new Error("Failed to generate class code");
  }
};