import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "../schema/index.js";
import type { DB } from "../client.js";
import { createCredentialAccount, hashPassword } from "../../../auth/src/index.js";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../connection-options.js";

const { schools, users, accounts, classrooms, classroomStudents, classroomTeachers } = schema;

/** Shared password of every QA account created by this seed. */
const QA_PASSWORD = "QaTest!2026x";

/**
 * Refuses to run in production or against a non-local database host.
 * @param connectionString Database URL the seed will connect to.
 * @throws When NODE_ENV is production or the URL host is not localhost or 127.0.0.1.
 */
export function assertLocalQaSeedAllowed(connectionString: string | undefined): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("primary QA seed refuses to run when NODE_ENV is production.");
  }
  if (!connectionString) {
    throw new Error("Provide DIRECT_DATABASE_URL or DATABASE_URL.");
  }
  const host = new URL(connectionString).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`primary QA seed refuses non-local database host "${host}".`);
  }
}

/**
 * Seeds Primary Advantage QA browser-test data into a local database.
 * Creates two schools, a SYSTEM user with a password login, credential accounts per role, one classroom
 * per school, and classroom links. Existing rows are skipped, so reruns are safe.
 * @param db Database client connected to a local database.
 * @returns A promise that resolves after all rows exist.
 */
export async function seedPrimaryQa(db: DB): Promise<void> {
  const ensureSchool = async (name: string) => {
    const [found] = await db.select().from(schools).where(eq(schools.name, name)).limit(1);
    if (found) return found;
    const [created] = await db.insert(schools).values({ name }).returning();
    return created;
  };
  const schoolA = await ensureSchool("QA School A");
  const schoolB = await ensureSchool("QA School B");

  const [existingSystem] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "qa-system"))
    .limit(1);
  let systemId = existingSystem?.id;
  if (!systemId) {
    systemId = crypto.randomUUID();
    await db.insert(users).values({
      id: systemId,
      username: "qa-system",
      displayUsername: "qa-system",
      name: "QA System",
      role: "SYSTEM",
      schoolId: schoolA.id,
      xp: 0,
      level: 1,
      cefrLevel: "A1-",
    });
  }
  const [systemCredential] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, systemId), eq(accounts.providerId, "credential")))
    .limit(1);
  if (!systemCredential) {
    await db.insert(accounts).values({
      id: `${systemId}_credential`,
      userId: systemId,
      providerId: "credential",
      password: await hashPassword(QA_PASSWORD),
    });
  }
  const actorUserId = systemId;

  const ensureUser = async (
    username: string,
    role: "ADMIN" | "TEACHER" | "STUDENT",
    schoolId: string,
  ): Promise<string> => {
    const [found] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (found) return found.id;
    const created = await createCredentialAccount(db, {
      username,
      displayUsername: username,
      name: username,
      password: QA_PASSWORD,
      role,
      schoolId,
      actorUserId,
      actorRole: "SYSTEM",
    });
    return created.id;
  };

  await ensureUser("qa-admin-a", "ADMIN", schoolA.id);
  const teacherA = await ensureUser("qa-teacher-a", "TEACHER", schoolA.id);
  const studentsA = [
    await ensureUser("qa-student-a1", "STUDENT", schoolA.id),
    await ensureUser("qa-student-a2", "STUDENT", schoolA.id),
    await ensureUser("qa-student-a3", "STUDENT", schoolA.id),
  ];
  await ensureUser("qa-admin-b", "ADMIN", schoolB.id);
  const teacherB = await ensureUser("qa-teacher-b", "TEACHER", schoolB.id);
  const studentsB = [await ensureUser("qa-student-b1", "STUDENT", schoolB.id)];

  const ensureClass = async (
    name: string,
    classCode: string,
    schoolId: string,
    teacherId: string,
    grade: number,
    studentIds: string[],
  ) => {
    let [klass] = await db.select().from(classrooms).where(eq(classrooms.classCode, classCode)).limit(1);
    if (!klass) {
      [klass] = await db
        .insert(classrooms)
        .values({ name, schoolId, teacherId, grade, classCode })
        .returning();
    }
    for (const studentId of studentIds) {
      const [link] = await db
        .select({ id: classroomStudents.id })
        .from(classroomStudents)
        .where(and(eq(classroomStudents.classroomId, klass.id), eq(classroomStudents.studentId, studentId)))
        .limit(1);
      if (!link) await db.insert(classroomStudents).values({ classroomId: klass.id, studentId });
    }
    const [teacherLink] = await db
      .select({ id: classroomTeachers.id })
      .from(classroomTeachers)
      .where(and(eq(classroomTeachers.classroomId, klass.id), eq(classroomTeachers.teacherId, teacherId)))
      .limit(1);
    if (!teacherLink) await db.insert(classroomTeachers).values({ classroomId: klass.id, teacherId });
  };

  await ensureClass("QA Class A", "QACLASSA", schoolA.id, teacherA, 4, studentsA);
  await ensureClass("QA Class B", "QACLASSB", schoolB.id, teacherB, 5, studentsB);
}

/** Entry point: guards the target database, runs the seed, and closes the client. */
async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  assertLocalQaSeedAllowed(connectionString);
  const client = postgres(
    normalizePostgresConnectionString(connectionString),
    buildPostgresOptions(connectionString),
  );
  try {
    await seedPrimaryQa(drizzle(client, { schema }) as unknown as DB);
    console.log(`primary QA seed complete (password: ${QA_PASSWORD})`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
