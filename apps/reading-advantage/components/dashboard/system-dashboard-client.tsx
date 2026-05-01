"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useScopedI18n } from "@/locales/client";
import axios from "axios";
import MetricsCards from "@/components/dashboard/metrics-cards";
import ActivityCharts from "@/components/dashboard/activity-charts";
import AIInsights from "@/components/dashboard/ai-insights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Activity,
  Brain,
  Settings,
  Download,
  RefreshCw,
  Calendar,
  Filter,
} from "lucide-react";

// Modern redesigned components
import ModernLicenseUsage from "@/components/dashboard/modern-license-usage";
import ModernActiveUsers from "@/components/dashboard/modern-active-users";

// Types for dashboard data
interface DashboardData {
  overview?: {
    totalSchools?: number;
    totalStudents?: number;
    totalTeachers?: number;
    totalArticles?: number;
  };
  activity?: {
    readingSessions?: number;
    completionRate?: string;
  };
  health?: {
    database?: string;
    databaseResponseTime?: string;
    apiResponse?: string;
    apiResponseTime?: string;
    errorRate?: string;
    uptime?: string;
    lastChecked?: string;
  };
  recentActivities?: Array<{
    id: string;
    type: string;
    userId: string;
    userName: string | null;
    userRole: string;
    targetId: string;
    completed: boolean;
    timestamp: string;
    details?: any;
  }>;
  genres?: any;
  assignments?: any;
  dateRange?: string;
  generatedAt?: string;
  errors?: Record<string, string>;
}

