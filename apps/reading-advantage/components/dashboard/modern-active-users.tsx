"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface ChartData {
  date: string;
  noOfUsers: number;
}

interface DailyUserData {
  date: string;
  users: ActiveUser[];
}

interface ModernActiveUsersProps {
  page?: string;
  licenseId?: string;
  dateRange?: string;
}

export default function ModernActiveUsers({
  page = "system",
  licenseId,
  dateRange = "7d",
}: ModernActiveUsersProps) {
  const t = useScopedI18n("components.modernActiveUsers");
  const chartConfig = {
    noOfUsers: {
      label: t("labels.activeUsers"),
      color: "hsl(var(--primary))",
    },
  };
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [todayUsers, setTodayUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<{
    value: number;
    direction: "up" | "down";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);

        const chartRes = await fetch(
          `/api/v1/activity/active-users?dateRange=${dateRange}`,
          {
            cache: "no-store",
          }
        );

        if (chartRes.ok) {
          const chartData = await chartRes.json();
          let dataToUse = chartData.total || [];

          let days: number;
          if (dateRange === "7d") {
            days = 7;
          } else if (dateRange === "30d") {
            days = 30;
          } else if (dateRange === "90d") {
            days = 90;
          } else if (dateRange === "all") {
            // For 'all time', use all available data
            days = dataToUse.length > 0 ? dataToUse.length : 365;
          } else {
            days = 30; // default
          }

          const filteredData =
            dateRange === "all" && dataToUse.length > 0
              ? dataToUse
              : fillMissingDates(dataToUse, days);
          setChartData(filteredData);

          // Calculate trend
          if (filteredData.length >= 2) {
            const latest =
              filteredData[filteredData.length - 1]?.noOfUsers || 0;
            const previous =
              filteredData[filteredData.length - 2]?.noOfUsers || 0;
            if (previous > 0) {
              const change = ((latest - previous) / previous) * 100;
              setTrend({
                value: Math.abs(change),
                direction: change >= 0 ? "up" : "down",
              });
            }
          }
        } else {
          const message = `${chartRes.status} ${chartRes.statusText}`;
          console.error("Active users chart request failed:", message);
          setError(message);
        }

        // Fetch today's users with caching
        const dailyRes = await fetch("/api/v1/activity/daily-active-users", {
          cache: "no-store",
        });
        if (dailyRes.ok) {
          const dailyData = await dailyRes.json();
          const today = new Date().toISOString().split("T")[0];
          const todayData = dailyData.total?.find(
            (item: DailyUserData) => item.date === today
          );
          setTodayUsers(todayData?.users || []);
        } else {
          const message = `${dailyRes.status} ${dailyRes.statusText}`;
          console.error("Daily active users request failed:", message);
          setError((prev) => prev || message);
        }
      } catch (error) {
        console.error("Error fetching active users data:", error);
        // Set fallback data
        setChartData([]);
        setTodayUsers([]);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, page, licenseId]);

  const fillMissingDates = (data: ChartData[], days: number): ChartData[] => {
    const now = new Date();
    const filledData: ChartData[] = [];
    const dataMap = new Map(data.map((item) => [item.date, item.noOfUsers]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      filledData.push({
        date: dateString,
        noOfUsers: dataMap.get(dateString) || 0,
      });
    }

    return filledData;
  };

  const totalActiveUsers = chartData.reduce(
    (sum, item) => sum + item.noOfUsers,
    0
  );
  const todayActiveUsers = todayUsers.length;

  if (!mounted || loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>

        {/* Key metrics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-8" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Chart/Content skeleton */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("today")}</p>
              <p className="text-2xl font-bold">{todayActiveUsers}</p>
            </div>
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {dateRange === "7d"
                  ? t("avg.7d")
                  : dateRange === "30d"
                    ? t("avg.30d")
                    : dateRange === "90d"
                      ? t("avg.90d")
                      : t("avg.allTime")}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {chartData.length > 0
                    ? Math.round(totalActiveUsers / chartData.length)
                    : 0}
                </p>
                {trend && (
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      trend.direction === "up"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {trend.direction === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{trend.value.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-2 rounded-full bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("title.activityTrend")}
          </span>
        </div>
        {error && (
          <div className="mb-2 text-sm text-red-600 dark:text-red-400">
            {t("title.activityTrend")}: {error}
          </div>
        )}
        {chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {error ? error : "No data for this range."}
          </div>
        ) : (
          <div className="h-[192px] w-full" style={{ height: 192 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  content={(props) => {
                    const { active, payload, label } = props;
                    if (active && payload && payload.length && label) {
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                          <p className="text-sm font-medium mb-1">
                            {new Date(label).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-sm text-muted-foreground">
                              {t("tooltip.activeUsers")}:
                            </span>
                            <span className="text-sm font-semibold">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="noOfUsers"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
