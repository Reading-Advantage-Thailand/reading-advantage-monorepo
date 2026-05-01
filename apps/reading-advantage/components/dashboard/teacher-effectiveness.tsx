"use client";

import React, { useEffect, useState } from "react";
import { WidgetShell } from "./widget-shell";
import { useScopedI18n } from "@/locales/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GraduationCap, TrendingUp, Users, Award } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

interface TeacherMetrics {
  teacherId: string;
  teacherName: string;
  studentCount: number;
  activeStudents: number;
  averageProgress: number; // Average level gain
  engagementRate: number; // % of students active
  averageAccuracy: number;
  classCount: number;
}

interface TeacherEffectivenessProps {
  licenseId?: string;
  timeframe?: string;
  onTeacherClick?: (teacherId: string) => void;
  className?: string;
}

export function TeacherEffectiveness({
  licenseId,
  timeframe = "30d",
  onTeacherClick,
  className,
}: TeacherEffectivenessProps) {
  const [teachers, setTeachers] = useState<TeacherMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherMetrics | null>(
    null
  );
  const t = useScopedI18n(
    "pages.admin.dashboard.widgets.teacherEffectiveness"
  ) as any;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ timeframe });
      if (licenseId) params.append("licenseId", licenseId);

      // Fetch teacher effectiveness data from dedicated endpoint
      const response = await fetch(
        `/api/v1/admin/teacher-effectiveness?${params}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch teacher data");
      }

      const result = await response.json();

      // Use data from new API
      const teacherMetrics: TeacherMetrics[] = result.teachers.map(
        (t: any) => ({
          teacherId: t.teacherId,
          teacherName: t.teacherName,
          studentCount: t.studentCount,
          activeStudents: t.activeStudents,
          averageProgress: 0,
          engagementRate: t.engagementRate,
          averageAccuracy: 0,
          classCount: t.classroomCount,
        })
      );

      // Show all teachers
      setTeachers(teacherMetrics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load teacher data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [licenseId, timeframe]);

  const getPerformanceColor = (
    engagementRate: number,
    averageProgress: number
  ) => {
    // Based on engagement rate only since we don't have progress data yet
    if (engagementRate >= 80) return "#22c55e"; // Green
    if (engagementRate >= 60) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.teacherName}</p>
          <div className="space-y-1 text-sm">
            <p>{t("tooltip.engagement", { rate: data.engagementRate })}</p>
            <p className="text-muted-foreground">
              {t("tooltip.activeStudents", {
                active: data.activeStudents,
                total: data.studentCount,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.classCount}{" "}
              {t("tooltip.classroom", { count: data.classCount })}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Sort teachers by engagement rate for ranking
  const sortedTeachers = [...teachers].sort(
    (a, b) => b.engagementRate - a.engagementRate
  );

  return (
    <WidgetShell
      title={t("title")}
      description={t("description")}
      icon={GraduationCap}
      loading={loading}
      error={error}
      isEmpty={teachers.length === 0}
      emptyMessage={t("noData")}
      onRefresh={fetchData}
      className={className}
    >
      <div className="space-y-4">
        {/* Scatter Chart - Engagement Rate */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="category"
                dataKey="teacherName"
                name="Teacher"
                angle={-45}
                textAnchor="end"
                height={80}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="engagementRate"
                name="Engagement Rate"
                label={{
                  value: "Engagement Rate (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[0, 100]}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                data={teachers}
                onClick={(data) => {
                  setSelectedTeacher(data);
                  onTeacherClick?.(data.teacherId);
                }}
                className="cursor-pointer"
              >
                {teachers.map((teacher, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getPerformanceColor(teacher.engagementRate, 0)}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>{t("legend.excellent")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>{t("legend.good")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>{t("legend.needsSupport")}</span>
          </div>
        </div>

        {/* Teacher List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-600" />
            {t("topTeacher")}
          </h4>
          {/* Top 3 Teachers */}
          {sortedTeachers.slice(0, 3).map((teacher, index) => {
            const medals = ["🥇", "🥈", "🥉"];

            return (
              <div
                key={teacher.teacherId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border-2 hover:bg-accent cursor-pointer transition-colors relative overflow-hidden",
                  `bg-gradient-to-r bg-opacity-5`
                )}
                onClick={() => {
                  setSelectedTeacher(teacher);
                  onTeacherClick?.(teacher.teacherId);
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl">{medals[index]}</div>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      teacher.engagementRate >= 80
                        ? "bg-green-500"
                        : teacher.engagementRate >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    )}
                  />
                  <div>
                    <p className="font-semibold text-sm">
                      {teacher.teacherName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {teacher.activeStudents}/{teacher.studentCount}{" "}
                      {t("activeLabel")} • {teacher.classCount}{" "}
                      {t("classroomLabel", { count: teacher.classCount })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{teacher.engagementRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    {t("engagement")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetShell>
  );
}
