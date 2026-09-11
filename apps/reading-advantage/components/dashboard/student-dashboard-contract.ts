/**
 * Zod contracts for the props passed from the dashboard server page to the
 * client dashboard components.
 */

import { z } from "zod";
import type { VelocityMetrics } from "@/server/services/metrics/velocity-service";
import type { GenreMetricsResponse } from "@/server/services/metrics/genre-engagement-service";
import type {
  DashboardAIInsight,
  StudentDashboardSRSHealth,
} from "@/server/services/metrics/student-dashboard-service";

export const dashboardGoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  currentValue: z.number(),
  targetValue: z.number(),
  unit: z.string(),
  targetDate: z.coerce.date(),
  status: z.string(),
  priority: z.string(),
});

export const activeGoalsPropSchema = z.array(dashboardGoalSchema);

const nullableObject = <T>() =>
  z.custom<T>((value) => value === null || typeof value === "object");

export const studentDashboardMetricsSchema = z.object({
  velocity: nullableObject<VelocityMetrics | null>(),
  genres: nullableObject<GenreMetricsResponse | null>(),
  srsHealth: nullableObject<StudentDashboardSRSHealth | null>(),
  aiInsights: nullableObject<{ insights: DashboardAIInsight[] } | null>(),
});

export type DashboardGoalProps = z.infer<typeof dashboardGoalSchema>;
export type StudentDashboardMetricsProps = z.infer<
  typeof studentDashboardMetricsSchema
>;
