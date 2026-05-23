/**
 * AI Insights Refresh Controller
 * 
 * Handles automated refresh of AI insights for Cloud Scheduler
 */

import { NextRequest, NextResponse } from "next/server";
import { db, and, eq, gt, gte, count } from "@reading-advantage/db";
import {
  aiInsights,
  aiInsightCache,
  licenses,
  classrooms,
  classroomTeachers,
  users,
  userActivity,
} from "@reading-advantage/db/schema";
import {
  generateStudentInsights,
  generateTeacherInsights,
  generateClassroomInsights,
  generateLicenseInsights,
  generateSystemInsights,
} from "@/server/services/ai-insight-service";
import { AIInsightScope } from "@/lib/enums";

interface RefreshResult {
  scope: string;
  entityId: string | null;
  status: "success" | "failed" | "skipped";
  insights: number;
  duration: number;
  error?: string;
}

/**
 * GET /api/v1/ai/insights/refresh
 * Health check and status for AI insights refresh
 */
export async function getAIInsightsRefreshStatus(req: NextRequest) {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get counts of recent insights
    const recentInsights = await db
      .select({ scope: aiInsights.scope, value: count() })
      .from(aiInsights)
      .where(gte(aiInsights.createdAt, last24h))
      .groupBy(aiInsights.scope);

    // Get cache status
    const cacheStats = await db
      .select({ scope: aiInsightCache.scope, value: count() })
      .from(aiInsightCache)
      .groupBy(aiInsightCache.scope);

    return NextResponse.json({
      status: "healthy",
      last24Hours: recentInsights.map(r => ({
        scope: r.scope,
        count: r.value,
      })),
      cacheStatus: cacheStats.map(c => ({
        scope: c.scope,
        cached: c.value,
      })),
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[AI Refresh] Status check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/ai/insights/refresh
 * Automated refresh of AI insights for all entities
 * Called by Cloud Scheduler daily
 */
export async function refreshAIInsightsAutomated(req: NextRequest) {
  const requestStartTime = Date.now();

  console.log("[CLOUD_SCHEDULER] Starting automated AI insights refresh");

  try {
    const results: RefreshResult[] = [];

    // 1. Refresh System-wide insights (once)
    console.log("[CLOUD_SCHEDULER] Refreshing SYSTEM insights");
    const systemResult = await refreshSystemInsights();
    results.push(systemResult);

    // 2. Refresh License insights (all active schools)
    console.log("[CLOUD_SCHEDULER] Refreshing LICENSE insights");
    const licenseResults = await refreshAllLicenseInsights();
    results.push(...licenseResults);

    // 3. Refresh Classroom insights (active classrooms)
    console.log("[CLOUD_SCHEDULER] Refreshing CLASSROOM insights");
    const classroomResults = await refreshAllClassroomInsights();
    results.push(...classroomResults);

    // 4. Refresh Teacher insights (active teachers)
    console.log("[CLOUD_SCHEDULER] Refreshing TEACHER insights");
    const teacherResults = await refreshAllTeacherInsights();
    results.push(...teacherResults);

    // 5. Refresh Student insights (active students only)
    console.log("[CLOUD_SCHEDULER] Refreshing STUDENT insights");
    const studentResults = await refreshAllStudentInsights();
    results.push(...studentResults);

    // Calculate summary
    const duration = Date.now() - requestStartTime;
    const successCount = results.filter((r) => r.status === "success").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const totalInsights = results.reduce((sum, r) => sum + r.insights, 0);

    console.log(
      `[CLOUD_SCHEDULER] AI Insights refresh completed: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped, ${totalInsights} insights generated (${duration}ms)`
    );

    // Log failures
    if (failedCount > 0) {
      const failures = results.filter((r) => r.status === "failed");
      console.error(
        "[CLOUD_SCHEDULER] Failed refreshes:",
        failures.length
      );
      failures.forEach((f) => {
        console.error(`  - ${f.scope} ${f.entityId || "N/A"}: ${f.error}`);
      });
    }

    return NextResponse.json({
      message: "AI insights refresh completed (automated)",
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        totalInsights,
        duration: `${duration}ms`,
      },
      byScope: {
        system: results.filter((r) => r.scope === "SYSTEM").length,
        license: results.filter((r) => r.scope === "LICENSE").length,
        classroom: results.filter((r) => r.scope === "CLASSROOM").length,
        teacher: results.filter((r) => r.scope === "TEACHER").length,
        student: results.filter((r) => r.scope === "STUDENT").length,
      },
      refreshedAt: new Date().toISOString(),
      refreshedBy: "Cloud Scheduler",
    });
  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error("[CLOUD_SCHEDULER] ❌ Error in AI insights refresh:", error);

    return NextResponse.json(
      {
        message: "AI insights refresh failed",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * Refresh system-wide insights
 */
async function refreshSystemInsights(): Promise<RefreshResult> {
  const startTime = Date.now();

  try {
    const insights = await generateSystemInsights();

    const cacheKey = "system:all";

    // Clear old cache
    await db.delete(aiInsightCache).where(eq(aiInsightCache.cacheKey, cacheKey));

    // Save to cache
    if (insights.length > 0) {
      await db.insert(aiInsightCache).values({
        cacheKey,
        scope: AIInsightScope.SYSTEM,
        insights: insights as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    return {
      scope: "SYSTEM",
      entityId: null,
      status: "success",
      insights: insights.length,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      scope: "SYSTEM",
      entityId: null,
      status: "failed",
      insights: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Refresh all license insights
 */
async function refreshAllLicenseInsights(): Promise<RefreshResult[]> {
  const licenseRows = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(gt(licenses.expiresAt, new Date()));

  console.log(`  Found ${licenseRows.length} active licenses`);

  const results = await Promise.allSettled(
    licenseRows.map(async (license) => {
      const startTime = Date.now();
      try {
        const insights = await generateLicenseInsights(license.id);

        const cacheKey = `license:${license.id}`;

        // Clear old cache
        await db.delete(aiInsightCache).where(eq(aiInsightCache.cacheKey, cacheKey));

        // Save to cache
        if (insights.length > 0) {
          await db.insert(aiInsightCache).values({
            cacheKey,
            scope: AIInsightScope.LICENSE,
            insights: insights as any,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }

        return {
          scope: "LICENSE",
          entityId: license.id,
          status: "success" as const,
          insights: insights.length,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          scope: "LICENSE",
          entityId: license.id,
          status: "failed" as const,
          insights: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  return results.map((r) => (r.status === "fulfilled" ? r.value : r.reason));
}

/**
 * Refresh all classroom insights
 */
async function refreshAllClassroomInsights(): Promise<RefreshResult[]> {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get classrooms with recent activity
  const classroomRows = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.archived, false), gte(classrooms.updatedAt, last30Days)));

  console.log(`  Found ${classroomRows.length} active classrooms`);

  const results = await Promise.allSettled(
    classroomRows.map(async (classroom) => {
      const startTime = Date.now();
      try {
        const insights = await generateClassroomInsights(classroom.id);

        const cacheKey = `classroom:${classroom.id}`;

        // Clear old cache
        await db.delete(aiInsightCache).where(eq(aiInsightCache.cacheKey, cacheKey));

        // Save to cache
        if (insights.length > 0) {
          await db.insert(aiInsightCache).values({
            cacheKey,
            scope: AIInsightScope.CLASSROOM,
            insights: insights as any,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }

        return {
          scope: "CLASSROOM",
          entityId: classroom.id,
          status: "success" as const,
          insights: insights.length,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          scope: "CLASSROOM",
          entityId: classroom.id,
          status: "failed" as const,
          insights: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  return results.map((r) => (r.status === "fulfilled" ? r.value : r.reason));
}

/**
 * Refresh all teacher insights
 */
async function refreshAllTeacherInsights(): Promise<RefreshResult[]> {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get teachers with active classrooms via ClassroomTeacher junction table
  const activeTeacherIds = await db
    .selectDistinct({ teacherId: classroomTeachers.teacherId })
    .from(classroomTeachers)
    .innerJoin(classrooms, eq(classroomTeachers.classroomId, classrooms.id))
    .where(and(eq(classrooms.archived, false), gte(classrooms.updatedAt, last30Days)));

  const teacherIds = activeTeacherIds.map(ct => ct.teacherId);

  console.log(`  Found ${teacherIds.length} active teachers`);

  const results = await Promise.allSettled(
    teacherIds.map(async (teacherId) => {
      const startTime = Date.now();
      try {
        const insights = await generateTeacherInsights(teacherId);

        const cacheKey = `teacher:${teacherId}`;

        // Clear old cache
        await db.delete(aiInsightCache).where(eq(aiInsightCache.cacheKey, cacheKey));

        // Save to cache
        if (insights.length > 0) {
          await db.insert(aiInsightCache).values({
            cacheKey,
            scope: AIInsightScope.TEACHER,
            insights: insights as any,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }

        return {
          scope: "TEACHER",
          entityId: teacherId,
          status: "success" as const,
          insights: insights.length,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          scope: "TEACHER",
          entityId: teacherId,
          status: "failed" as const,
          insights: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  return results.map((r) => (r.status === "fulfilled" ? r.value : r.reason));
}

/**
 * Refresh student insights (only active students)
 */
async function refreshAllStudentInsights(): Promise<RefreshResult[]> {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get students with recent activity
  const students = await db
    .selectDistinct({ id: users.id })
    .from(users)
    .innerJoin(userActivity, eq(userActivity.userId, users.id))
    .where(and(eq(users.role, "STUDENT"), gte(userActivity.createdAt, last7Days)))
    .limit(1000);

  console.log(`  Found ${students.length} active students`);

  const results = await Promise.allSettled(
    students.map(async (student) => {
      const startTime = Date.now();
      try {
        const insights = await generateStudentInsights(student.id);

        const cacheKey = `student:${student.id}`;

        // Clear old cache
        await db.delete(aiInsightCache).where(eq(aiInsightCache.cacheKey, cacheKey));

        // Save to cache
        if (insights.length > 0) {
          await db.insert(aiInsightCache).values({
            cacheKey,
            scope: AIInsightScope.STUDENT,
            insights: insights as any,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }

        return {
          scope: "STUDENT",
          entityId: student.id,
          status: "success" as const,
          insights: insights.length,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          scope: "STUDENT",
          entityId: student.id,
          status: "failed" as const,
          insights: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  return results.map((r) => (r.status === "fulfilled" ? r.value : r.reason));
}