export default function SystemDashboardClient() {
  const t = useScopedI18n("pages.system.dashboard.systemClient");
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState("30d");
  const [metricFilter, setMetricFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Helper function to get badge color based on status
  const getHealthBadgeClass = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("excellent") || statusLower.includes("fast")) {
      return "bg-emerald-600 dark:bg-emerald-500";
    } else if (statusLower.includes("good")) {
      return "bg-primary";
    } else if (statusLower.includes("slow") || statusLower.includes("medium")) {
      return "bg-amber-600 dark:bg-amber-500";
    } else if (statusLower.includes("error") || statusLower.includes("high")) {
      return "bg-red-600 dark:bg-red-500";
    } else if (statusLower.includes("low")) {
      return "bg-emerald-600 dark:bg-emerald-500";
    }
    return "bg-gray-500 dark:bg-gray-400";
  };

  // Helper function to format activity type
  const formatActivityType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Helper function to format timestamp to relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  // Helper function to get activity color
  const getActivityColor = (type: string, index: number) => {
    const colors = ["emerald", "blue", "amber", "violet", "rose"];
    return colors[index % colors.length];
  };

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateRange,
        ...(metricFilter !== "all" && { filter: metricFilter }),
      });

      // Use system-wide metrics endpoint for overview
      let response = await axios.get(`/api/v1/metrics/system?${params}`);

      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange, metricFilter]);

  useEffect(() => {
    // Fetch initial data
    fetchMetrics();
  }, [dateRange, metricFilter, fetchMetrics]);
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  const handleExport = () => {
    // Export dashboard data
    const exportedData = {
      dateRange,
      metricFilter,
      data: dashboardData,
    };

    const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t("dateRange.7d")}</SelectItem>
                <SelectItem value="30d">{t("dateRange.30d")}</SelectItem>
                <SelectItem value="90d">{t("dateRange.90d")}</SelectItem>
                <SelectItem value="all">{t("dateRange.all")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!dashboardData}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? t("refreshing") : t("refresh")}
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>{t("loading")}</span>
            </div>
          </div>
        ) : dashboardData ? (
          <div>
            {/* Metrics Overview */}
            <section className="mb-6">
              <MetricsCards dateRange={dateRange} />
              {dashboardData?.errors && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    {t("metricsUnavailableTitle")}
                  </h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {Object.entries(dashboardData.errors).map(
                      ([key, error]) =>
                        error && (
                          <li key={key}>
                            • {key}: {String(error)}
                          </li>
                        )
                    )}
                  </ul>
                </div>
              )}
            </section>

            {/* Main Dashboard Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  {t("tabs.overview")}
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex items-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  {t("tabs.activity")}
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {t("tabs.insights")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Key Metrics Stats - Redesigned */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("cards.totalSchools.title")}
                      </CardTitle>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Settings className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        {dashboardData?.overview?.totalSchools || "0"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("cards.totalSchools.desc")}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-emerald-500 dark:border-l-emerald-400 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("cards.totalUsers.title")}
                      </CardTitle>
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {(
                          (dashboardData?.overview?.totalStudents || 0) +
                          (dashboardData?.overview?.totalTeachers || 0)
                        ).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("cards.totalUsers.count", {
                          students:
                            dashboardData?.overview?.totalStudents?.toLocaleString() ||
                            "0",
                          teachers:
                            dashboardData?.overview?.totalTeachers?.toLocaleString() ||
                            "0",
                        })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-violet-500 dark:border-l-violet-400 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("cards.totalArticles.title")}
                      </CardTitle>
                      <div className="h-8 w-8 rounded-full bg-violet-500/10 dark:bg-violet-400/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                        {dashboardData?.overview?.totalArticles?.toLocaleString() ||
                          "0"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("cards.totalArticles.desc")}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-amber-500 dark:border-l-amber-400 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("cards.completionRate.title")}
                      </CardTitle>
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {dashboardData?.activity?.completionRate || "0%"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("cards.completionRate.desc")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Analytics */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        {t("licenseUsage.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("licenseUsage.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ModernLicenseUsage />
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {t("activeUsers.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("activeUsers.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ModernActiveUsers page="system" dateRange={dateRange} />
                    </CardContent>
                  </Card>
                </div>

                {/* System Health & Recent Activity */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center">
                          <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {t("systemHealth.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("systemHealth.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/20 dark:border-emerald-400/20">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.database")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="default"
                              className={getHealthBadgeClass(
                                dashboardData?.health?.database || "excellent"
                              )}
                            >
                              {dashboardData?.health?.database ||
                                t("systemHealth.status.excellent")}
                            </Badge>
                            {dashboardData?.health?.databaseResponseTime && (
                              <span className="text-xs text-muted-foreground">
                                {dashboardData.health.databaseResponseTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.apiResponse")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="default"
                              className={getHealthBadgeClass(
                                dashboardData?.health?.apiResponse || "good"
                              )}
                            >
                              {dashboardData?.health?.apiResponse ||
                                t("systemHealth.status.good")}
                            </Badge>
                            {dashboardData?.health?.apiResponseTime && (
                              <span className="text-xs text-muted-foreground">
                                {dashboardData.health.apiResponseTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-violet-500/5 dark:bg-violet-400/5 border border-violet-500/20 dark:border-violet-400/20">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.errorRate")}
                            </span>
                          </div>
                          <Badge
                            variant="default"
                            className={getHealthBadgeClass(
                              dashboardData?.health?.errorRate || "low"
                            )}
                          >
                            {t("systemHealth.status.low")}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/20 dark:border-amber-400/20">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.uptime")}
                            </span>
                          </div>
                          <Badge
                            variant="default"
                            className="bg-emerald-600 dark:bg-emerald-500"
                          >
                            {dashboardData?.health?.uptime || "99.9%"}
                          </Badge>
                        </div>
                        {dashboardData?.health?.lastChecked && (
                          <div className="pt-2 border-t border-muted">
                            <p className="text-xs text-muted-foreground text-center">
                              Last checked:{" "}
                              {new Date(
                                dashboardData.health.lastChecked
                              ).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        {t("recentActivity.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("recentActivity.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboardData?.recentActivities &&
                        dashboardData.recentActivities.length > 0 ? (
                          dashboardData.recentActivities.map(
                            (activity, index) => {
                              const color = getActivityColor(
                                activity.type,
                                index
                              );
                              return (
                                <div
                                  key={activity.id}
                                  className={`flex items-start gap-4 p-3 rounded-lg hover:bg-${color}-500/5 dark:hover:bg-${color}-400/5 transition-colors border border-transparent hover:border-${color}-500/20 dark:hover:border-${color}-400/20`}
                                >
                                  <div className="flex-shrink-0 mt-1">
                                    <div
                                      className={`w-2 h-2 rounded-full bg-${color}-500 dark:bg-${color}-400`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">
                                      {activity.userName || "Unknown User"} -{" "}
                                      {formatActivityType(activity.type)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatRelativeTime(activity.timestamp)}
                                    </p>
                                  </div>
                                  {activity.completed && (
                                    <div className="flex-shrink-0">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Completed
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">
                              No recent activities
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6 mt-6">
                <ActivityCharts dateRange={dateRange} />
              </TabsContent>

              <TabsContent value="insights" className="space-y-6 mt-6">
                <AIInsights scope="system" />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">
                {t("noData.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("noData.description")}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
