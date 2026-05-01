"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Activity, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScopedI18n } from "@/locales/client";

interface ActivityData {
  date: string;
  count: number;
  level: number; // 0-4 for color intensity
}

interface CompactActivityHeatmapProps {
  licenseId?: string;
  entityId?: string;
  timeframe?: string;
  className?: string;
  scope?: "student" | "class" | "school" | "license";
}

export function CompactActivityHeatmap({
  licenseId,
  entityId,
  timeframe = "90d",
  className,
  scope,
}: CompactActivityHeatmapProps) {
  const t = useScopedI18n("pages.student.dashboard.compactHeatmap");
  const [data, setData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, peak: 0, average: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Step 1: Generate all 90 days with zero activity (dark/gray squares) FIRST
        const days = 90;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day

        // Create array with ALL days in the range, from oldest to newest
        const activityData: ActivityData[] = [];

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];

          // Initialize all days with zero activity (level 0 = gray/dark)
          activityData.push({
            date: dateStr,
            count: 0,
            level: 0,
          });
        }

        // Step 2: Fetch activity data from API
        const idParam =
          scope === "license"
            ? `licenseId=${licenseId}`
            : `entityId=${entityId}`;
        const response = await fetch(
          `/api/v1/metrics/activity?${idParam}&scope=${scope}&format=heatmap&timeframe=${timeframe}&granularity=day`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch activity data");
        }

        const result = await response.json();

        // Step 3: Map API data onto the generated days
        const buckets = result.buckets || [];

        // Aggregate all activity counts by date (sum all activity types per day)
        const apiDataMap = new Map<string, number>();
        buckets.forEach((bucket: any) => {
          const currentCount = apiDataMap.get(bucket.date) || 0;
          apiDataMap.set(
            bucket.date,
            currentCount + (bucket.activityCount || 0)
          );
        });

        // Step 4: Update the pre-generated days with API data
        activityData.forEach((item) => {
          const count = apiDataMap.get(item.date);

          // If this date has data from API, update it
          if (count !== undefined) {
            item.count = count;

            // Map count to intensity level (0-4) based on thresholds
            // 0 = no activity (gray/dark)
            // 1 = 1-2 activities (light green)
            // 2 = 3-5 activities (medium green)
            // 3 = 6-9 activities (dark green)
            // 4 = 10+ activities (darkest green)
            if (count >= 10) item.level = 4;
            else if (count >= 6) item.level = 3;
            else if (count >= 3) item.level = 2;
            else if (count >= 1) item.level = 1;
            else item.level = 0;
          }
          // If no data from API, keep it as level 0 (gray/dark)
        });

        setData(activityData);

        // Calculate stats
        const total = activityData.reduce((sum, d) => sum + d.count, 0);
        const peak = Math.max(...activityData.map((d) => d.count));
        const average =
          activityData.length > 0 ? Math.round(total / activityData.length) : 0;
        setStats({ total, peak, average });
      } catch (error) {
        console.error("Error fetching activity data:", error);
        // Fallback to empty data on error
        setData([]);
        setStats({ total: 0, peak: 0, average: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 60 seconds for real-time updates
    const refreshInterval = setInterval(fetchData, 60000);

    return () => clearInterval(refreshInterval);
  }, [licenseId, timeframe]);

  const getColorClass = (level: number) => {
    switch (level) {
      case 0:
        return "bg-muted hover:bg-muted/80";
      case 1:
        return "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50";
      case 2:
        return "bg-green-300 dark:bg-green-700/60 hover:bg-green-400 dark:hover:bg-green-700/80";
      case 3:
        return "bg-green-500 dark:bg-green-600/80 hover:bg-green-600 dark:hover:bg-green-600";
      case 4:
        return "bg-green-700 dark:bg-green-500 hover:bg-green-800 dark:hover:bg-green-400";
      default:
        return "bg-muted";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = "";

    data.forEach((item, index) => {
      const date = new Date(item.date);
      const month = date.toLocaleDateString("en-US", { month: "short" });
      const weekIndex = Math.floor(index / 7);

      // Add label at the start of each new month, aligned to the week column
      if (month !== lastMonth) {
        labels.push({ month, weekIndex });
        lastMonth = month;
      }
    });

    return labels;
  };

  // Organize data into weeks for proper grid layout
  const organizeDataByWeeks = () => {
    if (data.length === 0) return [];

    const weeks: ActivityData[][] = [];
    const firstDate = new Date(data[0].date);
    const firstDayOfWeek = firstDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Create first week with proper offset
    let currentWeek: ActivityData[] = [];
    let dataIndex = 0;

    // Calculate total weeks needed
    const totalDays = data.length;
    const totalWeeks = Math.ceil(totalDays / 7);

    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
      currentWeek = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        if (dataIndex < data.length) {
          currentWeek.push(data[dataIndex]);
          dataIndex++;
        } else {
          // Add empty placeholder for incomplete weeks
          currentWeek.push({
            date: "",
            count: 0,
            level: 0,
          });
        }
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const monthLabels = getMonthLabels();
  const weeks = organizeDataByWeeks();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>{t("lastRange")}</span>
          <Badge variant="secondary" className="text-xs">
            {stats.total.toLocaleString()} {t("activities")}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats - Compact horizontal layout */}
        <div className="flex items-center justify-center gap-10 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("stats.total")}
              </p>
              <p className="text-lg font-bold">
                {stats.total.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("stats.peakDay")}
              </p>
              <p className="text-lg font-bold">{stats.peak}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("stats.dailyAvg")}
              </p>
              <p className="text-lg font-bold">{stats.average}</p>
            </div>
          </div>
        </div>

        {/* Heatmap - Full width */}
        <div className="space-y-3">
          {/* Month labels */}
          <div className="relative h-4 ml-12">
            <div className="flex text-xs text-muted-foreground font-medium gap-1">
              {monthLabels.map((label, index) => (
                <div
                  key={index}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: `${(label.weekIndex / weeks.length) * 100}%`,
                  }}
                >
                  {label.month}
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="w-full overflow-x-auto pb-2">
            <TooltipProvider>
              <div className="inline-flex gap-1 min-w-full">
                {/* Day labels */}
                <div className="flex flex-col gap-1 mr-2 text-xs text-muted-foreground justify-around py-1">
                  <span>{t("dow.sun")}</span>
                  <span>{t("dow.mon")}</span>
                  <span>{t("dow.tue")}</span>
                  <span>{t("dow.wed")}</span>
                  <span>{t("dow.thu")}</span>
                  <span>{t("dow.fri")}</span>
                  <span>{t("dow.sat")}</span>
                </div>

                {/* Grid by weeks (columns) */}
                <div className="flex gap-1 flex-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((item, dayIndex) => {
                        // Empty placeholder
                        if (!item.date) {
                          return <div key={dayIndex} className="w-3 h-3" />;
                        }

                        return (
                          <Tooltip key={dayIndex}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "w-3 h-3 rounded-sm transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary",
                                  getColorClass(item.level)
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <p className="font-semibold">
                                  {formatDate(item.date)}
                                </p>
                                <p className="text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {item.count}
                                  </span>{" "}
                                  {t("activities")}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("legend.less")}</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn("w-3 h-3 rounded-sm", getColorClass(level))}
                  />
                ))}
              </div>
              <span>{t("legend.more")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("hoverForDetails")}
            </p>
          </div>

          {/* Top Activity Dates */}
          <div className="pt-4 border-t mt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {t("topActivityDates")}
            </h4>
            <div className="space-y-2">
              {[...data]
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {formatDate(item.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            weekday: "long",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {item.count}
                      </Badge>
                      <div
                        className={cn(
                          "w-3 h-3 rounded-sm",
                          getColorClass(item.level)
                        )}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
