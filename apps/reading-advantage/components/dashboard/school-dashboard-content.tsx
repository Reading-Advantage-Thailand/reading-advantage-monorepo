"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KPICard } from "./kpi-card";
import { AdoptionWidget } from "./adoption-widget";
import { TeacherEffectiveness } from "./teacher-effectiveness";
import { AlertCenter } from "./alert-center";
import AIInsights from "./ai-insights";
import { CompactActivityHeatmap } from "./compact-activity-heatmap";
import LicenseSelector from "../admin/license-selector";
import { Role } from "@prisma/client";
import { AdminOverviewResponse, Alert } from "@/types/dashboard";
import {
  Users,
  GraduationCap,
  TrendingUp,
  Target,
  Zap,
  BookOpen,
  Activity,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { useDashboardTelemetry } from "@/lib/telemetry/dashboard-telemetry";

interface License {
  id: string;
  schoolName: string;
  maxUsers: number;
  expiresAt: Date;
  _count?: {
    licenseUsers: number;
  };
}

interface SchoolDashboardContentProps {
  initialOverview: AdminOverviewResponse;
  userRole: Role;
  userLicenseId?: string;
  allLicenses?: License[];
}

export function SchoolDashboardContent({
  initialOverview,
  userRole,
  userLicenseId,
  allLicenses = [],
}: SchoolDashboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trackEvent } = useDashboardTelemetry();

  const [selectedLicenseId, setSelectedLicenseId] = useState<string>(
    userLicenseId || allLicenses[0]?.id || ""
  );
  const [timeframe, setTimeframe] = useState<string>(
    searchParams.get("timeframe") || "30d"
  );
  const [overview, setOverview] = useState(initialOverview);
  const t = useScopedI18n("pages.system.school.dashboard");

  const handleLicenseChange = useCallback(
    async (licenseId: string) => {
      setSelectedLicenseId(licenseId);
      trackEvent("dashboard.license_changed", { licenseId });

      // Fetch new overview data for the selected license
      try {
        const response = await fetch(
          `/api/v1/admin/overview?licenseId=${licenseId}&timeframe=${timeframe}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (response.ok) {
          const newOverview: AdminOverviewResponse = await response.json();
          setOverview(newOverview);
        } else {
          console.error("Failed to fetch overview data:", response.status);
        }
      } catch (error) {
        console.error("Error fetching overview data:", error);
      }
    },
    [trackEvent, timeframe]
  );

  const handleTimeframeChange = useCallback(
    async (newTimeframe: string) => {
      setTimeframe(newTimeframe);

      // Update URL with new timeframe
      const params = new URLSearchParams(searchParams.toString());
      params.set("timeframe", newTimeframe);
      router.push(`?${params.toString()}`, { scroll: false });

      trackEvent("dashboard.timeframe_changed", { timeframe: newTimeframe });

      // Fetch new data with the selected timeframe
      try {
        const response = await fetch(
          `/api/v1/admin/overview?timeframe=${newTimeframe}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (response.ok) {
          const newOverview: AdminOverviewResponse = await response.json();
          setOverview(newOverview);
        } else {
          console.error("Failed to fetch overview data:", response.status);
        }
      } catch (error) {
        console.error("Error fetching overview data:", error);
      }
    },
    [router, searchParams, trackEvent]
  );

  const handleDrillDownToTeacher = useCallback(
    (teacherId: string) => {
      const params = new URLSearchParams({ timeframe });
      trackEvent("dashboard.drilldown_clicked", {
        target: "teacher",
        teacherId,
        timeframe,
      });
      router.push(`/admin/teachers/${teacherId}?${params.toString()}`);
    },
    [router, timeframe, trackEvent]
  );

  const handleDrillDownToClass = useCallback(
    (classId: string) => {
      const params = new URLSearchParams({ timeframe });
      trackEvent("dashboard.drilldown_clicked", {
        target: "class",
        classId,
        timeframe,
      });
      router.push(`/admin/classes/${classId}?${params.toString()}`);
    },
    [router, timeframe, trackEvent]
  );

  const handleDrillDownToLevel = useCallback(
    (level: string, type: "grade" | "cefr") => {
      const params = new URLSearchParams({ timeframe, level, type });
      trackEvent("dashboard.drilldown_clicked", {
        target: "students_by_level",
        level,
        type,
        timeframe,
      });
      router.push(`/admin/students?${params.toString()}`);
    },
    [router, timeframe, trackEvent]
  );

  const handleAlertClick = useCallback(
    (alert: Alert) => {
      trackEvent("dashboard.alert_clicked", {
        alertId: alert.id,
        severity: alert.severity,
      });

      if (alert.schoolId) {
        router.push(`/admin/schools/${alert.schoolId}/alerts`);
      }
    },
    [router, trackEvent]
  );

  const handleViewAllAlerts = useCallback(() => {
    trackEvent("dashboard.view_all_clicked", { widget: "alerts" });
    // Don't redirect - let AlertCenter handle the dialog internally
  }, [trackEvent]);

  const handleWidgetView = useCallback(
    (widgetName: string) => {
      trackEvent("dashboard.widget_viewed", { widget: widgetName });
    },
    [trackEvent]
  );

  // Get timeframe label for descriptions
  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case "7d":
        return t("timeframeDescription.7d");
      case "90d":
        return t("timeframeDescription.90d");
      case "30d":
      default:
        return t("timeframeDescription.30d");
    }
  };

  const timeframeLabel = getTimeframeLabel(timeframe);

  return (
    <div className="space-y-6">
      {/* License Selector for SYSTEM users */}
      {userRole === Role.SYSTEM && allLicenses.length > 0 && (
        <LicenseSelector
          licenses={allLicenses}
          selectedLicenseId={selectedLicenseId}
          onLicenseChange={handleLicenseChange}
        />
      )}

      {/* Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <div className="flex gap-2 border rounded-lg p-1">
          {["7d", "30d", "90d"].map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {tf === "7d"
                ? t("timeframes.7d")
                : tf === "30d"
                  ? t("timeframes.30d")
                  : t("timeframes.90d")}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t("kpis.activeStudents.title")}
          value={overview.summary.activeUsers30d}
          description={timeframeLabel}
          icon={Users}
          tooltip={t("kpis.activeStudents.tooltip")}
          dataSource={t("kpis.dataSource.userActivity")}
        />
        <KPICard
          title={t("kpis.activeTeachers.title")}
          value={overview.summary.activeTeachers}
          description={t("kpis.activeTeachers.description", {
            total: overview.summary.totalTeachers,
          })}
          icon={GraduationCap}
          tooltip={t("kpis.activeTeachers.tooltip")}
          dataSource={t("kpis.dataSource.userActivity")}
        />
        <KPICard
          title={t("kpis.activeClassrooms.title")}
          value={overview.summary.activeClassrooms}
          description={t("kpis.activeClassrooms.description")}
          icon={BookOpen}
          tooltip={t("kpis.activeClassrooms.tooltip")}
          dataSource={t("kpis.dataSource.classroomActivity")}
        />
        <KPICard
          title={t("kpis.readingSessions.title")}
          value={overview.summary.totalReadingSessions.toLocaleString()}
          description={t("kpis.readingSessions.description")}
          icon={Activity}
          tooltip={t("kpis.readingSessions.tooltip")}
          dataSource={t("kpis.dataSource.lessonRecords")}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title={t("kpis.totalXp.title")}
          value={overview.recentActivity.readingSessionsToday.toLocaleString()}
          description={t("kpis.totalXp.description")}
          icon={Target}
          tooltip={t("kpis.totalXp.tooltip")}
          dataSource={t("kpis.dataSource.lessonRecords")}
        />
        <KPICard
          title={t("kpis.newUsers.title")}
          value={overview.recentActivity.newUsersToday}
          description={t("kpis.newUsers.description")}
          icon={TrendingUp}
          tooltip={t("kpis.newUsers.tooltip")}
          dataSource={t("kpis.dataSource.userRegistration")}
        />
        <KPICard
          title={t("kpis.systemHealth.title")}
          value={overview.systemHealth.status === "healthy" ? "✓" : "⚠"}
          description={t("kpis.systemHealth.description", {
            status: overview.systemHealth.status,
          })}
          icon={Zap}
          tooltip={t("kpis.systemHealth.tooltip")}
          dataSource={t("kpis.dataSource.systemMonitoring")}
          status={
            overview.systemHealth.status === "healthy" ? "success" : "warning"
          }
        />
      </div>

      {/* Main Widgets Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Adoption Widget */}
        <AdoptionWidget
          licenseId={selectedLicenseId}
          timeframe={timeframe}
          onDrillDown={handleDrillDownToLevel}
        />

        {/* Alert Center */}
        <AlertCenter
          licenseId={selectedLicenseId}
          onAlertClick={handleAlertClick}
          onViewAll={handleViewAllAlerts}
        />

        {/* Teacher Effectiveness and Activity Heatmap - Side by Side */}
        <TeacherEffectiveness
          licenseId={selectedLicenseId}
          timeframe={timeframe}
          onTeacherClick={handleDrillDownToTeacher}
        />

        <CompactActivityHeatmap
          licenseId={selectedLicenseId}
          timeframe={timeframe}
          scope="license"
        />

        {/* AI Insights and Smart Suggestions - Full Width Container */}
        <div className="lg:col-span-2">
          <AIInsights
            key={selectedLicenseId}
            scope="license"
            contextId={selectedLicenseId}
          />
        </div>
      </div>
    </div>
  );
}
