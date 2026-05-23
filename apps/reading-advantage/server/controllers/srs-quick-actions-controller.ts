/**
 * SRS Quick Actions Controller
 *
 * Provides idempotent endpoints for executing SRS-related quick actions:
 * - Creating focused review sessions
 * - Sending practice reminders
 * - Reducing card loads for overloaded students
 * - Creating teacher alerts for at-risk students
 */

import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import {
  executeQuickAction,
  checkActionIdempotency,
  QuickActionRequest,
} from "@/server/services/srs-quick-actions-service";
import { db, eq, and, inArray } from "@reading-advantage/db";
import { users, classroomStudents, classroomTeachers } from "@reading-advantage/db/schema";

// ============================================================================
// Helper Functions
// ============================================================================

async function checkQuickActionAccess(
  userId: string,
  userRole: string,
  actionRequest: QuickActionRequest
): Promise<{ hasAccess: boolean; reason?: string }> {
  if (userRole === "SYSTEM" || userRole === "ADMIN") return { hasAccess: true };

  const { actionType, userId: targetUserId, classroomId, schoolId } = actionRequest;

  const [user] = await db
    .select({ schoolId: users.schoolId, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { hasAccess: false, reason: "User not found" };

  if (userRole === "STUDENT" || userRole === "USER") {
    if (targetUserId && targetUserId !== userId) {
      return { hasAccess: false, reason: "Students can only perform actions on their own data" };
    }
    if (classroomId || schoolId) {
      return { hasAccess: false, reason: "Students cannot perform actions at class or school level" };
    }
    if (!["review_session", "reduce_load"].includes(actionType)) {
      return { hasAccess: false, reason: "Action type not allowed for students" };
    }
    return { hasAccess: true };
  }

  if (userRole === "TEACHER") {
    const teacherClassroomRows = await db
      .select({ classroomId: classroomTeachers.classroomId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.teacherId, userId));
    const teacherClassroomIds = teacherClassroomRows.map((r) => r.classroomId);

    if (targetUserId) {
      const [studentInClass] = await db
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(
          and(
            eq(classroomStudents.studentId, targetUserId),
            teacherClassroomIds.length > 0 ? inArray(classroomStudents.classroomId, teacherClassroomIds) : eq(classroomStudents.classroomId, "")
          )
        )
        .limit(1);

      if (!studentInClass) {
        return { hasAccess: false, reason: "Student not in teacher's classes" };
      }
    }

    if (classroomId && !teacherClassroomIds.includes(classroomId)) {
      return { hasAccess: false, reason: "Classroom not accessible to teacher" };
    }

    if (schoolId && user.schoolId !== schoolId) {
      return { hasAccess: false, reason: "School not accessible to teacher" };
    }

    return { hasAccess: true };
  }

  return { hasAccess: false, reason: "Invalid user role" };
}

function validateQuickActionRequest(body: any): QuickActionRequest {
  const { actionType, userId, classroomId, schoolId, parameters } = body;

  if (!actionType || typeof actionType !== "string") {
    throw new Error("actionType is required and must be a string");
  }

  const validActionTypes = ["review_session", "reduce_load", "send_reminder", "teacher_alert", "break_session"];
  if (!validActionTypes.includes(actionType)) {
    throw new Error(`Invalid actionType. Must be one of: ${validActionTypes.join(", ")}`);
  }

  const scopeParams = [userId, classroomId, schoolId].filter(Boolean);
  if (scopeParams.length === 0) {
    throw new Error("At least one of userId, classroomId, or schoolId must be provided");
  }

  if (parameters && typeof parameters !== "object") {
    throw new Error("parameters must be an object");
  }

  return {
    actionType: actionType as "review_session" | "reduce_load" | "send_reminder" | "teacher_alert" | "break_session",
    userId: userId || undefined,
    classroomId: classroomId || undefined,
    schoolId: schoolId || undefined,
    parameters: parameters || {},
  };
}

// ============================================================================
// Main Controller Functions
// ============================================================================

export async function executeQuickActionController(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session?.user?.id) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ code: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
    }

    let actionRequest: QuickActionRequest;
    try {
      actionRequest = validateQuickActionRequest(body);
    } catch (error) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Invalid action request", details: { error: error instanceof Error ? error.message : "Unknown validation error" } },
        { status: 400 }
      );
    }

    const accessCheck = await checkQuickActionAccess(session.user.id, session.user.role, actionRequest);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Insufficient permissions", details: { reason: accessCheck.reason } },
        { status: 403 }
      );
    }

    const { actionId } = body;
    if (actionId) {
      const existingAction = await checkActionIdempotency(actionId);
      if (existingAction) {
        const duration = Date.now() - startTime;
        return NextResponse.json(existingAction, {
          headers: { "X-Response-Time": `${duration}ms`, "X-Idempotent": "true" },
        });
      }
    }

    const result = await executeQuickAction(actionRequest, session.user.id);
    const duration = Date.now() - startTime;

    console.log(`[QuickAction] ${actionRequest.actionType} - ${duration}ms - ${result.status}`);

    return NextResponse.json(result, {
      status: result.status === "success" ? 200 : result.status === "partial" ? 206 : 400,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate", "X-Response-Time": `${duration}ms` },
    });
  } catch (error) {
    console.error("[QuickAction] Error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to execute quick action", details: error instanceof Error ? { error: error.message } : {} },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}

