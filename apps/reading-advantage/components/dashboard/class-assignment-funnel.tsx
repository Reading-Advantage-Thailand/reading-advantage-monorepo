"use client";

import React, { useEffect, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, XCircle, ExternalLink } from "lucide-react";
import { MetricsAssignmentsResponse } from "@/types/dashboard";

interface ClassAssignmentFunnelProps {
  classroomId: string;
  detailed?: boolean;
  onSeeDetail?: () => void;
}

export function ClassAssignmentFunnel({
  classroomId,
  detailed = false,
  onSeeDetail,
}: ClassAssignmentFunnelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetricsAssignmentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'atRisk' | 'stale'>('all');
  const t = useScopedI18n("components.classAssignmentFunnel") as any;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/v1/metrics/assignments?classId=${classroomId}&timeframe=365d`
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch assignment funnel:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (classroomId) {
      fetchData();
    }
  }, [classroomId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.assignments || data.assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { assignments, summary } = data;
  const completionRate = Math.round(summary.averageCompletionRate);

  // Calculate metrics from assignments
  const totalAssignments = assignments.length;
  const highCompletionAssignments = assignments.filter(
    (a) => a.completionRate >= 80
  ).length;
  const atRiskAssignments = assignments.filter(
    (a) => a.completionRate < 70 && a.assigned > 0
  ).length;
  const staleAssignments = assignments.filter(
    (a) => a.notStarted === a.assigned && a.assigned > 0
  ).length;

  // Filter assignments based on selected filter
  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === 'high') {
      return assignment.completionRate >= 80;
    } else if (filter === 'atRisk') {
      return assignment.completionRate < 70 && assignment.assigned > 0;
    } else if (filter === 'stale') {
      return assignment.notStarted === assignment.assigned && assignment.assigned > 0;
    }
    return true; // 'all'
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {!detailed && onSeeDetail && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSeeDetail}
            >
              {t("seeDetail")}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">{t("overallCompletion")}</span>
          </div>
          <span className="text-2xl font-bold">{completionRate}%</span>
        </div>

        {/* Show filter buttons only in detailed view */}
        {detailed && (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setFilter(filter === 'high' ? 'all' : 'high')}
              className={`text-center p-3 rounded-lg border transition-all ${
                filter === 'high' 
                  ? 'bg-green-50 border-green-500 dark:bg-green-950' 
                  : 'hover:bg-muted border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-green-600">
                {highCompletionAssignments}
              </div>
              <div className="text-xs text-muted-foreground">{t("highCompletion")}</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'atRisk' ? 'all' : 'atRisk')}
              className={`text-center p-3 rounded-lg border transition-all ${
                filter === 'atRisk' 
                  ? 'bg-amber-50 border-amber-500 dark:bg-amber-950' 
                  : 'hover:bg-muted border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-amber-600">
                {atRiskAssignments}
              </div>
              <div className="text-xs text-muted-foreground">{t("atRisk")}</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'stale' ? 'all' : 'stale')}
              className={`text-center p-3 rounded-lg border transition-all ${
                filter === 'stale' 
                  ? 'bg-slate-50 border-slate-500 dark:bg-slate-950' 
                  : 'hover:bg-muted border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-slate-600">
                {staleAssignments}
              </div>
              <div className="text-xs text-muted-foreground">{t("stale")}</div>
            </button>
          </div>
        )}

        {/* Show simple stats in summary view */}
        {!detailed && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {highCompletionAssignments}
              </div>
              <div className="text-xs text-muted-foreground">{t("highCompletion")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {atRiskAssignments}
              </div>
              <div className="text-xs text-muted-foreground">{t("atRisk")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">
                {staleAssignments}
              </div>
              <div className="text-xs text-muted-foreground">{t("stale")}</div>
            </div>
          </div>
        )}

        {detailed && filteredAssignments.length > 0 && (
            <div className="text-xs text-muted-foreground pb-2">
            {t("showing", { count: filteredAssignments.length })}
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="ml-2 text-blue-600 hover:underline"
              >
                ({t("clearFilter")})
              </button>
            )}
          </div>
        )}

        {!detailed && filteredAssignments.length > 0 && (
          <div className="space-y-3">
            {filteredAssignments.slice(0, 5).map((assignment) => {
              const completed = assignment.completed;
              const total = assignment.assigned;
              const progress = assignment.completionRate;

              return (
                <div key={assignment.assignmentId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="font-medium truncate flex-1">
                      {assignment.title}
                    </span>
                    <span className="whitespace-nowrap">
                      {completed}/{total}
                    </span>
                  </div>
                  <Progress value={progress} />
                </div>
              );
            })}
          </div>
        )}

        {detailed && filteredAssignments.length > 0 && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filteredAssignments.map((assignment) => {
              const completed = assignment.completed;
              const total = assignment.assigned;
              const inProgress = assignment.inProgress;
              const notStarted = assignment.notStarted;
              const progress = assignment.completionRate;
              const isAtRisk =
                assignment.completionRate < 70 && assignment.assigned > 0;
              const isStale = notStarted === total && total > 0;

              return (
                <div key={assignment.assignmentId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="font-medium truncate flex-1">
                      {assignment.title}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="whitespace-nowrap">
                        {completed}/{total}
                      </span>
                      {isStale && (
                        <Badge variant="secondary" className="text-xs">
                          {t("notStarted")}
                        </Badge>
                      )}
                      {isAtRisk && (
                        <Badge
                          variant="outline"
                          className="text-xs text-amber-600"
                        >
                          At Risk
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() =>
                          router.push(
                            `/teacher/assignments/${classroomId}/${assignment.articleId}`
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={progress} />
                </div>
              );
            })}
          </div>
        )}

        {atRiskAssignments > 0 && filter === 'all' && (
            <div className="pt-4 border-t flex items-center space-x-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {atRiskAssignments} {atRiskAssignments > 1 ? t("needAttentionPlural") : t("needAttention")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
