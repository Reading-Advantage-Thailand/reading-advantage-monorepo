"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TEXT = {
  heading: {
    title: { en: "Students Needing Attention", th: "นักเรียนที่ต้องการความช่วยเหลือ" },
    description: {
      en: "Students with mastery below 60% across your classes",
      th: "นักเรียนที่มีระดับความเชี่ยวชาญต่ำกว่า 60% ในทุกชั้นเรียน",
    },
  },
  attention: { en: "students need attention", th: "นักเรียนต้องการความช่วยเหลือ" },
  viewDetails: { en: "View intervention details", th: "ดูรายละเอียดการแทรกแซง" },
  refresh: { en: "Refresh", th: "รีเฟรช" },
  retry: { en: "Retry", th: "ลองอีกครั้ง" },
  empty: {
    title: {
      en: "All students are on track!",
      th: "นักเรียนทุกคนอยู่ในเป้าหมาย!",
    },
    description: {
      en: "No students have mastery below 60%.",
      th: "ไม่มีนักเรียนที่มีระดับความเชี่ยวชาญต่ำกว่า 60%",
    },
  },
  error: {
    title: {
      en: "Unable to load attention data",
      th: "ไม่สามารถโหลดข้อมูลได้",
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

export function StudentsNeedAttentionCard() {
  const [count, setCount] = React.useState<number | null>(null);
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
      setCount(payload.studentsNeedingAttention);
    } catch (err) {
      console.error("Failed to load attention data", err);
      const message =
        err instanceof Error ? err.message : "Unable to load attention data";
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
      <CardContent>
        {isLoading && count === null && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
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

        {!isLoading && !error && count === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <AlertTriangle className="h-6 w-6 text-green-600" />
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

        {!isLoading && !error && count !== null && count > 0 && (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-red-600">{count}</span>
              <span className="text-sm text-muted-foreground">
                <DualText text={TEXT.attention} />
              </span>
            </div>
            <Link
              href="/teacher/classes?tab=interventions"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              <DualText text={TEXT.viewDetails} />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
