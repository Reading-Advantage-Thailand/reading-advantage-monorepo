import { createSession, studentSessionOptions } from "@reading-advantage/auth";
import type { DB } from "../index.js";
import { auditStudentLogin } from "./audit.js";
import type { AuthStrength, StudentSignInOutput } from "./contracts.js";
import type { RequestMeta } from "./class-session.js";

/** Result of a student sign-in: the contract output plus the raw session token for the cookie. */
export type StudentSignInResult = StudentSignInOutput & { token: string; expiresAt: Date };

/**
 * Creates the session of a student sign-in with the student session policy (FR-9: end of the
 * school day, 30 minutes idle, one device) and writes the `auth:login` audit entry.
 * Every student sign-in path that does not use the shared login calls this function.
 * @param params.db Database client.
 * @param params.userId The student user id.
 * @param params.meta Client IP and user agent.
 * @param params.authStrength Strength of the proof: `full` or `code_only`.
 * @param params.method The sign-in method, for the audit entry.
 * @param params.classroomId The class of the sign-in, for the audit entry. Empty for a QR card.
 * @param params.now Current time. Tests replace it.
 * @returns The user, the auth strength, the raw token, and the expiry.
 */
export async function startStudentSession(params: {
  db: DB;
  userId: string;
  meta: RequestMeta;
  authStrength: AuthStrength;
  method: "picture" | "code_only" | "qr";
  classroomId?: string;
  now?: Date;
}): Promise<StudentSignInResult> {
  const { db, userId, meta, authStrength, method, classroomId } = params;
  const created = await createSession(db, userId, {
    ...(meta.ip ? { ipAddress: meta.ip } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    authStrength,
    ...studentSessionOptions(params.now),
  });
  await auditStudentLogin(
    { userId, role: "STUDENT", ip: meta.ip, userAgent: meta.userAgent },
    "auth:login",
    { type: "user", id: userId },
    { method, ...(classroomId ? { classroomId } : {}), authStrength },
  );
  return { user: { id: userId, role: "STUDENT" }, authStrength, token: created.token, expiresAt: created.expiresAt };
}
