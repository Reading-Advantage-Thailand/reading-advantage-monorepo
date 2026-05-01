/**
 * Intelligent Materialized View Refresh Strategy
 * Automatically manages refresh timing to reduce database load
 */

import { prisma } from "@/lib/prisma";
import { advancedCache } from "./advanced-cache";

interface ViewRefreshConfig {
  viewName: string;
  refreshInterval: number; // minutes
  refreshCondition?: () => Promise<boolean>;
  dependencies?: string[]; // other tables this view depends on
  priority: "high" | "medium" | "low";
  concurrentRefresh: boolean;
}

class MaterializedViewManager {
  private refreshConfigs: ViewRefreshConfig[] = [
    {
      viewName: "mv_activity_heatmap",
      refreshInterval: 5, // Every 5 minutes
      priority: "high",
      concurrentRefresh: true,
      dependencies: ["UserActivity"],
    },
    {
      viewName: "mv_student_velocity",
      refreshInterval: 15, // Every 15 minutes
      priority: "high",
      concurrentRefresh: true,
      dependencies: ["UserActivity", "LessonRecord"],
    },
    {
      viewName: "mv_class_velocity",
      refreshInterval: 15, // Every 15 minutes
      priority: "high",
      concurrentRefresh: true,
      dependencies: ["mv_student_velocity"],
    },
    {
      viewName: "mv_school_velocity",
      refreshInterval: 20, // Every 20 minutes
      priority: "high",
      concurrentRefresh: true,
      dependencies: ["mv_class_velocity"],
    },
    {
      viewName: "mv_assignment_funnel",
      refreshInterval: 10, // Every 10 minutes
      priority: "medium",
      concurrentRefresh: true,
      dependencies: ["StudentAssignment"],
    },
    {
      viewName: "mv_srs_health",
      refreshInterval: 30, // Every 30 minutes
      priority: "medium",
      concurrentRefresh: true,
      dependencies: ["UserWordRecord", "UserSentenceRecord"],
    },
    {
      viewName: "mv_genre_engagement",
      refreshInterval: 60, // Every hour
      priority: "medium",
      concurrentRefresh: true,
      dependencies: ["UserActivity", "Article"],
    },
    {
      viewName: "mv_alignment_metrics",
      refreshInterval: 120, // Every 2 hours
      priority: "low",
      concurrentRefresh: true,
      dependencies: ["LessonRecord", "Article"],
    },
    {
      viewName: "mv_daily_activity_rollups",
      refreshInterval: 60, // Every hour
      priority: "medium",
      concurrentRefresh: true,
      dependencies: ["UserActivity"],
    },
  ];

  private refreshQueue: string[] = [];
  private isRefreshing = new Set<string>();
  private lastRefreshTimes = new Map<string, number>();

  /**
   * Start the materialized view refresh scheduler
   */
  startScheduler(): void {
    // Initial health check
    this.checkViewHealth();

    // Schedule regular refreshes
    this.scheduleRefreshes();

    // Monitor for trigger conditions
    this.setupTriggerMonitoring();
  }

  /**
   * Check health of all materialized views
   */
  async checkViewHealth(): Promise<void> {
    try {
      const healthChecks = await Promise.all(
        this.refreshConfigs.map(async (config) => {
          try {
            const result = await prisma.$queryRawUnsafe<
              Array<{ row_count: bigint }>
            >(`SELECT count(*) as row_count FROM ${config.viewName}`);

            const rowCount = Number(result[0]?.row_count || 0);
            const isHealthy = rowCount > 0;

            if (!isHealthy) {
              console.warn(
                `[MatView] ${config.viewName} appears unhealthy (${rowCount} rows)`
              );
              this.queueRefresh(config.viewName, "health_check");
            }

            return {
              viewName: config.viewName,
              healthy: isHealthy,
              rowCount,
            };
          } catch (error) {
            console.error(
              `[MatView] Health check failed for ${config.viewName}:`,
              error
            );
            this.queueRefresh(config.viewName, "health_check_error");

            return {
              viewName: config.viewName,
              healthy: false,
              rowCount: 0,
            };
          }
        })
      );

      const unhealthyViews = healthChecks.filter((h) => !h.healthy);
      if (unhealthyViews.length > 0) {
        console.warn(
          `[MatView] Found ${unhealthyViews.length} unhealthy views:`,
          unhealthyViews.map((v) => v.viewName)
        );
      }
    } catch (error) {
      console.error("[MatView] Health check failed:", error);
    }
  }

  /**
   * Schedule regular refreshes based on configuration
   */
  private scheduleRefreshes(): void {
    this.refreshConfigs.forEach((config) => {
      const intervalMs = config.refreshInterval * 60 * 1000;

      setInterval(async () => {
        if (this.shouldRefresh(config)) {
          await this.queueRefresh(config.viewName, "scheduled");
        }
      }, intervalMs);
    });
  }

