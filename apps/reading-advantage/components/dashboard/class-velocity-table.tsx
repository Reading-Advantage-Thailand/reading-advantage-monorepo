"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MetricsVelocityResponse } from "@/types/dashboard";
import { useScopedI18n } from "@/locales/client";

interface ClassVelocityTableProps {
  classroomId: string;
}

export function ClassVelocityTable({ classroomId }: ClassVelocityTableProps) {
  const tc = useScopedI18n("components.classVelocityTable") as any;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetricsVelocityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/v1/metrics/velocity?classId=${classroomId}&timeframe=365d`
        );
        
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch velocity data:", err);
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
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tc("errorUnableToLoad")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.dataPoints || data.dataPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription>{tc("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { dataPoints, summary } = data;

  // Check if there's any actual activity (not just empty data points)
  const hasActivity = summary.totalArticles > 0;

  if (!hasActivity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription>{tc("noActivity")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {tc("noActivityDetails", { days: data.timeframe === '7d' ? '7' : data.timeframe === '30d' ? '30' : data.timeframe === '90d' ? '90' : '365' })}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate average from data points
  const recentPoints = dataPoints.slice(-7);
  const olderPoints = dataPoints.slice(0, Math.min(7, dataPoints.length - 7));
  
  const recentAvg = recentPoints.reduce((sum, p) => sum + p.wordsRead, 0) / (recentPoints.length || 1);
  const olderAvg = olderPoints.length > 0 
    ? olderPoints.reduce((sum, p) => sum + p.wordsRead, 0) / olderPoints.length 
    : recentAvg;
  
  const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  // Calculate timeframe in days
  const timeframeDays = data.timeframe === '7d' ? 7 : data.timeframe === '30d' ? 30 : data.timeframe === '90d' ? 90 : 365;
  const articlesPerDay = summary.totalArticles / timeframeDays;
  const articlesPerWeek = articlesPerDay * 7;
  const articlesPerMonth = articlesPerDay * 30;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc("title")}</CardTitle>
        <CardDescription>{tc("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">
              {articlesPerDay >= 1 ? tc("labels.articlesPerDay") : tc("labels.articlesPerMonth")}
            </div>
            <div className="text-2xl font-bold">
              {articlesPerDay >= 1 
                ? articlesPerDay.toFixed(1)
                : articlesPerMonth.toFixed(1)
              }
            </div>
            {articlesPerDay < 1 && articlesPerDay > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                ({articlesPerWeek.toFixed(1)}/week)
              </div>
            )}
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">{tc("labels.trend")}</div>
            <div className="flex items-center space-x-2">
              {summary.trend === 'up' ? (
                <>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-xl font-bold text-green-600">{tc("trend.up")}</span>
                </>
              ) : summary.trend === 'down' ? (
                <>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="text-xl font-bold text-red-600">{tc("trend.down")}</span>
                </>
              ) : (
                <span className="text-xl font-bold text-slate-600">{tc("trend.stable")}</span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{tc("stats.totalArticles")}</span>
            <span className="font-medium">{summary.totalArticles}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{tc("stats.totalWords")}</span>
            <span className="font-medium">{summary.totalWords.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{tc("stats.totalTime")}</span>
            <span className="font-medium">{Math.round(summary.totalTime)} {tc("stats.min")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
