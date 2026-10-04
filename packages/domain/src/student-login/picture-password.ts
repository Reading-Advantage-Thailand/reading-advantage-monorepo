import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  classroomStudents,
  classrooms,
  primaryStudentCredentials,
  users,
} from "@reading-advantage/db/schema";
import type { RateLimitStore, UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { authorizeClassroom } from "./access.js";
import { auditStudentLogin, type StudentLoginActor } from "./audit.js";
import { burnVerifyTime, generatePictureSequence, hashPictureSequence, verifyPictureSequence } from "./codes.js";
import {
  type AssignPicturePasswordsInput,
  type CodeOnlySignInInput,
  type PicturePasswordSettingInput,
  type PicturePasswordSignInInput,
  type ResetPicturePasswordInput,
} from "./contracts.js";
import { ensureStudentCredentials } from "./credentials.js";
import { resolveCode, type OpenClassSession, type RequestMeta } from "./class-session.js";
import { StudentLoginError } from "./errors.js";
import { startStudentSession, type StudentSignInResult } from "./session.js";

/** Wrong picture tries before the lock (FR-3). */
export const MAX_PICTURE_FAILURES = 5;

/** Length of the lock after too many wrong tries (FR-3). */
export const PICTURE_LOCKOUT_MS = 5 * 60 * 1000;

interface ClassStudentRow {
  credentialId: string;
  userId: string;
  pictureHash: string | null;
  failedCount: number;
  lockedUntil: Date | null;
}

function teacherActor(user: UserContext, meta: RequestMeta): StudentLoginActor {
  return { userId: user.id, role: user.role, ip: meta.ip, userAgent: meta.userAgent };
}

/**
 * Finds a student by credential handle, only when the student is in the class of the session
 * and in its school. A handle of another class reads as missing.
 */
async function findClassStudent(db: DB, session: OpenClassSession, handle: string): Promise<ClassStudentRow | undefined> {
  const tenantDb = createTenantDB(db, { schoolId: session.schoolId });
  const [row] = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via session classroom id and users.schoolId")
    .select({
      credentialId: primaryStudentCredentials.id,
      userId: primaryStudentCredentials.userId,
      pictureHash: primaryStudentCredentials.pictureHash,
      failedCount: primaryStudentCredentials.failedCount,
      lockedUntil: primaryStudentCredentials.lockedUntil,
    })
    .from(primaryStudentCredentials)
    .innerJoin(users, eq(users.id, primaryStudentCredentials.userId))
    .innerJoin(classroomStudents, eq(classroomStudents.studentId, users.id))
    .where(
      and(
        eq(primaryStudentCredentials.id, handle),
        eq(primaryStudentCredentials.schoolId, session.schoolId),
        eq(classroomStudents.classroomId, session.classroomId),
        eq(users.schoolId, session.schoolId),
        eq(users.role, "STUDENT"),
      ),
    )
    .limit(1);
  return row;
}

function lockedError(lockedUntil: Date, now: Date): StudentLoginError {
  return new StudentLoginError(
    "locked",
    "Locked. Ask your teacher or wait.",
    Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000)),
  );
}

/**
 * Signs in a student with the 3-picture password (FR-3). Each try is claimed atomically in the
 * credential row before the verify, so parallel guesses cannot pass a stale lock check. The 5th wrong try locks the student for 5 minutes and writes an audit entry.
 * The error for a wrong handle, a wrong class, no password, and wrong pictures is the same.
 * @param params.db Database client.
 * @param params.store Shared rate-limit store.
 * @param params.meta Client IP and user agent.
 * @param params.input Code, student handle, and the 3 pictures.
 * @param params.now Current time. Tests replace it.
 * @returns The user, a `full` auth strength, and the session token.
 * @throws {StudentLoginError} `rate_limited`, `invalid_code`, `invalid_credentials`, or `locked`.
 */
