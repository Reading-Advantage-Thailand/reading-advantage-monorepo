"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DISPLAY_LIMIT = 5;
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface WeakStandard {
  code: string;
  title: string;
  masteryLevel: number;
  lastAssessedAt: string;
}

interface Alert {
  studentId: string;
  studentName: string;
  avatarInitials: string;
  alertSeverity: "critical" | "warning" | "moderate";
  weakStandards: WeakStandard[];
  weakStandardCount: number;
  avgWeakMastery: number;
  lastAssessmentAgeDays: number;
  score: number;
  traceId: string;
}

interface AlertsResponse {
  classId: string;
  generatedAt: string;
  alerts: Alert[];
  nextCursor: string | null;
  totalAlerts: number;
}

interface ClassOption {
  id: string;
  name: string;
}

interface InterventionAlertsWidgetProps {
  initialClassId?: string;
  classes: ClassOption[];
}

const TEXT = {
  heading: {
    title: { en: "Intervention Alerts", th: "แจ้งเตือนการแทรกแซง" },
    description: {
      en: "Students who may need additional support",
      th: "นักเรียนที่อาจต้องการความช่วยเหลือเพิ่มเติม",
    },
  },
  selectClass: { en: "Select class", th: "เลือกชั้นเรียน" },
  refresh: { en: "Refresh", th: "รีเฟรช" },
  viewAll: { en: "View all alerts", th: "ดูการแจ้งเตือนทั้งหมด" },
  empty: {
    title: {
      en: "Great news! All students are on track.",
      th: "ข่าวดี! นักเรียนทุกคนอยู่ในเป้าหมาย",
    },
    cta: {
      en: "Review class analytics",
      th: "ดูการวิเคราะห์ของชั้นเรียน",
    },
  },
  error: {
    title: {
      en: "Unable to load intervention alerts",
      th: "ไม่สามารถโหลดการแจ้งเตือนได้",
    },
    description: {
      en: "Try again or open class analytics for detailed information.",
      th: "ลองอีกครั้งหรือเปิดการวิเคราะห์ของชั้นเรียนสำหรับข้อมูลโดยละเอียด",
    },
  },
  unavailable: {
    en: "Intervention alerts are currently unavailable.",
    th: "การแจ้งเตือนการแทรกแซงไม่พร้อมใช้งานในขณะนี้",
  },
  retry: { en: "Retry", th: "ลองอีกครั้ง" },
  severity: {
    critical: { en: "Critical", th: "ร้ายแรง" },
    warning: { en: "Warning", th: "คำเตือน" },
    moderate: { en: "Moderate", th: "ปานกลาง" },
  },
  daysAgo: { en: "days ago", th: "วันที่แล้ว" },
  more: { en: "more", th: "เพิ่มเติม" },
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

function getSeverityBadgeVariant(
  severity: "critical" | "warning" | "moderate"
): "destructive" | "default" | "secondary" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "warning":
      return "default";
    case "moderate":
      return "secondary";
  }
}

function getSeverityIcon(severity: "critical" | "warning" | "moderate") {
  switch (severity) {
    case "critical":
      return <AlertCircle className="h-4 w-4" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4" />;
    case "moderate":
      return <Clock className="h-4 w-4" />;
  }
}

function getRelativeTime(daysAgo: number): string {
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "1 day ago";
  return `${daysAgo} days ago`;
}

function getRelativeTimeThai(daysAgo: number): string {
  if (daysAgo === 0) return "วันนี้";
  if (daysAgo === 1) return "1 วันที่แล้ว";
  return `${daysAgo} วันที่แล้ว`;
}

