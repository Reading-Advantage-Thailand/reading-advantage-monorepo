"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { useCustomDateRangeXp } from "@/hooks/useCustomDateRangeXp";
import { Skeleton } from "@/components/ui/skeleton";

// Simple date formatter function with Thai locale support
const formatDate = (date: Date): string => {
  return date.toLocaleDateString(["en-US"], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

type ClassroomData = {
  id: string;
  classroomName: string;
  classCode: string;
  grade: string;
  archived: boolean;
  title: string;
  importedFromGoogle: boolean;
  alternateLink: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  } | string | null;
  isOwner: boolean;
  teachers: Array<{
    teacherId: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
  student: Array<{
    studentId: string;
    email: string;
    lastActivity: string;
  }>;
  xpData?: {
    today: number;
    week: number;
    month: number;
    allTime: number;
    customRange?: number;
  };
};

interface ClassroomXpComparisonChartProps {
  classes: ClassroomData[];
  licenseId?: string;
}

type TimeRange = "today" | "week" | "month" | "allTime" | "custom";
type ChartType = "line" | "bar";

const timeRangeLabels = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  allTime: "All Time",
  custom: "Custom Range",
};

const chartConfig = {
  xp: {
    label: "XP",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function ClassroomXpComparisonChart({
  classes,
  licenseId,
}: ClassroomXpComparisonChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [maxClassrooms, setMaxClassrooms] = useState<number>(10);
  const [isMobile, setIsMobile] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const {
    data: customRangeData,
    loading: customRangeLoading,
    error: customRangeError,
    refetch: refetchCustomRange,
  } = useCustomDateRangeXp({
    fromDate: timeRange === "custom" ? dateRange.from : undefined,
    toDate: timeRange === "custom" ? dateRange.to : undefined,
    licenseId,
  });

  useEffect(() => {
    if (timeRange === "custom" && dateRange.from && dateRange.to) {
    }
  }, [timeRange, dateRange]);

  useEffect(() => {
    if (timeRange !== "custom") {
      setDateRange({ from: undefined, to: undefined });
    }
  }, [timeRange]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const activeClassrooms = useMemo(() => {
    const dataSource =
      timeRange === "custom" &&
      dateRange.from &&
      dateRange.to &&
      customRangeData
        ? customRangeData
        : classes;

    return dataSource.filter((classroom) => {
      if (classroom.archived) return false;

      if (!classroom.xpData) return false;

      if (timeRange === "custom" && dateRange.from && dateRange.to) {
        return true;
      }

      return (
        classroom.xpData.today > 0 ||
        classroom.xpData.week > 0 ||
        classroom.xpData.month > 0 ||
        classroom.xpData.allTime > 0
      );
    });
  }, [classes, customRangeData, timeRange, dateRange]);

  const chartData = useMemo(() => {
    let data = activeClassrooms
      .map((classroom) => {
        let xpValue = 0;
        if (timeRange === "custom") {
          if (
            dateRange.from &&
            dateRange.to &&
            classroom.xpData?.customRange !== undefined
          ) {
            xpValue = classroom.xpData.customRange;
          } else {
            xpValue = classroom.xpData?.week || 0;
          }
        } else {
          xpValue =
            classroom.xpData?.[timeRange as keyof typeof classroom.xpData] || 0;
        }

        const ownerTeacher = classroom.teachers?.find(teacher => teacher.role === "OWNER");
        
        return {
          name: classroom.classroomName,
          shortName:
            classroom.classroomName.length > 15
              ? classroom.classroomName.substring(0, 15) + "..."
              : classroom.classroomName,
          xp: xpValue,
          students: classroom.student.length,
          teacher: ownerTeacher?.name || "N/A",
          grade: classroom.grade,
        };
      })
      .filter((item) => {
        if (timeRange === "custom" && dateRange.from && dateRange.to) {
          return true;
        }
        return item.xp > 0;
      })
      .sort((a, b) => b.xp - a.xp)
      .slice(0, maxClassrooms);

    return data;
  }, [activeClassrooms, timeRange, maxClassrooms, dateRange]);

  const totalXp = chartData.reduce((sum, item) => sum + item.xp, 0);
  const averageXp =
    chartData.length > 0 ? Math.round(totalXp / chartData.length) : 0;
  const topClassroom = chartData[0];

  if (
    activeClassrooms.length === 0 &&
    !(timeRange === "custom" && customRangeLoading)
  ) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Classroom XP Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No classroom data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Classroom XP Comparison</span>
          {timeRange === "custom" && customRangeLoading ? (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Skeleton className="h-4 w-24" />
              <span>•</span>
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>Total: {totalXp.toLocaleString()} XP</span>
              <span>•</span>
              <span>Average: {averageXp.toLocaleString()} XP</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Time Range Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">
              Time Range:
            </span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(timeRangeLabels).map(([key, label]) => (
                <Button
                  key={key}
                  onClick={() => setTimeRange(key as TimeRange)}
                  variant={timeRange === key ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                >
                  {key === "custom" && (
                    <CalendarIcon className="mr-1 h-3 w-3" />
                  )}
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {timeRange === "custom" ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-muted/50 rounded-lg border-2 border-dashed border-primary/20">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium whitespace-nowrap">
                  Select Date Range:
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-center">
                {/* From Date */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    From:
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[240px] justify-start text-left font-normal hover:bg-primary/5 border-primary/20"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dateRange.from ? (
                          <span className="text-foreground">
                            {formatDate(dateRange.from)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Pick a date
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) =>
                          setDateRange((prev) => ({ ...prev, from: date }))
                        }
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Range Arrow */}
                <div className="flex items-center justify-center h-full pt-4">
                  <div className="text-primary font-bold text-lg">→</div>
                </div>

                {/* To Date */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    To:
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[240px] justify-start text-left font-normal hover:bg-primary/5 border-primary/20"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dateRange.to ? (
                          <span className="text-foreground">
                            {formatDate(dateRange.to)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Pick a date
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) =>
                          setDateRange((prev) => ({ ...prev, to: date }))
                        }
                        disabled={(date) => {
                          if (
                            date > new Date() ||
                            date < new Date("1900-01-01")
                          ) {
                            return true;
                          }
                          if (dateRange.from && date < dateRange.from) {
                            return true;
                          }
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Date Range Info */}
              {dateRange.from && dateRange.to && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded-md">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">
                      {Math.ceil(
                        (dateRange.to.getTime() - dateRange.from.getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1}{" "}
                      days selected
                    </div>
                    {customRangeLoading && (
                      <div className="flex items-center gap-1 text-blue-600 font-medium">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Loading...
                      </div>
                    )}
                    {customRangeError && (
                      <div className="text-red-600 font-medium">
                        Error: {customRangeError}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Show skeleton immediately when both dates are selected but data is loading */}
              {dateRange.from && dateRange.to && customRangeLoading && (
                <div className="space-y-2">
                  <div className="flex justify-center items-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">
                      Preparing data...
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                  </div>
                </div>
              )}

              {/* Refresh button for custom range */}
              {timeRange === "custom" && dateRange.from && dateRange.to && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetchCustomRange}
                  disabled={customRangeLoading}
                  className="text-xs flex items-center gap-1 hover:bg-primary/5"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${customRangeLoading ? "animate-spin" : ""}`}
                  />
                  {customRangeLoading ? "Loading..." : "Refresh"}
                </Button>
              )}
            </div>
          ) : null}

          {/* Chart Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium whitespace-nowrap">
                Chart Type:
              </span>
              <Select
                value={chartType}
                onValueChange={(value) => setChartType(value as ChartType)}
                disabled={timeRange === "custom" && customRangeLoading}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium whitespace-nowrap">
                Show Top:
              </span>
              <Select
                value={maxClassrooms.toString()}
                onValueChange={(value) => setMaxClassrooms(parseInt(value))}
                disabled={timeRange === "custom" && customRangeLoading}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {timeRange === "custom" && customRangeLoading ? (
          // Skeleton for summary stats when loading custom range - show whenever loading
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-primary/10 p-3 sm:p-4 rounded-lg">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="bg-secondary/50 p-3 sm:p-4 rounded-lg">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-12 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="bg-accent/50 p-3 sm:p-4 rounded-lg sm:col-span-2 lg:col-span-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ) : (
          topClassroom && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-primary/10 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Top Classroom
                </div>
                <div
                  className="font-semibold text-sm sm:text-base truncate"
                  title={topClassroom.name}
                >
                  {topClassroom.name}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {topClassroom.xp.toLocaleString()} XP
                </div>
              </div>
              <div className="bg-secondary/50 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Active Classrooms
                </div>
                <div className="font-semibold text-sm sm:text-base">
                  {chartData.length}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  with activity
                </div>
              </div>
              <div className="bg-accent/50 p-3 sm:p-4 rounded-lg sm:col-span-2 lg:col-span-1">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Total Students
                </div>
                <div className="font-semibold text-sm sm:text-base">
                  {chartData.reduce((sum, item) => sum + item.students, 0)}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  in active classes
                </div>
              </div>
            </div>
          )
        )}

        {/* Chart */}
        {timeRange === "custom" && customRangeLoading ? (
          // Enhanced skeleton loading for custom range - show whenever loading, regardless of date selection
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-center items-center h-8">
                <RefreshCw className="h-4 w-4 animate-spin mr-2 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {dateRange.from && dateRange.to
                    ? "Processing XP data for selected date range..."
                    : "Preparing data..."}
                </span>
              </div>
              {/* Chart skeleton with axis placeholders */}
              <div className="relative">
                <Skeleton className="h-[400px] w-full rounded-lg" />
                {/* Mock chart elements */}
                <div className="absolute inset-4 flex flex-col justify-end">
                  <div className="flex items-end justify-around space-x-2 h-full pb-8">
                    <Skeleton className="w-8 h-32 rounded-t" />
                    <Skeleton className="w-8 h-48 rounded-t" />
                    <Skeleton className="w-8 h-24 rounded-t" />
                    <Skeleton className="w-8 h-56 rounded-t" />
                    <Skeleton className="w-8 h-40 rounded-t" />
                    <Skeleton className="w-8 h-20 rounded-t" />
                  </div>
                  <div className="flex justify-around mt-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                {timeRange === "custom" && (!dateRange.from || !dateRange.to)
                  ? "Please select a date range to view data"
                  : timeRange === "custom" && customRangeLoading
                    ? "Loading data..."
                    : timeRange === "custom" && customRangeError
                      ? `Error: ${customRangeError}`
                      : `No data available for ${timeRangeLabels[timeRange].toLowerCase()}`}
              </p>
              {timeRange === "custom" &&
                dateRange.from &&
                dateRange.to &&
                !customRangeLoading &&
                !customRangeError && (
                  <p className="text-xs text-muted-foreground">
                    Selected range: {formatDate(dateRange.from)} -{" "}
                    {formatDate(dateRange.to)}
                  </p>
                )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <ChartContainer
              config={chartConfig}
              className="h-[400px] sm:h-[400px] lg:h-[450px] w-full"
            >
              {chartType === "bar" ? (
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 20,
                    bottom: isMobile ? 20 : 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="shortName"
                    angle={isMobile ? -90 : -45}
                    textAnchor="end"
                    height={isMobile ? 80 : 60}
                    fontSize={isMobile ? 10 : 12}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 40 : 60}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-md max-w-xs">
                            <p className="font-semibold text-sm">{data.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Grade {data.grade}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Teacher: {data.teacher}
                            </p>
                            <p className="text-xs">Students: {data.students}</p>
                            <p className="font-medium text-primary text-sm">
                              XP: {data.xp.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="xp"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 20,
                    bottom: isMobile ? 80 : 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="shortName"
                    angle={isMobile ? -90 : -45}
                    textAnchor="end"
                    height={isMobile ? 80 : 60}
                    fontSize={isMobile ? 10 : 12}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 40 : 60}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-md max-w-xs">
                            <p className="font-semibold text-sm">{data.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Grade {data.grade}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Teacher: {data.teacher}
                            </p>
                            <p className="text-xs">Students: {data.students}</p>
                            <p className="font-medium text-primary text-sm">
                              XP: {data.xp.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="xp"
                    stroke="hsl(var(--primary))"
                    strokeWidth={isMobile ? 2 : 3}
                    dot={{
                      fill: "hsl(var(--primary))",
                      strokeWidth: 2,
                      r: isMobile ? 3 : 4,
                    }}
                    activeDot={{ r: isMobile ? 4 : 6 }}
                  />
                </LineChart>
              )}
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export with React.memo for performance optimization
export default React.memo(
  ClassroomXpComparisonChart,
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render if classes array actually changed or licenseId changed
    if (prevProps.licenseId !== nextProps.licenseId) {
      return false; // Re-render if licenseId changed
    }

    // Compare classes array by reference first (fast check)
    if (prevProps.classes === nextProps.classes) {
      return true; // Same reference, no re-render needed
    }

    // If different references but same length and content, avoid re-render
    if (prevProps.classes.length !== nextProps.classes.length) {
      return false; // Different lengths, need re-render
    }

    // Deep comparison for classes content (only if lengths are same)
    return (
      JSON.stringify(prevProps.classes) === JSON.stringify(nextProps.classes)
    );
  }
);
