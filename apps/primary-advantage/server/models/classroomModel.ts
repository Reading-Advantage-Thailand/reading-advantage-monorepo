import {
  db,
  eq,
  and,
  desc,
  asc,
  inArray,
  or,
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
import type { Role } from "@reading-advantage/auth";
import { generateSecureCode } from "@/lib/utils";

type ClassroomActor = {
  id: string;
  role: Role;
  schoolId: string | null;
};

type AccessibleClassroom = {
  id: string;
  name: string;
  schoolId: string | null;
  teacherId: string;
};

const CLASSROOM_ROLES: readonly Role[] = ["TEACHER", "ADMIN", "SYSTEM"];

/**
 * Loads a classroom only when the actor can access it.
 * @param classroomId The classroom identifier.
 * @param actor The authenticated actor.
 * @returns The classroom access fields, or null when access is denied.
 */
async function getAccessibleClassroom(
  classroomId: string,
  actor: ClassroomActor,
): Promise<AccessibleClassroom | null> {
  if (!CLASSROOM_ROLES.includes(actor.role)) return null;
  if (actor.role !== "SYSTEM" && !actor.schoolId) return null;

  const classroomConditions = [eq(classrooms.id, classroomId)];
  if (actor.role !== "SYSTEM") {
    classroomConditions.push(eq(classrooms.schoolId, actor.schoolId!));
  }

  const [classroom] = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      schoolId: classrooms.schoolId,
      teacherId: classrooms.teacherId,
    })
    .from(classrooms)
    .where(and(...classroomConditions))
    .limit(1);

  if (!classroom) return null;
  if (actor.role === "SYSTEM") return classroom;
  if (actor.role === "ADMIN") return classroom;
  if (classroom.teacherId === actor.id) return classroom;

  const [membership] = await db
    .select({ id: classroomTeachers.id })
    .from(classroomTeachers)
    .where(
      and(
        eq(classroomTeachers.classroomId, classroomId),
        eq(classroomTeachers.teacherId, actor.id),
      ),
    )
    .limit(1);

  return membership ? classroom : null;
}

/**
 * Sets a supplied class code for an accessible classroom.
 * @param classroomId The classroom identifier.
 * @param classCode The new class code.
 * @param actor The authenticated actor.
 * @returns The updated classroom or a not-found response.
 */
export const createClassCode = async (
  classroomId: string,
  classCode: string,
  actor: ClassroomActor,
) => {
  try {
    const accessibleClassroom = await getAccessibleClassroom(classroomId, actor);
    if (!accessibleClassroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }
    const expiresAt = addDays(new Date(), 1);

    const [classroom] = await db.select({ id: classrooms.id, name: classrooms.name })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          accessibleClassroom.schoolId
            ? eq(classrooms.schoolId, accessibleClassroom.schoolId)
            : undefined,
        ),
      )
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
        .where(
          and(
            eq(classrooms.id, classroomId),
            accessibleClassroom.schoolId
              ? eq(classrooms.schoolId, accessibleClassroom.schoolId)
              : undefined,
          ),
        )
        .returning();
      return updated;
    }
  } catch (error) {
    throw new Error("Failed to generate or update classroom code");
  }
};

/**
 * Creates a classroom for an authorized actor.
 * @param data The classroom fields and authenticated actor.
 * @returns A success result after creation.
 * @throws When the actor cannot create a classroom.
 */
export const createClassroom = async (data: {
  name: string;
  classCode?: string;
  grade?: string;
  actor: ClassroomActor;
}) => {
  try {
    if (!CLASSROOM_ROLES.includes(data.actor.role)) throw new Error("FORBIDDEN");
    if (data.actor.role !== "SYSTEM" && !data.actor.schoolId) {
      throw new Error("FORBIDDEN");
    }

    await db.transaction(async (tx) => {
      const [classroom] = await tx.insert(classrooms).values({
        name: data.name,
        classCode: data.classCode || null,
        grade: data.grade ? parseInt(data.grade) : null,
        schoolId: data.actor.schoolId,
        teacherId: data.actor.id,
        createdBy: data.actor.id,
      }).returning();

      if (data.actor.role === "TEACHER") {
        await tx.insert(classroomTeachers).values({
          classroomId: classroom.id,
          teacherId: data.actor.id,
        });
      }
    });
    return { success: true, message: "Classroom created successfully" };
  } catch (error) {
    throw new Error("FAILED_CREATE");
  }
};

