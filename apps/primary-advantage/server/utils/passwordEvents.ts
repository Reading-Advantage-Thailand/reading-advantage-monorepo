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
 * Builds the audit context for a write by one actor.
 * @param actor The actor, or null for self-service.
 * @returns The audit context without request metadata.
 */
function auditContext(actor: PasswordActor | null): AuditContext {
  return {
    actorUserId: actor?.id ?? null,
    actorRole: (actor?.role ? String(actor.role).toUpperCase() : null) as AuditContext["actorRole"],
    ipAddress: null,
    userAgent: null,
  };
}

/**
 * Records the audit event for a committed password write and, for a change to an
 * existing account, revokes every session of that account unless the caller already
 * revoked them in the write transaction. The audit stays best-effort. A failed
 * revocation is logged and then thrown, so the caller cannot report success.
 * @param params The written account, the actor, whether the account is new, and whether
 * the sessions already ended inside the write transaction.
 * @throws When session revocation fails after the password write committed.
 */
export async function afterPasswordWrite(params: {
  userId: string;
  actor: PasswordActor | null;
  created: boolean;
  sessionsRevoked?: boolean;
}): Promise<void> {
  const { userId, actor, created, sessionsRevoked } = params;
  try {
    await recordAuditEvent(auditContext(actor), {
      action: created ? "user:created" : "auth:password_reset",
      targetType: "user",
      targetId: userId,
    });
  } catch (error) {
    console.error("Password write: audit event failed:", error instanceof Error ? error.message : "Unknown");
  }
  if (!created && !sessionsRevoked) {
    try {
      await revokeAllUserSessions(db, userId);
    } catch (error) {
      console.error("Password write: session revocation failed:", error instanceof Error ? error.message : "Unknown");
      throw new Error("Password changed but session revocation failed");
    }
  }
}

/**
 * Records the audit event for a committed account deletion. The audit is best-effort.
 * @param params The deleted account and the actor.
 */
export async function auditUserDeleted(params: {
  userId: string;
  actor: PasswordActor | null;
}): Promise<void> {
  try {
    await recordAuditEvent(auditContext(params.actor), {
      action: "user:deleted",
      targetType: "user",
      targetId: params.userId,
    });
  } catch (error) {
    console.error("Account delete: audit event failed:", error instanceof Error ? error.message : "Unknown");
  }
}
