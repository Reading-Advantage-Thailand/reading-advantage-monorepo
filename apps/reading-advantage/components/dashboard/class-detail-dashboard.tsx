"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClassDashboardKPIs } from "./class-dashboard-kpis";
import { ClassAssignmentFunnel } from "./class-assignment-funnel";
import { ClassAlignmentMatrix } from "./class-alignment-matrix";
import { ClassVelocityTable } from "./class-velocity-table";
import { ClassActivityHeatmap } from "./class-activity-heatmap";
import { ClassGenreEngagement } from "./class-genre-engagement";
import { ClassAccuracyMetrics } from "./class-accuracy-metrics";
import AIInsights from "./ai-insights";
import { ClassBatchActions } from "./class-batch-actions";
import { ClassroomGoalsManagement } from "./classroom-goals/classroom-goals-management";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Settings,
  Users,
  BookOpen,
  BarChart3,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { ScopedI18n } from "@/locales/locales";

export interface ClassDetailDashboardProps {
  classroomId: string;
  className: string;
  classCode: string;
}

export function ClassDetailDashboard({
  classroomId,
  className,
  classCode,
}: ClassDetailDashboardProps) {
  const router = useRouter();
  const scope = "pages.teacher.dashboardPage.classDetail" as const;
  const t = useScopedI18n(scope) as ScopedI18n<typeof scope>;
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const handleBack = () => {
    router.push("/th/teacher/dashboard");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger a refresh of all data
    window.location.reload();
  };

  const handleExportCSV = async () => {
    // TODO: Implement CSV export
    try {
      const res = await fetch(
        `/api/v1/teacher/class/${classroomId}/export?format=csv`
      );
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `class-${classCode}-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{className}</h1>
            <p className="text-muted-foreground">
              {t("classCodePrefix")} <span className="font-mono">{classCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t("exportCSV")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/th/teacher/my-classes/${classroomId}/settings`)
            }
          >
            <Settings className="h-4 w-4 mr-2" />
            {t("settings")}
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <ClassDashboardKPIs classroomId={classroomId} />

      {/* AI Insights for this classroom */}
      <AIInsights scope="classroom" contextId={classroomId} />

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <BookOpen className="h-4 w-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="h-4 w-4 mr-2" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="alignment">
            <Target className="h-4 w-4 mr-2" />
            Alignment
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Zap className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ClassAssignmentFunnel
              classroomId={classroomId}
              onSeeDetail={() => setActiveTab("assignments")}
            />
            <ClassVelocityTable classroomId={classroomId} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ClassGenreEngagement classroomId={classroomId} />
            <ClassActivityHeatmap
              classroomId={classroomId}
              onSeeDetail={() => setActiveTab("activity")}
            />
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <ClassAssignmentFunnel
            classroomId={classroomId}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <ClassBatchActions classroomId={classroomId} />
          <ClassAccuracyMetrics classroomId={classroomId} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <ClassroomGoalsManagement
            classroomId={classroomId}
            className={className}
          />
        </TabsContent>

        <TabsContent value="alignment" className="space-y-4">
          <ClassAlignmentMatrix classroomId={classroomId} />
        </TabsContent>


        <TabsContent value="activity" className="space-y-4">
          <ClassActivityHeatmap classroomId={classroomId} expanded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
