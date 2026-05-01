/**
 * Student Dashboard Data Layer
 * Centralized data fetching for the student dashboard
 */

import { VelocityMetrics } from "@/server/services/metrics/velocity-service";
import { GenreMetricsResponse } from "@/server/services/metrics/genre-engagement-service";

export interface StudentDashboardData {
  user: {
    id: string;
    name: string | null;
    email: string;
    level: number;
    cefrLevel: string;
    xp: number;
  };
  velocity: VelocityMetrics | null;
  genres: GenreMetricsResponse | null;
  activityLogs: any[];
  srsHealth: any | null;
  aiInsights: any | null;
}

/**
 * Fetch velocity metrics for a student
 */
export async function fetchVelocityMetrics(
  userId: string
): Promise<VelocityMetrics | null> {
  try {
    const response = await fetch(
      `/api/v1/metrics/velocity?studentId=${userId}`
    );
    if (!response.ok) {
      console.error("Failed to fetch velocity metrics:", response.statusText);
      return null;
    }
    const data = await response.json();
    return data.student || null;
  } catch (error) {
    console.error("Error fetching velocity metrics:", error);
    return null;
  }
}

/**
 * Fetch genre engagement metrics for a student
 */
export async function fetchGenreMetrics(
  userId: string,
  timeframe: "7d" | "30d" | "90d" | "6m" = "30d"
): Promise<GenreMetricsResponse | null> {
  try {
    const response = await fetch(
      `/api/v1/metrics/genres?studentId=${userId}&timeframe=${timeframe}&enhanced=true&includeRecommendations=true`
    );
    if (!response.ok) {
      console.error("Failed to fetch genre metrics:", response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching genre metrics:", error);
    return null;
  }
}

/**
 * Fetch activity logs for a student
 */
export async function fetchActivityLogs(userId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/v1/users/${userId}/activitylog`);
    if (!response.ok) {
      console.error("Failed to fetch activity logs:", response.statusText);
      return [];
    }
    const data = await response.json();
    return data.activityLogs || [];
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return [];
  }
}

/**
 * Fetch SRS health metrics for a student
 */
export async function fetchSRSHealth(userId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `/api/v1/metrics/srs?studentId=${userId}&includeDetails=true`
    );
    if (!response.ok) {
      console.error("Failed to fetch SRS health:", response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching SRS health:", error);
    return null;
  }
}

/**
 * Fetch AI insights for a student
 */
export async function fetchAIInsights(userId: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/v1/ai/summary?userId=${userId}`);
    if (!response.ok) {
      // AI insights are optional, don't log errors
      return null;
    }
    return await response.json();
  } catch (error) {
    // AI insights are optional, don't log errors
    return null;
  }
}

/**
 * Fetch activity timeline data
 */
export async function fetchActivityTimeline(
  userId: string,
  timeframe: "7d" | "30d" | "90d" = "30d"
): Promise<any | null> {
  try {
    const response = await fetch(
      `/api/v1/metrics/activity?entityId=${userId}&scope=student&format=timeline&timeframe=${timeframe}`
    );
    if (!response.ok) {
      console.error("Failed to fetch activity timeline:", response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching activity timeline:", error);
    return null;
  }
}

/**
 * Check feature flag for student
 */
export async function checkFeatureFlag(
  licenseKey: string,
  flagName: string
): Promise<boolean> {
  // For now, return true for dash_v2_student as it's in rollout
  // This should be replaced with actual feature flag checking logic
  if (flagName === "dash_v2_student") {
    return true;
  }
  return false;
}
