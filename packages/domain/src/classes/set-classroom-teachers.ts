import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@reading-advantage/db";
import { classroomTeachers, classrooms, users } from "@reading-advantage/db/schema";
import { AuthError, assertCan, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import "./permissions.js";

/** The refusal codes of `setClassroomTeachers` and their HTTP status. */
export const SET_CLASSROOM_TEACHERS_STATUS = {
  CLASSROOM_NOT_FOUND: 404,
  CROSS_SCHOOL_TEACHER: 400,
  NOT_A_TEACHER: 400,
} as const;

/** A refusal of `setClassroomTeachers`. No row changed when it is thrown. */
export class SetClassroomTeachersError extends Error {
  readonly status: number;

  /**
   * @param code The refusal code.
   * @param message A short message without names.
   */
  constructor(
    readonly code: keyof typeof SET_CLASSROOM_TEACHERS_STATUS,
    message: string,
  ) {
    super(message);
    this.name = "SetClassroomTeachersError";
    this.status = SET_CLASSROOM_TEACHERS_STATUS[code];
  }
}

/** Input of `setClassroomTeachers`: the class and the full list of its teachers. */
export const setClassroomTeachersInputSchema = z.object({
  classroomId: z.string().uuid(),
  teacherIds: z.array(z.string().min(1)).max(200),
});

/** Parsed input of `setClassroomTeachers`. */
export type SetClassroomTeachersInput = z.infer<typeof setClassroomTeachersInputSchema>;

/** Output of `setClassroomTeachers`: the teacher ids of the class after the change (the owner first). */
export const setClassroomTeachersOutputSchema = z.object({
  classroomId: z.string().uuid(),
  teacherIds: z.array(z.string()),
});

/** Output of `setClassroomTeachers`. */
export type SetClassroomTeachersOutput = z.infer<typeof setClassroomTeachersOutputSchema>;

/**
 * Sets the teachers of a class in one transaction. The function adds the missing
 * `classroom_teachers` rows and deletes the rows of the teachers that left the list. The class
 * owner (`classrooms.teacher_id`) always stays on the class. A pair never gets a second row.
 * @param params.db The database.
 * @param params.user The caller (ADMIN of the class school, or SYSTEM).
 * @param params.input The class id and the teacher ids.
 * @returns The teacher ids of the class after the change.
 * @throws {AuthError} When the caller lacks `class:teachers:assign`, or an ADMIN names a class of another school.
 * @throws {SetClassroomTeachersError} When the class does not exist, or a teacher is not a TEACHER of the class school.
 */
export async function setClassroomTeachers({
  db,
  user,
  input,
}: {
  db: DB;
  user: UserContext;
  input: SetClassroomTeachersInput;
}): Promise<SetClassroomTeachersOutput> {
  // The key is registered by `./permissions.js` (module registry), not in the central PERMISSIONS type.
  assertCan(user, "class:teachers:assign");
  const { classroomId, teacherIds } = setClassroomTeachersInputSchema.parse(input);
  const wanted = [...new Set(teacherIds)];

  const result = await db.transaction(async (tx) => {
    const [classroom] = await tx
      .select({ id: classrooms.id, schoolId: classrooms.schoolId, ownerId: classrooms.teacherId })
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1)
      .for("update");
    if (!classroom) throw new SetClassroomTeachersError("CLASSROOM_NOT_FOUND", "Classroom not found");
    if (user.role !== "SYSTEM" && (!user.schoolId || user.schoolId !== classroom.schoolId)) {
      throw new AuthError("The classroom belongs to another school", "FORBIDDEN");
    }

    const raw = createTenantDB(tx as unknown as DB, { schoolId: classroom.schoolId ?? "" }).unscoped(
      "classroom_teachers is REFERENTIAL, scoped via the classroom school checked above",
    );
    const owner = classroom.ownerId;
    const others = wanted.filter((id) => id !== owner);
    if (others.length > 0) {
      const found = await raw
        .select({ id: users.id, role: users.role, schoolId: users.schoolId })
        .from(users)
        .where(inArray(users.id, others));
      const byId = new Map(found.map((row) => [row.id, row]));
      for (const id of others) {
        const row = byId.get(id);
        if (!row || !classroom.schoolId || row.schoolId !== classroom.schoolId) {
          throw new SetClassroomTeachersError("CROSS_SCHOOL_TEACHER", "A teacher is not in the school of the classroom");
        }
        if (row.role !== "TEACHER") throw new SetClassroomTeachersError("NOT_A_TEACHER", "A user is not a teacher");
      }
    }

    const keep = new Set([...others, owner]);
    const existing = await raw
      .select({ id: classroomTeachers.id, teacherId: classroomTeachers.teacherId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.classroomId, classroomId));
    const seen = new Set<string>();
    const dropRowIds: string[] = [];
    for (const row of existing) {
      // A row of a teacher who left the list, or a second row of one pair, goes away.
      if (!keep.has(row.teacherId) || seen.has(row.teacherId)) dropRowIds.push(row.id);
      else seen.add(row.teacherId);
    }
    if (dropRowIds.length > 0) {
      await raw.delete(classroomTeachers).where(and(eq(classroomTeachers.classroomId, classroomId), inArray(classroomTeachers.id, dropRowIds)));
    }
    const missing = [...keep].filter((id) => !seen.has(id));
    if (missing.length > 0) {
      await raw.insert(classroomTeachers).values(missing.map((teacherId) => ({ classroomId, teacherId })));
    }
    return { classroomId, teacherIds: [owner, ...others] };
  });
  return setClassroomTeachersOutputSchema.parse(result);
}
