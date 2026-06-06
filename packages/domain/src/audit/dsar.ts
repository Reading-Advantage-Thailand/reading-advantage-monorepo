import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { auditEvents, users, type DB } from "@reading-advantage/db";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Maximum number of rows returned in a single DSAR export.
 * If exceeded, the function returns { status: "tooLarge" }.
 */
export const DSAR_ROW_CEILING = 100_000;

/**
 * Page size for paginated reads during DSAR export.
 */
const DSAR_PAGE_SIZE = 1000;

/** Reference to the data subject: either userId or email. */
export type SubjectRef = { userId: string } | { email: string };

/** Profile data included in a DSAR bundle. */
export interface DsarProfile {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  schoolId: string | null;
  createdAt: Date;
}

/** The full DSAR export bundle. */
export interface DsarBundle {
  status: "ok" | "tooLarge";
  profile: DsarProfile | null;
  auditEvents: Array<{
    id: string;
    actorUserId: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }>;
  totalRows: number;
}

/**
 * Exports all data held about a specific data subject (GDPR Art. 15).
 * Gathers: the user profile, all audit_events where the subject is actor or target.
 * Tenant-scoped: an admin in school A cannot export a subject in school B.
 *
 * @param params.db - Database client
 * @param params.user - Authenticated user context (the requesting admin)
 * @param params.tenant - Tenant context (school)
 * @param params.subjectRef - The subject to export (userId or email)
 * @returns A DsarBundle with the subject's data, or { status: "tooLarge" }
 */
export async function exportSubjectData({
  db,
  user,
  tenant,
  subjectRef,
}: {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  subjectRef: SubjectRef;
}): Promise<DsarBundle> {
  assertCan(user, "dsar:export", tenant);

  // 1. Resolve the subject user
  const conditions: SQL[] = [];
  if ("userId" in subjectRef) {
    conditions.push(eq(users.id, subjectRef.userId));
  } else {
    conditions.push(eq(users.email, subjectRef.email));
  }

  // Tenant scoping: the subject must belong to the requesting admin's school
  if (tenant.schoolId) {
    conditions.push(eq(users.schoolId, tenant.schoolId));
  }

  const subjectRows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      schoolId: users.schoolId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .limit(1);

  const profile = subjectRows[0] ?? null;

  if (!profile) {
    return { status: "ok", profile: null, auditEvents: [], totalRows: 0 };
  }

  // 2. Fetch audit events where subject is actor or target (paginated)
  const allAuditEvents: DsarBundle["auditEvents"] = [];
  let cursor: string | undefined;
  let totalRows = 0;

  while (true) {
    const conditions: SQL[] = [];
    conditions.push(
      sql`(${auditEvents.actorUserId} = ${profile.id} OR ${auditEvents.targetId} = ${profile.id})`
    );
    if (cursor) {
      conditions.push(sql`${auditEvents.id} < ${cursor}`);
    }

    const rows = await db
      .select({
        id: auditEvents.id,
        actorUserId: auditEvents.actorUserId,
        action: auditEvents.action,
        targetType: auditEvents.targetType,
        targetId: auditEvents.targetId,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.id))
      .limit(DSAR_PAGE_SIZE + 1);

    const hasMore = rows.length > DSAR_PAGE_SIZE;

    for (const row of rows) {
      totalRows++;
      if (totalRows > DSAR_ROW_CEILING) {
        return { status: "tooLarge", profile, auditEvents: allAuditEvents, totalRows };
      }
      allAuditEvents.push({
        id: row.id,
        actorUserId: row.actorUserId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt,
      });
    }

    if (!hasMore) break;
    cursor = rows[rows.length - 1].id;
  }

  return { status: "ok", profile, auditEvents: allAuditEvents, totalRows };
}