export async function signInWithPicture(params: {
  db: DB;
  store: RateLimitStore;
  meta: RequestMeta;
  input: PicturePasswordSignInInput;
  now?: Date;
}): Promise<StudentSignInResult> {
  const { db, meta, input } = params;
  const now = params.now ?? new Date();
  const session = await resolveCode({ db, store: params.store, ip: meta.ip, code: input.code, now });
  const row = await findClassStudent(db, session, input.studentId);
  if (!row || !row.pictureHash) {
    await burnVerifyTime();
    throw new StudentLoginError("invalid_credentials", "Wrong pictures.");
  }
  if (row.lockedUntil && row.lockedUntil > now) throw lockedError(row.lockedUntil, now);

  // Claim the try in one atomic statement BEFORE the verify. Parallel guesses cannot all pass a
  // stale lock read: only the rows claimed before the 5th try reach the verify.
  const tenantDb = createTenantDB(db, { schoolId: session.schoolId });
  const lockUntil = new Date(now.getTime() + PICTURE_LOCKOUT_MS).toISOString();
  const count = sql`${primaryStudentCredentials.failedCount} + 1`;
  const [claim] = await tenantDb
    .update(primaryStudentCredentials)
    .set({
      failedCount: sql`case when ${count} >= ${MAX_PICTURE_FAILURES} then 0 else ${count} end`,
      lockedUntil: sql`case when ${count} >= ${MAX_PICTURE_FAILURES} then ${lockUntil}::timestamp else null end`,
      updatedAt: now,
    })
    .where(
      and(
        eq(primaryStudentCredentials.id, row.credentialId),
        or(isNull(primaryStudentCredentials.lockedUntil), lte(primaryStudentCredentials.lockedUntil, now)),
      ),
    )
    .returning({ lockedUntil: primaryStudentCredentials.lockedUntil });
  if (!claim) {
    await burnVerifyTime();
    throw lockedError(new Date(now.getTime() + PICTURE_LOCKOUT_MS), now);
  }

  if (!(await verifyPictureSequence(input.pictures, row.pictureHash))) {
    const student: StudentLoginActor = { userId: row.userId, role: "STUDENT", ip: meta.ip, userAgent: meta.userAgent };
    if (claim.lockedUntil && claim.lockedUntil > now) {
      await auditStudentLogin(student, "student_login:lockout", { type: "student_credential", id: row.credentialId }, { classroomId: session.classroomId, lockedUntil: claim.lockedUntil.toISOString() });
      throw lockedError(claim.lockedUntil, now);
    }
    await auditStudentLogin(student, "auth:login_failed", { type: "user", id: row.userId }, { method: "picture", classroomId: session.classroomId });
    throw new StudentLoginError("invalid_credentials", "Wrong pictures.");
  }

  await tenantDb
    .update(primaryStudentCredentials)
    .set({ failedCount: 0, lockedUntil: null, updatedAt: now })
    .where(eq(primaryStudentCredentials.id, row.credentialId));
  return startStudentSession({ db, userId: row.userId, meta, authStrength: "full", method: "picture", classroomId: session.classroomId, now });
}

/**
 * Signs in a student with a code and a name only. It works only when the class turned the
 * picture password off (FR-7) and gives a `code_only` session.
 * @param params.db Database client.
 * @param params.store Shared rate-limit store.
 * @param params.meta Client IP and user agent.
 * @param params.input Code and student handle.
 * @param params.now Current time. Tests replace it.
 * @returns The user, a `code_only` auth strength, and the session token.
 * @throws {StudentLoginError} `rate_limited`, `invalid_code`, `forbidden` while the picture
 * password is on, or `invalid_credentials` for a handle outside the class.
 */
export async function signInWithCodeOnly(params: {
  db: DB;
  store: RateLimitStore;
  meta: RequestMeta;
  input: CodeOnlySignInInput;
  now?: Date;
}): Promise<StudentSignInResult> {
  const { db, meta, input } = params;
  const now = params.now ?? new Date();
  const session = await resolveCode({ db, store: params.store, ip: meta.ip, code: input.code, now });
  const [setting] = await createTenantDB(db, { schoolId: session.schoolId })
    .select({ picturePasswordEnabled: classrooms.picturePasswordEnabled })
    .from(classrooms)
    .where(eq(classrooms.id, session.classroomId))
    .limit(1);
  const row = await findClassStudent(db, session, input.studentId);
  if (!row) throw new StudentLoginError("invalid_credentials", "Not found.");
  if (setting?.picturePasswordEnabled !== false) {
    throw new StudentLoginError("forbidden", "This class needs a picture password.");
  }
  return startStudentSession({ db, userId: row.userId, meta, authStrength: "code_only", method: "code_only", classroomId: session.classroomId, now });
}

/** A picture sequence shown once to the teacher, for example on the class sheet. */
export interface AssignedPicturePassword {
  credentialId: string;
  userId: string;
  name: string | null;
  pictures: number[];
}

/**
 * Assigns a random picture sequence to each student of the class that has none (the import
 * and backfill path). Missing credential rows are created first. The sequences leave the
 * server only in the return value, because the database holds only argon2id hashes.
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.meta Client IP and user agent for the audit entry.
 * @param params.input The class.
 * @returns The new sequences, to print or show once.
 * @throws {StudentLoginError} `forbidden` or `not_found`.
 */
