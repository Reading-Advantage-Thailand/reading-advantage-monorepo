import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { GoalsService } from "@/server/services/goals-service";
import { CreateGoalInput, UpdateGoalInput } from "@/types/learning-goals";

/**
 * Get user's goals
 */
export async function getUserGoals(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as any;
    const includeProgress = searchParams.get("includeProgress") === "true";

    // Sync progress from user activities before fetching goals
    await GoalsService.syncProgressFromActivities(session.user.id);

    const goals = await GoalsService.getUserGoals(
      session.user.id,
      status,
      includeProgress
    );

    return NextResponse.json({
      success: true,
      goals,
    });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

/**
 * Create a new goal
 */
export async function createGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateGoalInput;

    const goal = await GoalsService.createGoal(session.user.id, body);

    return NextResponse.json(
      {
        success: true,
        goal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to create goal" },
      { status: 500 }
    );
  }
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract goal ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!goalId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Goal ID is required" },
        { status: 400 }
      );
    }

    const goal = await GoalsService.getGoalById(goalId, session.user.id);

    if (!goal) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Goal not found" },
        { status: 404 }
      );
    }

    // Calculate progress
    const progress = await GoalsService.calculateProgress(
      goalId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      goal,
      progress,
    });
  } catch (error) {
    console.error("Error fetching goal:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch goal" },
      { status: 500 }
    );
  }
}

/**
 * Update a goal
 */
export async function updateGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract goal ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!goalId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Goal ID is required" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as UpdateGoalInput;

    await GoalsService.updateGoal(goalId, session.user.id, body);

    // Fetch updated goal
    const updatedGoal = await GoalsService.getGoalById(
      goalId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      goal: updatedGoal,
    });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to update goal" },
      { status: 500 }
    );
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract goal ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!goalId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Goal ID is required" },
        { status: 400 }
      );
    }

    await GoalsService.deleteGoal(goalId, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Goal deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to delete goal" },
      { status: 500 }
    );
  }
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Extract goal ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const goalId = pathParts[pathParts.indexOf("goals") + 1];

    if (!goalId) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Goal ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { value, note, activityId, activityType } = body;

    if (typeof value !== "number") {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Value must be a number" },
        { status: 400 }
      );
    }

    const goal = await GoalsService.updateProgress(
      goalId,
      session.user.id,
      value,
      activityId,
      activityType,
      note
    );

    return NextResponse.json({
      success: true,
      goal,
    });
  } catch (error) {
    console.error("Error updating goal progress:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to update progress" },
      { status: 500 }
    );
  }
}

/**
 * Get goal recommendations
 */
export async function getGoalRecommendations(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const recommendations = await GoalsService.getGoalRecommendations(
      session.user.id
    );

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

/**
 * Get user goal summary
 */
export async function getUserGoalSummary(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const summary = await GoalsService.getUserGoalSummary(session.user.id);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
