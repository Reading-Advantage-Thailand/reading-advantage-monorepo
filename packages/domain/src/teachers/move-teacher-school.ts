import { and, eq, inArray, ne, notInArray } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@reading-advantage/db";
import { auditEvents, classroomTeachers, classrooms, schoolAdmins, schools, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { MoveTeacherSchoolError } from "./errors.js";
import "./permissions.js";

/** Input of `moveTeacherToSchool`: the teacher, the target school, and the classes of that school. */
export const moveTeacherToSchoolInputSchema = z.object({
  teacherId: z.string().min(1),
  schoolId: z.string().uuid(),
  classroomIds: z.array(z.string().uuid()).max(200),
});

/** Parsed input of `moveTeacherToSchool`. */
export type MoveTeacherToSchoolInput = z.infer<typeof moveTeacherToSchoolInputSchema>;

/** Output of `moveTeacherToSchool`: the teacher, the school, and the classes after the move. */
export const moveTeacherToSchoolOutputSchema = z.object({
  teacherId: z.string(),
  schoolId: z.string().uuid(),
  classroomIds: z.array(z.string().uuid()),
});

/** Output of `moveTeacherToSchool`. */
export type MoveTeacherToSchoolOutput = z.infer<typeof moveTeacherToSchoolOutputSchema>;

/**
 * Moves a teacher to another school in one transaction. The function sets `users.school_id`,
 * deletes the teacher's `classroom_teachers` rows, adds the rows for the chosen classes,
 * drops the teacher's `school_admins` rows of other schools, and writes an audit event.
 * A teacher who owns classes in the old school is refused.
 * Rows of the target school stay, and a same-school call touches no `school_admins` row.
 * @param params.db The database.
 * @param params.user The caller (SYSTEM only).
 * @param params.input The teacher id, the target school id, and the chosen class ids.
 * @returns The teacher id, the school id, and the class ids after the move.
 * @throws {AuthError} When the caller lacks `teacher:school:move`.
 * @throws {MoveTeacherSchoolError} With code TEACHER_NOT_FOUND, NOT_A_TEACHER, SCHOOL_NOT_FOUND,
 * CROSS_SCHOOL_CLASSROOM (400), or OWNS_CLASSES (409, with the class names).
 */
export async function moveTeacherToSchool({
  db,
  user,
  input,
}: {
  db: DB;
  user: UserContext;
  input: MoveTeacherToSchoolInput;
}): Promise<MoveTeacherToSchoolOutput> {
  assertCan(user, "teacher:school:move");
  const { teacherId, schoolId, classroomIds } = moveTeacherToSchoolInputSchema.parse(input);
  const wanted = [...new Set(classroomIds)];

  const result = await db.transaction(async (tx) => {
    const [teacher] = await tx
      .select({ id: users.id, role: users.role, schoolId: users.schoolId })
      .from(users)
      .where(eq(users.id, teacherId))
      .limit(1)
      .for("update");
    if (!teacher) throw new MoveTeacherSchoolError("TEACHER_NOT_FOUND", "Teacher not found");
    if (teacher.role !== "TEACHER") throw new MoveTeacherSchoolError("NOT_A_TEACHER", "The user is not a teacher");

    const [school] = await tx.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!school) throw new MoveTeacherSchoolError("SCHOOL_NOT_FOUND", "School not found");

    // Classes of the target school only. The tenant handle scopes the classroom reads.
    const scoped = createTenantDB(tx as unknown as DB, { schoolId });
    if (wanted.length > 0) {
      const found = await scoped.select({ id: classrooms.id }).from(classrooms).where(inArray(classrooms.id, wanted));
      if (found.length !== wanted.length) {
        throw new MoveTeacherSchoolError("CROSS_SCHOOL_CLASSROOM", "A class is not in the target school");
      }
    }

    const owned = await tx
      .select({ id: classrooms.id, name: classrooms.name })
      .from(classrooms)
      .where(eq(classrooms.teacherId, teacherId));
    if (teacher.schoolId !== schoolId && owned.length > 0) {
      throw new MoveTeacherSchoolError("OWNS_CLASSES", "The teacher owns classes", owned.map((row) => row.name));
    }

    const raw = scoped.unscoped("classroom_teachers is REFERENTIAL, scoped via the chosen classes of the target school");
    // Old links go. A class that the teacher still owns (same-school call) keeps its link.
    const ownedIds = owned.map((row) => row.id);
    await raw
      .delete(classroomTeachers)
      .where(
        ownedIds.length
          ? and(eq(classroomTeachers.teacherId, teacherId), notInArray(classroomTeachers.classroomId, ownedIds))
          : eq(classroomTeachers.teacherId, teacherId),
      );
    // A moved teacher keeps no admin rank of another school: `loadTargetEffectiveRank`
    // counts every `school_admins` row. Target-school rows stay, and a same-school
    // call touches no row.
    if (teacher.schoolId !== schoolId) {
      await tx
        .delete(schoolAdmins)
        .where(and(eq(schoolAdmins.userId, teacherId), ne(schoolAdmins.schoolId, schoolId)));
    }
    const toAdd = wanted.filter((id) => !ownedIds.includes(id));
    if (toAdd.length > 0) {
      await raw.insert(classroomTeachers).values(toAdd.map((classroomId) => ({ classroomId, teacherId })));
    }
    await tx.update(users).set({ schoolId }).where(eq(users.id, teacherId));
    await tx.insert(auditEvents).values({
      actorUserId: user.id,
      actorRole: user.role,
      action: "teacher:school:move",
      targetType: "user",
      targetId: teacherId,
      metadata: { fromSchoolId: teacher.schoolId, toSchoolId: schoolId, classCount: toAdd.length },
    });
    return { teacherId, schoolId, classroomIds: [...new Set([...ownedIds, ...toAdd])] };
  });
  return moveTeacherToSchoolOutputSchema.parse(result);
}
