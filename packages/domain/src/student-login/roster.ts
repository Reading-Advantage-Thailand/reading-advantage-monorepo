import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  classroomStudents,
  primaryClassLoginSessions,
  primaryStudentCredentials,
  sessions,
  users,
} from "@reading-advantage/db/schema";
import type { UserContext } from "@reading-advantage/auth";
import { authorizeClassroom } from "./access.js";
import type { ClassLoginRosterInput, ClassLoginRosterOutput } from "./contracts.js";

/**
 * Reads the live sign-in roster of a class for the teacher view (FR-4): the open class
 * session, the picture-password setting, and for each student whether a picture password and
 * a card exist, whether the student is signed in now, and when the student was last seen.
 * A session counts as signed in while it is before its end time and, for an idle-tracked
 * session, inside its idle limit (the same rule as `validateSession`). Locked students come
 * from `getClassLockouts`.
 * @param params.db Database client.
 * @param params.user The teacher of the class, or an admin of its school.
 * @param params.input The class.
 * @param params.now Current time. Tests replace it.
 * @returns The roster, students sorted by name.
 * @throws {StudentLoginError} `forbidden` or `not_found`.
 */
export async function getClassLoginRoster(params: {
  db: DB;
  user: UserContext;
  input: ClassLoginRosterInput;
  now?: Date;
}): Promise<ClassLoginRosterOutput> {
  const now = params.now ?? new Date();
  const { classroom, tenantDb } = await authorizeClassroom(params.db, params.user, params.input.classroomId);
  const [open] = await tenantDb
    .select({ id: primaryClassLoginSessions.id, expiresAt: primaryClassLoginSessions.expiresAt })
    .from(primaryClassLoginSessions)
    .where(
      and(
        eq(primaryClassLoginSessions.classroomId, classroom.id),
        isNull(primaryClassLoginSessions.closedAt),
        gt(primaryClassLoginSessions.expiresAt, now),
      ),
    )
    .limit(1);
  const rows = await tenantDb
    .unscoped("classroomStudents has no schoolId, scoped via classroom id and users.schoolId")
    .select({
      userId: users.id,
      name: users.name,
      username: users.username,
      pictureHash: primaryStudentCredentials.pictureHash,
      cardTokenHash: primaryStudentCredentials.cardTokenHash,
    })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .leftJoin(
      primaryStudentCredentials,
      and(eq(primaryStudentCredentials.userId, users.id), eq(primaryStudentCredentials.schoolId, classroom.schoolId)),
    )
    .where(
      and(
        eq(classroomStudents.classroomId, classroom.id),
        eq(users.schoolId, classroom.schoolId),
        eq(users.role, "STUDENT"),
      ),
    );

  const live = new Map<string, { signedIn: boolean; lastSeenAt: Date | null }>();
  if (rows.length > 0) {
    const studentSessions = await tenantDb
      .select({
        userId: sessions.userId,
        createdAt: sessions.createdAt,
        lastSeenAt: sessions.lastSeenAt,
        idleTimeoutSeconds: sessions.idleTimeoutSeconds,
      })
      .from(sessions)
      .where(and(inArray(sessions.userId, rows.map((row) => row.userId)), gt(sessions.expiresAt, now)));
    for (const s of studentSessions) {
      const seen = s.lastSeenAt ?? s.createdAt;
      const active = s.idleTimeoutSeconds == null || now.getTime() - seen.getTime() <= s.idleTimeoutSeconds * 1000;
      const prev = live.get(s.userId);
      live.set(s.userId, {
        signedIn: (prev?.signedIn ?? false) || active,
        lastSeenAt: prev?.lastSeenAt && prev.lastSeenAt > seen ? prev.lastSeenAt : seen,
      });
    }
  }

  const students = rows
    .map((row) => ({
      userId: row.userId,
      name: row.name?.trim() || row.username,
      username: row.username,
      hasPicturePassword: row.pictureHash != null,
      hasCardToken: row.cardTokenHash != null,
      signedIn: live.get(row.userId)?.signedIn ?? false,
      lastSeenAt: live.get(row.userId)?.lastSeenAt ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId));
  return {
    classroomName: classroom.name,
    picturePasswordEnabled: classroom.picturePasswordEnabled,
    openSession: open ? { id: open.id, expiresAt: open.expiresAt } : null,
    students,
  };
}
