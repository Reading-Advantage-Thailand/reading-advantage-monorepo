"use client";

import * as React from "react";
import { Clock, RefreshCw, CheckCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Completion {
  studentName: string;
  lessonTitle: string;
  score: number | null;
  completedAt: string;
}

const TEXT = {
  heading: {
    title: { en: "Recent Completions", th: "การสำเร็จล่าสุด" },
    description: {
      en: "Latest lesson completions across your classes",
      th: "การสำเร็จบทเรียนล่าสุดในทุกชั้นเรียน",
    },
  },
  refresh: { en: "Refresh", th: "รีเฟรช" },
  retry: { en: "Retry", th: "ลองอีกครั้ง" },
  empty: {
    title: {
      en: "No recent completions",
      th: "ยังไม่มีการสำเร็จล่าสุด",
    },
    description: {
      en: "Completions will appear here as students finish lessons.",
      th: "การสำเร็จจะปรากฏที่นี่เมื่อนักเรียนจบบทเรียน",
    },
  },
  error: {
    title: {
      en: "Unable to load completions",
      th: "ไม่สามารถโหลดข้อมูลได้",
    },
    description: {
      en: "Please try again.",
      th: "โปรดลองอีกครั้ง",
    },
  },
  scoreLabel: { en: "Score", th: "คะแนน" },
  noScore: { en: "N/A", th: "ไม่มี" },
};

function DualText({
  text,
  className,
  secondaryClassName,
}: {
  text: { en: string; th: string };
  className?: string;
  secondaryClassName?: string;
}) {
  return (
    <span className="flex flex-col leading-tight">
      <span className={className}>{text.en}</span>
      <span className={secondaryClassName ?? "text-xs text-muted-foreground"}>
        {text.th}
      </span>
    </span>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-blue-600";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function RecentCompletionsFeed() {
  const [completions, setCompletions] = React.useState<Completion[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async (refresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = new URL("/api/teachers/dashboard", window.location.origin);
      if (refresh) {
        url.searchParams.set("refresh", "true");
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      setCompletions(payload.recentCompletions);
    } catch (err) {
      console.error("Failed to load completions", err);
      const message =
        err instanceof Error ? err.message : "Unable to load completions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  const handleRefresh = React.useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold">
              <DualText
                text={TEXT.heading.title}
                secondaryClassName="text-sm font-medium text-muted-foreground"
              />
            </CardTitle>
            <CardDescription>
              <DualText text={TEXT.heading.description} />
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            aria-label={`${TEXT.refresh.en} / ${TEXT.refresh.th}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && completions.length === 0 && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">{TEXT.error.title.en}</p>
            <p className="text-xs text-red-600">{TEXT.error.title.th}</p>
            <p className="mt-2 text-gray-700">{TEXT.error.description.en}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-4 rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
            >
              <DualText text={TEXT.retry} />
            </button>
          </div>
        )}

        {!isLoading && !error && completions.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              <DualText
                text={TEXT.empty.title}
                secondaryClassName="text-sm font-medium text-gray-600"
              />
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              <DualText text={TEXT.empty.description} />
            </p>
          </div>
        )}

        {!isLoading && !error && completions.length > 0 && (
          <div className="space-y-2" role="list">
            {completions.map((completion, idx) => (
              <div
                key={`${completion.studentName}-${completion.lessonTitle}-${idx}`}
                role="listitem"
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {completion.studentName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {completion.studentName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {completion.lessonTitle}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`text-sm font-semibold ${getScoreColor(completion.score)}`}
                  >
                    {completion.score !== null
                      ? `${completion.score}%`
                      : TEXT.noScore.en}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(completion.completedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
