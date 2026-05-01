"use client";

import React from "react";
import { KPICard } from "./kpi-card";
import {
  Users,
  BookOpen,
  Target,
  TrendingUp,
  Zap,
  CheckCircle,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";

export interface TeacherOverviewKPIsProps {
  data: {
    totalClasses: number;
    totalStudents: number;
    activeStudents30d: number;
    averageClassLevel: number;
    pendingAssignments: number;
    studentsActiveToday: number;
    assignmentsCompletedToday: number;
    weeklyXP?: number;
    averageAccuracy?: number;
    readingVelocity?: number;
    onTrackPercentage?: number;
  };
  loading?: boolean;
}

export function TeacherOverviewKPIs({
  data,
  loading = false,
}: TeacherOverviewKPIsProps) {
  const t = useScopedI18n("pages.teacher.dashboardPage.kpis") as any;
  const activePercentage =
    data.totalStudents > 0
      ? Math.round((data.activeStudents30d / data.totalStudents) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Total Classes */}
      <KPICard
        title={t("totalClasses")}
        value={data.totalClasses}
        description={`${t("managing")} ${data.totalClasses} ${data.totalClasses === 1 ? t("class") : t("classes")}`}
        icon={BookOpen}
        loading={loading}
        status="info"
      />

      {/* Total Students */}
      <KPICard
        title={t("totalStudents")}
        value={data.totalStudents}
        description={t("acrossAllClasses")}
        icon={Users}
        loading={loading}
        status="info"
      />

      {/* Active Students (30d) */}
      <KPICard
        title={t("activeStudents")}
        value={`${activePercentage}%`}
        description={`${data.activeStudents30d} ${t("of")} ${data.totalStudents} ${t("active30d")}`}
        icon={TrendingUp}
        loading={loading}
        status={
          activePercentage >= 80
            ? "success"
            : activePercentage >= 50
              ? "warning"
              : "error"
        }
        trend={
          activePercentage > 0
            ? {
                value: activePercentage,
                direction: activePercentage >= 70 ? "up" : "down",
                label: t("engagementRate"),
              }
            : undefined
        }
      />

      {/* Average CEFR Level */}
      <KPICard
        title={t("averageLevel")}
        value={data.averageClassLevel.toFixed(1)}
        description={t("classAverageLevel")}
        icon={Target}
        loading={loading}
        status="info"
        tooltip={t("averageLevelTooltip")}
      />

      {/* Weekly XP (if provided) */}
      {data.weeklyXP !== undefined && (
        <KPICard
          title={t("weeklyXP")}
          value={data.weeklyXP.toLocaleString()}
          description={t("xpEarnedThisWeek")}
          icon={Zap}
          loading={loading}
          status="success"
        />
      )}

      {/* Average Accuracy (if provided) */}
      {data.averageAccuracy !== undefined && (
        <KPICard
          title={t("accuracy")}
          value={`${Math.round(data.averageAccuracy)}%`}
          description={t("averageQuizAccuracy")}
          icon={CheckCircle}
          loading={loading}
          status={
            data.averageAccuracy >= 80
              ? "success"
              : data.averageAccuracy >= 60
                ? "warning"
                : "error"
          }
        />
      )}

      {/* Reading Velocity (if provided) */}
      {data.readingVelocity !== undefined && (
        <KPICard
          title={t("readingVelocity")}
          value={data.readingVelocity.toFixed(1)}
          description={t("booksPerWeek")}
          icon={TrendingUp}
          loading={loading}
          status="info"
        />
      )}

      {/* On-Track Percentage (if provided) */}
      {data.onTrackPercentage !== undefined && (
        <KPICard
          title={t("onTrack")}
          value={`${Math.round(data.onTrackPercentage)}%`}
          description={t("studentsMeetingGoals")}
          icon={Target}
          loading={loading}
          status={
            data.onTrackPercentage >= 80
              ? "success"
              : data.onTrackPercentage >= 60
                ? "warning"
                : "error"
          }
        />
      )}

      {/* Students Active Today */}
      <KPICard
        title={t("activeToday")}
        value={data.studentsActiveToday}
        description={t("studentsActiveToday")}
        icon={Users}
        loading={loading}
        status="success"
      />

      {/* Assignments Completed Today */}
      <KPICard
        title={t("completedToday")}
        value={data.assignmentsCompletedToday}
        description={t("assignmentsCompletedToday")}
        icon={CheckCircle}
        loading={loading}
        status="success"
      />

      {/* Pending Assignments */}
      <KPICard
        title={t("pendingAssignments")}
        value={data.pendingAssignments}
        description={t("assignmentsWithIncompleteWork")}
        icon={BookOpen}
        loading={loading}
        status={
          data.pendingAssignments === 0
            ? "success"
            : data.pendingAssignments < 10
              ? "info"
              : "warning"
        }
        tooltip={t("pendingAssignmentsTooltip")}
      />
    </div>
  );
}
