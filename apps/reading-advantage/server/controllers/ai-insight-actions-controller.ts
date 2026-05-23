import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { db, eq, or } from "@reading-advantage/db";
import { aiInsights } from "@reading-advantage/db/schema";

/**
 * POST /api/v1/ai/insights/dismiss
 * Dismiss an AI insight
 */
export async function dismissInsight(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { insightId } = body;

    if (!insightId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "insightId is required" },
        { status: 400 }
      );
    }

    // Update the insight to mark as dismissed
    const [insight] = await db
      .update(aiInsights)
      .set({
        dismissed: true,
        dismissedAt: new Date(),
      })
      .where(eq(aiInsights.id, insightId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Insight dismissed successfully",
      data: insight,
    });
  } catch (error) {
    console.error("[API] /api/ai/insights/dismiss - Error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to dismiss insight",
        details: error instanceof Error ? { error: error.message } : {},
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/ai/insights/action
 * Mark an insight as action taken
 */
export async function markInsightAction(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { insightId } = body;

    if (!insightId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "insightId is required" },
        { status: 400 }
      );
    }

    const [insight] = await db
      .update(aiInsights)
      .set({
        actionTaken: true,
      })
      .where(eq(aiInsights.id, insightId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Insight action recorded",
      data: insight,
    });
  } catch (error) {
    console.error("[API] /api/ai/insights/action - Error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to record action",
        details: error instanceof Error ? { error: error.message } : {},
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/ai/insights/cache
 * Clear cached insights to force regeneration
 */
export async function clearInsightCache(req: ExtendedNextRequest) {
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

    // Delete insights matching the context (only defined conditions, matching Prisma's undefined-omitting behavior)
    const conditions = [eq(aiInsights.userId, userId)];
    if (classroomId) conditions.push(eq(aiInsights.classroomId, classroomId));
    if (licenseId) conditions.push(eq(aiInsights.licenseId, licenseId));

    await db.delete(aiInsights).where(or(...conditions));

    return NextResponse.json({
      success: true,
      message: "Insight cache cleared successfully",
    });
  } catch (error) {
    console.error("[API] /api/ai/insights/cache - Error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to clear cache",
        details: error instanceof Error ? { error: error.message } : {},
      },
      { status: 500 }
    );
  }
}