/**
 * Enrolls a same-school student in an accessible classroom.
 * @param studentId The student identifier.
 * @param classroomId The classroom identifier.
 * @param actor The authenticated actor.
 * @returns The enrollment with student and classroom details.
 */
export const enrollStudentInClassroom = async (
  studentId: string,
  classroomId: string,
  actor: ClassroomActor,
) => {
  try {
    const classroom = await getAccessibleClassroom(classroomId, actor);
    if (!classroom) throw new Error("Classroom not found or access denied");

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

    // Check if student exists and has STUDENT role
    const [student] = await db.select().from(users)
      .where(
        and(
          eq(users.id, studentId),
          eq(users.role, "STUDENT"),
          classroom.schoolId
            ? eq(users.schoolId, classroom.schoolId)
            : undefined,
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
        id: student.id,
        name: student.name,
        email: student.email,
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

/**
 * Removes a student from an accessible classroom.
 * @param studentId The student identifier.
 * @param classroomId The classroom identifier.
 * @param actor The authenticated actor.
 * @returns The removed enrollment with related records.
 */
export const unenrollStudentFromClassroom = async (
  studentId: string,
  classroomId: string,
  actor: ClassroomActor,
) => {
  try {
    const accessibleClassroom = await getAccessibleClassroom(classroomId, actor);
    if (!accessibleClassroom) throw new Error("Classroom not found or access denied");

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

/**
 * Gets same-school students who are available for enrollment.
 * @param classroomId The classroom identifier.
 * @param actor The authenticated actor.
 * @returns The available students.
 */
export const getAvailableStudentsForClassroom = async (
  classroomId: string,
  actor: ClassroomActor,
) => {
  try {
    const classroom = await getAccessibleClassroom(classroomId, actor);
    if (!classroom) throw new Error("Classroom not found or access denied");

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
      .from(users);

    const whereConditions: any[] = [eq(users.role, "STUDENT")];
    if (classroom.schoolId) {
      whereConditions.push(eq(users.schoolId, classroom.schoolId));
    }
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

/**
 * Gets classrooms within the authenticated actor's access scope.
 * @param actor The authenticated actor.
 * @returns The accessible classrooms with their teachers and students.
 * @throws When the actor cannot read classrooms.
 */
export const getAllClassrooms = async (actor: ClassroomActor) => {
  try {
    const whereConditions: any[] = [];
    if (!CLASSROOM_ROLES.includes(actor.role)) {
      throw new Error("Insufficient permissions to view classrooms");
    }
    if (actor.role !== "SYSTEM") {
      if (!actor.schoolId) throw new Error("Insufficient permissions to view classrooms");
      whereConditions.push(eq(classrooms.schoolId, actor.schoolId));
    }
    if (actor.role === "TEACHER") {
      const teacherClassroomIds = await db
        .select({ classroomId: classroomTeachers.classroomId })
        .from(classroomTeachers)
        .innerJoin(classrooms, eq(classrooms.id, classroomTeachers.classroomId))
        .where(
          and(
            eq(classroomTeachers.teacherId, actor.id),
            eq(classrooms.schoolId, actor.schoolId!),
          ),
        );
      const classroomIds = teacherClassroomIds.map((row) => row.classroomId);
      whereConditions.push(
        classroomIds.length
          ? or(eq(classrooms.teacherId, actor.id), inArray(classrooms.id, classroomIds))
          : eq(classrooms.teacherId, actor.id),
      );
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

/**
 * Updates an accessible classroom.
 * @param id The classroom identifier.
 * @param data The classroom changes.
 * @param actor The authenticated actor.
 * @returns The updated classroom, or null when access is denied.
 */
export const updateClassroom = async (
  id: string,
  data: {
    name?: string;
    grade?: string;
    description?: string;
  },
  actor: ClassroomActor,
) => {
  try {
    const accessibleClassroom = await getAccessibleClassroom(id, actor);
    if (!accessibleClassroom) return null;

    const [updatedClassroom] = await db.update(classrooms)
      .set({
        name: data.name,
        grade: data.grade ? parseInt(data.grade) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(classrooms.id, id),
          accessibleClassroom.schoolId
            ? eq(classrooms.schoolId, accessibleClassroom.schoolId)
            : undefined,
        ),
      )
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

/**
 * Deletes an accessible classroom or removes a co-teacher.
 * @param classroomId The classroom identifier.
 * @param actor The authenticated actor.
 * @returns The deletion result.
 */
export const deleteClassroom = async (
  classroomId: string,
  actor: ClassroomActor,
) => {
  try {
    const classroom = await getAccessibleClassroom(classroomId, actor);
    if (!classroom) {
      return { success: false, error: "Classroom not found or access denied" };
    }

    if (actor.role === "TEACHER") {
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
              eq(classroomTeachers.teacherId, actor.id),
            ),
          );
        return { success: true, message: "Removed from classroom" };
      } else {
        // Only one teacher: delete the entire classroom
        await db.delete(classrooms).where(eq(classrooms.id, classroomId));
        return { success: true, message: "Classroom deleted" };
      }
    }

    if (actor.role === "ADMIN" || actor.role === "SYSTEM") {
      await db.delete(classrooms).where(
        and(
          eq(classrooms.id, classroomId),
          classroom.schoolId ? eq(classrooms.schoolId, classroom.schoolId) : undefined,
        ),
      );
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

/**
 * Gets students from a teacher's classrooms in one school.
 * @param teacherId The teacher identifier.
 * @param schoolId The authorized school identifier.
 * @returns The teacher's students.
 */
export const getAllStudentsByTeacher = async (
  teacherId: string,
  schoolId: string,
) => {
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
      .where(
        and(
          eq(classroomTeachers.teacherId, teacherId),
          eq(classrooms.schoolId, schoolId),
        ),
      );

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

/**
 * Gets students for a school admin in the authorized school.
 * @param adminId The admin identifier.
 * @param schoolId The authorized school identifier.
 * @returns The school's students.
 */
export const getAllStudentsByAdmin = async (
  adminId: string,
  schoolId: string,
) => {
  try {
    const [schoolAdmin] = await db.select({ schoolId: schoolAdmins.schoolId })
      .from(schoolAdmins)
      .where(
        and(
          eq(schoolAdmins.userId, adminId),
          eq(schoolAdmins.schoolId, schoolId),
        ),
      )
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

/**
 * Gets an accessible classroom and its student roster.
 * @param classroomId The classroom identifier.
 * @param actor The authenticated actor.
 * @returns The classroom roster, or null when access is denied.
 */
export const getClassroomWithStudents = async (
  classroomId: string,
  actor: ClassroomActor,
) => {
  try {
    const accessibleClassroom = await getAccessibleClassroom(classroomId, actor);
    if (!accessibleClassroom) return null;

    const [classroom] = await db.select().from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          accessibleClassroom.schoolId
            ? eq(classrooms.schoolId, accessibleClassroom.schoolId)
            : undefined,
        ),
      )
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

    const primaryTeacher = teacherRows[0];

    const formattedClassroom = {
      id: classroom.id,
      classroomName: classroom.name,
      classCode: classroom.classCode,
      passwordStudents: classroom.passwordStudents,
      codeExpiresAt: classroom.codeExpiresAt?.toISOString() || null,
      grade: classroom.grade,
      teacherId: primaryTeacher?.userId,
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

/**
 * Generates a unique login code for an accessible classroom.
 * @param classroomId The classroom identifier.
 * @param actor The authenticated actor.
 * @returns The updated classroom, or null when access is denied.
 */
export const generateClassCode = async (
  classroomId: string,
  actor: ClassroomActor,
) => {
  try {
    const accessibleClassroom = await getAccessibleClassroom(classroomId, actor);
    if (!accessibleClassroom) return null;

    // Get classroom with existing password
    const [classroom] = await db.select({
      id: classrooms.id,
      name: classrooms.name,
      passwordStudents: classrooms.passwordStudents,
      codeExpiresAt: classrooms.codeExpiresAt,
    })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.id, classroomId),
          accessibleClassroom.schoolId
            ? eq(classrooms.schoolId, accessibleClassroom.schoolId)
            : undefined,
        ),
      )
      .limit(1);

    if (!classroom) {
      return null;
    }

    const existingPassword = classroom.passwordStudents;

    const generateCode = () => generateSecureCode(8).toUpperCase();

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
      .where(
        and(
          eq(classrooms.id, classroomId),
          accessibleClassroom.schoolId
            ? eq(classrooms.schoolId, accessibleClassroom.schoolId)
            : undefined,
        ),
      )
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
