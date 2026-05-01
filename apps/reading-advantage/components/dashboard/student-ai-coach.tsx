"use client";

import React from "react";
import { WidgetShell } from "./widget-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useScopedI18n } from "@/locales/client";

interface AIInsight {
  id: string;
  type: "trend" | "alert" | "recommendation" | "achievement";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  relatedMetrics?: string[];
}

interface AICoachCardProps {
  insights: AIInsight[] | null;
  metrics?: {
    currentXp: number;
    velocity: number;
    genresRead: number;
    retentionRate: number;
  };
  loading?: boolean;
  onRefresh?: () => void;
}

export function AICoachCard({
  insights,
  metrics,
  loading = false,
  onRefresh,
}: AICoachCardProps) {
  const t = useScopedI18n("pages.student.dashboard.aiCoach");
  const getInsightIcon = (type: string) => {
    switch (type) {
      case "trend":
        return <TrendingUp className="h-4 w-4" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "recommendation":
        return <Lightbulb className="h-4 w-4" />;
      case "achievement":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "trend":
        return "text-blue-600 bg-blue-100 dark:bg-blue-950";
      case "alert":
        return "text-red-600 bg-red-100 dark:bg-red-950";
      case "recommendation":
        return "text-purple-600 bg-purple-100 dark:bg-purple-950";
      case "achievement":
        return "text-green-600 bg-green-100 dark:bg-green-950";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-950";
    }
  };

  const topInsights = insights?.slice(0, 3) || [];

  return (
    <WidgetShell
      title={t("title")}
      description={t("description")}
      icon={Sparkles}
      loading={loading}
      isEmpty={!loading && topInsights.length === 0}
      emptyMessage={t("emptyMessage")}
      onRefresh={onRefresh}
      telemetryId="student.ai_coach"
    >
      <div className="space-y-4">
        {/* Metric References */}
        {metrics && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2 text-center">
              {t("basedOnMetrics")}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div>
                <span className="font-medium">{metrics.currentXp}</span> XP
              </div>
              <div>
                <span className="font-medium">
                  {metrics.velocity.toFixed(1)}
                </span>{" "}
                {t("xpPerDay")}
              </div>
              <div>
                <span className="font-medium">{metrics.genresRead}</span> genres
              </div>
              <div>
                <span className="font-medium">
                  {(metrics.retentionRate * 100).toFixed(0)}%
                </span>{" "}
                {t("retention")}
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="space-y-3">
          {topInsights.map((insight) => (
            <Card
              key={insight.id}
              className={`border-l-4 ${
                insight.priority === "high"
                  ? "border-l-red-500"
                  : insight.priority === "medium"
                    ? "border-l-yellow-500"
                    : "border-l-blue-500"
              }`}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div
                        className={`p-1 rounded ${getInsightColor(insight.type)}`}
                      >
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="space-y-1 flex-1">
                              <h5 className="font-medium text-sm">{insight.title}</h5>
                              <p className="text-xs text-muted-foreground">
                                {insight.description}
                              </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        insight.priority === "high"
                          ? "destructive"
                          : insight.priority === "medium"
                            ? "default"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {t(`priority.${insight.priority}`) || insight.priority}
                    </Badge>
                  </div>

                  {insight.relatedMetrics &&
                    insight.relatedMetrics.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                            {t("related")}
                          </span>
                        {insight.relatedMetrics.map((metric) => (
                          <Badge
                            key={metric}
                            variant="outline"
                            className="text-xs"
                          >
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Coaching Info */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {t("refreshNotice")}
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
