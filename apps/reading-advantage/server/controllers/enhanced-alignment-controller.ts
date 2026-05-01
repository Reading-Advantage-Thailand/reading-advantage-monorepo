import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import {
  MetricsAlignmentResponse,
  AlignmentData,
  AlignmentBuckets,
  AlignmentSample,
} from "@/types/dashboard";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

interface AlignmentMetricsRow {
  scope_id: string;
  scope_type: "school" | "classroom" | "student";
  user_id: string | null;
  display_name: string | null;
  email: string | null;
  classroom_id: string | null;
  student_ra_level: number | null;
  student_cefr_level: string | null;
  mapped_student_cefr_level: string | null;
  total_readings: number;
  below_count: number;
  aligned_count: number;
  above_count: number;
  unknown_count: number;
  below_pct: number;
  aligned_pct: number;
  above_pct: number;
  unknown_pct: number;
  below_samples: any[] | null;
  aligned_samples: any[] | null;
  above_samples: any[] | null;
  first_reading_at: Date | null;
  last_reading_at: Date | null;
  unique_articles: number;
  assigned_articles: number;
}

/**
 * Get enhanced alignment metrics with RBAC enforcement
 * @param req - Extended Next request with session
 * @returns Enhanced alignment metrics response with bucket analysis and samples
 */
