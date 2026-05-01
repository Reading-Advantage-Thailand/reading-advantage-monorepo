"use client";

import React, { useEffect, useState, useCallback } from "react";
import { TeacherOverviewKPIs } from "./teacher-overview-kpis";
import { ClassSummaryTable, ClassSummaryData } from "./class-summary-table";
import AIInsights from "./ai-insights";
import { useDashboardTelemetry } from "./telemetry-tracker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScopedI18n } from "@/locales/client";

export interface TeacherDashboardContentProps {
  userId: string;
}

export function TeacherDashboardContent({
  userId,
}: TeacherDashboardContentProps) {
  const t = useScopedI18n("pages.teacher.dashboardPage") as any;
  const [overviewData, setOverviewData] = useState<any>(null);
  const [classesData, setClassesData] = useState<ClassSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Setup telemetry
  const telemetry = useDashboardTelemetry();

  useEffect(() => {
    telemetry.setUserId(userId);
    telemetry.trackComponentLoad("teacher-dashboard", Date.now());
  }, [userId, telemetry]);

  // Fetch teacher overview data
  const fetchOverview = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/teacher/overview");
      if (!response.ok) {
        throw new Error("Failed to fetch overview");
      }
      const data = await response.json();
      setOverviewData(data);
      return data;
    } catch (err) {
      console.error("Error fetching overview:", err);
      throw err;
    }
  }, []);

  // Fetch teacher classes
  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/teacher/classes");
      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }
      const data = await response.json();

      // Transform to ClassSummaryData format
      const transformedClasses: ClassSummaryData[] = data.classes.map(
        (cls: any) => ({
          id: cls.id,
          name: cls.name,
          classCode: cls.classCode,
          studentCount: cls.studentCount,
          activeStudents7d: cls.activeStudents7d,
          averageLevel: cls.averageLevel,
          totalXp: cls.totalXp,
          createdAt: cls.createdAt,
          archived: cls.archived,
          atRisk: cls.activeStudents7d < cls.studentCount * 0.3, // Mark as at-risk if < 30% active
        })
      );

      setClassesData(transformedClasses);
      return transformedClasses;
    } catch (err) {
      console.error("Error fetching classes:", err);
      throw err;
    }
  }, []);

  // Fetch AI insights
  // Initial data fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchOverview(), fetchClasses()]);
      setLastUpdate(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchClasses]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Setup SSE/WebSocket for real-time updates (with fallback to polling)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    const setupRealTimeUpdates = () => {
      // Try to setup SSE first
      try {
        eventSource = new EventSource(
          `/api/v1/metrics/stream?userId=${userId}&scope=teacher`
        );

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Update relevant data based on event type
            if (data.type === "overview_update") {
              setOverviewData((prev: any) => ({ ...prev, ...data.payload }));
            } else if (data.type === "class_update") {
              fetchClasses();
            }

            setLastUpdate(new Date());
          } catch (err) {
            console.error("Error processing SSE event:", err);
          }
        };

        eventSource.onerror = () => {
          console.warn("SSE connection failed, falling back to polling");
          eventSource?.close();
          setupPolling();
        };
      } catch (err) {
        console.warn("SSE not available, using polling");
        setupPolling();
      }
    };

    const setupPolling = () => {
      // Fallback to polling every 5 minutes
      pollingInterval = setInterval(
        () => {
          fetchOverview();
          fetchClasses();
        },
        5 * 60 * 1000
      );
    };

    setupRealTimeUpdates();

    return () => {
      eventSource?.close();
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [userId, fetchOverview, fetchClasses]);

  // Handle manual refresh
  const handleRefresh = async () => {
    await fetchAllData();
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error.title")}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("error.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <TeacherOverviewKPIs
        data={{
          totalClasses: overviewData?.summary?.totalClasses || 0,
          totalStudents: overviewData?.summary?.totalStudents || 0,
          activeStudents30d: overviewData?.summary?.activeStudents30d || 0,
          averageClassLevel: overviewData?.summary?.averageClassLevel || 0,
          pendingAssignments: overviewData?.summary?.pendingAssignments || 0,
          studentsActiveToday:
            overviewData?.recentActivity?.studentsActiveToday || 0,
          assignmentsCompletedToday:
            overviewData?.recentActivity?.assignmentsCompletedToday || 0,
        }}
        loading={loading}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Class Summary Table - Takes 2/3 width on large screens */}
        <div>
          <ClassSummaryTable classes={classesData} loading={loading} />
        </div>

        {/* AI Insights for all teacher's classes */}
        <div>
          <AIInsights scope="teacher" contextId={userId} />
        </div>
      </div>

      {/* Last Update Timestamp */}
      <div className="text-xs text-muted-foreground text-right">
        {t("lastUpdated", {
          time: mounted ? lastUpdate.toLocaleTimeString() : "--:--:--",
        })}
      </div>
    </>
  );
}
