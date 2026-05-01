"use client";

import * as React from "react";
import { BookOpen, Users, TrendingUp, RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClassProgress {
  classId: string;
  className: string;
  completionRate: number;
  averageScore: number;
  activeStudents: number;
}

interface DashboardResponse {
  classProgress: ClassProgress[];
  studentsNeedingAttention: number;
  recentCompletions: Array<{
    studentName: string;
    lessonTitle: string;
    score: number | null;
    completedAt: string;
  }>;
}

const TEXT = {
  heading: {
    title: { en: "Class Progress", th: "ความก้าวหน้าของชั้นเรียน" },
    description: {
      en: "Overall completion and performance across your classes",
      th: "อัตราการสำเร็จและผลการเรียนโดยรวมของชั้นเรียน",
    },
  },
  completionRate: { en: "Completion Rate", th: "อัตราการสำเร็จ" },
  averageScore: { en: "Average Score", th: "คะแนนเฉลี่ย" },
  activeStudents: { en: "Active Students", th: "นักเรียนที่ใช้งานอยู่" },
  refresh: { en: "Refresh", th: "รีเฟรช" },
  retry: { en: "Retry", th: "ลองอีกครั้ง" },
  empty: {
    title: {
      en: "No classes yet",
      th: "ยังไม่มีชั้นเรียน",
    },
    description: {
      en: "Create a class to see progress data.",
      th: "สร้างชั้นเรียนเพื่อดูข้อมูลความก้าวหน้า",
    },
  },
  error: {
    title: {
      en: "Unable to load class progress",
      th: "ไม่สามารถโหลดข้อมูลความก้าวหน้าได้",
    },
    description: {
      en: "Please try again.",
      th: "โปรดลองอีกครั้ง",
    },
  },
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

function getColorClass(rate: number): string {
  if (rate >= 90) return "text-blue-600 bg-blue-50";
  if (rate >= 80) return "text-green-600 bg-green-50";
  if (rate >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

function getBarColorClass(rate: number): string {
  if (rate >= 90) return "bg-blue-500";
  if (rate >= 80) return "bg-green-500";
  if (rate >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function ClassProgressCard() {
  const [data, setData] = React.useState<ClassProgress[]>([]);
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

      const payload = (await response.json()) as DashboardResponse;
      setData(payload.classProgress);
    } catch (err) {
      console.error("Failed to load class progress", err);
      const message =
        err instanceof Error ? err.message : "Unable to load class progress";
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
        {isLoading && data.length === 0 && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200 mb-2" />
                <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
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

        {!isLoading && !error && data.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <BookOpen className="h-6 w-6 text-blue-600" />
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

        {!isLoading && !error && data.length > 0 && (
          <div className="space-y-4" role="list">
            {data.map((cls) => (
              <div
                key={cls.classId}
                role="listitem"
                className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {cls.className}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${getColorClass(cls.averageScore)}`}
                  >
                    {cls.averageScore}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <DualText text={TEXT.completionRate} />
                    </span>
                    <span className="font-medium">{cls.completionRate}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all ${getBarColorClass(cls.completionRate)}`}
                      style={{ width: `${Math.min(cls.completionRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <DualText text={TEXT.activeStudents} />
                  <span className="font-medium text-gray-900">
                    {cls.activeStudents}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
