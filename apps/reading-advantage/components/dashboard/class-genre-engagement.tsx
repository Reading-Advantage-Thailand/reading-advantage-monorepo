"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { MetricsGenresResponse } from "@/types/dashboard";
import { useScopedI18n } from "@/locales/client";

interface ClassGenreEngagementProps {
  classroomId: string;
}

export function ClassGenreEngagement({ classroomId }: ClassGenreEngagementProps) {
  const tc = useScopedI18n("components.classGenreEngagement") as any;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetricsGenresResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/v1/metrics/genres?classId=${classroomId}&timeframe=90d`
        );
        
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch genre data:", err);
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
          <Skeleton className="h-48 w-full" />
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

  if (!data || !data.genres || data.genres.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription>{tc("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { genres, summary } = data;
  const topGenres = genres.slice(0, 8); // Show top 8 genres

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc("title")}</CardTitle>
        <CardDescription>
          {tc("description", { mostPopular: summary.mostPopular })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topGenres.map((genre) => (
          <div key={genre.genre} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{genre.genre}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  {genre.count} {tc("labels.books")}
                </span>
                <span>•</span>
                <span>{genre.percentage.toFixed(1)}{tc("labels.percentSuffix")}</span>
              </div>
            </div>
            <Progress value={genre.percentage} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {tc("labels.avgLevel")}: {genre.averageLevel.toFixed(1)}
              </span>
              <span>
                {genre.totalXp} {tc("labels.xp")}
              </span>
            </div>
          </div>
        ))}

        {genres.length > 8 && (
          <div className="pt-2 border-t text-sm text-muted-foreground text-center">
            {tc("moreGenres", { count: genres.length - 8 })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
