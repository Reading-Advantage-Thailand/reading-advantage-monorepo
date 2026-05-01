"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScopedI18n } from "@/locales/client";

export interface AIInsight {
  id: string;
  type: "success" | "warning" | "info" | "risk";
  title: string;
  message: string;
  evidence?: string[];
  actionable?: boolean;
  priority?: "low" | "medium" | "high";
}

export interface AITeacherBriefProps {
  summary?: string;
  insights?: AIInsight[];
  generatedAt?: string;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

export function AITeacherBrief({
  summary,
  insights = [],
  generatedAt,
  loading = false,
  onRefresh,
}: AITeacherBriefProps) {
  const t = useScopedI18n("pages.teacher.dashboardPage.aiBrief") as any;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Failed to refresh AI brief:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case "risk":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
    }
  };

  const getInsightColor = (type: AIInsight["type"]) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20";
      case "warning":
        return "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20";
      case "risk":
        return "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20";
      default:
        return "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20";
    }
  };

  const getPriorityBadge = (priority?: AIInsight["priority"]) => {
    if (!priority) return null;

    const colors = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    } as const;

    return (
      <Badge variant={colors[priority]} className="text-xs">
        {t(`priority.${priority}`)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 dark:border-purple-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle>{t("title")}</CardTitle>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={t("refreshInsights")}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
          )}
        </div>
        <CardDescription>
          {t("description")}
          {generatedAt && (
            <span className="ml-2 text-xs">
              • {t("updatedAt", { time: new Date(generatedAt).toLocaleTimeString() })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {summary && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("keyInsights")} ({insights.length})
            </h4>
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-4 transition-all hover:shadow-sm",
                  getInsightColor(insight.type)
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-semibold text-sm">
                        {insight.title}
                      </h5>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {insight.message}
                    </p>

                    {/* Evidence List */}
                    {insight.evidence && insight.evidence.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("evidence")}:
                        </p>
                        <ul className="text-xs space-y-1 ml-4">
                          {insight.evidence.map((evidence, index) => (
                            <li
                              key={index}
                              className="list-disc text-muted-foreground"
                            >
                              {evidence}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actionable Badge */}
                    {insight.actionable && (
                      <Badge variant="outline" className="text-xs mt-2">
                        {t("actionable")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {summary ? t("noInsights") : t("aiInsightsWillAppear")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