export async function getEnhancedAlignmentMetrics(req: ExtendedNextRequest) {
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
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");
    const studentIds = searchParams
      .get("studentIds")
      ?.split(",")
      .filter(Boolean);
    const includeSamples = searchParams.get("includeSamples") === "true";
    const timeframe = searchParams.get("timeframe") || "90d";

    // RBAC: Determine scope and access permissions
    const userRole = session.user.role;
    const userSchoolId = session.user.school_id;

    let scopeType: "school" | "classroom" | "student";
    let scopeId: string;
    let allowPII = false;

    if (userRole === Role.SYSTEM || userRole === Role.ADMIN) {
      // System/Admin: Can access any scope, strip PII for system-wide requests
      if (studentIds && studentIds.length > 0) {
        scopeType = "student";
        scopeId = studentIds[0]; // Primary student for filtering
        allowPII = true;
      } else if (classId) {
        scopeType = "classroom";
        scopeId = classId;
        allowPII = true;
      } else if (schoolId) {
        scopeType = "school";
        scopeId = schoolId;
        allowPII = Boolean(schoolId); // Allow PII only for specific schools
      } else {
        scopeType = "school";
        scopeId = "system";
        allowPII = false; // Strip PII for system-wide view
      }
    } else if (userRole === Role.TEACHER) {
      // Teacher: Access own school/classes only
      if (!userSchoolId) {
        return NextResponse.json(
          {
            code: "FORBIDDEN",
            message: "Teacher must be associated with a school",
          },
          { status: 403 }
        );
      }

      if (classId) {
        // Verify teacher has access to this classroom
        const classroom = await prisma.classroom.findFirst({
          where: {
            id: classId,
            OR: [
              { teacherId: session.user.id },
              { teachers: { some: { teacherId: session.user.id } } },
            ],
          },
        });

        if (!classroom) {
          return NextResponse.json(
            { code: "FORBIDDEN", message: "Access denied to this classroom" },
            { status: 403 }
          );
        }

        scopeType = "classroom";
        scopeId = classId;
      } else {
        scopeType = "school";
        scopeId = userSchoolId;
      }
      allowPII = true;
    } else {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Build query filters
    const whereClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Apply scope filtering
    if (scopeType === "student" && studentIds && studentIds.length > 0) {
      whereClause.push(`user_id = ANY($${paramIndex})`);
      params.push(studentIds);
      paramIndex++;
    } else if (scopeType === "classroom") {
      whereClause.push(
        `((scope_type = 'classroom' AND scope_id = $${paramIndex}) OR (scope_type = 'student' AND classroom_id = $${paramIndex}))`
      );
      params.push(scopeId);
      paramIndex++;
    } else if (scopeType === "school" && scopeId !== "system") {
      whereClause.push(`scope_id = $${paramIndex}`);
      params.push(scopeId);
      paramIndex++;
    }

    // Apply timeframe filtering if needed (the matview already filters to 90 days)
    if (timeframe !== "90d") {
      const daysAgo = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
      whereClause.push(
        `first_reading_at >= NOW() - INTERVAL '${daysAgo} days'`
      );
    }

    const whereClauseSQL =
      whereClause.length > 0 ? `WHERE ${whereClause.join(" AND ")}` : "";

    // Query the materialized view
    const query = `
      SELECT 
        scope_id, scope_type, user_id, display_name, email, classroom_id,
        student_ra_level, student_cefr_level, mapped_student_cefr_level,
        total_readings, below_count, aligned_count, above_count, unknown_count,
        below_pct, aligned_pct, above_pct, unknown_pct,
        ${includeSamples ? "below_samples, aligned_samples, above_samples," : "NULL as below_samples, NULL as aligned_samples, NULL as above_samples,"}
        first_reading_at, last_reading_at, unique_articles, assigned_articles
      FROM mv_alignment_metrics
      ${whereClauseSQL}
      ORDER BY scope_type, total_readings DESC
    `;

    const rawResults = await prisma.$queryRawUnsafe<AlignmentMetricsRow[]>(
      query,
      ...params
    );

    // Aggregate results
    const studentResults = rawResults.filter(
      (r) => r.scope_type === "student" && r.user_id
    );
    const classResults = rawResults.filter((r) => r.scope_type === "classroom");
    const schoolResults = rawResults.filter((r) => r.scope_type === "school");

    // Calculate aggregate metrics (convert BigInt to Number)
    const totalReadings = studentResults.reduce(
      (sum, r) => sum + Number(r.total_readings),
      0
    );
    const totalBelowCount = studentResults.reduce(
      (sum, r) => sum + Number(r.below_count),
      0
    );
    const totalAlignedCount = studentResults.reduce(
      (sum, r) => sum + Number(r.aligned_count),
      0
    );
    const totalAboveCount = studentResults.reduce(
      (sum, r) => sum + Number(r.above_count),
      0
    );
    const totalUnknownCount = studentResults.reduce(
      (sum, r) => sum + Number(r.unknown_count),
      0
    );

    const buckets: AlignmentBuckets = {
      below: totalBelowCount,
      aligned: totalAlignedCount,
      above: totalAboveCount,
      unknown: totalUnknownCount,
    };

    const bucketPercentages: AlignmentBuckets = {
      below:
        totalReadings > 0
          ? Math.round((totalBelowCount / totalReadings) * 100 * 10) / 10
          : 0,
      aligned:
        totalReadings > 0
          ? Math.round((totalAlignedCount / totalReadings) * 100 * 10) / 10
          : 0,
      above:
        totalReadings > 0
          ? Math.round((totalAboveCount / totalReadings) * 100 * 10) / 10
          : 0,
      unknown:
        totalReadings > 0
          ? Math.round((totalUnknownCount / totalReadings) * 100 * 10) / 10
          : 0,
    };

    // Calculate alignment score (0-100, where 100 is perfect alignment)
    const alignmentScore =
      totalReadings > 0
        ? Math.round((totalAlignedCount / totalReadings) * 100)
        : 0;

    // Extract samples (limit to top 5 per bucket)
    const samples: AlignmentData["samples"] = includeSamples
      ? {
          below: extractTopSamples(
            studentResults,
            "below_samples",
            5,
            allowPII
          ),
          aligned: extractTopSamples(
            studentResults,
            "aligned_samples",
            5,
            allowPII
          ),
          above: extractTopSamples(
            studentResults,
            "above_samples",
            5,
            allowPII
          ),
        }
      : undefined;

    // Calculate misalignment indicators
    const highRiskStudents = studentResults.filter(
      (r) =>
        (Number(r.below_count) + Number(r.above_count)) /
          Math.max(Number(r.total_readings), 1) >
        0.7
    ).length;

    // Query assignment overrides count
    const assignmentOverridesResult = await prisma.assignment.count({
      where: {
        ...(scopeType === "classroom" ? { classroomId: scopeId } : {}),
        ...(scopeType === "school" && scopeId !== "system"
          ? { classroom: { schoolId: scopeId } }
          : {}),
      },
    });

    // Calculate content gaps
    const belowThreshold = Math.round(totalBelowCount * 0.8); // Articles significantly below
    const aboveThreshold = Math.round(totalAboveCount * 0.8); // Articles significantly above

    // Legacy compatibility data
    const levelDistribution: Record<string, number> = {};
    const cefrDistribution: Record<string, number> = {};

    studentResults.forEach((r) => {
      if (r.student_ra_level) {
        const levelKey = `Level ${r.student_ra_level}`;
        levelDistribution[levelKey] = (levelDistribution[levelKey] || 0) + 1;
      }
      if (r.student_cefr_level) {
        cefrDistribution[r.student_cefr_level] =
          (cefrDistribution[r.student_cefr_level] || 0) + 1;
      }
    });

    const alignment: AlignmentData = {
      // Legacy compatibility
      levelDistribution,
      cefrDistribution,
      recommendations: {
        studentsAboveLevel: totalAboveCount,
        studentsBelowLevel: totalBelowCount,
        studentsOnLevel: totalAlignedCount,
      },

      // Enhanced metrics
      buckets: {
        counts: buckets,
        percentages: bucketPercentages,
      },
      samples,
      misalignmentIndicators: {
        highRiskStudents,
        assignmentOverrides: assignmentOverridesResult,
        contentGaps: {
          belowThreshold,
          aboveThreshold,
        },
      },
    };

    const totalStudents = studentResults.length;
    const averageLevel =
      totalStudents > 0
        ? studentResults
            .filter((r) => r.student_ra_level)
            .reduce((sum, r) => sum + r.student_ra_level!, 0) /
          studentResults.filter((r) => r.student_ra_level).length
        : 0;

    const levelCounts = studentResults.reduce(
      (acc: Record<number, number>, r) => {
        if (r.student_ra_level) {
          acc[r.student_ra_level] = (acc[r.student_ra_level] || 0) + 1;
        }
        return acc;
      },
      {}
    );

    const modalLevel = Object.entries(levelCounts).reduce(
      (max, [level, count]) =>
        count > max.count ? { level: parseInt(level), count } : max,
      { level: 1, count: 0 }
    ).level;

    const response: MetricsAlignmentResponse = {
      alignment,
      summary: {
        totalStudents,
        averageLevel: Math.round(averageLevel * 10) / 10,
        modalLevel,
        totalReadings,
        alignmentScore,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        "X-Response-Time": `${duration}ms`,
        "X-Scope": `${scopeType}:${scopeId}`,
        "X-PII-Allowed": allowPII.toString(),
      },
    });
  } catch (error) {
    console.error("[Controller] getEnhancedAlignmentMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch alignment metrics",
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

/**
 * Extract top samples from alignment results
 */
function extractTopSamples(
  results: AlignmentMetricsRow[],
  sampleField: "below_samples" | "aligned_samples" | "above_samples",
  limit: number,
  allowPII: boolean
): AlignmentSample[] {
  const allSamples: AlignmentSample[] = [];

  for (const result of results) {
    const samples = result[sampleField];
    if (samples && Array.isArray(samples)) {
      for (const sample of samples) {
        if (sample && typeof sample === "object") {
          const alignmentSample: AlignmentSample = {
            articleId: sample.articleId || "",
            title: allowPII
              ? sample.title || "Untitled Article"
              : "[Article Title Hidden]",
            articleRaLevel: sample.articleRaLevel || 0,
            articleCefrLevel: sample.articleCefrLevel,
            studentRaLevel: sample.studentRaLevel,
            levelDiff: sample.levelDiff,
            readAt: sample.readAt || new Date().toISOString(),
            assignmentId: sample.assignmentId,
            genre: sample.genre,
          };
          allSamples.push(alignmentSample);
        }
      }
    }
  }

  // Sort by level difference (most misaligned first) and limit
  return allSamples
    .sort((a, b) => {
      const aDiff = Math.abs(a.levelDiff || 0);
      const bDiff = Math.abs(b.levelDiff || 0);
      return bDiff - aDiff;
    })
    .slice(0, limit);
}

// Backward compatibility export
export const getAlignmentMetrics = getEnhancedAlignmentMetrics;
