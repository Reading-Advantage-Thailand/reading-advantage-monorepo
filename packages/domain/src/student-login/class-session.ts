import { and, eq, gt, isNull, lte } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  classroomStudents,
  classrooms,
  primaryClassLoginSessions,
  primaryStudentCredentials,
  users,
} from "@reading-advantage/db/schema";
import type { RateLimitStore, UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { authorizeClassroom } from "./access.js";
import { auditStudentLogin, type StudentLoginActor } from "./audit.js";
import { generateClassCode, hashClassCode } from "./codes.js";
import {
  nameListOutput,
  type ClassSessionEndInput,
  type ClassSessionStartInput,
  type ClassSessionStartOutput,
  type CodeEntryInput,
  type NameListOutput,
} from "./contracts.js";
import { ensureStudentCredentials } from "./credentials.js";
import { StudentLoginError } from "./errors.js";
import { guardClassAttempt, guardCodeEntry, recordCodeMiss } from "./rate-limits.js";

/** Lifetime of a class code (spec: after 3 hours). */
export const CLASS_SESSION_LIFETIME_MS = 3 * 60 * 60 * 1000;

const MAX_CODE_ATTEMPTS = 10;

/** Request context of the caller: client IP and user agent. */
export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/** An open, unexpired class login session. */
export interface OpenClassSession {
  id: string;
  schoolId: string;
  classroomId: string;
}

/** Fixed avatar names. The client maps each name to a picture. */
export const STUDENT_AVATARS = [
  "red-circle", "blue-square", "green-triangle", "yellow-star", "purple-diamond", "orange-heart",
  "pink-moon", "teal-cloud", "brown-bear", "gray-fish", "lime-leaf", "navy-bird",
] as const;

function auditActor(user: UserContext, meta: RequestMeta): StudentLoginActor {
  return { userId: user.id, role: user.role, ip: meta.ip, userAgent: meta.userAgent };
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Starts a class login session: makes a fresh code, stores only its hash, and closes an
 * earlier open session of the class (a restart replaces the old code). Students of the class
 * that have no credential row get one. The code is unique among all open sessions of all schools.
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.actor Client IP and user agent for the audit entry.
 * @param params.input The class to start.
 * @param params.now Current time. Tests replace it.
 * @param params.pick Random integer source for the code. Tests replace it.
 * @returns The session id, the code (shown once), and the expiry time.
 * @throws {StudentLoginError} `forbidden`, `not_found`, or `unavailable` when no free code is found.
 */
export async function startClassSession(params: {
  db: DB;
  user: UserContext;
  actor: RequestMeta;
  input: ClassSessionStartInput;
  now?: Date;
  pick?: (max: number) => number;
}): Promise<ClassSessionStartOutput> {
  const { db, user, actor, input } = params;
  const now = params.now ?? new Date();
  const { classroom, tenantDb } = await authorizeClassroom(db, user, input.classroomId);
  await ensureStudentCredentials(db, classroom.schoolId, classroom.id);

  const closed = await tenantDb
    .update(primaryClassLoginSessions)
    .set({ closedAt: now })
    .where(and(eq(primaryClassLoginSessions.classroomId, classroom.id), isNull(primaryClassLoginSessions.closedAt)))
    .returning({ id: primaryClassLoginSessions.id, expiresAt: primaryClassLoginSessions.expiresAt });
  for (const old of closed) {
    if (old.expiresAt > now) {
      await auditStudentLogin(auditActor(user, actor), "student_login:class_end", { type: "classroom", id: classroom.id }, { sessionId: old.id, reason: "replaced" });
    }
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateClassCode(params.pick);
    const codeHash = hashClassCode(code);
    // Code lookup spans all schools, so the collision check does too.
    const [taken] = await db
      .select({ id: primaryClassLoginSessions.id })
      .from(primaryClassLoginSessions)
      .where(
        and(
          eq(primaryClassLoginSessions.codeHash, codeHash),
          isNull(primaryClassLoginSessions.closedAt),
          gt(primaryClassLoginSessions.expiresAt, now),
        ),
      )
      .limit(1);
    if (taken) continue;
    // An expired session that was never closed still holds the unique index slot.
    await db
      .update(primaryClassLoginSessions)
      .set({ closedAt: now })
      .where(
        and(
          eq(primaryClassLoginSessions.codeHash, codeHash),
          isNull(primaryClassLoginSessions.closedAt),
          lte(primaryClassLoginSessions.expiresAt, now),
        ),
      );
    const expiresAt = new Date(now.getTime() + CLASS_SESSION_LIFETIME_MS);
    let row: { id: string } | undefined;
    try {
      [row] = await tenantDb
        .insert(primaryClassLoginSessions)
        .values({ schoolId: classroom.schoolId, classroomId: classroom.id, teacherId: user.id, codeHash, startsAt: now, expiresAt })
        .returning({ id: primaryClassLoginSessions.id });
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
    if (!row) continue;
    await auditStudentLogin(auditActor(user, actor), "student_login:class_start", { type: "classroom", id: classroom.id }, { sessionId: row.id, expiresAt: expiresAt.toISOString() });
    return { sessionId: row.id, code, expiresAt };
  }
  throw new StudentLoginError("unavailable", "No free class code. Try again.");
}

/**
 * Ends the open class login session of a class. The call is idempotent.
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.actor Client IP and user agent for the audit entry.
 * @param params.input The class to end.
 * @param params.now Current time. Tests replace it.
 * @returns The number of sessions closed (0 or 1).
 * @throws {StudentLoginError} `forbidden` or `not_found`.
 */
export async function endClassSession(params: {
  db: DB;
  user: UserContext;
  actor: RequestMeta;
  input: ClassSessionEndInput;
  now?: Date;
}): Promise<{ closed: number }> {
  const { db, user, actor, input } = params;
  const now = params.now ?? new Date();
  const { classroom, tenantDb } = await authorizeClassroom(db, user, input.classroomId);
  const closed = await tenantDb
    .update(primaryClassLoginSessions)
    .set({ closedAt: now })
    .where(and(eq(primaryClassLoginSessions.classroomId, classroom.id), isNull(primaryClassLoginSessions.closedAt)))
    .returning({ id: primaryClassLoginSessions.id });
  if (closed.length > 0) {
    await auditStudentLogin(auditActor(user, actor), "student_login:class_end", { type: "classroom", id: classroom.id }, { sessionId: closed[0]!.id, reason: "ended" });
  }
  return { closed: closed.length };
}

/**
 * Finds the open, unexpired session for a class code. The lookup spans all schools by
 * design: a student has no school context before the code resolves.
 * @param db Database client.
 * @param code A validated class code.
 * @param now Current time.
 * @returns The session, or undefined when the code is unknown, closed, or expired.
 */
export async function findOpenSession(db: DB, code: string, now: Date): Promise<OpenClassSession | undefined> {
  const [row] = await db
    .select({
      id: primaryClassLoginSessions.id,
      schoolId: primaryClassLoginSessions.schoolId,
      classroomId: primaryClassLoginSessions.classroomId,
    })
    .from(primaryClassLoginSessions)
    .where(
      and(
        eq(primaryClassLoginSessions.codeHash, hashClassCode(code)),
        isNull(primaryClassLoginSessions.closedAt),
        gt(primaryClassLoginSessions.expiresAt, now),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Resolves a code to its open session with rate limits: per IP, global failed lookups, and per class.
 * @param params.db Database client.
 * @param params.store Shared rate-limit store.
 * @param params.ip Client IP, or null when unknown.
 * @param params.code A validated class code.
 * @param params.now Current time.
 * @returns The open session.
 * @throws {StudentLoginError} `rate_limited` or `invalid_code`.
 */
export async function resolveCode(params: {
  db: DB;
  store: RateLimitStore;
  ip: string | null;
  code: string;
  now: Date;
}): Promise<OpenClassSession> {
  await guardCodeEntry(params.store, params.ip);
  const session = await findOpenSession(params.db, params.code, params.now);
  if (!session) {
    await recordCodeMiss(params.store);
    throw new StudentLoginError("invalid_code", "Invalid code.");
  }
  await guardClassAttempt(params.store, session.classroomId);
  return session;
}

/**
 * Returns the name list of a class for a valid code (FR-2). A row has a first name and an
 * avatar. Its `studentId` is the id of the credential row: an opaque handle that is not a user id.
 * @param params.db Database client.
 * @param params.store Shared rate-limit store.
 * @param params.ip Client IP, or null when unknown.
 * @param params.input The code.
 * @param params.now Current time. Tests replace it.
 * @returns The name list in a fixed order (first name, then handle).
 * @throws {StudentLoginError} `rate_limited` or `invalid_code`.
 */
export async function getNameListForCode(params: {
  db: DB;
  store: RateLimitStore;
  ip: string | null;
  input: CodeEntryInput;
  now?: Date;
}): Promise<NameListOutput> {
  const now = params.now ?? new Date();
  const session = await resolveCode({ db: params.db, store: params.store, ip: params.ip, code: params.input.code, now });
  const tenantDb = createTenantDB(params.db, { schoolId: session.schoolId });
  const [setting] = await tenantDb
    .select({ picturePasswordEnabled: classrooms.picturePasswordEnabled })
    .from(classrooms)
    .where(eq(classrooms.id, session.classroomId))
    .limit(1);
  const rows = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via session classroom id and users.schoolId")
    .select({ handle: primaryStudentCredentials.id, name: users.name })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .innerJoin(primaryStudentCredentials, eq(primaryStudentCredentials.userId, users.id))
    .where(
      and(
        eq(classroomStudents.classroomId, session.classroomId),
        eq(users.schoolId, session.schoolId),
        eq(users.role, "STUDENT"),
        eq(primaryStudentCredentials.schoolId, session.schoolId),
      ),
    );
  const students = rows
    .map((row) => ({
      studentId: row.handle,
      displayName: (row.name?.trim().split(/\s+/)[0] || "Student").slice(0, 40),
      avatar: STUDENT_AVATARS[avatarIndex(row.handle)]!,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.studentId.localeCompare(b.studentId));
  return nameListOutput.parse({ picturePasswordRequired: setting?.picturePasswordEnabled ?? true, students });
}

function avatarIndex(handle: string): number {
  let sum = 0;
  for (const ch of handle) sum = (sum * 31 + ch.charCodeAt(0)) >>> 0;
  return sum % STUDENT_AVATARS.length;
}
