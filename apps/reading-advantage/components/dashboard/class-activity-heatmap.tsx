"use client";

import React, { useEffect, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { MetricsActivityResponse } from "@/types/dashboard";

interface ClassActivityHeatmapProps {
  classroomId: string;
  expanded?: boolean;
  onSeeDetail?: () => void;
}

export function ClassActivityHeatmap({ classroomId, expanded = false, onSeeDetail }: ClassActivityHeatmapProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetricsActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useScopedI18n("components.classActivityHeatmap") as any;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const timeframe = expanded ? '365d' : '120d';
        const res = await fetch(
          `/api/v1/metrics/activity?classId=${classroomId}&timeframe=${timeframe}`
        );
        
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch activity data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (classroomId) {
      fetchData();
    }
  }, [classroomId, expanded]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
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

    if (!data || !data.dataPoints || data.dataPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { dataPoints, summary } = data;
  
  // Find max sessions for scaling
  const maxSessions = Math.max(...dataPoints.map(d => d.readingSessions));
  
  // Get data based on expanded state
  const daysToShow = expanded ? 365 : 120;
  const recentData = dataPoints.slice(-daysToShow);
  
  // Find peak day with session count
  const peakDayData = dataPoints.find(d => d.date === summary.peakDay);
  const peakSessions = peakDayData?.readingSessions || 0;
  
  // Group data by weeks (7 days per column)
  const weeks: typeof recentData[] = [];
  for (let i = 0; i < recentData.length; i += 7) {
    weeks.push(recentData.slice(i, i + 7));
  }

  // Get color intensity based on activity level
  const getColor = (sessions: number) => {
    if (sessions === 0) return "bg-slate-100";
    const intensity = maxSessions > 0 ? sessions / maxSessions : 0;
    if (intensity > 0.75) return "bg-green-600";
    if (intensity > 0.5) return "bg-green-500";
    if (intensity > 0.25) return "bg-green-400";
    return "bg-green-300";
  };

  const weekdays = [
    t("dow.sun"),
    t("dow.mon"),
    t("dow.tue"),
    t("dow.wed"),
    t("dow.thu"),
    t("dow.fri"),
    t("dow.sat"),
  ];

  // Responsive sizes based on expanded state
  const cellSize = expanded ? 'w-3.5 h-3.5' : 'w-3 h-3';
  const gapSize = expanded ? 'gap-1' : 'gap-1';
  const legendSize = expanded ? 'w-3.5 h-3.5' : 'w-3 h-3';
  const legendGap = expanded ? 'gap-1' : 'gap-1';
  const fontSize = expanded ? 'text-xs' : 'text-[10px]';
  const labelHeight = expanded ? 'h-3.5' : 'h-3';
  const monthHeight = expanded ? 'h-6' : 'h-6';
  const containerPadding = expanded ? 'px-2' : 'px-2';

  return (
    <Card className={expanded ? '' : 'overflow-hidden'}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {t("title")}
              <span className="text-xs font-normal text-muted-foreground">
                ({expanded ? '365' : '120'} {t("days")})
              </span>
            </CardTitle>
            <CardDescription>
              {t("description", { days: expanded ? 365 : 120 })}
            </CardDescription>
          </div>
          {!expanded && onSeeDetail && (
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
        {/* Summary stats - moved to top for non-expanded */}
        {!expanded && (
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.totalActiveUsers}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("stats.activeUsers")}</div>
            </div>
            <div className="text-center border-x border-border/50">
              <div className="text-2xl font-bold text-primary">{summary.totalSessions}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("stats.totalActivity")}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {new Date(summary.peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t("stats.peakDay")} ({peakSessions})
              </div>
            </div>
          </div>
        )}

        {/* GitHub-style contribution grid */}
        <div className={`flex ${gapSize} overflow-x-auto pb-2 ${containerPadding}`}>
          {/* Day labels */}
          <div className={`flex flex-col ${gapSize} justify-start ${expanded ? 'pt-6' : 'pt-7'} pr-2`}>
            {weekdays.map((day, idx) => (
              <div key={day} className={`${labelHeight} ${fontSize} text-muted-foreground leading-none flex items-center ${idx % 2 === 0 ? '' : 'invisible'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className={`flex flex-col ${gapSize}`}>
              {/* Month label on first day of each month */}
              <div className={`${monthHeight} ${fontSize} text-muted-foreground font-medium leading-none pb-1 flex items-end`}>
                {weekIdx === 0 || new Date(week[0]?.date).getDate() <= 7
                  ? new Date(week[0]?.date).toLocaleDateString('en-US', { month: 'short' })
                  : ''}
              </div>
              {week.map((day, dayIdx) => {
                const date = new Date(day.date);
                return (
                  <div
                    key={dayIdx}
                    className={`${cellSize} rounded ${getColor(day.readingSessions)} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 hover:scale-110 transition-all shadow-sm`}
                    title={`${date.toLocaleDateString()}: ${day.readingSessions} activities`}
                  />
                );
              })}
              {/* Fill empty cells if week is incomplete */}
              {Array.from({ length: 7 - week.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className={cellSize} />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
          <div className={`flex items-center justify-between ${fontSize} text-muted-foreground pt-2 px-2`}>
          <span className="font-medium">{t("legend.title")}</span>
          <div className="flex items-center gap-2">
            <span>{t("legend.less")}</span>
            <div className={`flex ${legendGap}`}>
              <div className={`${legendSize} rounded bg-slate-100 border border-slate-200 shadow-sm`} />
              <div className={`${legendSize} rounded bg-green-300 shadow-sm`} />
              <div className={`${legendSize} rounded bg-green-400 shadow-sm`} />
              <div className={`${legendSize} rounded bg-green-500 shadow-sm`} />
              <div className={`${legendSize} rounded bg-green-600 shadow-sm`} />
            </div>
            <span>{t("legend.more")}</span>
          </div>
        </div>

        {/* Top 5 Most Active Days - for non-expanded view */}
        {!expanded && (
          <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
              {t("topActiveDays")}
            </h4>
            <div className="grid gap-2">
              {dataPoints
                .filter(d => d.readingSessions > 0)
                .sort((a, b) => b.readingSessions - a.readingSessions)
                .slice(0, 5)
                .map((day, index) => {
                  const date = new Date(day.date);
                  const intensity = maxSessions > 0 ? day.readingSessions / maxSessions : 0;
                  let colorClass = "bg-green-300/10 text-green-700 border-green-300/10";
                  if (intensity > 0.75) colorClass = "bg-green-600/10 text-green-700 border-green-600/20";
                  else if (intensity > 0.5) colorClass = "bg-green-500/10 text-green-600 border-green-500/20";
                  else if (intensity > 0.25) colorClass = "bg-green-450/10 text-green-600 border-green-400/20";
                  
                  return (
                    <div
                      key={day.date}
                      className={`flex items-center justify-between p-2.5 rounded-lg border ${colorClass} hover:shadow-sm transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background/50 border border-current/20">
                          <span className="text-xs font-bold">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {date.toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{day.readingSessions}</div>
                        <div className="text-[9px] text-muted-foreground uppercase">{t("activities")}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Summary stats for expanded view */}
        {expanded && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.totalActiveUsers}</div>
              <div className="text-xs text-muted-foreground">{t("stats.activeUsers")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.totalSessions}</div>
              <div className="text-xs text-muted-foreground">{t("stats.totalActivity")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {new Date(summary.peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                <span className="text-base ml-1 text-muted-foreground">({peakSessions})</span>
              </div>
              <div className="text-xs text-muted-foreground">{t("stats.peakDay")}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