  /**
   * Setup monitoring for data changes that should trigger refreshes
   */
  private setupTriggerMonitoring(): void {
    // Monitor for significant activity spikes that should trigger immediate refresh
    setInterval(
      async () => {
        try {
          const recentActivityCount = await prisma.userActivity.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
              },
            },
          });

          // If more than 100 activities in last 5 minutes, refresh activity-related views
          if (recentActivityCount > 100) {
            await this.queueRefresh("mv_activity_heatmap", "activity_spike");
            await this.queueRefresh(
              "mv_daily_activity_rollups",
              "activity_spike"
            );
          }
        } catch (error) {
          console.error("[MatView] Trigger monitoring error:", error);
        }
      },
      5 * 60 * 1000
    ); // Check every 5 minutes
  }

  /**
   * Determine if a view should be refreshed
   */
  private shouldRefresh(config: ViewRefreshConfig): boolean {
    const lastRefresh = this.lastRefreshTimes.get(config.viewName) || 0;
    const timeSinceLastRefresh = Date.now() - lastRefresh;
    const refreshIntervalMs = config.refreshInterval * 60 * 1000;

    // Don't refresh if already refreshing
    if (this.isRefreshing.has(config.viewName)) {
      return false;
    }

    // Check if enough time has passed
    if (timeSinceLastRefresh < refreshIntervalMs) {
      return false;
    }

    return true;
  }

  /**
   * Queue a materialized view for refresh
   */
  async queueRefresh(viewName: string, reason: string): Promise<void> {
    if (this.isRefreshing.has(viewName)) {
      return;
    }

    const config = this.refreshConfigs.find((c) => c.viewName === viewName);
    if (!config) {
      console.warn(`[MatView] No config found for ${viewName}`);
      return;
    }

    // Add to queue if not concurrent, otherwise refresh immediately
    if (config.concurrentRefresh) {
      this.refreshView(viewName, config);
    } else {
      if (!this.refreshQueue.includes(viewName)) {
        this.refreshQueue.push(viewName);
        this.processRefreshQueue();
      }
    }
  }

  /**
   * Process the refresh queue sequentially
   */
  private async processRefreshQueue(): Promise<void> {
    if (this.refreshQueue.length === 0) {
      return;
    }

    const viewName = this.refreshQueue.shift()!;
    const config = this.refreshConfigs.find((c) => c.viewName === viewName)!;

    await this.refreshView(viewName, config);

    // Process next item after a short delay
    if (this.refreshQueue.length > 0) {
      setTimeout(() => this.processRefreshQueue(), 1000);
    }
  }

  /**
   * Refresh a specific materialized view
   */
  private async refreshView(
    viewName: string,
    config: ViewRefreshConfig
  ): Promise<void> {
    if (this.isRefreshing.has(viewName)) {
      return;
    }

    this.isRefreshing.add(viewName);
    const startTime = Date.now();

    try {
      // Try concurrent refresh first (if supported)
      try {
        await prisma.$executeRawUnsafe(
          `REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`
        );
      } catch (error) {
        // Fall back to regular refresh
        await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ${viewName}`);
      }

      // Update last refresh time
      this.lastRefreshTimes.set(viewName, Date.now());

      // Invalidate related cache entries
      if (config.dependencies) {
        config.dependencies.forEach((dep) => {
          advancedCache.invalidate(new RegExp(dep.toLowerCase()));
        });
      }

      const duration = Date.now() - startTime;
    } catch (error) {
      console.error(`[MatView] Failed to refresh ${viewName}:`, error);
    } finally {
      this.isRefreshing.delete(viewName);
    }
  }

  /**
   * Force refresh all materialized views
   */
  async forceRefreshAll(): Promise<void> {
    // Sort by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedConfigs = [...this.refreshConfigs].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    for (const config of sortedConfigs) {
      await this.queueRefresh(config.viewName, "force_refresh");

      // Small delay between refreshes to prevent overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  /**
   * Get refresh statistics
   */
  getRefreshStats(): {
    totalViews: number;
    currentlyRefreshing: number;
    queueLength: number;
    lastRefreshTimes: Record<string, number>;
  } {
    return {
      totalViews: this.refreshConfigs.length,
      currentlyRefreshing: this.isRefreshing.size,
      queueLength: this.refreshQueue.length,
      lastRefreshTimes: Object.fromEntries(this.lastRefreshTimes),
    };
  }
}

// Export singleton instance
export const matViewManager = new MaterializedViewManager();

/**
 * Initialize materialized view management
 */
export async function initializeMaterializedViews(): Promise<void> {
  try {
    matViewManager.startScheduler();
  } catch (error) {
    console.error("[MatView] Failed to initialize:", error);
  }
}
