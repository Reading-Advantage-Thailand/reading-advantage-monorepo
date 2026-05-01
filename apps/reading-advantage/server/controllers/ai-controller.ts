import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { AISummaryResponse, AIInsight } from "@/types/dashboard";
import {
  generateStudentInsights,
  generateTeacherInsights,
  generateClassroomInsights,
  generateLicenseInsights,
  generateSystemInsights,
  saveInsights,
  getCachedInsights,
} from "@/server/services/ai-insight-service";
import { AIInsightScope, Role } from "@prisma/client";

/**
 * GET /api/v1/ai/summary
 * Generate AI-powered insights and recommendations using real AI
 */
export async function getAISummary(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || session.user.id;
    const classroomId = searchParams.get("classroomId");
    const licenseId = searchParams.get("licenseId");
    const kind = searchParams.get("kind"); // 'student', 'teacher', 'classroom', 'license', 'system'
    const forceRefresh = searchParams.get("refresh") === "true";

    // Debug logging
    console.log('[AI Insights] Request params:', {
      userId,
      classroomId,
      licenseId,
      kind,
      userRole: session.user.role,
      forceRefresh
    });

    let insights: any[] = [];
    let scope: AIInsightScope;

    // Determine scope based on parameters and user role
    // Priority: explicit parameters > user role
    if (classroomId || kind === "classroom") {
      scope = AIInsightScope.CLASSROOM;
    } else if (licenseId || kind === "license") {
      // Explicit license scope - works for both ADMIN and SYSTEM users
      scope = AIInsightScope.LICENSE;
    } else if (kind === "teacher") {
      // Explicit teacher scope - can be used by SYSTEM to view specific teacher
      scope = AIInsightScope.TEACHER;
    } else if (kind === "student") {
      // Explicit student scope
      scope = AIInsightScope.STUDENT;
    } else if (kind === "system") {
      // Explicit system scope - only for SYSTEM users viewing all schools
      scope = AIInsightScope.SYSTEM;
    } else if (session.user.role === Role.ADMIN) {
      // ADMIN role = School administrator, sees only their school
      scope = AIInsightScope.LICENSE;
    } else if (session.user.role === Role.SYSTEM) {
      // SYSTEM role without explicit scope = show system-wide view
      scope = AIInsightScope.SYSTEM;
    } else if (session.user.role === Role.TEACHER) {
      scope = AIInsightScope.TEACHER;
    } else {
      scope = AIInsightScope.STUDENT;
    }

    // Debug logging
    console.log('[AI Insights] Determined scope:', {
      scope,
      contextId: scope === AIInsightScope.LICENSE ? licenseId : 
                 scope === AIInsightScope.CLASSROOM ? classroomId :
                 scope === AIInsightScope.TEACHER || scope === AIInsightScope.STUDENT ? userId : 'none'
    });

    // Try to get cached insights first (unless forced refresh)
    if (!forceRefresh) {
      insights = await getCachedInsights(
        scope,
        scope === AIInsightScope.STUDENT || scope === AIInsightScope.TEACHER ? userId : undefined,
        classroomId || undefined,
        scope === AIInsightScope.LICENSE ? (licenseId || session.user.license_id) : undefined
      );
    }

    // If no cached insights or forced refresh, generate new ones
    if (insights.length === 0 || forceRefresh) {
      let generatedInsights: any[] = [];

      switch (scope) {
        case AIInsightScope.STUDENT:
          generatedInsights = await generateStudentInsights(userId);
          break;
        case AIInsightScope.TEACHER:
          generatedInsights = await generateTeacherInsights(userId);
          break;
        case AIInsightScope.CLASSROOM:
          if (!classroomId) {
            return NextResponse.json(
              { code: "BAD_REQUEST", message: "classroomId required for classroom scope" },
              { status: 400 }
            );
          }
          generatedInsights = await generateClassroomInsights(classroomId);
          break;
        case AIInsightScope.LICENSE:
          // ADMIN sees only their school's license
          const targetLicenseId = licenseId || session.user.license_id;
          if (!targetLicenseId) {
            return NextResponse.json(
              { code: "BAD_REQUEST", message: "licenseId required for license/admin scope" },
              { status: 400 }
            );
          }
          generatedInsights = await generateLicenseInsights(targetLicenseId);
          break;
        case AIInsightScope.SYSTEM:
          // SYSTEM sees all schools - generate system-wide insights
          generatedInsights = await generateSystemInsights();
          break;
        default:
          generatedInsights = [];
      }

      // Save insights to database
      if (generatedInsights.length > 0) {
        await saveInsights(
          generatedInsights,
          scope,
          scope === AIInsightScope.STUDENT || scope === AIInsightScope.TEACHER ? userId : undefined,
          classroomId || undefined,
          scope === AIInsightScope.LICENSE ? (licenseId || session.user.license_id) : undefined
        );

        // Fetch the saved insights
        insights = await getCachedInsights(
          scope,
          scope === AIInsightScope.STUDENT || scope === AIInsightScope.TEACHER ? userId : undefined,
          classroomId || undefined,
          scope === AIInsightScope.LICENSE ? (licenseId || session.user.license_id) : undefined
        );
      }
    }

    // Transform to API response format
    const apiInsights: AIInsight[] = insights.map((insight) => ({
      id: insight.id,
      type: insight.type.toLowerCase() as any,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      priority: insight.priority.toLowerCase() as any,
      data: insight.data || {},
      createdAt: insight.createdAt.toISOString(),
    }));

    const response: AISummaryResponse = {
      insights: apiInsights,
      summary: {
        totalInsights: apiInsights.length,
        highPriority: apiInsights.filter(
          (i) => i.priority === "high"
        ).length,
        lastGenerated: insights[0]?.createdAt?.toISOString() || new Date().toISOString(),
      },
      status: insights.length > 0 ? "ready" : "generating",
      cache: {
        cached: !forceRefresh && insights.length > 0,
        generatedAt: insights[0]?.createdAt?.toISOString() || new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    console.log(
      `[API] /api/ai/summary - ${duration}ms - ${apiInsights.length} insights (${scope})`
    );

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[API] /api/ai/summary - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch AI summary",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}
