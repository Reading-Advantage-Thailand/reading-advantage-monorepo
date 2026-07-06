import { z } from "zod";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { articles } from "@reading-advantage/db/schema";
import { createTenantDB, type TenantDB } from "../db-contract.js";
import { db as rawDb } from "@reading-advantage/db";

/**
 * Zod contract for the system dashboard query params.
 * Both startDate and endDate are optional ISO date strings (YYYY-MM-DD).
 */
export const systemDashboardQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format")
    .optional(),
});

export type SystemDashboardQuery = z.infer<typeof systemDashboardQuerySchema>;

/**
 * Result shape returned by `getSystemDashboardData`.
 */
export interface SystemDashboardData {
  data: Record<string, number>;
  dataRange: { start_date: string | null; end_date: string | null };
}

/**
 * Loads article counts grouped by `raLevel` for the SYSTEM dashboard.
 *
 * The SYSTEM role is required. Returns zero counts for missing levels so the
 * dashboard never crashes when no articles exist for a given level.
 *
 * @param db - Optional pre-constructed TenantDB. If omitted, the function
 *   constructs one internally so SYSTEM-level aggregates can use `unscoped`.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Optional date range filter
 * @returns Aggregated level → count map plus the echoed date range
 */
export async function getSystemDashboardData({
  db,
  user,
  tenant,
  input,
}: {
  db?: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: SystemDashboardQuery;
}): Promise<SystemDashboardData> {
  // SYSTEM-only summary view; tenant is still required for FLAT scoping
  // even when reading aggregate-level metrics.
  assertCan(user, "system:dashboard:read", tenant);

  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  let startFilter: Date | undefined;
  let endFilter: Date | undefined;
  if (input.startDate) {
    const start = new Date(input.startDate);
    start.setDate(start.getDate() - 1);
    start.setHours(23, 59, 59, 999);
    startFilter = start;
  }
  if (input.endDate) {
    const end = new Date(input.endDate);
    end.setHours(23, 59, 59, 999);
    endFilter = end;
  }

  const articlesByLevel: Record<string, number> = {};

  // SYSTEM-level aggregates operate across tenants and must bypass the
  // automatic schoolId injection. We intentionally construct (or accept) a
  // TenantDB here only to drop tenant scoping via `unscoped("reason")`.
  const tenantDb =
    db ?? createTenantDB(rawDb, { schoolId: tenant.schoolId ?? null });
  const systemRawDb = tenantDb.unscoped(
    "system dashboard reads aggregated article counts across all tenants",
  );

  for (const level of levels) {
    try {
      const [row] = await systemRawDb
        .select({ count: sql<number>`count(*)::int` })
        .from(articles)
        .where(
          and(
            eq(articles.raLevel, level),
            startFilter ? gte(articles.createdAt, startFilter) : undefined,
            endFilter ? lte(articles.createdAt, endFilter) : undefined,
          ),
        );
      articlesByLevel[level] = row?.count ?? 0;
    } catch (error) {
      console.error(`[reading] Error fetching count for level ${level}`, error);
      articlesByLevel[level] = 0;
    }
  }

  return {
    data: articlesByLevel,
    dataRange: {
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    },
  };
}