function AlertRow({
  alert,
  classId,
  onClick,
}: {
  alert: Alert;
  classId: string;
  onClick?: () => void;
}) {
  const severityText = TEXT.severity[alert.alertSeverity];
  const displayStandards = alert.weakStandards.slice(0, 2);
  const remainingCount = alert.weakStandardCount - displayStandards.length;

  return (
    <Link
      href={`/teacher/classes/${classId}/students/${alert.studentId}/analytics?from=intervention-widget`}
      onClick={onClick}
      role="button"
      aria-describedby={`alert-${alert.studentId}-severity alert-${alert.studentId}-standards`}
      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
        {alert.avatarInitials}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{alert.studentName}</p>
            <div
              id={`alert-${alert.studentId}-severity`}
              className="mt-1 flex items-center gap-2"
            >
              <Badge variant={getSeverityBadgeVariant(alert.alertSeverity)}>
                {getSeverityIcon(alert.alertSeverity)}
                <span className="sr-only">{severityText.en} /</span>
                {severityText.en}
              </Badge>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{getRelativeTime(alert.lastAssessmentAgeDays)}</p>
            <p className="text-[10px]">
              {getRelativeTimeThai(alert.lastAssessmentAgeDays)}
            </p>
          </div>
        </div>
        <div
          id={`alert-${alert.studentId}-standards`}
          className="text-sm text-muted-foreground"
        >
          <span className="font-medium">Weak standards: </span>
          {displayStandards.map((std, idx) => (
            <span key={std.code}>
              {idx > 0 && ", "}
              {std.code}
            </span>
          ))}
          {remainingCount > 0 && (
            <span
              className="ml-1 text-xs"
              title={alert.weakStandards
                .slice(2)
                .map((s) => s.code)
                .join(", ")}
            >
              +{remainingCount} {TEXT.more.en}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function InterventionAlertsWidget({
  initialClassId,
  classes,
}: InterventionAlertsWidgetProps) {
  const [selectedClassId, setSelectedClassId] = React.useState<string>(
    initialClassId || classes[0]?.id || ""
  );
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [totalAlerts, setTotalAlerts] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAlerts = React.useCallback(
    async (refresh = false) => {
      if (!selectedClassId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const startTime = Date.now();

      try {
        const url = new URL(
          `/api/teachers/classes/${selectedClassId}/intervention-alerts`,
          window.location.origin
        );
        url.searchParams.set("limit", String(DISPLAY_LIMIT));
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
          if (response.status === 403) {
            throw new Error("You don't have access to this class.");
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as AlertsResponse;
        setAlerts(data.alerts);
        setTotalAlerts(data.totalAlerts);

        // Telemetry: widget_impression
        const latency = Date.now() - startTime;
        if (latency > 1000) {
          console.warn(
            `[InterventionAlerts] API latency exceeded 1s: ${latency}ms`
          );
        }

        // Track impression
        console.log("[Telemetry] intervention_alerts.widget_impression", {
          classId: selectedClassId,
          alertCount: data.alerts.length,
          totalAlerts: data.totalAlerts,
          severityDistribution: data.alerts.reduce(
            (acc, alert) => {
              acc[alert.alertSeverity] = (acc[alert.alertSeverity] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        });
      } catch (err) {
        console.error("Failed to load intervention alerts", err);
        const message =
          err instanceof Error ? err.message : "Unable to load alerts";
        setError(message);

        // Track error
        console.log("[Telemetry] intervention_alerts.fetch_error", {
          classId: selectedClassId,
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedClassId]
  );

  // Initial fetch
  React.useEffect(() => {
    void fetchAlerts(false);
  }, [fetchAlerts]);

  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(() => {
      void fetchAlerts(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleRefresh = React.useCallback(() => {
    // Track refresh click
    console.log("[Telemetry] intervention_alerts.refresh_clicked", {
      classId: selectedClassId,
    });
    void fetchAlerts(true);
  }, [fetchAlerts, selectedClassId]);

  const handleClassChange = React.useCallback((newClassId: string) => {
    setSelectedClassId(newClassId);
  }, []);

  const handleAlertClick = React.useCallback(
    (alert: Alert) => {
      // Track alert row click
      console.log("[Telemetry] intervention_alerts.alert_row_clicked", {
        classId: selectedClassId,
        studentId: alert.studentId,
        severity: alert.alertSeverity,
        weakStandardCount: alert.weakStandardCount,
      });
    },
    [selectedClassId]
  );

  // No classes available
  if (classes.length === 0) {
    return null;
  }

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
              {totalAlerts > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalAlerts}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              <DualText text={TEXT.heading.description} />
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedClassId} onValueChange={handleClassChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={TEXT.selectClass.en} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label={`${TEXT.refresh.en} / ${TEXT.refresh.th}`}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading state */}
        {isLoading && alerts.length === 0 && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">{TEXT.error.title.en}</p>
            <p className="text-xs text-red-600">{TEXT.error.title.th}</p>
            <p className="mt-2 text-gray-700">{TEXT.error.description.en}</p>
            <p className="text-xs text-gray-500">{TEXT.error.description.th}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleRefresh}
            >
              <DualText text={TEXT.retry} />
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && alerts.length === 0 && (
          <div
            className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center"
            role="status"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              <DualText
                text={TEXT.empty.title}
                secondaryClassName="text-sm font-medium text-gray-600"
              />
            </h3>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <Link
                href={`/teacher/classes/${selectedClassId}/analytics`}
                aria-label={`${TEXT.empty.cta.en} / ${TEXT.empty.cta.th}`}
              >
                <DualText text={TEXT.empty.cta} />
              </Link>
            </Button>
          </div>
        )}

        {/* Alerts list */}
        {!isLoading && !error && alerts.length > 0 && (
          <>
            <div className="space-y-3" role="list">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.studentId}
                  alert={alert}
                  classId={selectedClassId}
                  onClick={() => handleAlertClick(alert)}
                />
              ))}
            </div>

            {totalAlerts > DISPLAY_LIMIT && (
              <div className="pt-2 text-center">
                <Button asChild variant="link" size="sm">
                  <Link
                    href={`/teacher/classes/${selectedClassId}/analytics?tab=interventions`}
                  >
                    <DualText text={TEXT.viewAll} />
                    {" "}({totalAlerts})
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
