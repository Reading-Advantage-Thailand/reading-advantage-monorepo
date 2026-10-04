import { randomInt } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { accounts, classroomStudents, sessions, users } from "@reading-advantage/db/schema";
import { hashPassword, type RateLimitStore, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { authorizeClassroom } from "./access.js";
import { auditStudentLogin } from "./audit.js";
import type { RequestMeta } from "./class-session.js";
import type { ResetClassPasswordsInput, ResetClassPasswordsOutput } from "./contracts.js";
import { ensureStudentCredentials } from "./credentials.js";
import { guardClassPasswordReset } from "./rate-limits.js";

/** Number of characters in a generated initial password. */
export const INITIAL_PASSWORD_LENGTH = 8;

/** Characters of an initial password: lower case and digits, without look-alikes (0, o, 1, i, l). */
const INITIAL_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

const FALLBACK_PREFIX = "student";
const MAX_PREFIX_LENGTH = 8;
const MAX_USERNAME_TRIES = 5;
const HASH_BATCH = 8;

/**
 * Makes the username prefix of a class: lower-case latin letters and digits of the class name,
 * at most 8 characters. A name with none of them (for example a Thai-only name) gives `student`.
 * @param className The class name, or null when the student has no class.
 * @returns The prefix, for example `p3a` for class `P3A`.
 */
export function usernamePrefix(className: string | null | undefined): string {
  const slug = (className ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, MAX_PREFIX_LENGTH);
  return slug || FALLBACK_PREFIX;
}

/**
 * Makes a random initial password that a teacher can print and a child can type.
 * @param pick Returns a random integer below the given bound. Tests replace it.
 * @returns A password of `INITIAL_PASSWORD_LENGTH` characters.
 */
export function generateInitialPassword(pick: (max: number) => number = randomInt): string {
  return Array.from({ length: INITIAL_PASSWORD_LENGTH }, () => INITIAL_PASSWORD_ALPHABET[pick(INITIAL_PASSWORD_ALPHABET.length)]).join("");
}

/**
 * Writes the password hash to the student's credential account (the account the shared login
 * reads), creating the account when it does not exist.
 */
function upsertCredentialPassword(executor: Pick<DB, "insert">, userId: string, hash: string) {
  return executor
    .insert(accounts)
    .values({ id: `${userId}_credential`, userId, providerId: "credential", password: hash })
    .onConflictDoUpdate({ target: [accounts.userId, accounts.providerId], set: { password: hash, updatedAt: new Date() } });
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/** One student that needs a generated username and an initial password. */
export interface StudentLoginSeed {
  userId: string;
  /** Class name for the username prefix. Empty gives the prefix `student`. */
  classroomName: string | null;
  /** Class to create the student credential row for. Empty skips the row. */
  classroomId: string | null;
  /** A password the caller chose. The student then gets no generated initial password. */
  password?: string;
}

/** The sign-in data of one provisioned student. */
export interface ProvisionedStudentLogin {
  userId: string;
  username: string;
  /** The plain initial password, shown once for printing. Null when the caller chose the password. */
  initialPassword: string | null;
}

/** A student whose login data could not be stored. The student keeps the old username. */
export interface FailedStudentLogin {
  userId: string;
  /** The error message, for the teacher report and the log. */
  reason: string;
}

/** Result of `provisionStudentLogins`: the students that got a login and the ones that did not. */
export interface ProvisionStudentLoginsResult {
  provisioned: ProvisionedStudentLogin[];
  failed: FailedStudentLogin[];
}

/**
 * Reads the highest number used after a prefix. Usernames are unique across all schools,
 * so this read is not scoped to one school.
 */
async function highestNumber(db: DB, prefix: string): Promise<number> {
  const rows = await db.select({ username: users.username }).from(users).where(like(users.username, `${prefix}%`));
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  return rows.reduce((max, row) => {
    const match = pattern.exec(row.username);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
}

/**
 * Gives each student a readable generated username (class prefix plus a number, lower case,
 * no email, no surname) and a credential account with an initial password, and creates the
 * student credential row for the class. It is the one path for student creation and roster
 * import (FR-6). A unique violation from a concurrent import is retried with a fresh number.
 * The username update and the account insert of one student run in one transaction, so a
 * student never keeps a new username without a password. A failure for one student does not
 * stop the others; it is returned in `failed`.
 * @param params.db Database client.
 * @param params.schoolId The school of the students, or null for a SYSTEM student without a school.
 * @param params.students The students to provision. They must exist already.
 * @returns The username and the plain initial password of each provisioned student, in input
 * order, and the students that failed.
 */
export async function provisionStudentLogins(params: {
  db: DB;
  schoolId: string | null;
  students: StudentLoginSeed[];
}): Promise<ProvisionStudentLoginsResult> {
  const { db, schoolId, students } = params;
  const userDb = schoolId ? createTenantDB(db, { schoolId }) : db;
  const counters = new Map<string, number>();
  const results: ProvisionedStudentLogin[] = [];
  const failed: FailedStudentLogin[] = [];

  const prepared: { seed: StudentLoginSeed; initialPassword: string | null; hash: string }[] = [];
  for (let i = 0; i < students.length; i += HASH_BATCH) {
    prepared.push(
      ...(await Promise.all(
        students.slice(i, i + HASH_BATCH).map(async (seed) => {
          const initialPassword = seed.password ? null : generateInitialPassword();
          return { seed, initialPassword, hash: await hashPassword(seed.password ?? initialPassword!) };
        }),
      )),
    );
  }

  for (const { seed, initialPassword, hash } of prepared) {
    const prefix = usernamePrefix(seed.classroomName);
    let username = "";
    try {
      for (let attempt = 0; attempt < MAX_USERNAME_TRIES; attempt++) {
        if (!counters.has(prefix) || attempt > 0) counters.set(prefix, await highestNumber(db, prefix));
        const next = counters.get(prefix)! + 1;
        counters.set(prefix, next);
        username = `${prefix}${next}`;
        try {
          await userDb.transaction(async (tx) => {
            await tx.update(users).set({ username, displayUsername: username }).where(eq(users.id, seed.userId));
            await upsertCredentialPassword(tx, seed.userId, hash);
          });
          break;
        } catch (error) {
          if (!isUniqueViolation(error) || attempt === MAX_USERNAME_TRIES - 1) throw error;
        }
      }
      results.push({ userId: seed.userId, username, initialPassword });
    } catch (error) {
      failed.push({ userId: seed.userId, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  if (schoolId) {
    for (const classroomId of new Set(students.flatMap((s) => (s.classroomId ? [s.classroomId] : [])))) {
      await ensureStudentCredentials(db, schoolId, classroomId);
    }
  }
  return { provisioned: results, failed };
}

/**
 * Sets a new random initial password for every student of a class and returns each plain
 * password once, for the class sheet (FR-6). The database keeps only argon2id hashes, so this
 * is the only way to print a sheet after the import. Each student's new password and the end
 * of the student's sessions are written in one transaction. A failure for one student does not
 * stop the others; that student keeps the old password and is returned in `failed`. One audit
 * entry records the count. Resets are limited per class.
 * @param params.db Database client.
 * @param params.store Shared rate-limit store.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.meta Client IP and user agent for the audit entry.
 * @param params.input The class.
 * @returns The class name, the sheet rows (name, username, new password) sorted by name, and
 * the students whose password did not change.
 * @throws {StudentLoginError} `forbidden`, `not_found`, or `rate_limited`.
 */
export async function resetClassPasswords(params: {
  db: DB;
  store: RateLimitStore;
  user: UserContext;
  meta: RequestMeta;
  input: ResetClassPasswordsInput;
}): Promise<ResetClassPasswordsOutput> {
  const { db, store, user, meta, input } = params;
  const { classroom, tenantDb } = await authorizeClassroom(db, user, input.classroomId);
  await guardClassPasswordReset(store, classroom.id);
  const rows = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via classroom id and users.schoolId")
    .select({ userId: users.id, name: users.name, username: users.username })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .where(
      and(
        eq(classroomStudents.classroomId, classroom.id),
        eq(users.schoolId, classroom.schoolId),
        eq(users.role, "STUDENT"),
      ),
    );

  const prepared: { userId: string; name: string; username: string; password: string; hash: string }[] = [];
  for (let i = 0; i < rows.length; i += HASH_BATCH) {
    prepared.push(
      ...(await Promise.all(
        rows.slice(i, i + HASH_BATCH).map(async (row) => {
          const password = generateInitialPassword();
          return { userId: row.userId, name: row.name?.trim() || row.username, username: row.username, password, hash: await hashPassword(password) };
        }),
      )),
    );
  }

  const students: ResetClassPasswordsOutput["students"] = [];
  const failed: ResetClassPasswordsOutput["failed"] = [];
  for (const row of prepared) {
    try {
      // The new password and the end of the old sessions are stored together or not at all.
      // `revokeAllUserSessions` takes the root client, so the delete runs on the transaction here.
      await tenantDb.transaction(async (tx) => {
        await upsertCredentialPassword(tx, row.userId, row.hash);
        await tx.delete(sessions).where(eq(sessions.userId, row.userId));
      });
      students.push({ userId: row.userId, name: row.name, username: row.username, password: row.password });
    } catch (error) {
      console.error("Class password reset failed for one student:", error instanceof Error ? error.message : "Unknown");
      failed.push({ userId: row.userId, name: row.name });
    }
  }
  if (prepared.length > 0) {
    await auditStudentLogin(
      { userId: user.id, role: user.role, ip: meta.ip, userAgent: meta.userAgent },
      "student_login:class_password_reset",
      { type: "classroom", id: classroom.id },
      { count: students.length, failed: failed.length },
    );
  }
  const byName = (a: { name: string; userId: string }, b: { name: string; userId: string }) =>
    a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId);
  return { classroomName: classroom.name, students: students.sort(byName), failed: failed.sort(byName) };
}
