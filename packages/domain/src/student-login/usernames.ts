import { randomInt } from "node:crypto";
import { eq, like } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { accounts, users } from "@reading-advantage/db/schema";
import { hashPassword } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { ensureStudentCredentials } from "./credentials.js";

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
 * @param params.db Database client.
 * @param params.schoolId The school of the students, or null for a SYSTEM student without a school.
 * @param params.students The students to provision. They must exist already.
 * @returns The username and the plain initial password of each student, in input order.
 * @throws {Error} When no free username is found after several tries.
 */
export async function provisionStudentLogins(params: {
  db: DB;
  schoolId: string | null;
  students: StudentLoginSeed[];
}): Promise<ProvisionedStudentLogin[]> {
  const { db, schoolId, students } = params;
  const userDb = schoolId ? createTenantDB(db, { schoolId }) : db;
  const counters = new Map<string, number>();
  const results: ProvisionedStudentLogin[] = [];

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
    for (let attempt = 0; attempt < MAX_USERNAME_TRIES; attempt++) {
      if (!counters.has(prefix) || attempt > 0) counters.set(prefix, await highestNumber(db, prefix));
      const next = counters.get(prefix)! + 1;
      counters.set(prefix, next);
      username = `${prefix}${next}`;
      try {
        await userDb.update(users).set({ username, displayUsername: username }).where(eq(users.id, seed.userId));
        break;
      } catch (error) {
        if (!isUniqueViolation(error) || attempt === MAX_USERNAME_TRIES - 1) throw error;
      }
    }
    await userDb
      .insert(accounts)
      .values({ id: `${seed.userId}_credential`, userId: seed.userId, providerId: "credential", password: hash })
      .onConflictDoUpdate({ target: [accounts.userId, accounts.providerId], set: { password: hash, updatedAt: new Date() } });
    results.push({ userId: seed.userId, username, initialPassword });
  }

  if (schoolId) {
    for (const classroomId of new Set(students.flatMap((s) => (s.classroomId ? [s.classroomId] : [])))) {
      await ensureStudentCredentials(db, schoolId, classroomId);
    }
  }
  return results;
}
