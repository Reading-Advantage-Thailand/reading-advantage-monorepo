/**
 * Enhanced Velocity Metrics Controller
 *
 * Provides XP velocity, projections, and leveling ETAs for students, classes, and schools.
 * Supports CSV exports for teacher workflows.
 */

import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import {
  getStudentVelocity,
  getBulkStudentVelocity,
  getClassVelocity,
  getSchoolVelocity,
  getSystemVelocity,
  VelocityMetrics,
  ClassVelocityMetrics,
  SchoolVelocityMetrics,
  SystemVelocityMetrics,
} from "@/server/services/metrics/velocity-service";
import { getCachedVelocity } from "@/server/services/metrics/cache-service";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface VelocityApiResponse {
  scope: "student" | "class" | "school" | "system";
  timeframe: "7d" | "30d";
  includeConfidence: boolean;
  data:
    | VelocityMetrics
    | VelocityMetrics[]
    | ClassVelocityMetrics
    | SchoolVelocityMetrics
    | SystemVelocityMetrics;
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert velocity data to CSV format
 */
function convertToCSV(
  data:
    | VelocityMetrics
    | VelocityMetrics[]
    | ClassVelocityMetrics
    | SchoolVelocityMetrics
    | SystemVelocityMetrics,
  scope: string
): string {
  const dataArray = Array.isArray(data) ? data : [data];

  if (scope === "student") {
    const studentData = dataArray as VelocityMetrics[];

    const headers = [
      "User ID",
      "Email",
      "Name",
      "School ID",
      "Current XP",
      "Current Level",
      "CEFR Level",
      "XP (7d)",
      "Active Days (7d)",
      "XP/Day (7d)",
      "XP (30d)",
      "Active Days (30d)",
      "XP/Day (30d)",
      "EMA Velocity",
      "Std Dev",
      "XP to Next Level",
      "ETA (days)",
      "ETA Date",
      "ETA Low",
      "ETA High",
      "Confidence",
      "Low Signal",
      "Last Activity",
    ].join(",");

    const rows = studentData.map((s) =>
      [
        s.userId,
        s.email,
        s.displayName || "",
        s.schoolId || "",
        s.currentXp,
        s.currentLevel,
        s.cefrLevel,
        s.xpLast7d,
        s.activeDays7d,
        s.xpPerCalendarDay7d,
        s.xpLast30d,
        s.activeDays30d,
        s.xpPerCalendarDay30d,
        s.emaVelocity,
        s.stdDev,
        s.xpToNextLevel,
        s.etaDays || "",
        s.etaDate || "",
        s.etaConfidenceLow || "",
        s.etaConfidenceHigh || "",
        s.confidenceBand,
        s.isLowSignal,
        s.lastActivityAt?.toISOString() || "",
      ].join(",")
    );

    return [headers, ...rows].join("\n");
  } else if (scope === "class") {
    const classData = dataArray as ClassVelocityMetrics[];

    const headers = [
      "Classroom ID",
      "School ID",
      "Class Name",
      "Grade",
      "Total Students",
      "Total XP (7d)",
      "Active Students (7d)",
      "Avg XP/Student (7d)",
      "XP/Day (7d)",
      "Total XP (30d)",
      "Active Students (30d)",
      "Avg XP/Student (30d)",
      "XP/Day (30d)",
      "Engagement Rate (%)",
      "Low Signal",
      "Last Activity",
    ].join(",");

    const rows = classData.map((c) =>
      [
        c.classroomId,
        c.schoolId || "",
        c.classroomName || "",
        c.grade || "",
        c.totalStudents,
        c.totalXp7d,
        c.activeStudents7d,
        c.avgXpPerStudent7d,
        c.xpPerDay7d,
        c.totalXp30d,
        c.activeStudents30d,
        c.avgXpPerStudent30d,
        c.xpPerDay30d,
        c.engagementRate30d,
        c.isLowSignal,
        c.lastActivityAt?.toISOString() || "",
      ].join(",")
    );

    return [headers, ...rows].join("\n");
  } else {
    const schoolData = dataArray as SchoolVelocityMetrics[];

    const headers = [
      "School ID",
      "School Name",
      "Total Students",
      "Total XP (7d)",
      "Active Students (7d)",
      "Avg XP/Student (7d)",
      "XP/Day (7d)",
      "Total XP (30d)",
      "Active Students (30d)",
      "Avg XP/Student (30d)",
      "XP/Day (30d)",
      "Engagement Rate (%)",
      "Low Signal",
      "Last Activity",
    ].join(",");

    const rows = schoolData.map((s) =>
      [
        s.schoolId,
        s.schoolName,
        s.totalStudents,
        s.totalXp7d,
        s.activeStudents7d,
        s.avgXpPerStudent7d,
        s.xpPerDay7d,
        s.totalXp30d,
        s.activeStudents30d,
        s.avgXpPerStudent30d,
        s.xpPerDay30d,
        s.engagementRate30d,
        s.isLowSignal,
        s.lastActivityAt?.toISOString() || "",
      ].join(",")
    );

    return [headers, ...rows].join("\n");
  }
}

/**
 * Check if user has access to the requested scope
 */
async function checkAccess(
  session: any,
  scope: string,
  scopeId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const userRole = session.user.role as Role;

  // System/Admin can access everything
  if (userRole === Role.ADMIN || userRole === Role.SYSTEM) {
    return { allowed: true };
  }

  if (scope === "student") {
    // Students can only access their own data
    if (userRole === Role.STUDENT && scopeId !== session.user.id) {
      return {
        allowed: false,
        reason: "Students can only access their own velocity data",
      };
    }

    // Teachers can access students in their classes
    if (userRole === Role.TEACHER) {
      const teacherClasses = await prisma.classroomTeacher.findMany({
        where: { teacherId: session.user.id },
        select: { classroomId: true },
      });

      const classIds = teacherClasses.map((tc) => tc.classroomId);

      const studentInClass = await prisma.classroomStudent.findFirst({
        where: {
          studentId: scopeId,
          classroomId: { in: classIds },
        },
      });

      if (!studentInClass) {
        return { allowed: false, reason: "Student not in your classes" };
      }
    }

    return { allowed: true };
  }

  if (scope === "class") {
    // Teachers can access their own classes
    if (userRole === Role.TEACHER) {
      const isTeacher = await prisma.classroomTeacher.findFirst({
        where: {
          teacherId: session.user.id,
          classroomId: scopeId,
        },
      });

      if (!isTeacher) {
        return { allowed: false, reason: "Not a teacher of this class" };
      }
    }

    return { allowed: true };
  }

  if (scope === "school") {
    // Teachers can access their school data
    if (userRole === Role.TEACHER) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { schoolId: true },
      });

      if (user?.schoolId !== scopeId) {
        return { allowed: false, reason: "Not in this school" };
      }
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Invalid scope" };
}

