"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";
import { useScopedI18n } from "@/locales/client";

type XPData = {
  [studentName: string]: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
};

type Props = {
  data: XPData;
  page?: "admin" | "teacher" | "student";
};

const ClassroomXPBarChartPerStudents: React.FC<Props> = ({ data, page }) => {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "allTime">(
    "today"
  );
  const [xpGoal, setXpGoal] = useState<number>(0);
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const trp = useScopedI18n("components.reports");
  const today = new Date().getDate();
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const chartData = Object.entries(data).map(([name, xp]) => ({
    name,
    xp: xp[period],
  }));
  const [chartHeight, setChartHeight] = useState<number>(400);
  const [windowWidth, setWindowWidth] = useState<number>(0);

  // Theme-aware colors
  const themeColors = {
    background: "bg-[hsl(var(--background))]",
    cardBackground: "bg-[hsl(var(--card))]",
    textPrimary: "text-[hsl(var(--foreground))]",
    textSecondary: "text-[hsl(var(--muted-foreground))]",
    textMuted: "text-[hsl(var(--muted-foreground))]",
    border: "border-[hsl(var(--border))]",
    controlBg: "bg-[hsl(var(--muted))]",
    controlBorder: "border-[hsl(var(--border))]",
    controlFocus: "ring-[hsl(var(--ring))]",
    gridStroke: "hsl(var(--muted))",
    axisTick: "hsl(var(--foreground))",
    axisStroke: "hsl(var(--muted-foreground))",
    barGradientStart: "hsl(var(--primary))",
    barGradientEnd: "hsl(var(--primary))",
    tooltipBg: "bg-[hsl(var(--popover))]",
    tooltipBorder: "border-[hsl(var(--border))]",
    tooltipText: "text-[hsl(var(--popover-foreground))]",
    shadow: "shadow-[hsl(var(--background))]",
  };

  const avgXP =
    chartData.reduce((sum, entry) => sum + entry.xp, 0) / chartData.length;

  const periodLabels = {
    today: `${trp("timeRangeDropdown.today")}`,
    week: `${trp("timeRangeDropdown.weekly")}`,
    month: `${trp("timeRangeDropdown.Monthly")}`,
    allTime: `${trp("timeRangeDropdown.allTime")}`,
  };

  useEffect(() => {
    // ตั้งค่า initial window width
    setWindowWidth(window.innerWidth);

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 640) {
        setChartHeight(300);
      } else if (window.innerWidth < 1024) {
        setChartHeight(400);
      } else {
        setChartHeight(500);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`${themeColors.tooltipBg} p-4 rounded-lg shadow-lg border ${themeColors.tooltipBorder}`}
        >
          <p className={`font-semibold ${themeColors.tooltipText} mb-1`}>
            {label}
          </p>
          <p className="text-blue-500 font-medium">{`XP: ${payload[0].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`w-full max-w-7xl mx-auto bg-gradient-to-br rounded-2xl ${themeColors.shadow} mb-8 ${page === "admin" ? "mt-6" : "px-4 sm:px-6 lg:px-8"}`}
    >
      {/* Header */}
      {page !== "admin" && (
        <div className="text-left mb-6 sm:mb-8 pt-6">
          <h2
            className={`text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2`}
          >
            {trp("studentXpDashboard")}
          </h2>
          <p className={`${themeColors.textSecondary} text-base sm:text-lg`}>
            {trp("studentXpDashboardDescription")}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div
          className={`${themeColors.cardBackground} rounded-xl p-3 sm:p-4 shadow-md border ${themeColors.border} flex-1 sm:flex-none`}
        >
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span
              className={`${themeColors.textPrimary} font-medium text-sm sm:text-base whitespace-nowrap`}
            >
              ⏰ {trp("selectTimeRange")}:
            </span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className={`bg-gradient-to-r ${themeColors.controlBg} border-2 ${themeColors.controlBorder} rounded-lg px-3 sm:px-4 py-2 ${themeColors.textPrimary} font-medium focus:outline-none focus:ring-2 ${themeColors.controlFocus} focus:border-transparent transition-all duration-200 text-sm sm:text-base w-full sm:w-auto min-w-0 sm:min-w-[140px]`}
            >
              <option value="today">📅 {trp("timeRangeDropdown.today")}</option>
              <option value="week">📆 {trp("timeRangeDropdown.weekly")}</option>
              <option value="month">
                🗓️ {trp("timeRangeDropdown.Monthly")}
              </option>
              <option value="allTime">
                🌟 {trp("timeRangeDropdown.allTime")}
              </option>
            </select>
          </label>
        </div>

        <div
          className={`${themeColors.cardBackground} rounded-xl p-3 sm:p-4 shadow-md border ${themeColors.border} flex-1 sm:flex-none`}
        >
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span
              className={`${themeColors.textPrimary} font-medium text-sm sm:text-base whitespace-nowrap`}
            >
              🎯 {trp("target")} XP:
            </span>
            <input
              type="number"
              value={xpGoal}
              onChange={(e) => setXpGoal(Number(e.target.value))}
              className={`bg-gradient-to-r border-2 border-green-200 rounded-lg px-3 sm:px-4 py-2 w-full sm:w-32 ${
                themeColors.textPrimary
              } font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base ${
                isDark
                  ? "from-green-900/30 to-emerald-900/30 border-green-700"
                  : ""
              }`}
            />
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-3 sm:p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-blue-100 text-xs sm:text-sm">
                {trp("timeRange")}
              </p>
              <p className="text-lg sm:text-xl font-bold truncate">
                {periodLabels[period]}
              </p>
            </div>
            <div className="text-2xl sm:text-3xl ml-2 flex-shrink-0">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-3 sm:p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-green-100 text-xs sm:text-sm">
                {trp("average")} XP
              </p>
              <p className="text-lg sm:text-xl font-bold truncate">
                {Math.round(avgXP).toLocaleString()}
              </p>
            </div>
            <div className="text-2xl sm:text-3xl ml-2 flex-shrink-0">📈</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-3 sm:p-4 text-white shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-purple-100 text-xs sm:text-sm">
                {trp("target")}
              </p>
              <p className="text-lg sm:text-xl font-bold truncate">
                {xpGoal.toLocaleString()}
              </p>
            </div>
            <div className="text-2xl sm:text-3xl ml-2 flex-shrink-0">🎯</div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div
        className={`${themeColors.cardBackground} rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg border ${themeColors.border}`}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            margin={{
              top: 30,
              right: windowWidth < 640 ? 10 : 30,
              bottom: windowWidth < 640 ? -40 : -60,
              left: windowWidth < 640 ? -10 : 30,
            }}
          >
            {/* ...existing code... */}
            <XAxis
              dataKey="name"
              angle={windowWidth < 640 ? -45 : -30}
              textAnchor="end"
              interval={windowWidth < 640 ? "preserveStartEnd" : 0}
              height={windowWidth < 640 ? 80 : 120}
              tick={{
                fontSize: windowWidth < 640 ? 10 : 12,
                fill: themeColors.axisTick,
              }}
              stroke={themeColors.axisStroke}
            />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={themeColors.barGradientStart}
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor={themeColors.barGradientEnd}
                  stopOpacity={0.9}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={themeColors.gridStroke}
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="name"
              angle={windowWidth < 640 ? -45 : -30}
              textAnchor="end"
              interval={windowWidth < 640 ? "preserveStartEnd" : 0}
              height={windowWidth < 640 ? 80 : 120}
              tick={{
                fontSize: windowWidth < 640 ? 10 : 12,
                fill: themeColors.axisTick,
              }}
              stroke={themeColors.axisStroke}
            />
            <YAxis
              tick={{
                fontSize: windowWidth < 640 ? 10 : 12,
                fill: themeColors.axisTick,
              }}
              stroke={themeColors.axisStroke}
              tickFormatter={(value) =>
                windowWidth < 640
                  ? value >= 1000
                    ? `${(value / 1000).toFixed(0)}k`
                    : value.toString()
                  : value.toLocaleString()
              }
              width={windowWidth < 640 ? 40 : 60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="xp"
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
              stroke={themeColors.barGradientEnd}
              strokeWidth={1}
            />
            <ReferenceLine
              y={xpGoal}
              stroke="#10B981"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{
                value:
                  windowWidth < 640
                    ? `🎯 ${
                        xpGoal >= 1000
                          ? `${(xpGoal / 1000).toFixed(0)}k`
                          : xpGoal
                      }`
                    : `🎯 ${trp("target")}: ${xpGoal.toLocaleString()}`,
                position: "top",
                fill: "#059669",
                fontSize: windowWidth < 640 ? 10 : 12,
                fontWeight: "bold",
              }}
            />
            <ReferenceLine
              y={avgXP}
              stroke="#F59E0B"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{
                value:
                  windowWidth < 640
                    ? `📊 ${
                        Math.round(avgXP) >= 1000
                          ? `${(Math.round(avgXP) / 1000).toFixed(0)}k`
                          : Math.round(avgXP)
                      }`
                    : `📊 ${trp("average")}: ${Math.round(
                        avgXP
                      ).toLocaleString()}`,
                position: "bottom",
                fill: "#D97706",
                fontSize: windowWidth < 640 ? 10 : 12,
                fontWeight: "bold",
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 sm:mt-6 pb-6">
        <p className={`${themeColors.textMuted} text-xs sm:text-sm px-2`}>
          💡 {trp("footer", { today: today, time: time })}
        </p>
      </div>
    </div>
  );
};

export default ClassroomXPBarChartPerStudents;
