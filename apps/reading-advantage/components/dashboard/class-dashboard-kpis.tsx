"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/kpi-card";
import {
  Users,
  BookOpen,
  TrendingUp,
  Target,
  Zap,
  Activity,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassOverviewResponse } from "@/types/dashboard";
import { useScopedI18n } from "@/locales/client";

interface ClassDashboardKPIsProps {
  classroomId: string;
}

export function ClassDashboardKPIs({ classroomId }: ClassDashboardKPIsProps) {
  const [data, setData] = useState<ClassOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tc = useScopedI18n("components.classDashboardKpis") as any;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/classroom/${classroomId}/overview`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result: ClassOverviewResponse = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching classroom overview:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classroomId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {tc("errorTitle")}
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data || !data.summary) {
    return null;
  }

  const { summary } = data;
  const activityRate = summary.totalStudents > 0 
    ? Math.round((summary.activeStudents30d / summary.totalStudents) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <KPICard
        title={tc("totalStudents.title")}
        value={summary.totalStudents}
        description={tc("totalStudents.description", { active: summary.activeStudents7d })}
        icon={Users}
        loading={false}
        status="info"
      />

      <KPICard
        title={tc("activeStudents.title")}
        value={summary.activeStudents30d}
        description={tc("activeStudents.description", { rate: activityRate })}
        icon={Activity}
        loading={false}
        status={activityRate >= 70 ? "success" : activityRate >= 40 ? "warning" : "error"}
      />

      <KPICard
        title={tc("avgLevel.title")}
        value={summary.averageLevel.toFixed(1)}
        description={tc("avgLevel.description")}
        icon={Target}
        loading={false}
        status="info"
      />

      <KPICard
        title={tc("totalXp.title")}
        value={summary.totalXpEarned.toLocaleString()}
        description={tc("totalXp.description")}
        icon={Zap}
        loading={false}
        status="success"
      />

      <KPICard
        title={tc("activeAssignments.title")}
        value={summary.assignmentsActive}
        description={tc("activeAssignments.description")}
        icon={BookOpen}
        loading={false}
        status="info"
      />

      <KPICard
        title={tc("completed.title")}
        value={summary.assignmentsCompleted}
        description={tc("completed.description")}
        icon={TrendingUp}
        loading={false}
        status="success"
      />
    </div>
  );
}
