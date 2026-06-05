import { eq, and, gte, lte, desc, type SQL } from "drizzle-orm";
import { auditEvents, type DB } from "@reading-advantage/db";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

/**
 * Query audit events with optional filters. ADMIN-only.
 * @param db - Database client (audit_events is global, not tenant-scoped)
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context (used for authorization only)
 * @param input - Optional filters (actorUserId, action, from, to, limit, cursor)
 * @returns Paginated audit events with nextCursor
 */
export async function queryAuditEvents({
  db,
  user,
  tenant,
  input,
}: {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: {
    actorUserId?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  };
}) {
  assertCan(user, "audit:read:all", tenant);

  const limit = Math.min(input.limit ?? 50, 100);

  const conditions: SQL[] = [];
  if (input.actorUserId) {
    conditions.push(eq(auditEvents.actorUserId, input.actorUserId));
  }
  if (input.action) {
    conditions.push(eq(auditEvents.action, input.action));
  }
  if (input.from) {
    conditions.push(gte(auditEvents.createdAt, new Date(input.from)));
  }
  if (input.to) {
    conditions.push(lte(auditEvents.createdAt, new Date(input.to)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(auditEvents)
    .where(whereClause)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const events = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? events[events.length - 1].id : undefined;

  return { events, nextCursor };
}
