import { z } from "zod";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { and, eq, gte, inArray, sql, desc } from "drizzle-orm";
import {
  articles,
  classroomStudents,
  classroomTeachers,
  classrooms,
  licenseOnUsers,
  licenses,
  schools,
  userActivity,
  users,
} from "@reading-advantage/db/schema";
import type { TenantDB } from "../db-contract.js";

/**
 * Zod contract for the license-scope query.
 */
export const schoolSegmentsQuerySchema = z.object({
  licenseId: z.string().min(1).optional(),
});

export type SchoolSegmentsQuery = z.infer<typeof schoolSegmentsQuerySchema>;

/**
 * Resolved license scope context: which licenseId was authorized for the read
 * and whether an audit event was emitted.
 */
export interface LicenseScopeResult {
  licenseId: string | null;
  auditedLicenseId: string | null;
}

/**
 * Result shape returned by `getSchoolSegmentsData`.
 */
export interface SchoolSegmentsData {
  segments: Array<{
    schoolId: string;
    schoolName: string;
    studentCount: number;
    teacherCount: number;
    activeRate: number;
    averageLevel: number;
    totalXp: number;
    licensesUsed: number;
    licensesTotal: number;
  }>;
  summary: {
    totalSchools: number;
    averageActiveRate: number;
    totalLicensesUsed: number;
  };
}

const ALLOW_ACCESS_KEY_ENV = "SYSTEM_CROSS_LICENSE_ACCESS_KEY";

/**
 * Determines whether a SYSTEM caller may read data for a license other than
 * their own. Cross-license SYSTEM reads require:
 *   1. an explicit access-key header, OR
 *   2. an audit event recorded for the override.
 *
 * Returns the resolved license scope or an object describing the denial.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param requestedLicenseId - Optional licenseId the caller asked for
 * @param accessKeyProvided - Whether the request supplied a valid SYSTEM access key
 * @returns A scope descriptor that downstream consumers must consult
 */
export async function resolveLicenseScope({
  user,
  tenant,
  requestedLicenseId,
  accessKeyProvided,
  recordAuditEvent,
}: {
  user: UserContext;
  tenant: Tenant;
  requestedLicenseId: string | null;
  accessKeyProvided: boolean;
  recordAuditEvent: (input: {
    actorUserId: string;
    actorRole: string;
    licenseId: string;
  }) => Promise<void>;
}): Promise<
  | { ok: true; licenseId: string | null; audited: boolean }
  | { ok: false; reason: "FORBIDDEN_CROSS_LICENSE" }
> {
  const ownLicenseId = user.license_id ?? null;

  // SYSTEM can read global aggregates without a license scope.
  if (user.role === "SYSTEM" && !requestedLicenseId) {
    return { ok: true, licenseId: null, audited: false };
  }

  // Non-SYSTEM callers are always scoped to their own license.
  if (user.role !== "SYSTEM") {
    assertCan(user, "admin:license:read:own", tenant);
    if (requestedLicenseId && requestedLicenseId !== ownLicenseId) {
      return { ok: false, reason: "FORBIDDEN_CROSS_LICENSE" };
    }
    return { ok: true, licenseId: ownLicenseId, audited: false };
  }

  // SYSTEM + override requested.
  if (requestedLicenseId && requestedLicenseId !== ownLicenseId) {
    if (accessKeyProvided) {
      return { ok: true, licenseId: requestedLicenseId, audited: false };
    }
    await recordAuditEvent({
      actorUserId: user.id,
      actorRole: user.role,
      licenseId: requestedLicenseId,
    });
    return { ok: true, licenseId: requestedLicenseId, audited: true };
  }

  return { ok: true, licenseId: ownLicenseId, audited: false };
}

/**
 * Computes school-level aggregate segments for the admin dashboard.
 *
 * SECURITY: When `resolvedLicenseId` is provided, all reads are constrained
 * to that license (a SYSTEM cross-license override MUST be audited by the
 * caller before this function is invoked).
 *
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Scope resolution + raw query params
 * @returns Aggregated school segments + summary
 */
