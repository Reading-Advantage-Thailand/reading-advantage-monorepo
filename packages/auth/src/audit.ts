import { db } from "@reading-advantage/db";
import { auditEvents } from "@reading-advantage/db/schema";
import type { Role } from "./roles.js";

/** Context about the actor performing the auditable action. */
export interface AuditContext {
  actorUserId: string | null;
  actorRole: Role | null;
  ipAddress: string | null;
  userAgent: string | null;
}

/** Payload describing the auditable action. */
export interface AuditPayload {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Known PII field names that must be stripped from audit metadata.
 * @see packages/auth/src/audit.ts — safeMetadata helper
 */
const PII_KEYS = new Set([
  "password",
  "passwd",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "email",
  "phone",
  "ssn",
  "creditCard",
  "credit_card",
  "cvv",
]);

/**
 * Strips known PII fields from a metadata object before writing to the
 * append-only audit log. Unknown keys pass through; known PII keys are
 * replaced with "[REDACTED]".
 * @param obj - The metadata object to sanitize
 * @returns A new object with PII fields redacted
 */
export function safeMetadata(
  obj: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!obj) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEYS.has(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Writes an audit event row to the append-only audit_events table.
 * Failures are thrown so callers can decide how to handle them
 * (e.g., log-and-continue in route handlers).
 *
 * @param ctx - Actor context (userId, role, IP, user-agent)
 * @param payload - The action being audited (action, targetType, targetId, metadata)
 * @throws {AuditEventError} When the action field is empty or the DB insert fails
 */
export async function recordAuditEvent(
  ctx: AuditContext,
  payload: AuditPayload
): Promise<void> {
  if (!payload.action || payload.action.trim().length === 0) {
    throw new AuditEventError("audit action is required");
  }

  try {
    await db.insert(auditEvents).values({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole ?? null,
      action: payload.action,
      targetType: payload.targetType ?? null,
      targetId: payload.targetId ?? null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: safeMetadata(payload.metadata),
    });
  } catch (error) {
    throw new AuditEventError(
      `Failed to record audit event: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error }
    );
  }
}

/**
 * Error thrown when an audit event cannot be recorded.
 */
export class AuditEventError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuditEventError";
  }
}
