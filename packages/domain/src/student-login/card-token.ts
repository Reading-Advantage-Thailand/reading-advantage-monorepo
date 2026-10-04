import { and, eq, isNull } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  classroomStudents,
  classrooms,
  primaryStudentCredentials,
  users,
} from "@reading-advantage/db/schema";
import type { RateLimitStore, UserContext } from "@reading-advantage/auth";
import { authorizeClassroom } from "./access.js";
import { auditStudentLogin } from "./audit.js";
import { generateCardToken, hashCardToken } from "./codes.js";
import type { IssueCardTokensInput, QrTokenSignInInput, RotateCardTokenInput } from "./contracts.js";
import type { RequestMeta } from "./class-session.js";
import { ensureStudentCredentials } from "./credentials.js";
import { StudentLoginError } from "./errors.js";
import { guardCardScan, recordCardMiss } from "./rate-limits.js";
import { startStudentSession, type StudentSignInResult } from "./session.js";

/** A raw card token shown once, for example on the QR print page. The database holds only its hash. */
export interface IssuedCardToken {
  credentialId: string;
  userId: string;
  name: string | null;
  token: string;
}

/**
 * Signs in a student with the token of a QR card (FR-5). One scan gives a `full` session.
 * The token must belong to a credential of a student who still is in a class of the credential's
 * school. An unknown, rotated, or out-of-class token gives one generic error. Failed scans are
 * limited per IP.
 * @param params.db Database client.
 * @param params.store Shared rate-limit store.
 * @param params.meta Client IP and user agent.
 * @param params.input The scanned token.
 * @param params.now Current time. Tests replace it.
 * @returns The user, a `full` auth strength, and the session token.
 * @throws {StudentLoginError} `rate_limited` or `invalid_credentials`.
 */
export async function signInWithCardToken(params: {
  db: DB;
  store: RateLimitStore;
  meta: RequestMeta;
  input: QrTokenSignInInput;
  now?: Date;
}): Promise<StudentSignInResult> {
  const { db, store, meta } = params;
  await guardCardScan(store, meta.ip);
  // The token is the only key here, so the lookup cannot be scoped by school up front.
  // The joins below tie the student and the class to the credential's own school instead.
  const [row] = await db
    .select({
      userId: primaryStudentCredentials.userId,
      credentialId: primaryStudentCredentials.id,
      schoolId: primaryStudentCredentials.schoolId,
    })
    .from(primaryStudentCredentials)
    .innerJoin(users, eq(users.id, primaryStudentCredentials.userId))
    .innerJoin(classroomStudents, eq(classroomStudents.studentId, users.id))
    .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
    .where(
      and(
        eq(primaryStudentCredentials.cardTokenHash, hashCardToken(params.input.token)),
        eq(users.role, "STUDENT"),
        eq(users.schoolId, primaryStudentCredentials.schoolId),
        eq(classrooms.schoolId, primaryStudentCredentials.schoolId),
        eq(classrooms.archived, false),
      ),
    )
    .limit(1);
  if (!row) {
    await recordCardMiss(store, meta.ip);
    throw new StudentLoginError("invalid_credentials", "Card not valid.");
  }
  return startStudentSession({
    db,
    userId: row.userId,
    meta,
    authStrength: "full",
    method: "qr",
    ...(params.now ? { now: params.now } : {}),
  });
}

/**
 * Gives one student a new card token. The new hash overwrites the old one, so the old card
 * stops working at once (FR-5). The raw token leaves the server only in the return value.
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.meta Client IP and user agent for the audit entry.
 * @param params.input The class and the student user id.
 * @returns The credential id and the new raw token, to print once.
 * @throws {StudentLoginError} `forbidden`, or `not_found` when the student is not in the class.
 */
export async function rotateCardToken(params: {
  db: DB;
  user: UserContext;
  meta: RequestMeta;
  input: RotateCardTokenInput;
}): Promise<{ credentialId: string; token: string }> {
  const { db, user, meta, input } = params;
  const { classroom, tenantDb } = await authorizeClassroom(db, user, input.classroomId);
  await ensureStudentCredentials(db, classroom.schoolId, classroom.id);
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
  const token = generateCardToken();
  const now = new Date();
  await tenantDb
    .update(primaryStudentCredentials)
    .set({ cardTokenHash: hashCardToken(token), rotatedAt: now, updatedAt: now })
    .where(eq(primaryStudentCredentials.id, target.credentialId));
  await auditStudentLogin(
    { userId: user.id, role: user.role, ip: meta.ip, userAgent: meta.userAgent },
    "student_login:card_rotate",
    { type: "student_credential", id: target.credentialId },
    { classroomId: classroom.id },
  );
  return { credentialId: target.credentialId, token };
}

/**
 * Gives a card token to each student of the class that has none (the print-the-class-set path).
 * Students with a token keep it. Missing credential rows are created first.
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.meta Client IP and user agent for the audit entry.
 * @param params.input The class.
 * @returns The new raw tokens, to print once.
 * @throws {StudentLoginError} `forbidden` or `not_found`.
 */
export async function issueClassCardTokens(params: {
  db: DB;
  user: UserContext;
  meta: RequestMeta;
  input: IssueCardTokensInput;
}): Promise<IssuedCardToken[]> {
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
        isNull(primaryStudentCredentials.cardTokenHash),
      ),
    );
  const issued: IssuedCardToken[] = [];
  for (const row of pending) {
    const token = generateCardToken();
    const now = new Date();
    await tenantDb
      .update(primaryStudentCredentials)
      .set({ cardTokenHash: hashCardToken(token), rotatedAt: now, updatedAt: now })
      .where(and(eq(primaryStudentCredentials.id, row.credentialId), isNull(primaryStudentCredentials.cardTokenHash)));
    issued.push({ credentialId: row.credentialId, userId: row.userId, name: row.name, token });
  }
  if (issued.length > 0) {
    await auditStudentLogin(
      { userId: user.id, role: user.role, ip: meta.ip, userAgent: meta.userAgent },
      "student_login:card_issue",
      { type: "classroom", id: classroom.id },
      { count: issued.length },
    );
  }
  return issued;
}
