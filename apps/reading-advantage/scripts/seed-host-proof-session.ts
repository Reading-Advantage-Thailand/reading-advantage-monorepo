/**
 * Idempotently seeds the local Reading host-proof student account.
 *
 * Usage (from apps/reading-advantage):
 *   pnpm exec tsx scripts/seed-host-proof-session.ts
 */

import { loadEnvConfig } from "@next/env";
import { getHostProofTestCredentials } from "../host-proof-test-config";

loadEnvConfig(process.cwd());

const { username: STUDENT_USERNAME, password: STUDENT_PASSWORD } = getHostProofTestCredentials();
const STUDENT_ID = "host-proof-reading-student";
const STUDENT_EMAIL = "host-proof-reading-student@reading-advantage.local";
const SCHOOL_NAME = "Host Proof Reading School";

/**
 * Creates or refreshes the deterministic Reading host-proof school and student.
 * @returns A promise resolved after the fixture is ready for login.
 */
async function seedHostProofSession(): Promise<void> {
  const { and, db, eq } = await import("@reading-advantage/db");
  const { accounts, schools, users } = await import("@reading-advantage/db/schema");
  const { hashPassword } = await import("@reading-advantage/auth");

  const [existingSchool] = await db.select().from(schools).where(eq(schools.name, SCHOOL_NAME)).limit(1);
  const schoolId = existingSchool?.id ?? (await db
    .insert(schools)
    .values({ name: SCHOOL_NAME })
    .returning({ id: schools.id }))[0].id;

  const [existingStudent] = await db.select().from(users).where(eq(users.username, STUDENT_USERNAME)).limit(1);
  const studentId = existingStudent?.id ?? STUDENT_ID;
  if (existingStudent) {
    await db
      .update(users)
      .set({
        displayUsername: STUDENT_USERNAME,
        name: "Host Proof Reading Student",
        email: STUDENT_EMAIL,
        role: "STUDENT",
        schoolId,
        xp: 100,
        level: 1,
      })
      .where(eq(users.id, existingStudent.id));
  } else {
    await db.insert(users).values({
      id: STUDENT_ID,
      username: STUDENT_USERNAME,
      displayUsername: STUDENT_USERNAME,
      name: "Host Proof Reading Student",
      email: STUDENT_EMAIL,
      role: "STUDENT",
      schoolId,
      xp: 100,
      level: 1,
    });
  }

  const passwordHash = await hashPassword(STUDENT_PASSWORD);
  const [existingAccount] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, studentId), eq(accounts.providerId, "credential")))
    .limit(1);

  if (existingAccount) {
    await db.update(accounts).set({ password: passwordHash }).where(eq(accounts.id, existingAccount.id));
  } else {
    await db.insert(accounts).values({
      id: "account-host-proof-reading-student",
      userId: studentId,
      providerId: "credential",
      password: passwordHash,
    });
  }

  console.log(`Reading host-proof fixture ready: ${STUDENT_USERNAME}`);
}

seedHostProofSession()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed Reading host-proof session:", error);
    process.exit(1);
  });