export async function assignPicturePasswords(params: {
  db: DB;
  user: UserContext;
  meta: RequestMeta;
  input: AssignPicturePasswordsInput;
}): Promise<AssignedPicturePassword[]> {
  const { db, user, meta, input } = params;
  const { classroom, tenantDb } = await authorizeClassroom(db, user, input.classroomId);
  await ensureStudentCredentials(db, classroom.schoolId, classroom.id);
  const pending = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via classroom id and users.schoolId")
    .select({ credentialId: primaryStudentCredentials.id, userId: users.id, name: users.name })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .innerJoin(primaryStudentCredentials, eq(primaryStudentCredentials.userId, users.id))
    .where(
      and(
        eq(classroomStudents.classroomId, classroom.id),
        eq(users.schoolId, classroom.schoolId),
        eq(users.role, "STUDENT"),
        isNull(primaryStudentCredentials.pictureHash),
      ),
    );
  const assigned: AssignedPicturePassword[] = [];
  for (const row of pending) {
    const pictures = generatePictureSequence();
    await tenantDb
      .update(primaryStudentCredentials)
      .set({ pictureHash: await hashPictureSequence(pictures), failedCount: 0, lockedUntil: null, updatedAt: new Date() })
      .where(and(eq(primaryStudentCredentials.id, row.credentialId), isNull(primaryStudentCredentials.pictureHash)));
    assigned.push({ credentialId: row.credentialId, userId: row.userId, name: row.name, pictures });
  }
  if (assigned.length > 0) {
    await auditStudentLogin(teacherActor(user, meta), "student_login:picture_assign", { type: "classroom", id: classroom.id }, { count: assigned.length });
  }
  return assigned;
}

/**
 * Resets the picture password of one student in one step: new random sequence, failure count
 * and lock cleared, audit entry written.
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.meta Client IP and user agent for the audit entry.
 * @param params.input The class and the student user id.
 * @returns The new sequence, shown once.
 * @throws {StudentLoginError} `forbidden`, or `not_found` when the student is not in the class.
 */
export async function resetPicturePassword(params: {
  db: DB;
  user: UserContext;
  meta: RequestMeta;
  input: ResetPicturePasswordInput;
}): Promise<{ credentialId: string; pictures: number[] }> {
  const { db, user, meta, input } = params;
  const { classroom, tenantDb } = await authorizeClassroom(db, user, input.classroomId);
  const [target] = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via classroom id and users.schoolId")
    .select({ credentialId: primaryStudentCredentials.id })
    .from(primaryStudentCredentials)
    .innerJoin(users, eq(users.id, primaryStudentCredentials.userId))
    .innerJoin(classroomStudents, eq(classroomStudents.studentId, users.id))
    .where(
      and(
        eq(users.id, input.studentUserId),
        eq(users.schoolId, classroom.schoolId),
        eq(primaryStudentCredentials.schoolId, classroom.schoolId),
        eq(classroomStudents.classroomId, classroom.id),
      ),
    )
    .limit(1);
  if (!target) throw new StudentLoginError("not_found", "Student not found.");
  const pictures = generatePictureSequence();
  await tenantDb
    .update(primaryStudentCredentials)
    .set({ pictureHash: await hashPictureSequence(pictures), failedCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(primaryStudentCredentials.id, target.credentialId));
  await auditStudentLogin(teacherActor(user, meta), "student_login:reset", { type: "student_credential", id: target.credentialId }, { classroomId: classroom.id });
  return { credentialId: target.credentialId, pictures };
}

/**
 * Turns the picture password of a class on or off (FR-7).
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.meta Client IP and user agent for the audit entry.
 * @param params.input The class and the new setting.
 * @returns Resolves when the setting is stored.
 * @throws {StudentLoginError} `forbidden` or `not_found`.
 */
export async function setPicturePasswordEnabled(params: {
  db: DB;
  user: UserContext;
  meta: RequestMeta;
  input: PicturePasswordSettingInput;
}): Promise<void> {
  const { db, user, meta, input } = params;
  const { classroom, tenantDb } = await authorizeClassroom(db, user, input.classroomId);
  await tenantDb
    .update(classrooms)
    .set({ picturePasswordEnabled: input.enabled, updatedAt: new Date() })
    .where(eq(classrooms.id, classroom.id));
  await auditStudentLogin(teacherActor(user, meta), "student_login:picture_setting", { type: "classroom", id: classroom.id }, { enabled: input.enabled });
}

/**
 * Lists the students of a class who are locked now (data for the teacher live view, FR-3/FR-4).
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.input The class.
 * @param params.now Current time. Tests replace it.
 * @returns Locked students with the end of the lock.
 * @throws {StudentLoginError} `forbidden` or `not_found`.
 */
export async function getClassLockouts(params: {
  db: DB;
  user: UserContext;
  input: { classroomId: string };
  now?: Date;
}): Promise<{ userId: string; name: string | null; lockedUntil: Date }[]> {
  const now = params.now ?? new Date();
  const { classroom, tenantDb } = await authorizeClassroom(params.db, params.user, params.input.classroomId);
  const rows = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via classroom id and users.schoolId")
    .select({ userId: users.id, name: users.name, lockedUntil: primaryStudentCredentials.lockedUntil, failedCount: primaryStudentCredentials.failedCount })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .innerJoin(primaryStudentCredentials, eq(primaryStudentCredentials.userId, users.id))
    .where(
      and(
        eq(classroomStudents.classroomId, classroom.id),
        eq(users.schoolId, classroom.schoolId),
        gt(primaryStudentCredentials.lockedUntil, now),
      ),
    );
  return rows.flatMap((r) => (r.lockedUntil ? [{ userId: r.userId, name: r.name, lockedUntil: r.lockedUntil }] : []));
}
