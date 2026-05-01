"use client";

import React from "react";
import { WidgetShell } from "./widget-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useScopedI18n } from "@/locales/client";

interface SRSHealthData {
  userId?: string;
  classroomId?: string;
  schoolId?: string;
  healthStatus: "healthy" | "moderate" | "overloaded" | "critical";
  metrics: {
    totalCards: number;
    dueToday: number;
    overdue: number;
    newCardsToday: number;
    reviewedToday: number;
    avgRetentionRate: number;
  };
  recommendations: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }>;
  quickActions?: Array<{
    label: string;
    count: number;
    action: string;
  }>;
}

interface SRSHealthCardProps {
  data: SRSHealthData | null;
  loading?: boolean;
  onRefresh?: () => void;
  onPracticeClick?: () => void;
}

export function SRSHealthCard({
  data,
  loading = false,
  onRefresh,
  onPracticeClick,
}: SRSHealthCardProps) {
  const t = useScopedI18n("pages.student.dashboard.srsHealth");
  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100 dark:bg-green-950";
      case "moderate":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-950";
      case "overloaded":
        return "text-orange-600 bg-orange-100 dark:bg-orange-950";
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-950";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-950";
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5" />;
      case "moderate":
      case "overloaded":
        return <Clock className="h-5 w-5" />;
      case "critical":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  return (
    <WidgetShell
      title={t("title")}
      description={t("description")}
      icon={Brain}
      loading={loading}
      isEmpty={!loading && !data}
      emptyMessage={t("emptyMessage")}
      onRefresh={onRefresh}
      telemetryId="student.srs_health"
    >
      <div className="space-y-4">
        {/* Health Status */}
        {data && (
          <Card
            className={`border-2 ${
              data.healthStatus === "healthy"
                ? "border-green-500/20"
                : data.healthStatus === "critical"
                  ? "border-red-500/20"
                  : "border-yellow-500/20"
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getHealthIcon(data.healthStatus)}
                    <span className="font-medium capitalize">
                      {t(`status.${data.healthStatus}`) || data.healthStatus}
                    </span>
                </div>
                  <Badge className={getHealthColor(data.healthStatus)}>
                    {data.metrics.dueToday + data.metrics.overdue} {t("due")}
                  </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold">
                    {data.metrics.totalCards}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("totalCards")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {data.metrics.reviewedToday}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("reviewedToday")}
                  </p>
                </div>
              </div>

              {/* Retention Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("retentionRate")}</span>
                  <span className="font-medium">
                    {(data.metrics.avgRetentionRate * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={data.metrics.avgRetentionRate * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {data?.quickActions && data.quickActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("quickActions")}</h4>
            {data.quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-between"
                onClick={onPracticeClick}
              >
                <span>{action.label}</span>
                <Badge variant="secondary">{action.count}</Badge>
              </Button>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {data?.recommendations && data.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("recommendations")}</h4>
            <div className="space-y-2">
              {data.recommendations.slice(0, 2).map((rec, index) => (
                <Card
                  key={index}
                  className={
                    rec.priority === "high"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200"
                      : "bg-muted"
                  }
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        className={`h-4 w-4 mt-0.5 ${
                          rec.priority === "high"
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      />
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">{rec.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {rec.reason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Practice CTA */}
        {data && (data.metrics.dueToday > 0 || data.metrics.overdue > 0) && (
          <Button onClick={onPracticeClick} className="w-full" size="lg">
            <Brain className="mr-2 h-4 w-4" />
            {t("practiceNow")} ({data.metrics.dueToday + data.metrics.overdue} {t("cards")})
          </Button>
        )}
      </div>
    </WidgetShell>
  );
}