// ============================================================================
// Controller
// ============================================================================

/**
 * GET /api/v1/metrics/velocity
 *
 * Query Parameters:
 * - scope: 'student' | 'class' | 'school' (required)
 * - id: scope ID (required for student/class, optional for school to get all)
 * - timeframe: '7d' | '30d' (default: '30d')
 * - includeConfidence: 'true' | 'false' (default: 'true')
 * - format: 'json' | 'csv' (default: 'json')
 * - classId: filter students by class (for scope=student with bulk query)
 * - schoolId: filter by school (for scope=student/class with bulk query)
 */
export async function getVelocityMetrics(req: ExtendedNextRequest) {
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
    const scope = searchParams.get("scope") as
      | "student"
      | "class"
      | "school"
      | null;
    const id = searchParams.get("id");
    const timeframe = (searchParams.get("timeframe") || "30d") as "7d" | "30d";
    const includeConfidence = searchParams.get("includeConfidence") !== "false";
    const format = searchParams.get("format") || "json";
    const classId = searchParams.get("classId");
    const schoolId = searchParams.get("schoolId");

    // Validate scope - allow empty scope for system-level aggregates
    if (scope && !["student", "class", "school", "system"].includes(scope)) {
      return NextResponse.json(
        {
          code: "INVALID_SCOPE",
          message: "Scope must be student, class, school, or system",
        },
        { status: 400 }
      );
    }

    // If no scope provided, default to system-level aggregates
    const actualScope = scope || "system";

    let data:
      | VelocityMetrics
      | VelocityMetrics[]
      | ClassVelocityMetrics
      | SchoolVelocityMetrics
      | SystemVelocityMetrics
      | null = null;

    // Handle different scopes
    if (actualScope === "student") {
      if (id) {
        // Single student
        const access = await checkAccess(session, "student", id);
        if (!access.allowed) {
          return NextResponse.json(
            { code: "FORBIDDEN", message: access.reason },
            { status: 403 }
          );
        }

        // Use cache for single student queries
        const cached = await getCachedVelocity(
          "student",
          id,
          () => getStudentVelocity(id, includeConfidence),
          { includeConfidence: includeConfidence.toString(), timeframe },
          5 * 60 * 1000 // 5 minute TTL
        );
        data = cached.data;
      } else if (classId || schoolId) {
        // Bulk students by class or school
        let studentIds: string[] = [];

        if (classId) {
          const access = await checkAccess(session, "class", classId);
          if (!access.allowed) {
            return NextResponse.json(
              { code: "FORBIDDEN", message: access.reason },
              { status: 403 }
            );
          }

          const students = await prisma.classroomStudent.findMany({
            where: { classroomId: classId },
            select: { studentId: true },
          });
          studentIds = students.map((s) => s.studentId);
        } else if (schoolId) {
          const access = await checkAccess(session, "school", schoolId);
          if (!access.allowed) {
            return NextResponse.json(
              { code: "FORBIDDEN", message: access.reason },
              { status: 403 }
            );
          }

          const students = await prisma.user.findMany({
            where: { schoolId, role: Role.STUDENT },
            select: { id: true },
          });
          studentIds = students.map((s) => s.id);
        }

        data = await getBulkStudentVelocity(studentIds, includeConfidence);
      } else {
        return NextResponse.json(
          {
            code: "MISSING_ID",
            message: "Must provide id, classId, or schoolId",
          },
          { status: 400 }
        );
      }
    } else if (actualScope === "class") {
      if (!id) {
        return NextResponse.json(
          { code: "MISSING_ID", message: "Must provide classId" },
          { status: 400 }
        );
      }

      const access = await checkAccess(session, "class", id);
      if (!access.allowed) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: access.reason },
          { status: 403 }
        );
      }

      data = await getClassVelocity(id);
    } else if (actualScope === "school") {
      if (!id) {
        return NextResponse.json(
          { code: "MISSING_ID", message: "Must provide schoolId" },
          { status: 400 }
        );
      }

      const access = await checkAccess(session, "school", id);
      if (!access.allowed) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: access.reason },
          { status: 403 }
        );
      }

      data = await getSchoolVelocity(id);
    } else if (actualScope === "system") {
      // System-level aggregated velocity metrics (no access control needed for admins)
      data = await getSystemVelocity();
    }

    if (!data) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "No velocity data found" },
        { status: 404 }
      );
    }

    // Handle CSV export
    if (format === "csv") {
      const csv = convertToCSV(data, actualScope);
      const filename = `velocity-${scope}-${id || "bulk"}-${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      });
    }

    // JSON response
    const response: VelocityApiResponse = {
      scope: actualScope,
      timeframe,
      includeConfidence,
      data,
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
      },
    });
  } catch (error) {
    console.error("[Controller] getVelocityMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch velocity metrics",
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
