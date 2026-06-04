import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceClasses,
  scienceClassStudents,
  scienceStandardMastery,
  scienceStandards,
  users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Lists intervention alerts for a class. Detects students with low mastery
 * levels and generates alerts with severity classifications.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `classId`, optional `limit`, `severity`, `cursor`, `since`, `refresh`
 * @param deps - Injected dependencies for caching and detection
 * @returns Object with `alerts`, `classId`, `generatedAt`, `nextCursor`, `totalAlerts`
 * @throws {AuthError} When user lacks intervention:read permission
 */
export async function listAlerts({
  user,
  tenant,
  input,
  deps,
}: {
  user: UserContext;
  tenant: Tenant;
  input: {
    classId: string;
    limit?: number;
    severity?: "critical" | "warning" | "moderate";
    cursor?: string;
    since?: Date;
    refresh?: boolean;
  };
  deps: {
    masteryFilterLevel: number;
    detectionCap: number;
    defaultLimit: number;
    maxLimit: number;
    freshnessHeaderSeconds: number;
    cacheGet: (
      classId: string
    ) => {
      classId: string;
      generatedAt: string;
      alerts: Array<{
        alertSeverity: string;
        detectedAt: string;
        cursor: string;
        [key: string]: unknown;
      }>;
    } | null;
    cacheSet: (
      classId: string,
      payload: {
        classId: string;
        generatedAt: string;
        alerts: unknown[];
      }
    ) => void;
    detectAlerts: (input: {
      classMeta: { id: string; name: string };
      students: Array<{ id: string; name: string; gradeLevel: number | null }>;
      masteryRecords: Array<{
        studentId: string;
        masteryLevel: string;
        lastAssessedAt: Date;
        standard: { code: string; description: string };
      }>;
      maxAlerts: number;
    }) => {
      classId: string;
      alerts: Array<{
        alertSeverity: string;
        detectedAt: string;
        cursor: string;
        [key: string]: unknown;
      }>;
    };
  };
}) {
  assertCan(user, "intervention:read", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const { classId, limit, severity, cursor, since, refresh } = input;
  const limitValue = limit ?? deps.defaultLimit;
  const bypassCache = refresh ?? false;

  const [klass] = await tenantDb
    .select({
      id: scienceClasses.id,
      name: scienceClasses.name,
      teacherId: scienceClasses.teacherId,
    })
    .from(scienceClasses)
    .where(eq(scienceClasses.id, classId))
    .limit(1);

  if (!klass) {
    return { error: "Class not found", status: 404 };
  }

  const isAdmin = user.role === "ADMIN";
  const isClassTeacher =
    user.role === "TEACHER" && user.id === klass.teacherId;

  if (!isAdmin && !isClassTeacher) {
    return { error: "Forbidden", status: 403 };
  }

  const students = await tenantDb
    .select({
      id: users.id,
      name: users.name,
      gradeLevel: users.gradeLevel,
    })
    .from(scienceClassStudents)
    .innerJoin(users, eq(users.id, scienceClassStudents.studentId))
    .where(eq(scienceClassStudents.classId, classId));

  if (students.length === 0) {
    return {
      classId,
      generatedAt: new Date().toISOString(),
      alerts: [],
      nextCursor: null,
      totalAlerts: 0,
    };
  }

  let cacheStatus: "hit" | "miss" | "bypass" = "miss";
  let cached = null;

  if (!bypassCache) {
    cached = deps.cacheGet(classId);
    cacheStatus = cached ? "hit" : "miss";
  } else {
    cacheStatus = "bypass";
  }

  const payload =
    cached ??
    (await (async () => {
      const studentIds = students.map((student) => student.id);

      const masteryRows = await tenantDb
        .select({
          studentId: scienceStandardMastery.studentId,
          masteryLevel: scienceStandardMastery.masteryLevel,
          lastAssessedAt: scienceStandardMastery.lastAssessedAt,
          standardCode: scienceStandards.code,
          standardDescription: scienceStandards.description,
        })
        .from(scienceStandardMastery)
        .innerJoin(
          scienceStandards,
          eq(scienceStandards.id, scienceStandardMastery.standardId)
        )
        .where(
          and(
            inArray(scienceStandardMastery.studentId, studentIds),
            lt(
              scienceStandardMastery.masteryLevel,
              sql`${deps.masteryFilterLevel}`
            )
          )
        );

      const masteryRecords = masteryRows.map((row) => ({
        studentId: row.studentId,
        masteryLevel: row.masteryLevel,
        lastAssessedAt: row.lastAssessedAt,
        standard: {
          code: row.standardCode,
          description: row.standardDescription,
        },
      }));

      const studentsForDetection = students.map((student) => ({
        id: student.id,
        name: student.name ?? "",
        gradeLevel: student.gradeLevel,
      }));

      const detectionResult = deps.detectAlerts({
        classMeta: { id: klass.id, name: klass.name },
        students: studentsForDetection,
        masteryRecords,
        maxAlerts: deps.detectionCap,
      });

      const generatedPayload = {
        classId: detectionResult.classId,
        generatedAt: new Date().toISOString(),
        alerts: detectionResult.alerts,
      };

      deps.cacheSet(classId, generatedPayload);
      return generatedPayload;
    })());

  let filteredAlerts = payload.alerts;

  if (severity) {
    filteredAlerts = filteredAlerts.filter(
      (alert) => alert.alertSeverity === severity
    );
  }

  if (since) {
    filteredAlerts = filteredAlerts.filter(
      (alert) => new Date(alert.detectedAt) > since
    );
  }

  if (cursor) {
    const cursorIndex = filteredAlerts.findIndex(
      (alert) => alert.cursor === cursor
    );
    if (cursorIndex >= 0) {
      filteredAlerts = filteredAlerts.slice(cursorIndex + 1);
    }
  }

  const limitedAlerts = filteredAlerts.slice(0, limitValue);
  const nextCursor =
    filteredAlerts.length > limitValue
      ? filteredAlerts[limitValue - 1]?.cursor ?? null
      : null;

  return {
    classId: payload.classId,
    generatedAt: payload.generatedAt,
    alerts: limitedAlerts,
    nextCursor,
    totalAlerts: filteredAlerts.length,
    cacheStatus,
  };
}