export async function getAvailableQuickActions(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session?.user?.id) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const classroomId = searchParams.get("classroomId");
    const schoolId = searchParams.get("schoolId");

    const userRole = session.user.role;
    const availableActions: Array<{
      actionType: string;
      name: string;
      description: string;
      parameters: any;
      supportedScopes: string[];
    }> = [];

    availableActions.push({
      actionType: "review_session",
      name: "Start Review Session",
      description: "Create a focused flashcard review session",
      parameters: {
        cardLimit: { type: "number", default: 25, min: 5, max: 50 },
        targetFilter: { type: "enum", values: ["overdue", "due", "new", "learning"], default: "due" },
        sessionDuration: { type: "number", default: 15, min: 5, max: 45 },
        priority: { type: "enum", values: ["low", "medium", "high", "critical"], default: "medium" },
      },
      supportedScopes: ["student"],
    });

    availableActions.push({
      actionType: "reduce_load",
      name: "Reduce Card Load",
      description: "Temporarily reduce new card introduction rate",
      parameters: {},
      supportedScopes: ["student"],
    });

    if (userRole === "TEACHER" || userRole === "ADMIN" || userRole === "SYSTEM") {
      availableActions.push({
        actionType: "send_reminder",
        name: "Send Practice Reminder",
        description: "Send practice reminders to students",
        parameters: {
          reminderMessage: { type: "string", default: "Time for your daily flashcard practice!" },
          priority: { type: "enum", values: ["low", "medium", "high"], default: "medium" },
        },
        supportedScopes: ["student", "class", "school"],
      });
    }

    if (userRole === "TEACHER" || userRole === "ADMIN" || userRole === "SYSTEM") {
      availableActions.push({
        actionType: "teacher_alert",
        name: "Create Teacher Alert",
        description: "Alert teachers about at-risk students",
        parameters: {},
        supportedScopes: ["class"],
      });
    }

    const response = {
      availableActions,
      userRole,
      supportedScopes: studentId ? ["student"] : classroomId ? ["class"] : schoolId ? ["school"] : ["student", "class", "school"],
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;
    return NextResponse.json(response, { headers: { "Cache-Control": "private, max-age=300", "X-Response-Time": `${duration}ms` } });
  } catch (error) {
    console.error("[QuickAction] getAvailableActions error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to get available actions", details: error instanceof Error ? { error: error.message } : {} },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}