export async function getSchoolSegmentsData({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { resolvedLicenseId: string | null };
}): Promise<SchoolSegmentsData> {
  assertCan(user, "admin:license:read", tenant);

  const targetLicenseId = input.resolvedLicenseId;

  // SYSTEM-level aggregates operate across tenants and must bypass the
  // automatic schoolId injection. ADMIN callers stay scoped via the tenant
  // they passed in.
  const isSystemScope = user.role === "SYSTEM";
  const rawDb = isSystemScope
    ? db.unscoped(
        "SYSTEM-level school-segments aggregation reads across tenants",
      )
    : db;

  let targetSchoolId: string | null = null;

  if (targetLicenseId) {
    const [lr] = await rawDb
      .select({ schoolId: licenses.schoolId })
      .from(licenses)
      .where(eq(licenses.id, targetLicenseId))
      .limit(1);

    if (lr?.schoolId) {
      targetSchoolId = lr.schoolId;
    }
  }

  const schoolRows = targetSchoolId
    ? await rawDb
        .select({ id: schools.id, name: schools.name })
        .from(schools)
        .where(eq(schools.id, targetSchoolId))
    : await rawDb.select({ id: schools.id, name: schools.name }).from(schools);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const schoolIds = schoolRows.map((s) => s.id);

  if (schoolIds.length === 0) {
    return {
      segments: [],
      summary: { totalSchools: 0, averageActiveRate: 0, totalLicensesUsed: 0 },
    };
  }

  const schoolUserRows = await rawDb
    .select({
      id: users.id,
      role: users.role,
      level: users.level,
      xp: users.xp,
      schoolId: users.schoolId,
    })
    .from(users)
    .where(inArray(users.schoolId, schoolIds));

  const allUserIds = schoolUserRows.map((u) => u.id);

  const recentActivityRows =
    allUserIds.length > 0
      ? await rawDb
          .selectDistinct({ userId: userActivity.userId })
          .from(userActivity)
          .where(
            and(
              inArray(userActivity.userId, allUserIds),
              gte(userActivity.createdAt, thirtyDaysAgo),
            ),
          )
      : [];
  const activeUserSet = new Set(recentActivityRows.map((r) => r.userId));

  const schoolLicenses = await rawDb
    .select({
      id: licenses.id,
      schoolId: licenses.schoolId,
      maxUsers: licenses.maxUsers,
    })
    .from(licenses)
    .where(inArray(licenses.schoolId, schoolIds));

  const licenseIds = schoolLicenses.map((l) => l.id);
  const licenseUserCountRows =
    licenseIds.length > 0
      ? await rawDb
          .select({
            licenseId: licenseOnUsers.licenseId,
            count: sql<number>`count(*)::int`,
          })
          .from(licenseOnUsers)
          .where(inArray(licenseOnUsers.licenseId, licenseIds))
          .groupBy(licenseOnUsers.licenseId)
      : [];
  const licenseUserCountMap = new Map(
    licenseUserCountRows.map((r) => [r.licenseId, r.count]),
  );

  const schoolUsersMap = new Map<string, typeof schoolUserRows>();
  schoolUserRows.forEach((u) => {
    if (!u.schoolId) return;
    if (!schoolUsersMap.has(u.schoolId)) schoolUsersMap.set(u.schoolId, []);
    schoolUsersMap.get(u.schoolId)!.push(u);
  });

  const schoolLicensesMap = new Map<string, typeof schoolLicenses>();
  schoolLicenses.forEach((l) => {
    if (!l.schoolId) return;
    if (!schoolLicensesMap.has(l.schoolId))
      schoolLicensesMap.set(l.schoolId, []);
    schoolLicensesMap.get(l.schoolId)!.push(l);
  });

  const segments = schoolRows.map((school) => {
    const schoolUserList = schoolUsersMap.get(school.id) || [];
    const students = schoolUserList.filter((u) => u.role === "STUDENT");
    const teachers = schoolUserList.filter(
      (u) => u.role === "TEACHER" || u.role === "ADMIN",
    );

    const activeUsers = schoolUserList.filter((u) =>
      activeUserSet.has(u.id),
    ).length;
    const totalUsers = schoolUserList.length;
    const activeRate =
      totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

    const avgLevel =
      students.length > 0
        ? students.reduce((sum, s) => sum + s.level, 0) / students.length
        : 0;

    const totalXp = students.reduce((sum, s) => sum + s.xp, 0);

    const lics = schoolLicensesMap.get(school.id) || [];
    const licensesUsed = lics.reduce(
      (sum, l) => sum + (licenseUserCountMap.get(l.id) || 0),
      0,
    );
    const licensesTotal = lics.reduce(
      (sum, l) => sum + (l.maxUsers || 0),
      0,
    );

    return {
      schoolId: school.id,
      schoolName: school.name,
      studentCount: students.length,
      teacherCount: teachers.length,
      activeRate,
      averageLevel: Math.round(avgLevel * 10) / 10,
      totalXp,
      licensesUsed,
      licensesTotal,
    };
  });

  const summary = {
    totalSchools: segments.length,
    averageActiveRate:
      segments.length > 0
        ? Math.round(
            segments.reduce((sum, s) => sum + s.activeRate, 0) / segments.length,
          )
        : 0,
    totalLicensesUsed: segments.reduce((sum, s) => sum + s.licensesUsed, 0),
  };

  return { segments, summary };
}