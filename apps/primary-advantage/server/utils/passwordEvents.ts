import { db } from "@reading-advantage/db";
import {
  recordAuditEvent,
  revokeAllUserSessions,
  type AuditContext,
} from "@reading-advantage/auth";

/** Who performed a password write; null for self-service sign-up. */
export interface PasswordActor {
  id: string;
  role: string | null | undefined;
}

/**
 * Records the audit event for a committed password write and, for a change to an
 * existing account, revokes every session of that account. Failures are logged
 * and never undo the committed write.
 * @param params The written account, the actor, and whether the account is new.
 */
export async function afterPasswordWrite(params: {
  userId: string;
  actor: PasswordActor | null;
  created: boolean;
}): Promise<void> {
  const { userId, actor, created } = params;
  if (!created) {
    try {
      await revokeAllUserSessions(db, userId);
    } catch (error) {
      console.error("Password write: session revocation failed:", error instanceof Error ? error.message : "Unknown");
    }
  }
  const context: AuditContext = {
    actorUserId: actor?.id ?? null,
    actorRole: (actor?.role ? String(actor.role).toUpperCase() : null) as AuditContext["actorRole"],
    ipAddress: null,
    userAgent: null,
  };
  try {
    await recordAuditEvent(context, {
      action: created ? "user:created" : "auth:password_reset",
      targetType: "user",
      targetId: userId,
    });
  } catch (error) {
    console.error("Password write: audit event failed:", error instanceof Error ? error.message : "Unknown");
  }
}
