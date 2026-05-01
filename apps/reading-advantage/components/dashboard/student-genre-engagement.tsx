"use client";

import React from "react";
import { WidgetShell } from "./widget-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Sparkles } from "lucide-react";
import { GenreMetricsResponse } from "@/server/services/metrics/genre-engagement-service";
import { Progress } from "@/components/ui/progress";
import { useScopedI18n } from "@/locales/client";

interface GenreEngagementWidgetProps {
  data: GenreMetricsResponse | null;
  loading?: boolean;
  onRefresh?: () => void;
  onGenreClick?: (genre: string) => void;
}

export function GenreEngagementWidget({
  data,
  loading = false,
  onRefresh,
  onGenreClick,
}: GenreEngagementWidgetProps) {
  const t = useScopedI18n("pages.student.dashboard.genreEngagement");
  const topGenres = data?.topGenres?.slice(0, 5) || [];
  const recommendations = data?.recommendations?.slice(0, 3) || [];

  return (
    <WidgetShell
      title={t("title")}
      description={t("description")}
      icon={BookOpen}
      loading={loading}
      isEmpty={!loading && topGenres.length === 0}
      emptyMessage={t("emptyMessage")}
      onRefresh={onRefresh}
      telemetryId="student.genre_engagement"
    >
      <div className="space-y-6">
        {/* Top Genres */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t("yourTopGenres")}</h4>
          <div className="space-y-3">
            {topGenres.map((genre, index) => (
              <div key={genre.genre} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <button
                      onClick={() => onGenreClick?.(genre.genre)}
                      className="font-medium hover:underline"
                    >
                      {genre.genre}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {genre.totalReads} {t("reads")}
                    </span>
                    {genre.cefrBucket && (
                      <Badge variant="outline" className="text-xs">
                        {genre.cefrBucket}
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress
                  value={
                    (genre.totalReads /
                      Math.max(...topGenres.map((g) => g.totalReads))) *
                    100
                  }
                  className="h-2"
                />
                {genre.weightedEngagementScore && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>
                      {t("score")} {genre.weightedEngagementScore.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">{t("recommendedForYou")}</h4>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <Card
                  key={rec.genre}
                  className="bg-primary/5 border-primary/20"
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{rec.genre}</h5>
                        <Badge
                          variant={
                            rec.confidenceScore > 0.8
                              ? "default"
                              : rec.confidenceScore > 0.5
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {rec.recommendationType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rec.rationale}
                      </p>
                      {rec.cefrAppropriate && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {t("cefrAppropriate")}
                          </span>
                          <Badge variant="outline">
                            ✓
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {data && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {data.topGenres.length}
                </p>
                <p className="text-xs text-muted-foreground">{t("genresRead")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.topGenres.reduce((sum, g) => sum + g.totalReads, 0)}
                </p>
                <p className="text-xs text-muted-foreground">{t("totalReads")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.totalEngagementScore.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">{t("totalScore")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
