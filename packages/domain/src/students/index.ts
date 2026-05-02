import { eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { users, classroomStudents } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

interface ListStudentsInput {
  classroomId: string;
}

interface ImportRosterInput {
  classroomId: string;
  students: Array<{ name: string; email: string }>;
}

export async function listStudents({
  db,
  user,
  tenant,
  input,
}: {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: ListStudentsInput;
}) {
  assertCan(user, "student:list", tenant);

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      xp: users.xp,
      level: users.level,
      cefrLevel: users.cefrLevel,
    })
    .from(classroomStudents)
    .innerJoin(users, eq(classroomStudents.studentId, users.id))
    .where(eq(classroomStudents.classroomId, input.classroomId));
}

export async function importRoster({
  db,
  user,
  tenant,
  input,
}: {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: ImportRosterInput;
}) {
  assertCan(user, "student:import", tenant);

  return db.transaction(async (tx) => {
    const results = [];

    for (const student of input.students) {
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.email, student.email));

      let studentId: string;

      if (existingUser) {
        studentId = existingUser.id;
      } else {
        const [newUser] = await tx
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            name: student.name,
            email: student.email,
            role: "STUDENT",
            schoolId: tenant.schoolId,
          })
          .returning();
        studentId = newUser.id;
      }

      await tx
        .insert(classroomStudents)
        .values({
          classroomId: input.classroomId,
          studentId,
        })
        .onConflictDoNothing();

      results.push({ email: student.email, id: studentId });
    }

    return results;
  });
}
