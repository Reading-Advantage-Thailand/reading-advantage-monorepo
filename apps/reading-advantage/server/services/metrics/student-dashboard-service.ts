/**
 * Student Dashboard Service
 *
 * Assembles the student dashboard metrics on the server so the dashboard
 * page can pass them as props instead of letting the browser fetch each
 * widget's data over HTTP. Mirrors the responses of the
 * `/api/v1/metrics/*` and `/api/v1/ai/summary` endpoints.
 */

import {
  getStudentVelocity,
  VelocityMetrics,
} from "@/server/services/metrics/velocity-service";
import {
  getGenreMetrics,
  GenreMetricsResponse,
} from "@/server/services/metrics/genre-engagement-service";
import { getStudentSRSHealth } from "@/server/services/metrics/srs-health-service";
import {
  QuickActionSuggestion,
  generateQuickActions,
} from "@/server/controllers/srs-health-controller";
import {
  generateStudentInsights,
  getCachedInsights,
  saveInsights,
} from "@/server/services/ai-insight-service";
import { AIInsightScope, GoalStatus, Role } from "@/lib/enums";
import type { DashboardAIInsightProps } from "@/components/dashboard/student-dashboard-contract";

const STAFF_ROLES: string[] = [Role.TEACHER, Role.ADMIN, Role.SYSTEM];

export type DashboardAIInsight = DashboardAIInsightProps;

export interface StudentDashboardSRSHealth {
  scope: "student";
  student: NonNullable<Awaited<ReturnType<typeof getStudentSRSHealth>>>;
  quickActions: QuickActionSuggestion[];
  /** Optional aggregate metrics; undefined mirrors the API response shape. */
  metrics?: { avgRetentionRate: number } | null;
}

export interface StudentDashboardMetrics {
  velocity: VelocityMetrics | null;
  genres: GenreMetricsResponse | null;
  srsHealth: StudentDashboardSRSHealth | null;
  aiInsights: { insights: DashboardAIInsight[] } | null;
}

export interface StudentDashboardGoal {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  targetDate: Date;
  status: string;
  priority: string;
}

/**
 * Fetches the velocity metrics for one student, returning null on failure.
 * @param userId The student user id.
 * @returns The velocity metrics or null.
 */
async function fetchVelocity(userId: string): Promise<VelocityMetrics | null> {
  try {
    return await getStudentVelocity(userId, true);
  } catch (error) {
    console.error("[DashboardService] velocity fetch failed:", error);
    return null;
  }
}

/**
 * Fetches the genre engagement metrics for one student, returning null on failure.
 * @param userId The student user id.
 * @returns The genre metrics or null.
 */
async function fetchGenres(userId: string): Promise<GenreMetricsResponse | null> {
  try {
    return await getGenreMetrics("student", userId, "30d");
  } catch (error) {
    console.error("[DashboardService] genre fetch failed:", error);
    return null;
  }
}

/**
 * Fetches the SRS health payload for staff viewers, mirroring the staff-only
 * `/api/v1/metrics/srs` route. Students receive null, matching prior behavior.
 * @param userId The student user id.
 * @param role The viewing user's role.
 * @returns The SRS health payload or null.
 */
async function fetchSRSHealth(
  userId: string,
  role: string,
): Promise<StudentDashboardSRSHealth | null> {
  if (!STAFF_ROLES.includes(role)) return null;
  try {
    const student = await getStudentSRSHealth(userId);
    if (!student) return null;
    return {
      scope: "student",
      student,
      quickActions: generateQuickActions("student", { student }, []),
    };
  } catch (error) {
    console.error("[DashboardService] SRS health fetch failed:", error);
    return null;
  }
}

/**
 * Fetches AI coach insights for one student, generating and caching a first
 * set when none exist. Mirrors `/api/v1/ai/summary?kind=student`.
 * @param userId The student user id.
 * @returns The insights payload or null.
 */
async function fetchAIInsights(
  userId: string,
): Promise<{ insights: DashboardAIInsight[] } | null> {
  try {
    let insights = await getCachedInsights(AIInsightScope.STUDENT, userId);

    if (insights.length === 0) {
      const generated = await generateStudentInsights(userId);
      if (generated.length > 0) {
        await saveInsights(generated, AIInsightScope.STUDENT, userId);
        insights = await getCachedInsights(AIInsightScope.STUDENT, userId);
      }
    }

    return {
      insights: insights.map((insight: any) => ({
        id: insight.id,
        type: String(insight.type).toLowerCase(),
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        priority: String(insight.priority).toLowerCase(),
        data: insight.data || {},
        createdAt: insight.createdAt.toISOString(),
      })) as DashboardAIInsight[],
    };
  } catch (error) {
    console.error("[DashboardService] AI insights fetch failed:", error);
    return null;
  }
}

/**
 * Assembles all student dashboard metrics for the server page.
 * @param userId The student user id.
 * @param role The viewing user's role.
 * @returns The dashboard metrics bundle.
 */
export async function getStudentDashboardMetrics(
  userId: string,
  role: string,
): Promise<StudentDashboardMetrics> {
  const [velocity, genres, srsHealth, aiInsights] = await Promise.all([
    fetchVelocity(userId),
    fetchGenres(userId),
    fetchSRSHealth(userId, role),
    fetchAIInsights(userId),
  ]);

  return { velocity, genres, srsHealth, aiInsights };
}

/**
 * Fetches the top active goals for the dashboard widget, mirroring the
 * `/api/v1/goals?status=ACTIVE` endpoint including its progress sync.
 * @param userId The student user id.
 * @returns Up to three active goals.
 */
export async function getStudentActiveGoals(
  userId: string,
): Promise<StudentDashboardGoal[]> {
  try {
    const { GoalsService } = await import("@/server/services/goals-service");
    await GoalsService.syncProgressFromActivities(userId);
    const goals = await GoalsService.getUserGoals(userId, GoalStatus.ACTIVE, false);
    return goals.slice(0, 3).map((goal) => ({
      id: goal.id,
      title: goal.title,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      unit: goal.unit,
      targetDate: goal.targetDate,
      status: goal.status,
      priority: goal.priority,
    }));
  } catch (error) {
    console.error("[DashboardService] active goals fetch failed:", error);
    return [];
  }
}
