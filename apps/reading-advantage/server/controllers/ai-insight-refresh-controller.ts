/**
 * AI Insights Refresh Controller
 * 
 * Handles automated refresh of AI insights for Cloud Scheduler
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateStudentInsights,
  generateTeacherInsights,
  generateClassroomInsights,
  generateLicenseInsights,
  generateSystemInsights,
} from "@/server/services/ai-insight-service";
import { AIInsightScope } from "@prisma/client";

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
    const recentInsights = await prisma.aIInsight.groupBy({
      by: ['scope'],
      where: {
        createdAt: {
          gte: last24h,
        },
      },
      _count: true,
    });

    // Get cache status
    const cacheStats = await prisma.aIInsightCache.groupBy({
      by: ['scope'],
      _count: true,
    });

    return NextResponse.json({
      status: "healthy",
      last24Hours: recentInsights.map(r => ({
        scope: r.scope,
        count: r._count,
      })),
      cacheStatus: cacheStats.map(c => ({
        scope: c.scope,
        cached: c._count,
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
    await prisma.aIInsightCache.deleteMany({
      where: {
        cacheKey,
      },
    });

    // Save to cache
    if (insights.length > 0) {
      await prisma.aIInsightCache.create({
        data: {
          cacheKey,
          scope: AIInsightScope.SYSTEM,
          insights: insights as any,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
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
  const licenses = await prisma.license.findMany({
    where: {
      expiresAt: {
        gt: new Date(), // Only active licenses
      },
    },
    select: {
      id: true,
    },
  });

  console.log(`  Found ${licenses.length} active licenses`);

  const results = await Promise.allSettled(
    licenses.map(async (license) => {
      const startTime = Date.now();
      try {
        const insights = await generateLicenseInsights(license.id);

        const cacheKey = `license:${license.id}`;

        // Clear old cache
        await prisma.aIInsightCache.deleteMany({
          where: {
            cacheKey,
          },
        });

        // Save to cache
        if (insights.length > 0) {
          await prisma.aIInsightCache.create({
            data: {
              cacheKey,
              scope: AIInsightScope.LICENSE,
              insights: insights as any,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
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
  const classrooms = await prisma.classroom.findMany({
    where: {
      archived: false,
      updatedAt: {
        gte: last30Days, // Only classrooms updated in last 30 days
      },
    },
    select: {
      id: true,
    },
  });

  console.log(`  Found ${classrooms.length} active classrooms`);

  const results = await Promise.allSettled(
    classrooms.map(async (classroom) => {
      const startTime = Date.now();
      try {
        const insights = await generateClassroomInsights(classroom.id);

        const cacheKey = `classroom:${classroom.id}`;

        // Clear old cache
        await prisma.aIInsightCache.deleteMany({
          where: {
            cacheKey,
          },
        });

        // Save to cache
        if (insights.length > 0) {
          await prisma.aIInsightCache.create({
            data: {
              cacheKey,
              scope: AIInsightScope.CLASSROOM,
              insights: insights as any,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
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
  const activeTeacherIds = await prisma.classroomTeacher.findMany({
    where: {
      classroom: {
        archived: false,
        updatedAt: {
          gte: last30Days,
        },
      },
    },
    select: {
      teacherId: true,
    },
    distinct: ['teacherId'],
  });

  const teacherIds = activeTeacherIds.map(ct => ct.teacherId);

  console.log(`  Found ${teacherIds.length} active teachers`);

  const results = await Promise.allSettled(
    teacherIds.map(async (teacherId) => {
      const startTime = Date.now();
      try {
        const insights = await generateTeacherInsights(teacherId);

        const cacheKey = `teacher:${teacherId}`;

        // Clear old cache
        await prisma.aIInsightCache.deleteMany({
          where: {
            cacheKey,
          },
        });

        // Save to cache
        if (insights.length > 0) {
          await prisma.aIInsightCache.create({
            data: {
              cacheKey,
              scope: AIInsightScope.TEACHER,
              insights: insights as any,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
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
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      userActivities: {
        some: {
          createdAt: {
            gte: last7Days, // Active in last 7 days
          },
        },
      },
    },
    select: {
      id: true,
    },
    take: 1000, // Limit to prevent timeout - adjust based on needs
  });

  console.log(`  Found ${students.length} active students`);

  const results = await Promise.allSettled(
    students.map(async (student) => {
      const startTime = Date.now();
      try {
        const insights = await generateStudentInsights(student.id);

        const cacheKey = `student:${student.id}`;

        // Clear old cache
        await prisma.aIInsightCache.deleteMany({
          where: {
            cacheKey,
          },
        });

        // Save to cache
        if (insights.length > 0) {
          await prisma.aIInsightCache.create({
            data: {
              cacheKey,
              scope: AIInsightScope.STUDENT,
              insights: insights as any,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
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
