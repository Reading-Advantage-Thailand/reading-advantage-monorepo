import { recordAuditEvent, type Role } from "@reading-advantage/auth";

/** Audit actions written by student login (FR-10). */
export type StudentLoginAuditAction =
  | "student_login:class_start"
  | "student_login:class_end"
  | "student_login:lockout"
  | "student_login:reset"
  | "student_login:picture_assign"
  | "student_login:picture_setting"
  | "student_login:card_rotate"
  | "student_login:card_issue"
  | "student_login:class_password_reset"
  | "auth:login"
  | "auth:login_failed";

/** Who acted and from where. */
export interface StudentLoginActor {
  userId: string | null;
  role: Role | null;
  ip: string | null;
  userAgent: string | null;
}

/**
 * Writes one audit event. A failed write is logged and does not stop the sign-in or teacher action.
 * @param actor Who acted and from where.
 * @param action The audit action.
 * @param target The target type and id, for example the class or the credential.
 * @param metadata Extra fields without secrets or personal data.
 * @returns Resolves when the write ends.
 */
export async function auditStudentLogin(
  actor: StudentLoginActor,
  action: StudentLoginAuditAction,
  target: { type: string; id: string },
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await recordAuditEvent(
      { actorUserId: actor.userId, actorRole: actor.role, ipAddress: actor.ip, userAgent: actor.userAgent },
      { action, targetType: target.type, targetId: target.id, ...(metadata ? { metadata } : {}) },
    );
  } catch (error) {
    console.error(`Audit event ${action} failed:`, error instanceof Error ? error.message : "Unknown");
  }
}
